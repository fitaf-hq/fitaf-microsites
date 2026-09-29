// R2-08: fill A's guard. A snapshots the cart key before it writes and restores it on any failure, so storage
// afterwards is byte-identical to before. With payload version 2 (SPEC-rung2 § 11), which carries no product id, fill A
// stops at its product-id check AFTER reading the cart and BEFORE its one setItem (R2-06), so the failures reachable
// from a link are before the write: the guard then leaves storage exactly as it was, removes the fragment and
// navigates nowhere, even when every write would throw. ⚠ The restore of a write that LANDED (the navigation throwing
// after it) was checked here with a v1 link; no v2 link reaches that write, so that check has nothing to run on.
import test from "node:test";
import assert from "node:assert/strict";
import { CART_KEY, FakeStorage, fakeWindow, fragmentFor, run, script } from "./r2-harness.mjs";

const PAYLOAD = {
  items: [
    { name: "Birria de Res Bowl", qty: 2 },
    { name: "Chicken Pesto Pasta", qty: 5 },
  ],
};
const VISITOR_CART = JSON.stringify([{ localId: "36688", name: "a visitor's own line", quantity: 1 }]);
const noNavigation = (events) => events.every(([kind]) => kind === "replaceState");

for (const [label, entries] of [
  ["a visitor's cart", { [CART_KEY]: VISITOR_CART }],
  ["no cart key", {}],
]) {
  for (const [how, options] of [
    ["every write throwing", { failSetItem: true }],
    ["writes allowed", {}],
  ]) {
    test(`R2-08 (${label}, ${how}): A fails after reading the cart — storage byte-identical, fragment removed, no navigation`, async () => {
      const storage = new FakeStorage(entries, options);
      const before = storage.dump();
      const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), storage, faults: { replace: true } });
      run(await script("A"), h.window);
      assert.equal(storage.dump(), before);
      assert.equal(storage.map.has(CART_KEY), CART_KEY in entries, "an absent key is still absent");
      assert.ok(noNavigation(h.events), JSON.stringify(h.events));
      assert.equal(h.url.hash, "");
      assert.ok(h.info.some((line) => / stopped: no product id: /.test(line)), JSON.stringify(h.info));
    });
  }
}
