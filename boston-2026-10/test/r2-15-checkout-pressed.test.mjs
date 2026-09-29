// R2-15 (SPEC-rung2 § 8): fill B ends by pressing the store's own CHECKOUT, never by loading /checkout. On a meal-plan
// page the store's Add to Cart fills the plan's PENDING list; only its own checkout control commits that list and
// routes to /checkout inside the app, so a /checkout B loaded itself showed "Your cart is empty".
// On the synthetic page CHECKOUT is enabled only once the plan's count is met ("Add N more meals", disabled, before):
// B presses it exactly once, after the last meal, the fragment already removed; the store routes; B logs done.
// No location.assign / replace / href, no storage touched. The main case is checkoutCase() in r2-harness.mjs, which
// R2-18 also runs against its mutants.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ADD,
  checkoutCase,
  CHECKOUT_PAYLOAD,
  fakeWindow,
  fragmentFor,
  MEALS,
  orderPage,
  PAGE,
  run,
  script,
  untouchableStorage,
} from "./r2-harness.mjs";

test("R2-15a: the seven meals, then the displayed CHECKOUT once; the store routes; location.assign never called", async () => {
  await checkoutCase(await script("B"));
});

test("R2-15b: CHECKOUT is disabled until the last meal, and enabled late — B waits for it and presses once", async () => {
  const page = await orderPage({ late: 4 });
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page, storage: untouchableStorage() });
  run(await script("B"), h.window);
  assert.deepEqual(page.summary(), ["Add 7 more meals (disabled)", "Add 7 more meals (disabled)"], "fixture control");
  while (page.log.length < 7) assert.ok(h.timers.step(), "still pressing meals");
  assert.deepEqual(page.summary(), ["Add 1 more meal (disabled)", "Add 1 more meal (disabled)"], "not yet enabled");
  h.timers.drain();
  assert.deepEqual(page.controls, ["checkout:shown"], "never a disabled control, and CHECKOUT once");
  assert.deepEqual(h.events.at(-1), ["pushState", "/checkout"]);
});

test("R2-15c: the look-alikes are there, enabled, and ahead of it — and are never pressed", async () => {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  run(await script("B"), h.window);
  h.timers.drain();
  // Fixture control: in document order, every enabled button reading "checkout" (any case) before the real one.
  const naive = [...page.document.querySelectorAll("button")]
    .filter((b) => !b.disabled && /^checkout$/i.test(b.textContent.trim()))
    .map((b) => (b.closest("app-product-card, app-product-card-mobile") ? b.closest("app-product-card, app-product-card-mobile").localName : b.getAttribute("data-id")));
  assert.deepEqual(naive, ["app-product-card", "app-product-card-mobile", "checkout:hidden", "checkout:shown"]);
  assert.deepEqual(page.controls, ["checkout:shown"], "the displayed CHECKOUT, not the hidden layout's");
  assert.ok(!page.log.some(([, label]) => /checkout/i.test(label)), `a card's look-alike pressed: ${JSON.stringify(page.log)}`);
});

test("R2-15d: a stepper after the first press — the Increase presses count toward the plan, then CHECKOUT", async () => {
  const page = await orderPage({ afterFirstPress: "stepper" });
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  run(await script("B"), h.window);
  h.timers.drain();
  assert.equal(page.log.length, 7);
  assert.deepEqual(page.all.at(-1), [PAGE, "checkout:shown"]);
  assert.deepEqual(page.controls, ["checkout:shown"]);
  assert.deepEqual(h.events.at(-1), ["pushState", "/checkout"]);
});

test("R2-15e: after the press, B keeps polling until the store routes, and presses nothing more meanwhile", async () => {
  const page = await orderPage({ syncTicks: 12 });
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  run(await script("B"), h.window);
  h.timers.drain();
  assert.deepEqual(page.controls, ["checkout:shown"], "CHECKOUT stayed enabled 12 store ticks; pressed once");
  assert.deepEqual(page.log.map(([meal]) => meal).sort(), [MEALS[0], MEALS[1], MEALS[1], MEALS[2], MEALS[2], MEALS[2], MEALS[2]].sort());
  assert.ok(page.log.every(([, label]) => label === ADD));
  assert.deepEqual(h.events.at(-1), ["pushState", "/checkout"]);
  assert.equal(h.info.filter((line) => / done: \/checkout$/.test(line)).length, 1);
});
