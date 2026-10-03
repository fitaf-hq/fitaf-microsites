// Shared by this package's r2-*.test.mjs files: rung 2's two faces (SPEC-rung2-progress-and-checkout.md § 5), the cases
// that need a real browser: `:has()`, what is displayed, motion, the screen's 90 s clock, and real images loading.
// They live here, not in the site's suite, because this package is the one that drives Chrome (puppeteer-core, which
// the site's install never gets: tools/README.md). Not a test file itself.
//
// Each case runs the SHIPPED text (the site's own build, the fill-B console file) as a person pastes it, on the
// synthetic store (browser-store.mjs, on 127.0.0.1; never the live store), with the link the site's own payload code
// writes, then reads the page. The readers below are this file's own, written from the contract (§ 3 item 4's list of
// controls); the watch's live check (lib/faces.mjs, W10–W13) is a separate implementation, tested separately.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromePath, freshBrowser, poll, sleep } from "../lib/browser.mjs";
import { VIEWPORTS } from "../lib/config.mjs";
import { siteCode } from "../lib/site-code.mjs";
import { MEALS } from "./browser-store.mjs";

export const chrome = (() => {
  try {
    return chromePath();
  } catch {
    return null;
  }
})();
export const skip = chrome ? false : "no Chrome found (set CHROME_PATH)";
export const SCREEN = "#fitaf-screen";
export const STYLE = "style#fitaf-deep";
export const DONE = "[fitaf-handoff] done: /checkout";
const VERDICT = /^\[fitaf-handoff\] (done|stopped):/;

/** The site's own code, and the fill-B console file its build writes. */
export async function shipped() {
  const code = await siteCode();
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-r2-"));
  try {
    await code.buildStorefront({ outDir: dir });
    return { code, text: await readFile(join(dir, "fitaf-handoff.fill-B.console.js"), "utf8") };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** A mutant of `text`: `from` replaced by `to`, exactly once, or the mutant is refused (it would test nothing). */
export function mutate(text, from, to) {
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`mutant: expected ${JSON.stringify(from)} once in the text, found it ${n} times`);
  return text.replace(from, to);
}

/**
 * The link the site's own payload code writes for `meals` (one each) on mpid 21, on the synthetic store; with
 * `offer`, the offer code it carries (`~<code>`, SPEC-rung2 § 11).
 */
export function linkFor(code, origin, meals = MEALS.slice(0, 7), offer = null) {
  const args = ["--mpid", "21", ...meals.flatMap((name) => ["--item", `${name}:1`]), ...(offer ? ["--code", offer] : [])];
  const link = new URL(code.handoffLink(code.plans, code.payloadFromArgs(args, code.counts)));
  return new URL(link.pathname + link.search + link.hash, origin).href;
}

/** One browser for a file's cases; each case opens its own context (a fresh profile's worth: no shared storage). */
export async function browserFor() {
  return freshBrowser({ executablePath: chrome });
}

/**
 * Open the link in a new context of `browser`, at `width`, with `text` pasted once the cards are on the page (as the
 * smoke pastes) and `ready()` (a page function, if given) is true. `reducedMotion` emulates prefers-reduced-motion:
 * reduce. Returns the page, its console, and waits.
 */
export async function openDeep(browser, { origin, code, text, width = 1280, reducedMotion = false, meals, ready = null, offer = null }) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport(VIEWPORTS[width]);
  if (reducedMotion) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  const lines = [];
  page.on("console", (m) => lines.push(m.text()));
  await page.goto(linkFor(code, origin, meals, offer), { waitUntil: "load" });
  await poll(page, () => document.querySelectorAll("app-product-card").length, null, (n) => n > 0, { timeoutMs: 15_000 });
  if (ready) await poll(page, ready, null, (v) => Boolean(v), { timeoutMs: 15_000, everyMs: 100 });
  await page.evaluate(text);
  return {
    page,
    lines,
    close: () => context.close(),
    /** Wait for fill B's verdict line (done or stopped); the line, or null after `ms`. */
    async verdict(ms = 15_000) {
      const until = Date.now() + ms;
      while (Date.now() < until) {
        const line = lines.find((l) => VERDICT.test(l));
        if (line) return line;
        await sleep(100);
      }
      return null;
    },
    /** Wait until `fn(arg)` in the page is truthy; its value, or the last one after `ms`. */
    until: (fn, arg, ms = 15_000) => poll(page, fn, arg, (v) => Boolean(v), { timeoutMs: ms, everyMs: 100 }),
  };
}

