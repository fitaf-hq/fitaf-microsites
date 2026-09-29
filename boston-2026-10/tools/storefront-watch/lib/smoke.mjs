// SPEC-storefront-watch § 4, the smoke test: the hand-off run end to end in a headless browser, at 1280 × 900 and at
// 390 × 844 ×3 (a phone), each in a fresh profile. At each width:
//   1. this week's menu, read from /order?mpid=21 with no fragment: the first 7 displayed meals whose card has an
//      enabled Add to Cart, and the line price each shows;
//   2. the link, built by the site's own payload code (scripts/handoff-link.mjs, imported);
//   3. the link opened in a second fresh context. "live": the store runs our Footer block, the link alone does it.
//      "paste": the given text is evaluated in the page, as a person pastes it in the console, once the meal cards
//      are shown; any block of ours on the page is held off by its own once-per-load marker, set before the page's
//      scripts run and removed just before the paste, so the text under test is the one that runs;
//   4. wait for `[fitaf-handoff] done: /checkout` (or a `stopped:` line), then READ /checkout: the names listed, the
//      "N items", the total. Nothing is typed or pressed here, on /checkout or anywhere; the profile is discarded.
// The pass rule is lib/smoke-verdict.mjs (W6).
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freshBrowser, poll, sleep } from "./browser.mjs";
import { LOG_PREFIX, MPID, STORE_ORIGIN, VIEWPORTS, WIDTHS } from "./config.mjs";
import { parseBlock } from "./footer-check.mjs";
import { siteCode } from "./site-code.mjs";
import { DONE_LINE, smokeVerdict } from "./smoke-verdict.mjs";

const NAV_MS = 60_000;
/** Fill B itself waits at most 10 s for the cards; the menu read and the paste wait for them longer. */
const MENU_MS = 45_000;
/** Cards, 7 presses, CHECKOUT, perhaps the extras dialog, the route: fill B's own waits add to under 40 s. */
const HANDOFF_MS = 60_000;
const CHECKOUT_MS = 30_000;
const STOPPED = `${LOG_PREFIX} stopped:`;

/** In the page. The menu, and the first `need` displayed meals with an enabled Add to Cart, as fill B reads cards. */
function readMenu(need) {
  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const price = (el) => {
    const m = /\$\s*([\d,]+)\.(\d{2})/.exec(text(el));
    return m ? Number(m[1].replace(/,/g, "")) * 100 + Number(m[2]) : null;
  };
  // A meal is displayed if a title of that name is: at 666 px and narrower the page shows its mobile cards and hides
  // app-product-card, which fill B presses at every width (SPEC-rung2 § 8).
  const shown = new Set([...document.querySelectorAll(".product__content-title")].filter((t) => t.getClientRects().length > 0).map(text));
  const names = [];
  const chosen = [];
  for (const card of document.querySelectorAll("app-product-card")) {
    const name = text(card.querySelector(".product__content-title"));
    if (!name) continue;
    if (!names.includes(name)) names.push(name);
    if (chosen.length >= need || !shown.has(name) || chosen.some((c) => c.name === name)) continue;
    const add = [...card.querySelectorAll(".product__actions button")].find((b) => text(b).includes("Add to Cart"));
    if (!add || add.disabled) continue;
    chosen.push({ name, priceCents: price(add) ?? price(card.querySelector(".product__price-now")) });
  }
  return { names, chosen };
}

/** In the page, on /checkout: read only. Text nodes are read whether or not they are displayed (a closed drawer). */
function readCheckout(menuNames) {
  const clean = (s) => s.replace(/\s+/g, " ").trim();
  const cents = (s) => {
    const m = /\$\s*([\d,]+)\.(\d{2})/.exec(s);
    return m ? Number(m[1].replace(/,/g, "")) * 100 + Number(m[2]) : null;
  };
  const summary = document.querySelector(".checkout__summary");
  const root = summary || document.body;
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || el.closest("script,style,noscript,template")) continue;
    const t = clean(n.nodeValue);
    if (t) nodes.push({ t, el });
  }
  const menu = new Set(menuNames);
  const names = [...new Set(nodes.map((n) => n.t).filter((t) => menu.has(t)))];
  const itemCounts = nodes.flatMap((n) => [...n.t.matchAll(/(\d+)\s+items?\b/g)].map((m) => Number(m[1])));
  // The store's summary (its public template): "Plan Total (N items)" beside the plan's total, and
  // "Subtotal | N items" beside the subtotal. The last amount in the line's own box is the one shown as its total.
  let totalCents = null;
  let totalFrom = null;
  for (const [label, re] of [["Plan Total", /^Plan Total \(\d+ items?\)$/], ["Subtotal", /^Subtotal \| \d+ items?$/]]) {
    const hit = nodes.find((n) => re.test(n.t));
    const box = hit && (hit.el.parentElement || hit.el);
    const amounts = box ? nodes.filter((n) => box.contains(n.el)).map((n) => cents(n.t)).filter((c) => c !== null) : [];
    if (amounts.length) {
      totalCents = amounts[amounts.length - 1];
      totalFrom = label;
      break;
    }
  }
  return { path: location.pathname, scope: summary ? ".checkout__summary" : "body", names, itemCounts, totalCents, totalFrom };
}

