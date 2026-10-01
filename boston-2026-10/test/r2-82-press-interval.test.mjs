// R2-82 (SPEC-rung2-progress-and-checkout § 23, superseded by SPEC-rung2-fill-c § 1.1), fake timers: fill B waited a
// fixed PRESS_MS (1000) after every press. Fill C waits for the store's count instead, and keeps § 1.1's floor: the
// delay it schedules right after each press is MIN_GAP_MS (300), the wait to its first read of that press's count; the
// one SETTLE_MS (1000) follows the last press's count (§ 1.3); every other delay is a 200 ms poll (the waits for the
// cards, for a count, for CHECKOUT, and after CHECKOUT). Each delay is recorded with the number of meal presses made when
// it was scheduled, so a MIN_GAP_MS is placed, not only counted. Run on R2-15's link (3 Add to Cart and 4 of the store's
// "+") with the cards late (a wait before the first press) and the store's CHECKOUT busy for two ticks (a wait after).
import test from "node:test";
import assert from "node:assert/strict";
import { CHECKOUT_PAYLOAD, CHECKOUT_PRESSES, fakeWindow, fragmentFor, MIN_GAP_MS, orderPage, PAGE, POLL_MS, run, script, SETTLE_MS } from "./r2-harness.mjs";

test("R2-82 (as fill C): MIN_GAP_MS after each press, SETTLE_MS once after the last count, every other delay a 200 ms poll; no fixed 1000 ms between presses", async () => {
  assert.deepEqual([MIN_GAP_MS, SETTLE_MS, POLL_MS], [300, 1000, 200]);
  const page = await orderPage({ loadingTicks: 2 });
  page.hide();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  const scheduled = [];
  const setTimeout = h.window.setTimeout;
  h.window.setTimeout = (fn, ms) => {
    scheduled.push({ ms, presses: page.log.length });
    return setTimeout(fn, ms);
  };
  run(await script(), h.window);
  for (let i = 0; i < 5; i++) h.timers.step(); // five polls with no card
  page.show();
  h.timers.drain();
  assert.ok(h.info.includes("[fitaf-handoff] done: /checkout"), JSON.stringify(h.info));
  assert.deepEqual(page.all.slice(-1), [[PAGE, "checkout:shown"]], "control: CHECKOUT pressed last");
  assert.deepEqual(page.log, CHECKOUT_PRESSES, "control: R2-15's presses");
  let seen = 0;
  let settled = false;
  const expected = scheduled.map(({ presses }) => {
    const afterPress = presses > seen;
    seen = presses;
    if (afterPress) return MIN_GAP_MS;
    // The first delay after the last press's own is the settle; then polls again.
    if (presses === 7 && !settled) return (settled = true), SETTLE_MS;
    return POLL_MS;
  });
  assert.deepEqual(scheduled.map((d) => d.ms), expected, "MIN_GAP_MS exactly after each press; SETTLE_MS once after the last; POLL_MS elsewhere");
  assert.equal(scheduled.filter((d) => d.ms === MIN_GAP_MS).length, 7, "one per press, the last's included");
  assert.equal(scheduled.filter((d) => d.ms === SETTLE_MS).length, 1, "the one 1000 ms delay is the settle, not a press interval");
  assert.ok(scheduled.filter((d) => d.ms === POLL_MS && d.presses === 0).length >= 5, "control: polls before the first press");
  assert.ok(scheduled.filter((d) => d.ms === POLL_MS && d.presses === 7).length >= 2, "control: polls after the last (CHECKOUT busy, then the route)");
});
