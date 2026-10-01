// R2-17 (SPEC-rung2 § 8): the store's CHECKOUT may open its extras dialog instead of routing. B then presses that
// dialog's CONTINUE TO CHECKOUT, once, and adds nothing from it: the dialog's own add controls are never pressed.
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCheckedOut,
  CHECKOUT_PAYLOAD,
  fakeWindow,
  fragmentFor,
  LOG_PREFIX,
  MAX_WAIT_AFTER_CHECKOUT_MS,
  MAX_WAIT_MS,
  MIN_GAP_MS,
  orderPage,
  PAGE,
  run,
  SETTLE_MS,
  script,
  untouchableStorage,
  assertPollsAndPresses,
} from "./r2-harness.mjs";

async function viaDialog(options) {
  const page = await orderPage({ extras: true, ...options });
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page, storage: untouchableStorage() });
  run(await script(), h.window);
  h.timers.drain();
  return { page, h };
}

test("R2-17a: CHECKOUT opens the dialog; its CONTINUE TO CHECKOUT pressed once; nothing added from it", async () => {
  const { page, h } = await viaDialog();
  assert.equal(page.log.length, 7);
  assert.deepEqual(page.all.slice(-2), [[PAGE, "checkout:shown"], [PAGE, "continue"]]);
  assert.ok(!page.controls.some((id) => id.startsWith("extra:")), `an extra added: ${page.controls}`);
  assertCheckedOut(h, page, "/order?mpid=21", { dialog: true });
});

test("R2-17b: the dialog opens late and the store routes late — still once each, and CHECKOUT not pressed again", async () => {
  const { page, h } = await viaDialog({ openTicks: 9, syncTicks: 9 });
  assertCheckedOut(h, page, "/order?mpid=21", { dialog: true });
});

test("R2-17c: the store never routes after CONTINUE — B stops within its budget, pressing nothing more", async () => {
  // Not stated by § 8 (it names success and "no checkout control"): the build's choice, pinned here.
  const { page, h } = await viaDialog({ routes: false });
  assert.deepEqual(page.controls, ["checkout:shown", "continue"]);
  assert.deepEqual(h.events, [
    ["replaceState", "/order?mpid=21"],
    ["press", "checkout:shown"],
    ["press", "continue"],
  ]);
  assert.ok(h.info.includes(`${LOG_PREFIX} stopped: /checkout not reached`), JSON.stringify(h.info));
  assert.ok(!h.info.some((line) => /done/.test(line)));
  assertPollsAndPresses(h.timers.delays, page.log.length, "fill C:");
  // Fill C's wait after each of the seven presses and its settle (SPEC-rung2-fill-c § 1), at most 10 s for CHECKOUT,
  // then at most 30 s after each of the store's two controls (§ 11 item 4).
  const budget = 7 * MIN_GAP_MS + SETTLE_MS + MAX_WAIT_MS + 2 * MAX_WAIT_AFTER_CHECKOUT_MS;
  const waited = h.timers.delays.reduce((a, b) => a + b, 0);
  assert.ok(waited <= budget, `${waited} ms of ${budget}`);
});
