// R2-55 (SPEC-rung2-progress-and-checkout § 10 item 4, H9): the summary with a discount row. Subtotal, Shipping and Tax
// (.summary__row) hidden; the discount row (.summary__row--discount) and the Total (.summary__total) displayed. ⭐ The
// Total is never hidden: on a phone the pay button reads PAY NOW with no amount, so the Total is the only place the
// visitor sees what they will pay. ⭐ Mutant (in the suite): a rule that also hides .summary__total; R2-55 fails.
// Headless Chrome against the synthetic store on 127.0.0.1; skipped without Chrome.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { startStore } from "./browser-store.mjs";
import { browserFor, DONE, mutate, openDeep, shipped, skip } from "./r2-browser.mjs";

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

/** In the page: each summary row's label and whether it is displayed, and the Total's. */
function rows() {
  const shown = (el) => el.getClientRects().length > 0;
  return {
    rows: [...document.querySelectorAll(".summary__row")].map((r) => [r.firstElementChild.textContent.trim(), shown(r)]),
    total: [...document.querySelectorAll(".summary__total")].map(shown),
  };
}

/** R2-55's check over `text`: throws (an AssertionError) unless exactly the breakdown is hidden. */
async function rowsCase(text, width = 1280) {
  store.set({ discountRow: true });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text, width });
  try {
    assert.equal(await run.verdict(), DONE);
    await run.until(() => document.querySelector("app-checkout .summary__items .item"));
    assert.deepEqual(await run.page.evaluate(rows), {
      rows: [["Subtotal", false], ["Shipping", false], ["Tax", false], ["Discount (OFFER)", true]],
      total: [true],
    });
  } finally {
    await run.close();
  }
}

test("R2-55: Subtotal, Shipping and Tax hidden; the discount row and the Total displayed (both widths)", { skip, timeout: 60_000 }, async () => {
  for (const width of [1280, 390]) await rowsCase(site.text, width);
});

test("R2-55 (mutant): a rule that also hides .summary__total — R2-55 fails", { skip, timeout: 60_000 }, async () => {
  const mutant = mutate(site.text, "a.contact__sign-in,", "a.contact__sign-in,.summary__total,");
  await assert.rejects(rowsCase(mutant), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});
