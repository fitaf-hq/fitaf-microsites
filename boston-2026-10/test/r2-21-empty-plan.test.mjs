// R2-21 (SPEC-rung2 § 10): an EMPTY plan, at both widths, gets the normal fill (R2-15's case). What "empty" looks like,
// per § 10's build note: below 1025 px the store HIDES its cart bar (its control still rendered inside it); at 1025 px
// and wider its sidebar shows "Your cart is empty" and no control. So the store displays no checkout-slot control,
// while one IS rendered in an element that is not displayed, and the meal cards carry displayed "Checkout" look-alikes:
// neither may read as a plan that holds meals.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ADD,
  assertCheckedOut,
  CHECKOUT_PAYLOAD,
  fakeWindow,
  fragmentFor,
  HELD_LINE,
  MEALS,
  orderPage,
  PAGE,
  run,
  script,
  untouchableStorage,
} from "./r2-harness.mjs";

for (const width of ["bar", "sidebar"]) {
  test(`R2-21 ${width}: an empty plan — the store shows no checkout control; the seven meals, then its checkout once`, async () => {
    const page = await orderPage({ width });
    const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page, storage: untouchableStorage() });
    // Fixture controls: what "empty" looks like at this width.
    assert.deepEqual(page.displayed(), [], "no checkout-slot control displayed");
    assert.ok(page.summary().includes("Add 7 more meals (disabled)"), "one rendered, in an element not displayed");
    if (width === "sidebar") assert.equal(page.shownText(), "Your cart is empty Add some delicious meals to get started!");
    const lookalikes = [...page.document.querySelectorAll("button")].filter(
      (b) => /checkout/i.test(b.textContent) && b.getClientRects().length && b.closest("app-product-card, app-product-card-mobile"),
    );
    assert.equal(lookalikes.length, 2, "displayed 'Checkout' look-alikes inside meal cards");
    run(await script("B"), h.window);
    h.timers.drain();
    assert.deepEqual(page.all, [
      [MEALS[0], ADD],
      [MEALS[1], ADD],
      [MEALS[2], ADD],
      [MEALS[1], ADD],
      [MEALS[2], ADD],
      [MEALS[2], ADD],
      [MEALS[2], ADD],
      [PAGE, "checkout:shown"],
    ]);
    assertCheckedOut(h, page, "/order?mpid=21");
    assert.equal(page.store.pending.length, 7);
    assert.ok(!h.info.includes(HELD_LINE));
  });
}
