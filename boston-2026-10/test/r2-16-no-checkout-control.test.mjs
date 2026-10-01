// R2-16 (SPEC-rung2 § 8, fail-safe): no enabled, displayed CHECKOUT within the polling budget ⇒ B logs
// "stopped: no checkout control" and presses nothing beyond the meals. The meals stay in the visitor's pending
// list, as if they had pressed the buttons themselves; the page is the store's own; B navigates nowhere.
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

const MEAL_TICKS = 7; // one 200 ms tick after each of the seven meal presses

async function stopped(options, prepare = () => {}) {
  const page = await orderPage(options);
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  prepare(page);
  run(await script("B"), h.window);
  h.timers.drain();
  assert.equal(page.log.length, 7, "the meals were pressed");
  assert.deepEqual(page.controls, [], "no page control pressed, not even a disabled one");
  assert.deepEqual(h.events, [["replaceState", "/order?mpid=21"]], "fragment removed; no navigation of any kind");
  assert.ok(h.info.includes(`${LOG_PREFIX} stopped: no checkout control`), JSON.stringify(h.info));
  assertPollsAndPresses(h.timers.delays, page.log.length, "§ 23:");
  assert.ok((h.timers.delays.length - MEAL_TICKS) * POLL_MS <= MAX_WAIT_MS, `waited ${h.timers.delays.length} polls`);
  return page;
}

test("R2-16a: the plan is not full on the page — CHECKOUT still reads \"Add 1 more meal\", disabled", async () => {
  const page = await stopped({ need: 8 });
  assert.deepEqual(page.summary(), ["Add 1 more meal (disabled)", "Add 1 more meal (disabled)"], "fixture control");
});

test("R2-16b: the only enabled CHECKOUT is in a layout that is not displayed — not pressed", async () => {
  const page = await stopped({}, (p) => p.document.querySelector('[data-layout="shown"]').setAttribute("style", "display: none"));
  assert.deepEqual(page.summary(), ["CHECKOUT", "CHECKOUT"], "fixture control: both enabled, neither displayed");
});

test("R2-16c: a displayed look-alike (\"CHECKOUT NOW PLEASE\") is neither label — not pressed (labels match exactly)", async () => {
  const page = await stopped({ shownLabel: " CHECKOUT NOW PLEASE " });
  assert.deepEqual(page.summary(), ["CHECKOUT", "CHECKOUT NOW PLEASE"], "fixture control");
});
