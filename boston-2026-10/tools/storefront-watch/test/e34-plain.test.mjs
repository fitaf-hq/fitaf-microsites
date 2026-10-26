// E1–E3 (SPEC-rung2-progress-and-checkout § 34): the EMERGENCY block, deep carting only. The site's own build with
// `plain: true` (the Footer block the Advisor pastes only if checkout breaks), run as a person pastes it on the stand-in
// store (browser-store.mjs, on 127.0.0.1; never the live store), beside the live block (the default build) on the same
// links.
//   E1  for every link shape the live block's cases here use (seven meals at 1280 and at 390, a link with counts, an
//       offer code, a photo part, the store's extras dialog with and without its key honoured), the emergency block fills
//       the SAME cart as the live block: the store's pending list, in the same order, and the same route.
//   E2  nothing drawn, hidden, styled or typed: no element of ours added (no style, no #fitaf-*: the screen is #fitaf-screen), no class on
//       <html>, the store's shell and discounts displayed after done, nothing typed into or pressed in a discount field.
//       Control: the live block, on the same link, fails the same check (the recorder sees what it does).
//   E3  the store's next step reached as today: done: /checkout, the checkout on the page, no stop, nothing paid.
// Mutants (each with its control, the emergency block passing the same case): a style left in (E2 fails); `zero` typed
// (the live block's zero() in the emergency block: E2 fails).
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { poll, sleep } from "../lib/browser.mjs";
import { VIEWPORTS } from "../lib/config.mjs";
import { MEALS, startStore } from "./browser-store.mjs";
import { browserFor, DONE, mutate, shipped, skip } from "./r2-browser.mjs";

const VERDICT = /^\[fitaf-handoff\] (done|stopped):/;
/** The emergency block's zero(): a stub that types nothing and goes on at once (the build's § 34 cut). */
const ZERO_STUB = 'function zero(then) { then("off"); }';
/** The emergency block's mark(): a stub that sets nothing (the build's § 34 cut). */
const MARK_STUB = "function mark() {}";

