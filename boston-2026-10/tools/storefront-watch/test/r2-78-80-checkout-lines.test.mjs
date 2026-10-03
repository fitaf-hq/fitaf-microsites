// R2-78 – R2-80 (SPEC-rung2-progress-and-checkout § 19), in headless Chrome on the synthetic store with the store's own
// order-line markup (browser-store.mjs `storeLines`: .summary__item, its image, name, add-on pills, quantity stepper with
// its "Remove item" button, and price; the plan's total row .summary__plan-total), after a deep-carted run of the
// SHIPPED text; skipped without Chrome.
//   R2-78 each line's price, portion (its add-on pills), quantity and remove HIDDEN, its photograph and name DISPLAYED,
//         at both widths; and only on a deep-carted checkout: the same checkout reached without the link's run shows
//         them all (nothing of ours on an ordinary visit).
//   R2-79 the plan's total row hidden; the order's Total (.summary__total) and the pay button displayed. § 25 (the three-step
//         checkout): the pay button at step 3, where § 25.2 displays it (and only there: R2-86), the row and the Total
//         at step 1 and at step 3.
//   R2-80 ⭐ fourteen lines (a 14-meal plan's: `checkoutNames`) fit one 390 x 844 screen: from the first line's top to the
//         last line's bottom at most 844 px; the control, the same lines without our style, do not.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { poll } from "../lib/browser.mjs";
import { VIEWPORTS } from "../lib/config.mjs";
import { MEALS, startStore } from "./browser-store.mjs";
import { browserFor, displayedCounts, DONE, openDeep, shipped, skip, walkTo } from "./r2-browser.mjs";

const HIDDEN = [".summary__item-price", ".summary__item-addons", ".summary__item-quantity-controls", ".summary__item-remove"];
const SHOWN = [".summary__item", ".summary__item-image img", ".summary__item-name"];
const PHONE_HEIGHT = 844;
const FOURTEEN = Array.from({ length: 14 }, (_, i) => `${MEALS[i % MEALS.length]}${i >= MEALS.length ? ` with Roasted Sweet Potato Wedges ${i}` : ""}`);

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

/** A deep-carted run on the synthetic store with the store's line markup; `fn(run)` reads it. */
async function deep(width, cfg, fn) {
  store.set({ storeLines: true, ...cfg });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text, width });
  try {
    assert.equal(await run.verdict(), DONE, "fill B reached /checkout");
    await run.until(() => document.querySelector("app-checkout .summary__item") && document.getElementById("fitaf-deep"));
    return await fn(run);
  } finally {
    await run.close();
  }
}

/** In the page: the order lines' extent, first top to last bottom, and their count. */
function linesExtent() {
  const lines = [...document.querySelectorAll("app-checkout .summary__item")].filter((el) => el.getClientRects().length > 0);
  if (!lines.length) return { count: 0, height: 0 };
  const top = lines[0].getBoundingClientRect().top;
  const bottom = lines[lines.length - 1].getBoundingClientRect().bottom;
  return { count: lines.length, height: Math.round(bottom - top) };
}

test("R2-78: each line's price, portion, quantity and remove hidden, its photograph and name displayed (both widths)", { skip, timeout: 90_000 }, async () => {
  for (const width of [1280, 390]) {
    await deep(width, {}, async (run) => {
      const counts = await run.page.evaluate(displayedCounts, [...HIDDEN, ...SHOWN]);
      for (const sel of HIDDEN) assert.deepEqual([counts[sel].found > 0, counts[sel].displayed], [true, 0], `${width}: ${sel} found and hidden`);
      for (const sel of SHOWN) assert.equal(counts[sel].displayed, counts[sel].found, `${width}: ${sel} displayed (${counts[sel].found})`);
      assert.equal(counts[".summary__item"].found, 7, `${width}: fixture control: the seven lines`);
      const bare = await run.page.evaluate((sels) => {
        document.getElementById("fitaf-deep").disabled = true;
        const out = sels.map((s) => [...document.querySelectorAll(s)].every((el) => el.getClientRects().length > 0));
        document.getElementById("fitaf-deep").disabled = false;
        return out;
      }, HIDDEN);
      assert.deepEqual(bare, HIDDEN.map(() => true), `${width}: fixture control: each displayed without our style`);
    });
  }
});

test("R2-78b: the same checkout without a deep-carted run (no link of ours) — every line element displayed", { skip, timeout: 60_000 }, async () => {
  store.set({ storeLines: true, checkoutNames: MEALS.slice(0, 7) });
  const context = await browser.browser.createBrowserContext();
  try {
    const page = await context.newPage();
    await page.setViewport(VIEWPORTS[390]);
    await page.goto(`${store.origin}/checkout`, { waitUntil: "load" });
    await poll(page, () => document.querySelectorAll("app-checkout .summary__item").length, null, (n) => n > 0, { timeoutMs: 15_000 });
    const counts = await page.evaluate(displayedCounts, [...HIDDEN, ...SHOWN, ".summary__plan-total"]);
    for (const [sel, c] of Object.entries(counts)) assert.ok(c.found > 0 && c.displayed === c.found, `${sel}: ${JSON.stringify(c)}`);
    assert.equal(await page.evaluate(() => document.getElementById("fitaf-deep")), null, "no style of ours");
  } finally {
    await context.close();
  }
});

test("R2-79: the plan's total row hidden; the order's Total and the pay button displayed (both widths)", { skip, timeout: 90_000 }, async () => {
  for (const width of [1280, 390]) {
    await deep(width, {}, async (run) => {
      for (const step of [1, 3]) {
        await walkTo(run, step);
        const counts = await run.page.evaluate(displayedCounts, [".summary__plan-total", ".summary__total", ".checkout__submit button", ".summary__pay-button button"]);
        assert.deepEqual([counts[".summary__plan-total"].found, counts[".summary__plan-total"].displayed], [1, 0], `${width}, step ${step}: the plan total hidden`);
        assert.deepEqual(counts[".summary__total"], { found: 1, displayed: 1 }, `${width}, step ${step}: the order's Total displayed`);
        const pay = width === 1280 ? ".checkout__submit button" : ".summary__pay-button button";
        if (step === 3) assert.equal(counts[pay].displayed, 1, `${width}, step 3: the pay button displayed`);
      }
    });
  }
});

test("R2-80: fourteen lines fit one 390 x 844 screen (first top to last bottom); without our style they do not", { skip, timeout: 60_000 }, async () => {
  await deep(390, { checkoutNames: FOURTEEN }, async (run) => {
    const ours = await run.page.evaluate(linesExtent);
    const bare = await run.page.evaluate((fn) => {
      document.getElementById("fitaf-deep").disabled = true;
      const out = new Function(`return (${fn})()`)();
      document.getElementById("fitaf-deep").disabled = false;
      return out;
    }, linesExtent.toString());
    assert.equal(ours.count, 14, "the fourteen lines displayed");
    assert.ok(bare.height > PHONE_HEIGHT, `fixture control: without our style they take ${bare.height} px`);
    assert.ok(ours.height <= PHONE_HEIGHT, `fourteen lines in ${ours.height} px, at most ${PHONE_HEIGHT}`);
  });
});
