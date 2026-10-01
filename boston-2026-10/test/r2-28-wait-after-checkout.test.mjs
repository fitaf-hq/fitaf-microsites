// R2-28 (SPEC-rung2 § 11 item 4): after fill B presses the store's CHECKOUT, it waits up to 30 s (150 polls of 200 ms)
// for /checkout, where it waited 10 s: one live phone-width run of four stopped at 10 s with the store still
// committing. The waits BEFORE a press stay at 10 s (50 polls). Time here is the script's own polls: each step of the
// fake timers after the press is one 200 ms poll, and the store "routes" when the test pushes /checkout.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CHECKOUT_PAYLOAD,
  fakeWindow,
  fragmentFor,
  LOG_PREFIX,
  MAX_WAIT_AFTER_CHECKOUT_MS,
  MAX_WAIT_MS,
  MIN_GAP_MS,
  orderPage,
  POLL_MS,
  run,
  script,
  SETTLE_MS,
} from "./r2-harness.mjs";

const DONE = `${LOG_PREFIX} done: /checkout`;
const NOT_REACHED = `${LOG_PREFIX} stopped: /checkout not reached`;

/**
 * Fill B on a store that never routes by itself, run until the store's `control` is pressed; then poll by poll, the
 * store routing (history.pushState, as the store does) once `routeAfterMs` of polls have run, if given. Returns the
 * log and how many polls after the press each line came.
 */
async function afterPress({ routeAfterMs = null, control = "checkout:shown", extras = false }) {
  const page = await orderPage({ routes: false, extras });
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  run(await script(), h.window);
  while (!page.controls.includes(control)) assert.ok(h.timers.step(), `the script stopped before pressing ${control}`);
  let polls = 0;
  const at = {};
  for (;;) {
    if (routeAfterMs !== null && polls * POLL_MS === routeAfterMs) h.window.history.pushState(null, "", "/checkout");
    if (!h.timers.step()) break;
    polls += 1;
    for (const line of h.info) at[line] ??= polls;
  }
  return { h, page, at, polls };
}

test("R2-28a: the store routes 25 s after CHECKOUT — done: /checkout, at the next poll", async () => {
  const { h, at } = await afterPress({ routeAfterMs: 25_000 });
  assert.equal(at[DONE], 25_000 / POLL_MS + 1);
  assert.ok(!h.info.includes(NOT_REACHED));
});

test("R2-28b: no route by 30 s — stopped: /checkout not reached, at exactly 30 s; a route at 31 s finds nothing running", async () => {
  const { h, page, at, polls } = await afterPress({});
  assert.equal(at[NOT_REACHED], MAX_WAIT_AFTER_CHECKOUT_MS / POLL_MS, "the 150th poll after the press");
  assert.equal(polls, 150, "and no poll after it");
  assert.equal(h.timers.pending(), 0);
  h.window.history.pushState(null, "", "/checkout"); // the store, at 31 s
  assert.equal(h.timers.pending(), 0);
  assert.ok(!h.info.includes(DONE));
  assert.deepEqual(page.controls, ["checkout:shown"], "nothing pressed after CHECKOUT");
});

test("R2-28c: the edge — a route after 29.8 s is seen by the 150th poll (done); after 30 s it is not", async () => {
  const early = await afterPress({ routeAfterMs: 29_800 });
  assert.equal(early.at[DONE], 150);
  assert.ok(!early.h.info.includes(NOT_REACHED));
  const late = await afterPress({ routeAfterMs: 30_000 });
  assert.equal(late.at[NOT_REACHED], 150);
  assert.ok(!late.h.info.includes(DONE));
});

test("R2-28d: after the extras dialog's CONTINUE TO CHECKOUT, the wait for /checkout is 30 s too", async () => {
  const { h, at } = await afterPress({ extras: true, control: "continue" });
  assert.equal(at[NOT_REACHED], MAX_WAIT_AFTER_CHECKOUT_MS / POLL_MS);
  assert.ok(!h.info.includes(DONE));
});

test("R2-28e: the wait BEFORE a press stays 10 s — no enabled CHECKOUT: stopped after exactly 50 polls", async () => {
  const page = await orderPage({ need: 8 }); // the store keeps "Add 1 more meal" disabled
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  run(await script(), h.window);
  while (page.log.length < 7) assert.ok(h.timers.step());
  const from = h.timers.delays.length;
  while (h.timers.step());
  assert.ok(
    h.info.includes(`${LOG_PREFIX} stopped: the store counted 7 of 7; the plan shows 7; no checkout control`),
    JSON.stringify(h.info),
  );
  // After the last press: fill C's read of its count (MIN_GAP_MS), its settle (SETTLE_MS), then the look for CHECKOUT,
  // whose first poll runs at once and whose 50th stops it: 49 timers of 200 ms (SPEC-rung2-fill-c § 1.3, § 1.4).
  const polls = MAX_WAIT_MS / POLL_MS;
  assert.deepEqual(h.timers.delays.slice(from - 1), [MIN_GAP_MS, SETTLE_MS, ...Array(polls - 1).fill(POLL_MS)]);
});
