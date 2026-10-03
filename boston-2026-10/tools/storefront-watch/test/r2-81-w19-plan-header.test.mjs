// R2-81 and W19 (SPEC-rung2-progress-and-checkout § 21): the plan group's header (.summary__plan-group-header: the plan's
// name, its "Remove plan" button and the chevron) and its return link (a.summary__plan-return, "← Return to …").
//   R2-81 (Chrome, the synthetic store, the SHIPPED text): both hidden on the deep-carted checkout at both widths, with
//         § 19's lines (photograph and name), the order's Total and the pay button displayed (§ 25: the lines at step 1,
//         the pay button at step 3, the header and link hidden at both); both displayed on an
//         ordinary visit (the same checkout reached without the link's run: nothing of ours).
//   W19a  (the rule, on recorded outcomes) H16 and H17 are W19's: each hidden or absent passes; one found and still
//         displayed with the style fails the width, naming it.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { poll } from "../lib/browser.mjs";
import { VIEWPORTS } from "../lib/config.mjs";
import * as faces from "../lib/faces.mjs";
import { MEALS, startStore } from "./browser-store.mjs";
import { browserFor, displayedCounts, DONE, openDeep, shipped, skip, walkTo } from "./r2-browser.mjs";

const HEADER = [".summary__plan-group-header", ".summary__plan-return"];
const KEPT = [".summary__item", ".summary__item-image img", ".summary__item-name", ".summary__total"];

// ── W19a: the rule, on recorded outcomes ─────────────────────────────────────────────────────────────────────────────

const outcome = () => ({
  done: true,
  screenAtEnd: false,
  events: [{ e: "screen+" }, { e: "step", text: "Meal One · 1 of 7 meals" }, { e: "style+" }, { e: "mark" }, { e: "screen-" }],
  checkout: {
    path: "/checkout",
    style: true,
    mark: true,
    payment: { hidden: [], allowed: [], added: [], payWith: true, payWithout: true, payShown: [], counts: { with: 1, without: 1 } },
    hide: faces.HIDE.flatMap((h) => h.selectors.map((selector) => ({ id: h.id, selector, found: 1, displayed: 0 }))),
    total: { found: 1, displayed: 1 },
    oneTime: { activeSwitches: 0, renews: [] },
  },
});

test("W19a: H16 and H17 are W19's — hidden or absent passes; one still displayed fails the width, naming it", () => {
  assert.deepEqual(["H16", "H17"].map((id) => faces.HIDE.find((h) => h.id === id)?.selectors[0]), HEADER);
  assert.deepEqual(["H16", "H17"].map((id) => faces.HIDE.find((h) => h.id === id)?.check), ["W19", "W19"]);
  assert.deepEqual(faces.facesVerdict(outcome()).reasons, []);
  const absent = outcome();
  for (const h of absent.checkout.hide) if (h.id === "H16" || h.id === "H17") h.found = 0;
  assert.deepEqual(faces.facesVerdict(absent).reasons, [], "absent: reported, not a failure");
  const shown = outcome();
  shown.checkout.hide.find((h) => h.id === "H17").displayed = 1;
  assert.deepEqual(faces.facesVerdict(shown).reasons, ["W19: H17 .summary__plan-return found and still displayed with the style (1)"]);
});

// ── R2-81: in Chrome, on the synthetic store ─────────────────────────────────────────────────────────────────────────

let store;
let browser;
let site;
before(async () => {
  if (skip) return;
  store = await startStore();
  browser = await browserFor();
  site = await shipped();
});
after(async () => {
  await browser?.close();
  await store?.close();
});

test("R2-81: deep-carted, the plan's header and return link hidden; the lines, the Total and the pay button displayed (both widths)", { skip, timeout: 90_000 }, async () => {
  for (const width of [1280, 390]) {
    store.set({ storeLines: true });
    const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text, width });
    try {
      assert.equal(await run.verdict(), DONE, "fill B reached /checkout");
      await run.until(() => document.querySelector("app-checkout .summary__item") && document.getElementById("fitaf-deep"));
      const pay = width === 1280 ? ".checkout__submit button" : ".summary__pay-button button";
      // § 25.2: the lines are step 1's, the pay button step 3's; the Total is in both.
      for (const [step, kept] of [[1, KEPT], [3, [".summary__total", pay]]]) {
        await walkTo(run, step);
        const counts = await run.page.evaluate(displayedCounts, [...HEADER, ...kept]);
        for (const sel of HEADER) assert.deepEqual(counts[sel], { found: 1, displayed: 0 }, `${width}, step ${step}: ${sel} found and hidden`);
        for (const sel of kept) assert.ok(counts[sel].found > 0 && counts[sel].displayed === counts[sel].found, `${width}, step ${step}: ${sel} displayed`);
      }
    } finally {
      await run.close();
    }
  }
});

test("R2-81b: an ordinary visit (no link of ours) — the plan's header and return link displayed", { skip, timeout: 60_000 }, async () => {
  store.set({ storeLines: true, checkoutNames: MEALS.slice(0, 7) });
  const context = await browser.browser.createBrowserContext();
  try {
    const page = await context.newPage();
    await page.setViewport(VIEWPORTS[390]);
    await page.goto(`${store.origin}/checkout`, { waitUntil: "load" });
    await poll(page, () => document.querySelectorAll("app-checkout .summary__item").length, null, (n) => n > 0, { timeoutMs: 15_000 });
    const counts = await page.evaluate(displayedCounts, HEADER);
    for (const sel of HEADER) assert.deepEqual(counts[sel], { found: 1, displayed: 1 }, `${sel} displayed`);
    assert.equal(await page.evaluate(() => document.getElementById("fitaf-deep")), null, "no style of ours");
  } finally {
    await context.close();
  }
});
