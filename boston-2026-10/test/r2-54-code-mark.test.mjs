// R2-54, the mark (SPEC-rung2-progress-and-checkout § 10 item 2): fill B marks a link that carries an offer code with a
// second class on <html>, `fitaf-code`, set at done with `fitaf-deep`, so the checkout's style keeps the discounts for
// it (H7 hides them only without the mark). A link without a code gets `fitaf-deep` alone; a coded link that stops gets
// neither. What the marks do on a checkout (the discounts displayed or hidden) is R2-54 in the watch package, in Chrome.
import test from "node:test";
import assert from "node:assert/strict";
import { CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, orderPage, run, script } from "./r2-harness.mjs";

const CODED = { ...CHECKOUT_PAYLOAD, code: "BOSTON10" };
const marks = (document) => [...document.documentElement.classList].filter((c) => c.startsWith("fitaf-")).sort();

async function runOn(payload, options = {}) {
  const page = await orderPage(options);
  const h = fakeWindow({ fragment: fragmentFor(payload), page });
  run(await script(), h.window);
  h.timers.drain();
  return { page, h };
}

test("R2-54: a coded link reaches done with fitaf-deep and fitaf-code on <html>", async () => {
  const { page, h } = await runOn(CODED);
  assert.ok(h.info.includes("[fitaf-handoff] fill C, mpid 21; offer code not applied"), JSON.stringify(h.info));
  assert.ok(h.info.includes("[fitaf-handoff] done: /checkout"));
  assert.deepEqual(marks(page.document), ["fitaf-code", "fitaf-deep"]);
});

test("R2-54: a link without a code reaches done with fitaf-deep alone", async () => {
  const { page } = await runOn(CHECKOUT_PAYLOAD);
  assert.deepEqual(marks(page.document), ["fitaf-deep"]);
});

test("R2-54: a coded link that stops (/checkout not reached) leaves no mark at all", async () => {
  const { page, h } = await runOn(CODED, { routes: false });
  assert.ok(h.info.includes("[fitaf-handoff] stopped: /checkout not reached"));
  assert.deepEqual(marks(page.document), []);
});
