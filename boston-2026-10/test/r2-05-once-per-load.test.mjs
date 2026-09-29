// R2-05: once per load. A marker on `window` stops a second run of the script on the same page — a second copy
// in the Footer, or a console paste on a page that already has it — even while the first is still waiting.
import test from "node:test";
import assert from "node:assert/strict";
import { assertCheckedOut, CART_KEY, FakeStorage, fakeWindow, fragmentFor, orderPage, run, script } from "./r2-harness.mjs";

const PAYLOAD = { mpid: 21, items: [{ name: "Chicken Pesto Pasta", qty: 7 }] };

test("R2-05a fill B: a second run while the first waits for the cards presses nothing more", async () => {
  const page = await orderPage();
  page.hide();
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), page });
  const text = await script("B");
  run(text, h.window);
  assert.equal(h.url.hash.startsWith("#fitaf="), true, "still waiting: the fragment is still there");
  run(text, h.window);
  page.show();
  h.timers.drain();
  assert.deepEqual(page.presses.get("Chicken Pesto Pasta"), Array(7).fill("Add to Cart"));
  assert.deepEqual(page.controls, ["checkout:shown"], "the store's CHECKOUT pressed once, not twice (§ 8)");
  assertCheckedOut(h, page, "/order?mpid=21");
});

test("R2-05b fill A: the fragment put back on the same page runs nothing a second time", async () => {
  // Payload v2 carries no product id, so fill A's first run stops before its write (R2-06); the marker still stops
  // the second run before it reads anything at all.
  const storage = new FakeStorage({ [CART_KEY]: '[{"localId":"36688"}]' });
  const before = storage.dump();
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), storage });
  const text = await script("A");
  run(text, h.window);
  const lines = h.info.length;
  h.goto(`/order?mpid=21${fragmentFor(PAYLOAD)}`);
  run(text, h.window);
  assert.equal(storage.dump(), before, "storage unchanged");
  assert.equal(h.events.length, 1, "the second run wrote no history and navigated nowhere");
  assert.equal(h.info.length, lines, "the second run logged nothing");
});
