// R2-16 (SPEC-rung2 § 8, fail-safe): no enabled, displayed CHECKOUT within the polling budget ⇒ the fill stops and
// presses nothing beyond the meals. The meals stay in the visitor's pending list, as if they had pressed the buttons
// themselves; the page is the store's own; the fill navigates nowhere. Since fill C (SPEC-rung2-fill-c § 1.4, § 1.6) the
// line names the store's counts and the plan's own count before "no checkout control":
// "stopped: the store counted 7 of 7; the plan shows N; no checkout control".
import test from "node:test";
import assert from "node:assert/strict";
import {
  CHECKOUT_PAYLOAD,
  fakeWindow,
  fragmentFor,
  LOG_PREFIX,
  MAX_WAIT_MS,
  orderPage,
  POLL_MS,
  run,
  script,
  assertPollsAndPresses,
} from "./r2-harness.mjs";

/** The stop line, the plan's own count as the store displays it at the stop (0 when it displays none). */
const line = (plan) => `${LOG_PREFIX} stopped: the store counted 7 of 7; the plan shows ${plan}; no checkout control`;

async function stopped(options, plan, prepare = () => {}) {
  const page = await orderPage(options);
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  prepare(page);
  run(await script(), h.window);
  h.timers.drain();
  assert.equal(page.log.length, 7, "the meals were pressed");
  assert.deepEqual(page.controls, [], "no page control pressed, not even a disabled one");
  assert.deepEqual(h.events, [["replaceState", "/order?mpid=21"]], "fragment removed; no navigation of any kind");
  assert.ok(h.info.includes(line(plan)), JSON.stringify(h.info));
  assertPollsAndPresses(h.timers.delays, page.log.length, "fill C:");
  // The meals counted at once, so every poll is the wait for CHECKOUT: at most 10 s of them.
  const polls = h.timers.delays.filter((ms) => ms === POLL_MS).length;
  assert.ok(polls * POLL_MS <= MAX_WAIT_MS, `waited ${polls} polls`);
  return page;
}

test("R2-16a: the plan is not full on the page — CHECKOUT still reads \"Add 1 more meal\", disabled", async () => {
  const page = await stopped({ need: 8 }, 7);
  assert.deepEqual(page.summary(), ["Add 1 more meal (disabled)", "Add 1 more meal (disabled)"], "fixture control");
});

test("R2-16b: the only enabled CHECKOUT is in a layout that is not displayed — not pressed", async () => {
  // Nothing of the plan is displayed either: the plan shows 0.
  const page = await stopped({}, 0, (p) => p.document.querySelector('[data-layout="shown"]').setAttribute("style", "display: none"));
  assert.deepEqual(page.summary(), ["CHECKOUT", "CHECKOUT"], "fixture control: both enabled, neither displayed");
});

test("R2-16c: a displayed look-alike (\"CHECKOUT NOW PLEASE\") is neither label — not pressed (labels match exactly)", async () => {
  const page = await stopped({ shownLabel: " CHECKOUT NOW PLEASE " }, 7);
  assert.deepEqual(page.summary(), ["CHECKOUT", "CHECKOUT NOW PLEASE"], "fixture control");
});
