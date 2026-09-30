// R2-03: the hand-off acts only on /order, and the plan is the page's own: payload version 2 carries no plan id, so the
// script reads `mpid` from the page's query, once (SPEC-rung2 § 11 item 1), and the counts must make THAT plan (§ 7).
// Anywhere else it removes the fragment and stops, touching neither storage nor the page.
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCheckedOut,
  assertRefused,
  fakeWindow,
  fragmentFor,
  orderPage,
  run,
  script,
  untouchableStorage,
} from "./r2-harness.mjs";

const PAYLOAD = { items: [{ name: "Birria de Res Bowl", qty: 7 }] };
const untouchableDocument = () => new Proxy({}, { get: (_, k) => assert.fail(`document touched: ${String(k)}`) });

const REFUSED = [
  ["/checkout", /not the order page/],
  ["/orders?mpid=21", /not the order page/],
  ["/", /not the order page/],
  ["/order", /no mpid on this page/],
  ["/order?xmpid=21", /no mpid on this page/],
  ["/order?mpid=", /no mpid on this page/],
  ["/order?mpid=021", /no mpid on this page/],
  ["/order?mpid=21x", /no mpid on this page/],
  ["/order?mpid=210", /unknown mpid 210/],
  // Lean 10: the page's plan, which a 7-meal link does not make.
  ["/order?mpid=22", /the plan needs 10 meals; the link has 7/],
];

for (const [path, reason] of REFUSED) {
  test(`R2-03 fill B on ${path}: fragment removed, nothing else`, async () => {
    const h = fakeWindow({
      path,
      fragment: fragmentFor(PAYLOAD),
      storage: untouchableStorage(),
      document: untouchableDocument(),
    });
    run(await script("B"), h.window);
    h.timers.drain();
    assertRefused(h, path, reason);
  });
}

test("R2-03 control: mpid among other query parameters is found, and the query is kept", async () => {
  const page = await orderPage();
  const h = fakeWindow({ path: "/order?utm_source=qr&mpid=21", fragment: fragmentFor(PAYLOAD), page });
  run(await script("B"), h.window);
  h.timers.drain();
  assert.ok(h.info.includes("[fitaf-handoff] fill B, mpid 21"), JSON.stringify(h.info));
  assertCheckedOut(h, page, "/order?utm_source=qr&mpid=21");
});

test("R2-03 control: the same link on another plan of the same count (Signature 7, mpid 26) is that plan's", async () => {
  const page = await orderPage();
  const h = fakeWindow({ path: "/order?mpid=26", fragment: fragmentFor(PAYLOAD), page });
  run(await script("B"), h.window);
  h.timers.drain();
  assert.ok(h.info.includes("[fitaf-handoff] fill B, mpid 26"), JSON.stringify(h.info));
  assertCheckedOut(h, page, "/order?mpid=26");
});
