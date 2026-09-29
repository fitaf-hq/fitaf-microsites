// R2-08: fill A's guard. A snapshots the cart key before it writes and restores it on any failure, so storage
// afterwards is byte-identical to before. A writes the whole cart in ONE setItem, so a line can never be
// half-written; "mid-fill" is therefore (a) that write throwing, and (b) any step after it throwing — here the
// navigation to /checkout — which must put back exactly what was there, including "no key at all".
import test from "node:test";
import assert from "node:assert/strict";
import { CART_KEY, FakeStorage, fakeWindow, fragmentFor, run, script } from "./r2-harness.mjs";

const PAYLOAD = {
  v: 1,
  mpid: 21,
  items: [
    { name: "Birria de Res Bowl", qty: 2, pid: 1353 },
    { name: "Chicken Pesto Pasta", qty: 5, pid: 1400 },
  ],
};
const VISITOR_CART = JSON.stringify([{ localId: "36688", name: "a visitor's own line", quantity: 1 }]);
const noNavigation = (events) => events.every(([kind]) => kind === "replaceState");

for (const [label, entries] of [
  ["a visitor's cart", { [CART_KEY]: VISITOR_CART }],
  ["no cart key", {}],
]) {
  test(`R2-08a (${label}): the write throws — storage byte-identical, fragment removed, no navigation`, async () => {
    const storage = new FakeStorage(entries, { failSetItem: true });
    const before = storage.dump();
    const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), storage });
    run(await script("A"), h.window);
    assert.equal(storage.dump(), before);
    assert.ok(noNavigation(h.events), JSON.stringify(h.events));
    assert.equal(h.url.hash, "");
  });

  test(`R2-08b (${label}): the write lands, then the navigation throws — restored byte-identical`, async () => {
    const storage = new FakeStorage(entries);
    const before = storage.dump();
    const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), storage, faults: { replace: true } });
    run(await script("A"), h.window);
    assert.equal(storage.dump(), before);
    assert.equal(storage.map.has(CART_KEY), CART_KEY in entries, "an absent key is absent again");
    assert.ok(noNavigation(h.events), JSON.stringify(h.events));
    assert.equal(h.url.hash, "");
  });
}

test("R2-08 control: without the fault the same fill writes, so the restore above undid a real write", async () => {
  const storage = new FakeStorage({ [CART_KEY]: VISITOR_CART });
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), storage });
  run(await script("A"), h.window);
  assert.equal(JSON.parse(storage.getItem(CART_KEY)).length, 3);
});
