// FC-3 (SPEC-rung2-fill-c § 1.3 and § 4.1): after the last unit is counted, fill C waits SETTLE_MS and reads every
// meal's count once more; a meal the store has since taken back is completed by § 1.1–1.2, ONCE (no second settle);
// any count taken back after that read is § 1.4's to catch, before CHECKOUT, and the stop names it. On a clock
// (fc-harness.mjs), the store counting at once: the fourteen presses 300 ms apart (the last at 3.9 s), the last counted
// at 4.2 s, the settled read at 5.2 s. Store press 1 is MEALS[1] (one of it in the link), its only press.
// ⭐ The mutant, IN MEMORY: the settled read skipped (the last unit goes straight to the check before CHECKOUT): FC-3a
// fails, the take-back never completed.
import test from "node:test";
import assert from "node:assert/strict";
import { ADD, LOG_PREFIX, MEALS, MIN_GAP_MS, script, SETTLE_MS } from "./r2-harness.mjs";
import { assertDone, assertFullPlan, assertNeverOver, EXTRA, fatesFrom, fcRun, FC_TOTAL, keyOf, pressesOf } from "./fc-harness.mjs";

const SETTLED = "fill(p, steps(p.items), settle)";

async function takenBackCase(text) {
  // MEALS[1] counted at once (0.3 s), taken back 0.5 s later, while fill C presses the other meals.
  const r = await fcRun({ text, fates: fatesFrom({ 1: { takeBackMs: 500 } }) });
  assert.deepEqual(r.page.takenBack, [MEALS[1]], "fixture control: the store took MEALS[1]'s count back");
  const m1 = pressesOf(r.page, MEALS[1]);
  assert.deepEqual(m1.map(([label]) => label), [ADD, ADD], "its Add to Cart again, once");
  const lastMain = r.page.at[FC_TOTAL - 1];
  assert.equal(m1[1][1] - lastMain, MIN_GAP_MS + SETTLE_MS, "at the settled read: the last unit's count, then SETTLE_MS");
  assertDone(r);
  assertFullPlan(r.page);
  assertNeverOver(r.page);
  return r;
}

test("FC-3a: a count taken back after the meal's last unit is completed by the settled re-read; then CHECKOUT", async () => {
  await takenBackCase(await script());
});

test("FC-3b: the settled read happens once — a count taken back after it is caught before CHECKOUT, named, never silent", async () => {
  // MEALS[1] taken back as in FC-3a (completed at 5.2 s); EXTRA[7] (store press 10, counted at 3.0 s) taken back at
  // 5.3 s: after the settled read and before the completion's count is read (5.5 s). No second settle: the check before
  // CHECKOUT sees the plan one short and stops, naming it.
  const r = await fcRun({ fates: fatesFrom({ 1: { takeBackMs: 500 }, 10: { takeBackMs: 2300 } }) });
  assert.deepEqual(r.page.takenBack, [MEALS[1], EXTRA[7]], "fixture control: both taken back");
  assert.equal(pressesOf(r.page, EXTRA[7]).length, 1, "EXTRA[7] not pressed again: the settled read came before its take-back");
  assert.equal(pressesOf(r.page, MEALS[1]).length, 2, "MEALS[1] completed once");
  assert.deepEqual(r.page.controls, [], "CHECKOUT never pressed with the plan short");
  assert.equal(
    r.last,
    `${LOG_PREFIX} stopped: the store counted 13 of ${FC_TOTAL}; short: ${keyOf(EXTRA[7])}; the plan shows 13; no checkout control`,
  );
});

test("FC-3 (mutant): the settled read skipped — FC-3a fails (the take-back is never completed)", async () => {
  const text = await script();
  assert.equal(text.split(SETTLED).length, 2, "the settled read the mutant skips is in the shipped text, once");
  const mutant = text.replace(SETTLED, "fill(p, steps(p.items), checkout)");
  await assert.rejects(takenBackCase(mutant), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});
