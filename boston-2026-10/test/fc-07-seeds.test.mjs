// FC-7 (SPEC-rung2-fill-c § 4.1): a store that, by a seeded schedule (fc-harness's seededFates through r2-harness),
// drops presses (15 % of them), counts the rest late (0 to 2 s) and takes ONE count back after showing it (0 to 0.8 s
// after), run over many seeds at both widths on the 14-meal link. Each run must end at the FULL plan (CHECKOUT pressed
// with exactly the link's meals in the plan) or stop naming its shortfall (the line's short list is exactly the meals
// the store shows short, CHECKOUT never pressed): ⛔ never silently short, and ⛔ never over (no meal's count ever above
// the link's, so no press of fill C's was ever counted twice). The controls: the schedule exercised drops, late counts
// and take-backs, and both endings occurred.
import test from "node:test";
import assert from "node:assert/strict";
import { LOG_PREFIX, seededFates } from "./r2-harness.mjs";
import { assertFullPlan, assertNeverOver, fcRun, FC_TOTAL, parseCounted, shortNow } from "./fc-harness.mjs";

const SEEDS = 200;

test(`FC-7: ${SEEDS} seeds of a store that drops, counts late and takes back — the full plan, or a stop naming the shortfall; never over`, async () => {
  const outcomes = { done: 0, stopped: 0 };
  const seen = { drops: 0, late: 0, takenBack: 0 };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const fates = seededFates(seed);
    const told = [];
    const r = await fcRun({ width: seed % 2 ? "bar" : "sidebar", fates: (i, name) => (told.push(fates(i, name)), told.at(-1)) });
    const where = `seed ${seed}: ${JSON.stringify(r.ours)}`;
    assertNeverOver(r.page);
    assert.ok(!r.ours.some((l) => l.includes("; over:")), `never over: ${where}`);
    if (r.last === `${LOG_PREFIX} done: /checkout`) {
      outcomes.done += 1;
      assertFullPlan(r.page);
    } else {
      outcomes.stopped += 1;
      const said = parseCounted(r.last);
      assert.ok(said, `a stop naming the counts: ${where}`);
      assert.equal(said.n, FC_TOTAL, where);
      assert.deepEqual(said.short, shortNow(r.page), `the shortfall named exactly: ${where}`);
      assert.ok(said.short.length > 0, `a stop with nothing short is not a stop of § 1: ${where}`);
      assert.deepEqual(r.page.controls, [], `CHECKOUT never pressed short: ${where}`);
    }
    seen.drops += told.filter((f) => f.drop).length;
    seen.late += told.filter((f) => !f.drop && f.ackMs > 300).length;
    seen.takenBack += r.page.takenBack.length;
  }
  assert.equal(outcomes.done + outcomes.stopped, SEEDS);
  assert.ok(outcomes.done > 0 && outcomes.stopped > 0, `control: both endings occurred: ${JSON.stringify(outcomes)}`);
  assert.ok(seen.drops > 0 && seen.late > 0 && seen.takenBack >= SEEDS / 2, `control: the schedule did its three things: ${JSON.stringify(seen)}`);
});
