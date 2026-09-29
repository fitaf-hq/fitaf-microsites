// R2-03: the hand-off acts only on /order with an `mpid` query parameter equal to the payload's. Anywhere else it
// removes the fragment and stops; off the order page it touches neither storage nor the page.
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertRefused,
  CART_KEY,
  fakeWindow,
  fragmentFor,
  run,
  script,
  untouchableStorage,
} from "./r2-harness.mjs";

const PAYLOAD = { v: 1, mpid: 21, items: [{ name: "Birria de Res Bowl", qty: 7, pid: 1353 }] };
const untouchableDocument = () => new Proxy({}, { get: (_, k) => assert.fail(`document touched: ${String(k)}`) });

const REFUSED = [
  ["/checkout", /order page/],
  ["/orders?mpid=21", /order page/],
  ["/", /order page/],
  ["/order", /mpid/],
  ["/order?mpid=26", /mpid/],
  ["/order?mpid=210", /mpid/],
  ["/order?xmpid=21", /mpid/],
];

for (const [path, reason] of REFUSED) {
  for (const fill of ["A", "B"]) {
    test(`R2-03 fill ${fill} on ${path}: fragment removed, nothing else`, async () => {
      const h = fakeWindow({
        path,
        fragment: fragmentFor(PAYLOAD),
        storage: untouchableStorage(),
        document: untouchableDocument(),
      });
      run(await script(fill), h.window);
      h.timers.drain();
      assertRefused(h, path, reason);
    });
  }
}

test("R2-03 control: mpid among other query parameters is found, and the query is kept", async () => {
  const h = fakeWindow({ path: "/order?utm_source=qr&mpid=21", fragment: fragmentFor(PAYLOAD) });
  run(await script("A"), h.window);
  assert.equal(JSON.parse(h.storage.getItem(CART_KEY)).length, 1);
  assert.deepEqual(h.events, [
    ["replaceState", "/order?utm_source=qr&mpid=21"],
    ["replace", "/checkout"],
  ]);
});
