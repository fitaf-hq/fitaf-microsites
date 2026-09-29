// R2-01: a payload encoded by the link tool is decoded by the shipped script, for both fills: every name
// (including a non-ASCII one), count and product id arrives intact. The offer code is accepted but not applied.
import test from "node:test";
import assert from "node:assert/strict";
import { encodePayload } from "../scripts/handoff-link.mjs";
import { assertCheckedOut, CART_KEY, fakeWindow, fragmentFor, orderPage, run, script } from "./r2-harness.mjs";

const PAYLOAD = {
  v: 1,
  mpid: 24,
  items: [
    { name: "Birria de Res Bowl", qty: 1, pid: 1353 },
    { name: "Jalapeño Lime Chicken", qty: 20, pid: 1400 },
  ],
  code: "BOSTON26",
};

test("R2-01a: the encoder's own round trip (base64url of UTF-8 JSON, no padding)", () => {
  const encoded = encodePayload(PAYLOAD);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")), PAYLOAD);
});

test("R2-01b: fill A decodes it: one line per item, names, counts and product ids intact", async () => {
  const h = fakeWindow({ path: "/order?mpid=24", fragment: fragmentFor(PAYLOAD) });
  run(await script("A"), h.window);
  const cart = JSON.parse(h.storage.getItem(CART_KEY));
  assert.deepEqual(
    cart.map((line) => [line.name, line.quantity, line.productId]),
    PAYLOAD.items.map((it) => [it.name, it.qty, it.pid]),
  );
  assert.deepEqual(h.events, [
    ["replaceState", "/order?mpid=24"],
    ["replace", "/checkout"],
  ]);
  assert.ok(h.info.some((line) => /code not applied/.test(line)), "the log says the code was not applied");
});

test("R2-01c: fill B decodes it: each named meal pressed its count, then the store's own CHECKOUT (§ 8)", async () => {
  const page = await orderPage();
  const h = fakeWindow({ path: "/order?mpid=24", fragment: fragmentFor(PAYLOAD), page });
  run(await script("B"), h.window);
  h.timers.drain();
  assert.equal(page.presses.get("Birria de Res Bowl").length, 1);
  assert.equal(page.presses.get("Jalapeño Lime Chicken").length, 20);
  assertCheckedOut(h, page, "/order?mpid=24");
});
