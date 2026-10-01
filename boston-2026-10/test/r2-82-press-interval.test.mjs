// R2-82 (SPEC-rung2-progress-and-checkout § 23), fake timers: fill B waits PRESS_MS (1000) after each press, every Add
// to Cart and every +, before the next, and after the last before its first look for CHECKOUT; every other delay it
// schedules is a 200 ms poll (the waits for the cards, for CHECKOUT, and after CHECKOUT). Each delay is recorded with the
// number of meal presses made when it was scheduled, so a PRESS_MS is placed, not only counted: a delay scheduled
// after a new press is PRESS_MS, any other is POLL_MS. Run on R2-15's link (1 + 2 + 4: 3 Add to Cart and 4 more) with
// the cards late (a wait before the first press) and the store's CHECKOUT busy for two ticks (a wait after the last).
import test from "node:test";
import assert from "node:assert/strict";
import { ADD, CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, MEALS, orderPage, PAGE, POLL_MS, PRESS_MS, run, script } from "./r2-harness.mjs";

test("R2-82: 1000 ms after each press and after the last; every other delay a 200 ms poll", async () => {
  assert.deepEqual([PRESS_MS, POLL_MS], [1000, 200]);
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
  assert.equal(page.log.length, 7, "control: seven presses");
  assert.deepEqual(page.log.map(([, label]) => label), Array(7).fill(ADD), "control: R2-15's presses");
  let seen = 0;
  const expected = scheduled.map(({ presses }) => {
    const afterPress = presses > seen;
    seen = presses;
    return afterPress ? PRESS_MS : POLL_MS;
  });
  assert.deepEqual(scheduled.map((d) => d.ms), expected, "PRESS_MS exactly after each press; POLL_MS elsewhere");
  assert.equal(scheduled.filter((d) => d.ms === PRESS_MS).length, 7, "one per press, the last's included");
  assert.ok(scheduled.filter((d) => d.ms === POLL_MS && d.presses === 0).length >= 5, "control: polls before the first press");
  assert.ok(scheduled.filter((d) => d.ms === POLL_MS && d.presses === 7).length >= 2, "control: polls after the last (CHECKOUT busy, then the route)");
  assert.ok(MEALS.length >= 3);
});