/**
 * In the page: SPEC-rung2-progress-and-checkout § 3 item 4's measure. The displayed controls inside app-checkout
 * (input, select, textarea, button, iframe, a[href], [role=switch], [role=radio]) with style#fitaf-deep enabled, then
 * disabled (and enabled again): each described, and the two sets compared by element. The pay button (§ 9) is the
 * displayed one of `.checkout__submit button` and the summary's mobile bar's `.summary__pay-button`: the store shows
 * the first above 1024 px and the second at 1024 px and narrower. Reads; presses nothing.
 */
export function paymentMeasure() {
  const LIST = "input, select, textarea, button, iframe, a[href], [role=switch], [role=radio]";
  const style = document.getElementById("fitaf-deep");
  const checkout = document.querySelector("app-checkout");
  if (!checkout || !style) return { checkout: Boolean(checkout), style: Boolean(style) };
  const describe = (el) => {
    const cls = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean)[0];
    const name = el.getAttribute("name");
    const label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""}${name ? `[name=${name}]` : ""}${label ? ` "${label}"` : ""}`;
  };
  const displayed = () => [...checkout.querySelectorAll(LIST)].filter((el) => el.getClientRects().length > 0);
  const withStyle = displayed();
  style.disabled = true;
  const without = displayed();
  style.disabled = false;
  const again = displayed();
  const isPay = (el) => el.tagName === "BUTTON" && el.closest(".checkout__submit, .summary__pay-button");
  const pay = (set) => set.some(isPay);
  return {
    checkout: true,
    style: true,
    hidden: without.filter((el) => !withStyle.includes(el)).map(describe).sort(),
    added: withStyle.filter((el) => !without.includes(el)).map(describe).sort(),
    restored: again.length === withStyle.length && again.every((el, i) => el === withStyle[i]),
    counts: { with: withStyle.length, without: without.length },
    payWith: pay(withStyle),
    payWithout: pay(without),
    payShown: withStyle.filter(isPay).map(describe),
  };
}

/**
 * In the page, § 25 (the three-step checkout): § 3 item 4's measure ACROSS the steps. Each call adds the controls
 * displayed now, with style#fitaf-deep, to a set kept on the page (`reset` starts it again), and returns those the
 * store displays without our style that no step has displayed so far, described. After the three steps, that is
 * exactly what the style hides from the visitor altogether. Compared by element; reads and toggles our style only.
 */
export function unionMeasure({ reset = false } = {}) {
  const LIST = "input, select, textarea, button, iframe, a[href], [role=switch], [role=radio]";
  const style = document.getElementById("fitaf-deep");
  const checkout = document.querySelector("app-checkout");
  if (!checkout || !style) return null;
  const describe = (el) => {
    const cls = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean)[0];
    const name = el.getAttribute("name");
    const label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""}${name ? `[name=${name}]` : ""}${label ? ` "${label}"` : ""}`;
  };
  const displayed = () => [...checkout.querySelectorAll(LIST)].filter((el) => el.getClientRects().length > 0);
  if (reset || !window.__fitafUnion) window.__fitafUnion = new Set();
  for (const el of displayed()) window.__fitafUnion.add(el);
  style.disabled = true;
  const without = displayed();
  style.disabled = false;
  return { never: without.filter((el) => !window.__fitafUnion.has(el)).map(describe).sort(), seen: window.__fitafUnion.size };
}

/** In the page: is each selector's first element displayed (null: none on the page)? */
export function displayedMap(selectors) {
  const out = {};
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    out[sel] = el ? el.getClientRects().length > 0 : null;
  }
  return out;
}

/** In the page: for each selector, how many elements match and how many of them are displayed. */
export function displayedCounts(selectors) {
  const out = {};
  for (const sel of selectors) {
    const all = [...document.querySelectorAll(sel)];
    out[sel] = { found: all.length, displayed: all.filter((el) => el.getClientRects().length > 0).length };
  }
  return out;
}

