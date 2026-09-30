// R2-54 (SPEC-rung2-progress-and-checkout § 10 item 2, H7): the discounts, in their three placements (.checkout-discounts:
// the payment section's, its own section, the summary's), each with a gift-card and a discount-code field and their Apply
// buttons. A link WITH an offer code (`~<code>`) keeps them displayed, so the visitor can enter the offer (fill B still
// never types into /checkout); a link without one hides them. Both widths.
// Headless Chrome against the synthetic store on 127.0.0.1; skipped without Chrome.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { startStore } from "./browser-store.mjs";
import { browserFor, DONE, displayedCounts, openDeep, shipped, skip } from "./r2-browser.mjs";

const DISCOUNTS = [".checkout-discounts", ".checkout-discounts input", ".checkout-discounts button"];

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

async function discountsOn({ offer, width }) {
  store.set({});
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text, width, offer });
  try {
    assert.equal(await run.verdict(), DONE);
    await run.until(() => document.querySelector("app-checkout .summary__items .item"));
    const marks = await run.page.evaluate(() => [...document.documentElement.classList].filter((c) => c.startsWith("fitaf-")).sort());
    return { counts: await run.page.evaluate(displayedCounts, DISCOUNTS), marks };
  } finally {
    await run.close();
  }
}

for (const width of [1280, 390]) {
  test(`R2-54 (${width} px): a link with an offer code — the discounts displayed, all three placements`, { skip, timeout: 60_000 }, async () => {
    const { counts, marks } = await discountsOn({ offer: "BOSTON10", width });
    assert.deepEqual(marks, ["fitaf-code", "fitaf-deep"], "the coded link's second mark");
    assert.deepEqual(counts, {
      ".checkout-discounts": { found: 3, displayed: 3 },
      ".checkout-discounts input": { found: 6, displayed: 6 },
      ".checkout-discounts button": { found: 6, displayed: 6 },
    });
  });

  test(`R2-54 (${width} px): a link without a code — the discounts hidden, all three placements`, { skip, timeout: 60_000 }, async () => {
    const { counts, marks } = await discountsOn({ offer: null, width });
    assert.deepEqual(marks, ["fitaf-deep"]);
    assert.deepEqual(counts, {
      ".checkout-discounts": { found: 3, displayed: 0 },
      ".checkout-discounts input": { found: 6, displayed: 0 },
      ".checkout-discounts button": { found: 6, displayed: 0 },
    });
  });
}
