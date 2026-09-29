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
//   5. before the page closes, READ it as text (§ 7 item 2), which the report shows only for a width that failed: the
//      path, the displayed buttons outside meal cards, any dialog's text, the COUNTS of the store's pending list and
//      cart, and every console line of the page. Never a screenshot. (lib/report.mjs redacts and cuts it.)
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
/**
 * Fill B's longest run on mpid 21 (SPEC-rung2 §§ 6, 8, 11), each wait at its limit: the cards (10 s), one 200 ms tick
 * per press of the 7 meals, an enabled CHECKOUT (10 s), then 30 s after CHECKOUT and 30 s after the extras dialog's
 * CONTINUE TO CHECKOUT (§ 11 item 4). W9e reads the built fill-B text's own constants and checks this sum.
 */
export const FILL_B_LONGEST_MS = 10_000 + 7 * 200 + 10_000 + 30_000 + 30_000;
/** § 7 item 3: the smoke waits for fill B's own verdict (done or stopped) at most this long, above its longest run. */
export const HANDOFF_MS = FILL_B_LONGEST_MS + 15_000;
const CHECKOUT_MS = 30_000;
/** The store's own lists (SPEC-rung2 § 8), whose COUNTS a failed width records. */
const STORE_LISTS = ["hmp_pending_plan_items", "hmp_local_cart"];
const STOPPED = `${LOG_PREFIX} stopped:`;

/** In the page. The menu, and the first `need` displayed meals with an enabled Add to Cart, as fill B reads cards. */
function readMenu(need) {
  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const price = (el) => {
    const m = /\$\s*([\d,]+)\.(\d{2})/.exec(text(el));
    return m ? Number(m[1].replace(/,/g, "")) * 100 + Number(m[2]) : null;
  };
  // A meal is displayed if a title of that name is, in any of the store's card layouts: at 666 px and narrower the page
  // shows its mobile cards (their title is `.product-card-mobile__title`, found on the live store 2026-09-29) and hides
  // app-product-card, which fill B presses at every width (SPEC-rung2 § 8). Choosing only from displayed
  // app-product-card titles chose nothing at 390 px.
  const TITLES = "app-product-card .product__content-title, app-product-card-mobile .product-card-mobile__title, " +
    "app-product-card-classic-mobile [class*='title']";
  const shown = new Set([...document.querySelectorAll(TITLES)].filter((t) => t.getClientRects().length > 0).map(text));
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

/**
 * In the page: § 7 item 2's text evidence. Buttons displayed and outside every meal-card layout, with label and disabled
 * state; the text of each displayed dialog (not one inside another); the store's lists as COUNTS only (a list's length,
 * or for an object the lengths of its lists added up), never their contents. Reads; presses and types nothing.
 */
function readEvidence(keys) {
  const text = (el) => el.textContent.replace(/\s+/g, " ").trim();
  // A dialog's text node by text node, joined with spaces: its title and its buttons' labels do not run together.
  const words = (el) => {
    const out = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.nodeValue.replace(/\s+/g, " ").trim();
      if (t && !n.parentElement?.closest("script,style,template")) out.push(t);
    }
    return out.join(" ");
  };
  const shown = (el) => el.getClientRects().length > 0;
  const CARDS = "app-product-card, app-product-card-mobile, app-product-card-classic-mobile";
  const buttons = [...document.querySelectorAll("button")]
    .filter((b) => shown(b) && !b.closest(CARDS))
    .map((b) => ({ label: text(b) || b.getAttribute("aria-label") || "(no label)", disabled: b.disabled }));
  const found = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"], dialog[open], [aria-modal="true"]')].filter(shown);
  const dialogs = found.filter((d) => !found.some((o) => o !== d && o.contains(d))).map(words).filter(Boolean);
  const lists = keys.map((key) => {
    let value;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return { key, state: "absent", count: null };
      value = JSON.parse(raw);
    } catch {
      return { key, state: "unreadable", count: null };
    }
    if (Array.isArray(value)) return { key, state: "count", count: value.length };
    if (value && typeof value === "object") {
      return { key, state: "count", count: Object.values(value).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0) };
    }
    return { key, state: "not a list", count: null };
  });
  return { path: location.pathname, buttons, dialogs, lists };
}

/** § 7 item 2, from the Node side: the page read as text, and every console line and page error it logged. */
async function evidenceOf(page, where, consoleLines, errors) {
  try {
    return { where, ...(await page.evaluate(readEvidence, STORE_LISTS)), console: [...consoleLines], errors: [...errors] };
  } catch (err) {
    return { where, error: String(err?.message ?? err), console: [...consoleLines], errors: [...errors] };
  }
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
  const outcome = { width, need, menu: 0, menuNames: [], chosen: [], link: null, console: [], errors: [], checkout: null, evidence: null };
  const { browser, close } = await freshBrowser({ executablePath });
  try {
    const menuContext = await browser.createBrowserContext();
    const menuPage = await menuContext.newPage();
    const menuConsole = [];
    const menuErrors = [];
    menuPage.on("console", (m) => menuConsole.push(m.text()));
    menuPage.on("pageerror", (e) => menuErrors.push(String(e?.message ?? e)));
    await menuPage.setViewport(VIEWPORTS[width]);
    await menuPage.goto(`${origin}/order?mpid=${MPID}`, { waitUntil: "load", timeout: NAV_MS });
    const menu = await poll(menuPage, readMenu, need, (m) => m.chosen.length >= need, { timeoutMs: MENU_MS });
    // Too few meals to choose: the width fails here, so the menu page is the one to record.
    if (!(menu?.chosen?.length >= need)) outcome.evidence = await evidenceOf(menuPage, "the order page with no fragment (the menu read)", menuConsole, menuErrors);
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
      outcome.evidence = await evidenceOf(page, "the page the link ended on", outcome.console, outcome.errors);
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
