// R2-07: fill A refuses, changing nothing, what it cannot write faithfully: a Performance plan (its portion option id
// is not known), Family (mpid 35, not a portion plan), an unknown mpid, an item without a product id, and a cart key
// holding anything but a JSON list. The link is payload version 2 (SPEC-rung2 § 11), which carries no product id at
// all, so the product-id refusal is every v2 link's (R2-06); each other refusal here comes BEFORE it and names itself.
import test from "node:test";
import assert from "node:assert/strict";
import { loadPlans } from "./helpers.mjs";
import { assertRefused, CART_KEY, FakeStorage, fakeWindow, fragmentFor, run, script } from "./r2-harness.mjs";

const VISITOR_CART = JSON.stringify([{ localId: "36688", name: "a visitor's own line" }]);
// Every payload here meets its plan's count (R2-14), so each refusal is A's own.
const item = (over = {}) => ({ name: "Birria de Res Bowl", qty: 7, ...over }); // 7 of mpid 21's 7

async function refusedByA({ mpid, items = [item()], cart = VISITOR_CART, reason }) {
  const storage = new FakeStorage(cart === undefined ? {} : { [CART_KEY]: cart });
  const before = storage.dump();
  const h = fakeWindow({ path: `/order?mpid=${mpid}`, fragment: fragmentFor({ items }), storage });
  run(await script("A"), h.window);
  assertRefused(h, `/order?mpid=${mpid}`, reason);
  assert.equal(storage.dump(), before, "storage byte-identical");
  return h;
}

test("R2-07a: every Performance mpid is refused (its portion option id is not known)", async () => {
  const plans = await loadPlans();
  const performance = plans.individual.find((plan) => plan.id === "performance");
  assert.equal(performance.counts.length, 5);
  for (const cell of performance.counts) {
    await refusedByA({ mpid: cell.mpid, items: [item({ qty: cell.meals_per_week })], reason: /Performance: option not known$/ });
  }
});

test("R2-07b: Family (mpid 35) is refused", async () => {
  const plans = await loadPlans();
  assert.equal(plans.family.counts[0].mpid, 35);
  await refusedByA({ mpid: 35, items: [item({ qty: 1 })], reason: /fill A has no portion plan for mpid 35$/ });
});

test("R2-07c: an mpid data/plans.json does not know is refused", async () => {
  await refusedByA({ mpid: 99, reason: /unknown mpid 99$/ });
});

test("R2-07d: a link whose items carry no product id refuses the whole payload (every v2 link)", async () => {
  const items = [item({ qty: 5 }), item({ name: "Chicken Pesto Pasta", qty: 2 })];
  await refusedByA({ mpid: 21, items, reason: /no product id/ });
});

for (const [label, cart] of [
  ["an object", '{"lines":[]}'],
  ["a string", '"cart"'],
  ["null", "null"],
  ["not JSON", "{broken"],
]) {
  test(`R2-07e: a cart key holding ${label} is refused, untouched`, async () => {
    await refusedByA({ mpid: 21, cart, reason: /stored cart is not a list$/ });
  });
}

test("R2-07 control: with no cart key at all, A gets as far as its product id, and still writes nothing", async () => {
  const h = await refusedByA({ mpid: 21, cart: undefined, reason: /no product id/ });
  assert.equal(h.window.localStorage.getItem(CART_KEY), null);
});
