// R2-07: fill A refuses, changing nothing, what it cannot write faithfully: a Performance plan (its portion
// option id is not known), Family (mpid 35, not a portion plan), an unknown mpid, an item without a product id,
// and a cart key holding anything but a JSON list.
import test from "node:test";
import assert from "node:assert/strict";
import { loadPlans } from "./helpers.mjs";
import { assertRefused, CART_KEY, FakeStorage, fakeWindow, fragmentFor, run, script } from "./r2-harness.mjs";

const VISITOR_CART = JSON.stringify([{ localId: "36688", name: "a visitor's own line" }]);
const item = (over = {}) => ({ name: "Birria de Res Bowl", qty: 2, pid: 1353, ...over });

async function refusedByA({ mpid, items = [item()], cart = VISITOR_CART, reason }) {
  const storage = new FakeStorage(cart === undefined ? {} : { [CART_KEY]: cart });
  const before = storage.dump();
  const h = fakeWindow({ path: `/order?mpid=${mpid}`, fragment: fragmentFor({ v: 1, mpid, items }), storage });
  run(await script("A"), h.window);
  assertRefused(h, `/order?mpid=${mpid}`, reason);
  assert.equal(storage.dump(), before, "storage byte-identical");
}

test("R2-07a: every Performance mpid is refused (its portion option id is not known)", async () => {
  const plans = await loadPlans();
  const performance = plans.individual.find((plan) => plan.id === "performance");
  assert.equal(performance.counts.length, 5);
  for (const cell of performance.counts) {
    await refusedByA({ mpid: cell.mpid, reason: /Performance/ });
  }
});

test("R2-07b: Family (mpid 35) is refused", async () => {
  const plans = await loadPlans();
  assert.equal(plans.family.counts[0].mpid, 35);
  await refusedByA({ mpid: 35, reason: /35/ });
});

test("R2-07c: an mpid the plan table does not know is refused", async () => {
  await refusedByA({ mpid: 99, reason: /99/ });
});

test("R2-07d: one item without a product id refuses the whole payload", async () => {
  await refusedByA({ mpid: 21, items: [item(), item({ name: "Chicken Pesto Pasta", pid: undefined })], reason: /product id/ });
});

for (const [label, cart] of [
  ["an object", '{"lines":[]}'],
  ["a string", '"cart"'],
  ["null", "null"],
  ["not JSON", "{broken"],
]) {
  test(`R2-07e: a cart key holding ${label} is refused, untouched`, async () => {
    await refusedByA({ mpid: 21, cart, reason: /cart/ });
  });
}

test("R2-07 control: with no cart key at all, A writes a new list", async () => {
  const storage = new FakeStorage();
  const h = fakeWindow({ fragment: fragmentFor({ v: 1, mpid: 21, items: [item()] }), storage });
  run(await script("A"), h.window);
  assert.equal(JSON.parse(storage.getItem(CART_KEY)).length, 1);
});
