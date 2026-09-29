// R2-06: fill A writes cart lines in the shape of a real one — the sample the store's owner supplied on
// 2026-09-27 — field by field: the same keys in the same order, the same types at every depth, and, for the
// sample's own inputs, the same values but a fresh localId. A visitor's own lines are kept, never removed.
import test from "node:test";
import assert from "node:assert/strict";
import { loadPlans } from "./helpers.mjs";
import { CART_KEY, FakeStorage, fakeWindow, fragmentFor, run, script } from "./r2-harness.mjs";

/** The supplied line (SPEC-rung2 § 6 "A, what it writes"), with `images` emptied as the contract allows. */
const SAMPLE_LINE = {
  localId: "36688",
  productId: 1353,
  quantity: 4,
  unitPriceCents: 1300,
  baseUnitPriceCents: 1300,
  regularPriceCents: 1300,
  name: "Birria de Res Bowl",
  images: [],
  itemData: [{ name: "Portion", display: "Lean", value: "Lean", price: "0.00" }],
  extensions: { mpid: 20 },
  cartItemData: { mpid: 20 },
  hmpAddons: [{ addon_field_id: 1297, addon_field_option_id: 10538, quantity: 4 }],
  includeAddonPrices: false,
  isFreeTreat: false,
  freeTreatTierId: null,
  freeTreatOrigin: null,
};

/** The type of every field, recursively, keeping key order: two values of the same shape map to equal trees. */
function shape(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return value.map(shape);
  if (typeof value === "object") return Object.entries(value).map(([k, v]) => [k, shape(v)]);
  return typeof value;
}

async function fillA(payload, storage = new FakeStorage()) {
  const h = fakeWindow({ path: `/order?mpid=${payload.mpid}`, fragment: fragmentFor(payload), storage });
  run(await script("A"), h.window);
  return { h, cart: JSON.parse(storage.getItem(CART_KEY)) };
}

test("R2-06a: the sample's inputs give the sample line: same keys, same types, same values, fresh localId", async () => {
  const { h, cart } = await fillA({ v: 1, mpid: 20, items: [{ name: "Birria de Res Bowl", qty: 4, pid: 1353 }] });
  assert.equal(cart.length, 1);
  const [line] = cart;
  assert.deepEqual(Object.keys(line), Object.keys(SAMPLE_LINE), "same fields, same order");
  assert.deepEqual(shape(line), shape(SAMPLE_LINE), "same type at every depth");
  assert.match(line.localId, /^\d{5}$/, "a localId in the sample's form: five digits, as a string");
  assert.deepEqual({ ...line, localId: SAMPLE_LINE.localId }, SAMPLE_LINE, "every value, localId aside");
  assert.deepEqual(h.events, [
    ["replaceState", "/order?mpid=20"],
    ["replace", "/checkout"],
  ]);
});

test("R2-06b: appended after a visitor's own lines, which stay byte-identical; localIds all distinct", async () => {
  const visitor = JSON.stringify([SAMPLE_LINE]);
  const storage = new FakeStorage({ [CART_KEY]: visitor, other_key: "untouched" });
  const payload = {
    v: 1,
    mpid: 26,
    items: [
      { name: "Chicken Pesto Pasta", qty: 3, pid: 1400 },
      { name: "Jalapeño Lime Chicken", qty: 4, pid: 1401 },
    ],
  };
  const { cart } = await fillA(payload, storage);
  assert.equal(cart.length, 3);
  assert.equal(JSON.stringify([cart[0]]), visitor, "the visitor's line, unchanged");
  assert.equal(storage.getItem("other_key"), "untouched");
  assert.equal(new Set(cart.map((l) => l.localId)).size, 3, "localIds distinct");
  for (const [i, it] of payload.items.entries()) {
    const line = cart[i + 1];
    assert.deepEqual(shape(line), shape(SAMPLE_LINE));
    assert.equal(line.name, it.name);
    assert.equal(line.productId, it.pid);
    assert.equal(line.quantity, it.qty);
    assert.equal(line.hmpAddons[0].quantity, it.qty);
    assert.equal(line.hmpAddons[0].addon_field_option_id, 10539, "Signature's portion option");
    assert.deepEqual(line.itemData[0], { name: "Portion", display: "Signature", value: "Signature", price: "0.00" });
    assert.deepEqual([line.extensions, line.cartItemData], [{ mpid: 26 }, { mpid: 26 }]);
  }
});

test("R2-06c: every Lean and Signature mpid gets data/plans.json's name and per-meal price", async () => {
  const plans = await loadPlans();
  const OPTION = { lean: 10538, signature: 10539 };
  const cells = plans.individual
    .filter((plan) => plan.id in OPTION)
    .flatMap((plan) => plan.counts.map((cell) => ({ plan, cell })));
  assert.equal(cells.length, 10);
  for (const { plan, cell } of cells) {
    const items = [{ name: "Birria de Res Bowl", qty: cell.meals_per_week, pid: 1353 }];
    const { cart } = await fillA({ v: 1, mpid: cell.mpid, items });
    const [line] = cart;
    const cents = cell.price_per_meal_cents;
    assert.deepEqual(
      [line.unitPriceCents, line.baseUnitPriceCents, line.regularPriceCents],
      [cents, cents, cents],
      `mpid ${cell.mpid}`,
    );
    assert.equal(line.itemData[0].value, plan.name, `mpid ${cell.mpid}`);
    assert.equal(line.hmpAddons[0].addon_field_option_id, OPTION[plan.id], `mpid ${cell.mpid}`);
    assert.equal(line.extensions.mpid, cell.mpid);
  }
});
