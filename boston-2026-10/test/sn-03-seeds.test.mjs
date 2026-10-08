// SN-3 (SPEC-snacks-in-the-cart § 5 item 2; SPEC-rung2-fill-c § 4.1 and FC-7's store): the same seeded store as FC-7 —
// it drops 15 % of presses, counts the rest 0 to 2 s late and takes ONE count back 0 to 0.8 s after showing it — now on
// the 14-meal link with its snacks (one behind Select Options, its expansion up to 1 s late; one with Add to Cart
// directly; 17 units), over many seeds at both widths. Each run ends at the FULL plan AND cart (CHECKOUT pressed with
// exactly the link's meals in the plan and its snacks in the cart) or stops naming its shortfall (the line's short list
// exactly the meals and snacks the store shows short, N the link's 17 units, CHECKOUT never pressed): ⛔ never silently
// short, ⛔ never over (no meal's or snack's count ever above the link's), and Select Options never pressed twice on one
// card. The controls: drops, late counts and take-backs occurred, a take-back fell on a snack, and both endings occurred.
import test from "node:test";
import assert from "node:assert/strict";
import { LOG_PREFIX, refKey, seededFates, seeded } from "./r2-harness.mjs";
import { parseCounted } from "./fc-harness.mjs";
import { assertFullCart, assertNeverOverAll, DIRECT, labelsOf, snRun, SN_PAYLOAD, SN_UNITS, TOGGLED } from "./sn-harness.mjs";

const SEEDS = 200;
const ALL = [...SN_PAYLOAD.items, ...SN_PAYLOAD.snacks];
const shortNow = (page) => ALL.filter((it) => page.countOf(it.name) < it.qty).map((it) => refKey(it.name));

test(`SN-3: ${SEEDS} seeds of a store that drops, counts late and takes back, with snacks — the full plan and cart, or a stop naming the shortfall; never over`, async () => {
  const outcomes = { done: 0, stopped: 0 };
  const seen = { drops: 0, late: 0, takenBack: 0, snackTakenBack: 0 };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const fates = seededFates(seed, { takeBackWithin: SN_UNITS });
    const told = [];
    const expandMs = Math.floor(seeded(seed + 1000)() * 1000);
    const r = await snRun({
      width: seed % 2 ? "bar" : "sidebar",
      cards: [{ name: TOGGLED, expandMs }, { name: DIRECT, toggle: false }],
      fates: (i, name) => (told.push(fates(i, name)), told.at(-1)),
    });
    const where = `seed ${seed}: ${JSON.stringify(r.ours)}`;
    assertNeverOverAll(r.page);
    assert.ok(!r.ours.some((l) => l.includes("; over:")), `never over: ${where}`);
    assert.ok(labelsOf(r.page, TOGGLED).filter((l) => l === "Select Options").length <= 1, `Select Options at most once: ${where}`);
    if (r.last === `${LOG_PREFIX} done: /checkout`) {
      outcomes.done += 1;
      assertFullCart(r.page);
    } else {
      outcomes.stopped += 1;
      const said = parseCounted(r.last);
      assert.ok(said, `a stop naming the counts: ${where}`);
      assert.equal(said.n, SN_UNITS, where);
      assert.deepEqual(said.short, shortNow(r.page), `the shortfall named exactly: ${where}`);
      assert.ok(said.short.length > 0, `a stop with nothing short is not a stop of § 1: ${where}`);
      assert.deepEqual(r.page.controls, [], `CHECKOUT never pressed short: ${where}`);
    }
    seen.drops += told.filter((f) => f.drop).length;
    seen.late += told.filter((f) => !f.drop && f.ackMs > 300).length;
    seen.takenBack += r.page.takenBack.length;
    seen.snackTakenBack += r.page.takenBack.filter((n) => n === TOGGLED || n === DIRECT).length;
  }
  assert.equal(outcomes.done + outcomes.stopped, SEEDS);
  assert.ok(outcomes.done > 0 && outcomes.stopped > 0, `control: both endings occurred: ${JSON.stringify(outcomes)}`);
  assert.ok(seen.drops > 0 && seen.late > 0 && seen.takenBack >= SEEDS / 2 && seen.snackTakenBack > 0, `control: the schedule did its things: ${JSON.stringify(seen)}`);
  console.log(`SN-3: ${JSON.stringify({ ...outcomes, ...seen })}`);
});
