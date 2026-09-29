// R2-05: once per load. A marker on `window` stops a second run of the script on the same page — a second copy
// in the Footer, or a console paste on a page that already has it — even while the first is still waiting.
import test from "node:test";
import assert from "node:assert/strict";
import { CART_KEY, fakeWindow, fragmentFor, orderPage, run, script } from "./r2-harness.mjs";

const PAYLOAD = { v: 1, mpid: 21, items: [{ name: "Chicken Pesto Pasta", qty: 2, pid: 1400 }] };

test("R2-05a fill B: a second run while the first waits for the cards presses nothing more", async () => {
  const page = await orderPage();
  page.hide();
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), document: page.document });
  const text = await script("B");
  run(text, h.window);
  assert.equal(h.url.hash.startsWith("#fitaf="), true, "still waiting: the fragment is still there");
  run(text, h.window);
  page.show();
  h.timers.drain();
  assert.deepEqual(page.presses.get("Chicken Pesto Pasta"), ["Add to Cart", "Add to Cart"]);
  assert.deepEqual(
    h.events.filter(([kind]) => kind === "assign"),
    [["assign", "/checkout"]],
  );
});

test("R2-05b fill A: the fragment put back on the same page does not write a second time", async () => {
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD) });
  const text = await script("A");
  run(text, h.window);
  const once = h.storage.dump();
  h.goto(`/order?mpid=21${fragmentFor(PAYLOAD)}`);
  run(text, h.window);
  assert.equal(h.storage.dump(), once, "storage as after the first run");
  assert.equal(JSON.parse(h.storage.getItem(CART_KEY)).length, 1);
  assert.equal(h.events.length, 2, "the second run wrote no history and navigated nowhere");
});