// ── SPEC-rung2-progress-and-checkout § 25: the three-step checkout ─────────────────────────────────────────────────────
// The block's own elements: the step bar, the foot (Back, and Continue where no phone bar is displayed), Continue, Back.
export const STEP_IDS = { bar: "fitaf-bar", nav: "fitaf-nav", go: "fitaf-go", back: "fitaf-back" };
/** § 25.2's step 2: the store's own sections (the live markup as browser-store.mjs carries it). */
export const STEP2 = ["section.contact", "section.delivery", "section.schedule"];
/** What a customer types into step 2 of the synthetic form (its required controls): valid entries, invented. */
export const ENTRIES = [["email", "visitor@example.com"], ["phone", "6175550100"], ["firstName", "Test"], ["lastName", "Visitor"], ["address", "1 Main St"]];

/**
 * In the page: the step the block shows (the class html.fitaf-step-N), its bar's text and current step, its Continue
 * (words, displayed, and whether it stands right after the store's .summary__pay-button) and Back, and the focused
 * element described. Reads only.
 */
export function stepRead(ids) {
  const html = document.documentElement;
  const shown = (el) => Boolean(el && el.getClientRects().length > 0);
  const clean = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
  const bar = document.getElementById(ids.bar);
  const go = document.getElementById(ids.go);
  const back = document.getElementById(ids.back);
  const a = document.activeElement;
  return {
    classes: [1, 2, 3].filter((n) => html.classList.contains(`fitaf-step-${n}`)),
    bar: clean(bar),
    barShown: shown(bar),
    current: clean(bar?.querySelector('[aria-current="step"]')),
    nav: Boolean(document.getElementById(ids.nav)),
    go: go ? { text: clean(go), shown: shown(go), inBar: Boolean(go.previousElementSibling?.matches(".summary__pay-button")) } : null,
    back: back ? { text: clean(back), shown: shown(back) } : null,
    focused: a && a !== document.body ? { name: a.getAttribute("name"), invalid: a.classList.contains("ng-invalid") } : null,
  };
}

/** Wait until the block shows `step` (its class on <html>); the reading, or throws after `ms`. */
export async function untilStep(run, step, ms = 5_000) {
  const r = await poll(run.page, stepRead, STEP_IDS, (v) => v.classes.length === 1 && v.classes[0] === step, { timeoutMs: ms, everyMs: 50 });
  if (!(r.classes.length === 1 && r.classes[0] === step)) throw new Error(`step ${step} not reached: ${JSON.stringify(r)}`);
  return r;
}

/** A person's press of one of the block's buttons (a trusted click at its place on the screen). */
export const press = (run, which) => run.page.click(`#${STEP_IDS[which]}`);

/** A person typing step 2's entries, each into its own field (displayed: step 2 is shown); a field holding one is left. */
export async function fillStep2(run, entries = ENTRIES) {
  for (const [name, value] of entries) {
    const sel = `app-checkout [name=${name}]`;
    if (!(await run.page.$eval(sel, (el) => el.value))) await run.page.type(sel, value);
  }
}

/** Forward from the step the block shows, as a person: Continue, with step 2's entries made before leaving step 2. */
export async function walkTo(run, step) {
  let now = (await poll(run.page, stepRead, STEP_IDS, (v) => v.classes.length === 1, { timeoutMs: 5_000, everyMs: 50 })).classes[0];
  if (!(now <= step)) throw new Error(`walkTo goes forward only: at step ${now}, asked for ${step}`);
  while (now < step) {
    if (now === 2) await fillStep2(run);
    await press(run, "go");
    await untilStep(run, ++now);
  }
}

/** In the page: the step-related parts of the checkout, each with how many are found and displayed. */
export const SECTIONS = [".summary__item", ...STEP2, "section.payment", ".checkout__consent", "textarea[name=specialRequests]", "section.checkout__section.tip"];

/** In the page: the screen's slides, the one shown, its title and step line; null when it is not on the page. */
export function screenRead() {
  const s = document.getElementById("fitaf-screen");
  if (!s) return null;
  const slides = [...(s.querySelector(".c")?.children ?? [])];
  const clean = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
  return {
    step: clean(s.querySelector('[role="status"]')),
    shown: slides.findIndex((el) => el.classList.contains("on")),
    slides: slides.map((el) => ({ name: clean(el.querySelector("b")), img: el.querySelector("img")?.getAttribute("src") ?? null })),
  };
}
