// FC-2 (SPEC-rung2-fill-c § 1.2 and § 4.1): no count within ACK_MS ⇒ read the card again, and press again ONLY if the
// store still shows the meal short; at most RETRIES re-presses per unit; then stop, naming the counts. ⛔ Never a second
// press on a clock alone: a count the store shows late (within the window) is one press, seen once. On a clock
// (fc-harness.mjs): the window is ACK_WINDOW_MS (5,100 ms: MIN_GAP_MS, then 200 ms polls past ACK_MS). Store press 2 is
// MEALS[2]'s Add to Cart (the third meal of FC_PAYLOAD, the first of its three). ⭐ The mutant, IN MEMORY: the count is
// read only before a unit's first press (so the window's end presses again whatever the store shows): FC-2b fails.
import test from "node:test";
import assert from "node:assert/strict";
import { ACK_MS, ACK_WINDOW_MS, ADD, INC, LOG_PREFIX, MEALS, MIN_GAP_MS, RETRIES, script } from "./r2-harness.mjs";
import {
  assertDone,
  assertFullPlan,
  assertNeverOver,
  EXTRA,
  fatesFrom,
  fcRun,
  FC_TOTAL,
  parseCounted,
  pressesOf,
  shortNow,
} from "./fc-harness.mjs";

const COUNTED = "if (n > list[k][1])";

test("FC-2a: a dropped press is pressed again once, after its window, and counted once", async () => {
  const r = await fcRun({ fates: fatesFrom({ 2: { drop: true } }) });
  const m2 = pressesOf(r.page, MEALS[2]);
  assert.deepEqual(m2.map(([label]) => label), [ADD, ADD, INC, INC], "Add to Cart twice (the store dropped the first), then its two \"+\"");
  assert.equal(m2[1][1] - m2[0][1], ACK_WINDOW_MS, "the re-press at the window's end, not before");
  assert.ok(ACK_WINDOW_MS >= ACK_MS);
  assert.equal(pressesOf(r.page, EXTRA[0])[0][1] - m2[1][1], MIN_GAP_MS, "the next meal once the re-press is counted");
  assertDone(r);
  assertFullPlan(r.page);
  assertNeverOver(r.page);
});

for (const ackMs of [2000, 4900]) {
  test(`FC-2b: a count shown ${ackMs} ms after its press is NOT pressed again — the store saw exactly one press for it`, async () => {
    const r = await fcRun({ fates: fatesFrom({ 2: { ackMs } }) });
    const m2 = pressesOf(r.page, MEALS[2]);
    assert.deepEqual(m2.map(([label]) => label), [ADD, INC, INC], "one Add to Cart, then the two \"+\": no re-press");
    assert.equal(r.page.log.length, FC_TOTAL, "fourteen presses for fourteen meals");
    assert.ok(pressesOf(r.page, EXTRA[0])[0][1] - m2[0][1] >= ackMs, "the next meal only after the late count");
    assertDone(r);
    assertFullPlan(r.page);
    assertNeverOver(r.page);
  });
}

test("FC-2c: a meal the store never counts — pressed 1 + RETRIES times, a window apart, then a stop naming the counts; nothing more", async () => {
  const r = await fcRun({ fates: fatesFrom({ 2: { drop: true }, 3: { drop: true }, 4: { drop: true } }) });
  const m2 = pressesOf(r.page, MEALS[2]);
  assert.deepEqual(m2.map(([label]) => label), Array(1 + RETRIES).fill(ADD));
  assert.deepEqual(m2.slice(1).map(([, at], i) => at - m2[i][1]), Array(RETRIES).fill(ACK_WINDOW_MS));
  assert.equal(r.page.log.length, 2 + 1 + RETRIES, "MEALS[0] and MEALS[1] once each, MEALS[2]'s three; nothing after");
  const said = parseCounted(r.last);
  assert.ok(said, `a counted stop line: ${r.last}`);
  assert.deepEqual([said.k, said.n, said.over, said.rest], [2, FC_TOTAL, [], ""]);
  assert.deepEqual(said.short, shortNow(r.page), "short: every meal of the link the store shows short, in the link's order");
  assert.deepEqual(r.page.controls, [], "CHECKOUT never pressed");
  assert.equal(r.timers.now, m2.at(-1)[1] + ACK_WINDOW_MS, "the stop at the last window's end");
});

test("FC-2e (a known limit): a store that counts presses but shows no count gets at most 1 + RETRIES presses of one meal, then the stop", async () => {
  const r = await fcRun({ afterFirstPress: "stays" });
  assert.deepEqual(r.page.log, Array(1 + RETRIES).fill([MEALS[0], ADD]), "one meal, three presses, never more");
  assert.equal(r.page.store.pending.length, 1 + RETRIES, "the store took all three: § 1.2 can only trust a count it is shown");
  assert.match(r.last, new RegExp(`^\\${LOG_PREFIX} stopped: the store counted 0 of ${FC_TOTAL}; short: `));
  assert.deepEqual(r.page.controls, []);
});

test("FC-2 (mutant): the count read only before a unit's first press (a re-press on the clock alone) — FC-2b fails", async () => {
  const text = await script();
  assert.equal(text.split(COUNTED).length, 2, "the count test the mutant narrows is in the shipped text, once");
  const mutant = text.replace(COUNTED, "if (n > list[k][1] && !tries)");
  const r = await fcRun({ text: mutant, fates: fatesFrom({ 2: { ackMs: 2000 } }) });
  assert.notDeepEqual(pressesOf(r.page, MEALS[2]).map(([label]) => label), [ADD, INC, INC], "the mutant presses again");
  assert.notEqual(r.last, `${LOG_PREFIX} done: /checkout`, "and does not reach done");
});