let store;
let browser;
let site;
let plain;
before(async () => {
  if (skip) return;
  store = await startStore();
  browser = await browserFor();
  site = await shipped();
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-e34-"));
  try {
    await site.code.buildStorefront({ outDir: dir, plain: true });
    plain = await readFile(join(dir, "fitaf-handoff.fill-B.console.js"), "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
after(async () => {
  await browser?.close();
  await store?.close();
});

/** The link the site's own payload code writes for `items` ("<name>:<n>") on mpid 21, on the stand-in. */
function link(items, { offer = null, photoPart = "" } = {}) {
  const args = ["--mpid", "21", ...items.flatMap((it) => ["--item", it]), ...(offer ? ["--code", offer] : [])];
  const url = new URL(site.code.handoffLink(site.code.plans, site.code.payloadFromArgs(args, site.code.counts)));
  return new URL(url.pathname + url.search + url.hash, store.origin).href + photoPart;
}

const SEVEN = MEALS.slice(0, 7).map((name) => `${name}:1`);
/**
 * The link shapes the live block's cases here use. The photo part names host code 9, which is no host of the list:
 * the live block requests nothing for it (§ 17.1: any fault is no photograph, never a stop), so nothing leaves 127.0.0.1.
 */
const SHAPES = [
  { name: "seven meals, one each, at 1280", items: SEVEN },
  { name: "seven meals, one each, at 390", items: SEVEN, width: 390 },
  { name: "three meals with counts (3, 2, 2)", items: [`${MEALS[0]}:3`, `${MEALS[1]}:2`, `${MEALS[3]}:2`] },
  { name: "an offer code (~SAVE10)", items: SEVEN, offer: "SAVE10" },
  { name: "a photo part", items: SEVEN, photoPart: "!9/s.svg!8c!0,0,a,a" },
  { name: "the store's extras dialog (its key ignored)", items: SEVEN, cfg: { extrasDialog: true } },
  { name: "the store's extras dialog (its key honoured)", items: SEVEN, cfg: { extrasDialog: true, honoursKey: true } },
];

/**
 * In every document, before its own scripts: what anything other than the store's own first render does to the page —
 * elements added that are a style, a link, carry an id `fitaf…` (the store's own extras dialog is a popover, so a popover is not ours by itself); a class `fitaf…` on <html>; and every input,
 * change and click inside a .checkout-discounts.
 */
function recorder() {
  window.__e = { added: [], html: [], typed: [] };
  const watch = () => {
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "attributes" && r.target === document.documentElement && /fitaf/.test(document.documentElement.className)) {
          window.__e.html.push(document.documentElement.className);
        }
        for (const n of r.addedNodes ?? []) {
          if (!(n instanceof Element)) continue;
          const all = [n, ...n.querySelectorAll("*")];
          for (const e of all) {
            if (e.localName === "style" || e.localName === "link" || /^fitaf/.test(e.id)) {
              window.__e.added.push(`${e.localName}${e.id ? `#${e.id}` : ""}`);
            }
          }
        }
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style"] });
  };
  if (document.documentElement) watch();
  else document.addEventListener("readystatechange", watch, { once: true });
  for (const type of ["input", "change", "click"]) {
    document.addEventListener(type, (e) => {
      const t = e.target;
      if (t instanceof Element && t.closest(".checkout-discounts")) window.__e.typed.push(`${type} ${t.getAttribute("name") || t.localName}`);
    }, true);
  }
}

/** One hand-off: `text` pasted once the cards are on the page, as a person pastes it. The cart and what the page shows. */
async function handoff(text, shape) {
  store.set(shape.cfg ?? {});
  const context = await browser.browser.createBrowserContext();
  const page = await context.newPage();
  try {
    await page.setViewport(VIEWPORTS[shape.width ?? 1280]);
    const lines = [];
    page.on("console", (m) => lines.push(m.text()));
    await page.evaluateOnNewDocument(recorder);
    await page.goto(link(shape.items, shape), { waitUntil: "load" });
    await poll(page, () => document.querySelectorAll("app-product-card").length, null, (n) => n > 0, { timeoutMs: 15_000 });
    await page.evaluate(text);
    const until = Date.now() + 30_000;
    while (Date.now() < until && !lines.some((l) => VERDICT.test(l))) await sleep(100);
    await sleep(500);
    const read = await page.evaluate(() => {
      const shown = (q) => [...document.querySelectorAll(q)].map((e) => e.getClientRects().length > 0);
      return {
        path: location.pathname,
        pending: localStorage.getItem("hmp_pending_plan_items"),
        checkout: Boolean(document.querySelector("app-checkout")),
        recorded: window.__e,
        shell: shown(".sticky-header, .footer, .checkout-discounts, .summary__row"),
        discountValues: [...document.querySelectorAll(".checkout-discounts input")].map((i) => i.value),
      };
    });
    return { lines, verdict: lines.find((l) => VERDICT.test(l)) ?? null, ours: lines.filter((l) => l.startsWith("[fitaf-handoff]")), ...read };
  } finally {
    await context.close();
  }
}

/** E2 over one run: nothing drawn, hidden, styled or typed. */
function assertNothingVisual(r) {
  assert.deepEqual(r.recorded.added, [], "no element of ours added: no style, no #fitaf-*");
  assert.deepEqual(r.recorded.html, [], "no class of ours on <html>");
  assert.deepEqual(r.recorded.typed, [], "nothing typed into or pressed in a discount field");
  assert.ok(r.discountValues.every((v) => v === ""), `every discount field empty: ${JSON.stringify(r.discountValues)}`);
  assert.ok(r.shell.length > 0 && r.shell.every(Boolean), `the store's shell, discounts and price rows all displayed: ${JSON.stringify(r.shell)}`);
}

/** E3 over one run: the store's next step reached as today. */
function assertNextStep(r) {
  assert.equal(r.verdict, DONE, JSON.stringify(r.ours));
  assert.equal(r.path, "/checkout");
  assert.ok(r.checkout, "the store's checkout component on the page");
  assert.ok(!r.lines.some((l) => l.includes("stopped:")), "no stop");
  assert.ok(!r.lines.some((l) => l.includes("ORDER PLACED")), "nothing paid");
}

for (const shape of SHAPES) {
  test(`E1/E3: ${shape.name} — the emergency block fills the same cart as the live block and reaches the checkout`, { skip, timeout: 90_000 }, async () => {
    const live = await handoff(site.text, shape);
    assertNextStep(live);
    assert.ok(live.pending && JSON.parse(live.pending)["21"].length > 0, "control: the live block filled the plan");
    const emergency = await handoff(plain, shape);
    assertNextStep(emergency);
    assert.equal(emergency.pending, live.pending, "the same pending list, in the same order");
  });
}

for (const shape of [SHAPES[0], SHAPES[1], SHAPES[5]]) {
  test(`E2: ${shape.name} — nothing drawn, hidden, styled or typed; the live block (control) fails the same check`, { skip, timeout: 90_000 }, async () => {
    const emergency = await handoff(plain, shape);
    assertNextStep(emergency);
    assertNothingVisual(emergency);
    const live = await handoff(site.text, shape);
    assert.throws(() => assertNothingVisual(live), assert.AssertionError, "control: the recorder sees the live block's screen, style and zero");
  });
}

test("E2 (mutant): a style left in — E2 fails", { skip, timeout: 90_000 }, async () => {
  const mutant = mutate(plain, MARK_STUB, 'function mark() { w.document.head.appendChild(w.document.createElement("style")).textContent = "html{}"; }');
  const r = await handoff(mutant, SHAPES[0]);
  assertNextStep(r);
  assert.throws(() => assertNothingVisual(r), assert.AssertionError);
});

test("E2 (mutant): `zero` typed (the live block's zero() in the emergency block) — E2 fails", { skip, timeout: 90_000 }, async () => {
  const from = site.text.indexOf('var ZERO = "zero"');
  assert.ok(from >= 0, "control: the live block carries zero()");
  const liveZero = site.text.slice(from, site.text.indexOf("\n}\n", from) + 2);
  const mutant = mutate(plain, ZERO_STUB, liveZero);
  const r = await handoff(mutant, SHAPES[0]);
  assertNextStep(r);
  assert.ok(r.lines.includes("[fixture] discount pressed: zero"), `fixture control: the mutant typed and pressed zero: ${JSON.stringify(r.lines)}`);
  assert.throws(() => assertNothingVisual(r), assert.AssertionError);
});
