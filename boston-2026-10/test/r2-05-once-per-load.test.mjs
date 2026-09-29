// R2-05: once per load. A marker on `window` stops a second run of the script on the same page — a second copy
// in the Footer, or a console paste on a page that already has it — even while the first is still waiting.
import test from "node:test";
import assert from "node:assert/strict";
import { assertCheckedOut, fakeWindow, fragmentFor, orderPage, run, script } from "./r2-harness.mjs";

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