/** A Footer block file (<script>…</script>) gives the text between its tags; a console file is used as it is. */
export function scriptFromFile(text) {
  const m = /^\s*<script\b[^>]*>([\s\S]*)<\/script>\s*$/i.exec(text);
  return m ? m[1] : text;
}

const describe = (text) => parseBlock(text)?.versionLine ?? "no version line";

/** Which script runs, and how the report names it (§ 4: "the report says which"). */
export async function scriptMode({ liveBlocks = [], scriptFile = null, code, why = "F3 found no block of ours on the live page" }) {
  if (scriptFile) {
    const text = scriptFromFile(await readFile(scriptFile, "utf8"));
    return { kind: "paste", text, label: `${scriptFile} (${describe(text)}), pasted in the console; any block of ours on the live page held off` };
  }
  if (liveBlocks.length) return { kind: "live", label: `the store's own Footer block (${liveBlocks.join("; ")}): the link alone` };
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-build-"));
  try {
    await code.buildStorefront({ outDir: dir });
    const text = await readFile(join(dir, "fitaf-handoff.fill-B.console.js"), "utf8");
    return { kind: "paste", text, label: `fitaf-handoff.fill-B.console.js built from this checkout (${describe(text)}), pasted in the console (${why})` };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function smokeRun({ origin = STORE_ORIGIN, width, mode, code, executablePath }) {
  const need = code.counts.get(MPID);
  const outcome = { width, need, menu: 0, menuNames: [], chosen: [], link: null, console: [], errors: [], checkout: null };
  const { browser, close } = await freshBrowser({ executablePath });
  try {
    const menuContext = await browser.createBrowserContext();
    const menuPage = await menuContext.newPage();
    await menuPage.setViewport(VIEWPORTS[width]);
    await menuPage.goto(`${origin}/order?mpid=${MPID}`, { waitUntil: "load", timeout: NAV_MS });
    const menu = await poll(menuPage, readMenu, need, (m) => m.chosen.length >= need, { timeoutMs: MENU_MS });
    await menuContext.close();
    outcome.menuNames = menu?.names ?? [];
    outcome.menu = outcome.menuNames.length;
    outcome.chosen = menu?.chosen ?? [];

    if (outcome.chosen.length >= need) {
      const args = ["--mpid", String(MPID), ...outcome.chosen.flatMap((c) => ["--item", `${c.name}:1`])];
      const link = new URL(code.handoffLink(code.plans, code.payloadFromArgs(args, code.counts)));
      outcome.link = new URL(link.pathname + link.search + link.hash, origin).href;

      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport(VIEWPORTS[width]);
      page.on("console", (m) => outcome.console.push(m.text()));
      page.on("pageerror", (e) => outcome.errors.push(String(e?.message ?? e)));
      if (mode.kind === "paste") {
        await page.evaluateOnNewDocument(() => {
          window.__fitafHandoff = true;
        });
      }
      await page.goto(outcome.link, { waitUntil: "load", timeout: NAV_MS });
      if (mode.kind === "paste") {
        await poll(page, () => document.querySelectorAll("app-product-card").length, null, (n) => n > 0, { timeoutMs: MENU_MS });
        await page.evaluate(() => {
          delete window.__fitafHandoff;
        });
        try {
          await page.evaluate(mode.text);
        } catch (err) {
          outcome.errors.push(`the pasted script threw: ${err.message}`);
        }
      }
      const until = Date.now() + HANDOFF_MS;
      while (Date.now() < until && !outcome.console.some((l) => l === DONE_LINE || l.startsWith(STOPPED))) await sleep(250);
      outcome.checkout = outcome.console.includes(DONE_LINE)
        ? await poll(page, readCheckout, outcome.menuNames, (c) => c.path === "/checkout" && c.totalCents !== null && c.names.length > 0, { timeoutMs: CHECKOUT_MS })
        : await page.evaluate(() => ({ path: location.pathname, names: [], itemCounts: [], totalCents: null, totalFrom: null }));
      await context.close();
    }
  } finally {
    await close();
  }
  const verdict = smokeVerdict({
    need,
    chosen: outcome.chosen,
    console: outcome.console.filter((l) => l.startsWith(LOG_PREFIX)),
    checkout: outcome.checkout,
  });
  return { width, verdict, outcome };
}

/** Both widths (or those given), one mode. `live` forces the link alone. */
export async function smoke({ liveBlocks = [], scriptFile = null, live = false, widths = WIDTHS, origin = STORE_ORIGIN, executablePath, why } = {}) {
  const code = await siteCode();
  const mode = await scriptMode({ liveBlocks: live ? ["as asked, with --live"] : liveBlocks, scriptFile, code, why });
  const runs = [];
  for (const width of widths) runs.push(await smokeRun({ origin, width, mode, code, executablePath }));
  return { flag: runs.some((r) => !r.verdict.pass), script: mode.label, runs };
}
