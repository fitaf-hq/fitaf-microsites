// FC-1 (SPEC-rung2-fill-c § 1.1): one unit at a time. Fill C presses a unit (a meal's Add to Cart, or for a count above
// 1 the card's own "+"), then waits for the STORE'S count on that card to read the unit's number (1, then n + 1), and
// presses the next only then, and never sooner than MIN_GAP_MS after the last. On a clock (fc-harness.mjs): a store
// that counts each press 1 s after it gets each next press at the first read after that second (300 ms, then 200 ms
// polls: 1,100 ms); a store that counts at once, every 300 ms exactly. ⭐ The mutant, made IN MEMORY from the shipped
// text: the fill moves on after MIN_GAP_MS whether or not the store has counted (fill B's clock, shorter): FC-1a fails.
import test from "node:test";
import assert from "node:assert/strict";
import { ADD, INC, MEALS, MIN_GAP_MS, POLL_MS, script, SETTLE_MS, assertPollsAndPresses } from "./r2-harness.mjs";
import { assertDone, assertFullPlan, assertNeverOver, FC_PAYLOAD, FC_TOTAL, fatesFrom, fcRun } from "./fc-harness.mjs";

/** FC_PAYLOAD's presses in fill B's order (every first press before any second), the seconds by the card's "+". */
const ORDER = [...FC_PAYLOAD.items.map((it) => [it.name, ADD]), [MEALS[0], INC], [MEALS[2], INC], [MEALS[2], INC]];
const gapsOf = (page) => page.at.slice(1).map((t, i) => t - page.at[i]);
/** The shipped text's test for "the store has counted this unit": the card's count above the unit's own index. */
const COUNTED = "if (n > list[k][1])";

async function countedLate(text) {
  const r = await fcRun({ text, fates: () => ({ ackMs: 1000 }) });
  assert.deepEqual(r.page.log, ORDER, "each meal's Add to Cart, then the \"+\" for the counts above 1");
  // The first read after a press is MIN_GAP_MS later, then every POLL_MS: 300, 500, …, 1,100 ms is the first at or past 1 s.
  assert.deepEqual(gapsOf(r.page), Array(FC_TOTAL - 1).fill(1100), "each press at the first read after the store's count of the last");
  assertDone(r);
  assertFullPlan(r.page);
  assertNeverOver(r.page);
  return r;
}

test("FC-1a: a store that counts each press 1 s later — each next press only once the last is counted (1,100 ms apart)", async () => {
  await countedLate(await script());
});

test("FC-1b: a store that counts at once — each next press MIN_GAP_MS after the last, exactly; one settle; no fixed 1 s between presses", async () => {
  const r = await fcRun();
  assert.deepEqual(r.page.log, ORDER);
  assert.deepEqual(gapsOf(r.page), Array(FC_TOTAL - 1).fill(MIN_GAP_MS), "300 ms apart: 14 presses in 3.9 s (fill B: 1 s each)");
  assertPollsAndPresses(r.h.timers.delays, FC_TOTAL, "FC-1b:");
  assert.equal(r.h.timers.delays.filter((ms) => ms === SETTLE_MS).length, 1, "the one 1,000 ms delay is the settle");
  assertDone(r);
  assertFullPlan(r.page);
});

test("FC-1c: a second unit waits for the card's count to reach n + 1, not for any count to be shown", async () => {
  // Store press 11 is MEALS[0]'s "+" (after the 11 meals' first presses); its count comes 1.5 s later. Until then the
  // card already shows a count (1): fill C does not read that as its "+" counted.
  const r = await fcRun({ fates: fatesFrom({ 11: { ackMs: 1500 } }) });
  assert.deepEqual(r.page.log[11], [MEALS[0], INC]);
  assert.equal(r.page.at[12] - r.page.at[11], MIN_GAP_MS + 6 * POLL_MS, "the next press at the first read after 1.5 s");
  assertDone(r);
  assertFullPlan(r.page);
});

test("FC-1 (mutant): the fill moves on after MIN_GAP_MS whether or not the store counted — FC-1a fails", async () => {
  const text = await script();
  assert.equal(text.split(COUNTED).length, 2, "the count test the mutant weakens is in the shipped text, once");
  const mutant = text.replace(COUNTED, "if (tries || n > list[k][1])");
  await assert.rejects(countedLate(mutant), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});
