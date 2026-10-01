// FC-5 (SPEC-rung2-fill-c § 1.5, § 7 a's default): a meal the store shows ABOVE the link's count for it stops fill C
// with nothing more pressed (the store's own "remove" is the visitor's). Read at every one of fill C's reads, for every
// meal. A count above the unit's number but within the meal's (the store counting a press twice on a meal of 3) is not
// over: the unit is counted, and a later unit the store already shows is not pressed. On a clock (fc-harness.mjs).
// ⭐ The mutant, IN MEMORY: the over check removed: FC-5a fails (fill C presses on past an over-count).
import test from "node:test";
import assert from "node:assert/strict";
import { ACK_WINDOW_MS, ADD, INC, MEALS, script } from "./r2-harness.mjs";
import { assertDone, assertFullPlan, fatesFrom, fcRun, keyOf, parseCounted, pressesOf, shortNow } from "./fc-harness.mjs";

const OVER_CHECK = "if (/; over:/.test(s)) fail(s);";
/** Store press 1 is MEALS[1] (one of it in the link), pressed at 0.3 s. */
const LATE_PAST_WINDOW = { 1: { ackMs: ACK_WINDOW_MS + 400 } };

async function lateAfterRepress(text) {
  // MEALS[1]'s count comes 5.5 s after its press: after fill C's re-read (5.1 s), whose re-press the store counts at
  // once. Then the late one lands: 2 of 1.
  const r = await fcRun({ text, fates: fatesFrom(LATE_PAST_WINDOW) });
  const m1 = pressesOf(r.page, MEALS[1]);
  assert.deepEqual(m1.map(([label]) => label), [ADD, ADD], "fixture control: the re-press");
  const overAt = m1[0][1] + LATE_PAST_WINDOW[1].ackMs;
  assert.equal(r.page.max.get(MEALS[1]), 2, "fixture control: the store showed 2 of 1");
  assert.ok(r.page.at.every((t) => t <= overAt), `nothing pressed after the over-count appeared (${overAt} ms): ${r.page.at}`);
  assert.deepEqual(r.page.controls, [], "CHECKOUT never pressed");
  const said = parseCounted(r.last);
  assert.ok(said, r.last);
  assert.deepEqual(said.over, [keyOf(MEALS[1])], "the stop names the meal over");
  return r;
}

test("FC-5a: a late count after the re-press (2 of 1) — stopped at the next read, naming it over; nothing more pressed", async () => {
  await lateAfterRepress(await script());
});

test("FC-5b: the store counts one press as two on a meal of 1 — stopped at the next read, nothing more pressed", async () => {
  const r = await fcRun({ fates: fatesFrom({ 1: { twice: true } }) });
  assert.deepEqual(r.page.log, [[MEALS[0], ADD], [MEALS[1], ADD]], "MEALS[1]'s press, then nothing");
  const said = parseCounted(r.last);
  assert.ok(said, r.last);
  assert.deepEqual(
    [said.k, said.n, said.short, said.over, said.rest],
    [3, 14, shortNow(r.page), [keyOf(MEALS[1])], ""],
    "the store counted 3 of 14 (1 + 2), every meal short named, MEALS[1] over",
  );
});

test("FC-5c: one press counted as two on a meal of 3 is not over — its next unit, already shown, is not pressed; the plan full", async () => {
  // Store press 2 is MEALS[2]'s Add to Cart (3 of it in the link): the store shows 2.
  const r = await fcRun({ fates: fatesFrom({ 2: { twice: true } }) });
  assert.deepEqual(pressesOf(r.page, MEALS[2]).map(([label]) => label), [ADD, INC], "two presses for its three");
  assertDone(r);
  assertFullPlan(r.page);
});

test("FC-5 (mutant): the over check removed — FC-5a fails", async () => {
  const text = await script();
  assert.equal(text.split(OVER_CHECK).length, 2, "the over check the mutant removes is in the shipped text, once");
  await assert.rejects(lateAfterRepress(text.replace(OVER_CHECK, "")), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});
