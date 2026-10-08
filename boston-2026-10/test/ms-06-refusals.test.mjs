// MS-6 (SPEC-meal-selection.md § 6): refusals. A broken meal selection or a broken version-2 picks file fails the build,
// naming the file (and the row or the cart), before anything is written. Every case changes ONE thing in an input that
// builds (the control), so each fails for its own reason.
//
// data/plans.json (§ 2, § 4, § 9 item 3): a `plan` not sold at every size, a `plan` above its `meals`, a row missing or
// twice, a row's `meals` not what its answers come to, an unknown field, a default or a snacks flag that is not a
// boolean, and `snacks.carted` true (no link carries a snack in this build: § 4).
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../build.mjs";
import { noPicksDir, plansCopy } from "./ms-harness.mjs";

/** Build with a changed copy of data/plans.json; the error (or null) and whether the output directory was written. */
async function attemptPlans(change) {
  const plans = await plansCopy(change);
  const picks = await noPicksDir();
  const outDir = join(await mkdtemp(join(tmpdir(), "boston-ms-06-")), "out");
  try {
    let error = null;
    try {
      await build({ target: "prod", outDir, plansPath: plans.path, picksDir: picks.dir });
    } catch (err) {
      error = err;
    }
    return { error, wrote: existsSync(outDir) };
  } finally {
    await plans.done();
    await picks.done();
    await rm(join(outDir, ".."), { recursive: true, force: true });
  }
}

const row = (plans, key) => {
  const [ld, days, b] = key.split("-");
  return plans.selection.find((r) => r.lunch_dinner === ld && r.weekends === (days === "7d") && r.breakfast === (b === "b"));
};

test("MS-6 (control): the committed data/plans.json builds", async () => {
  const { error, wrote } = await attemptPlans(() => {});
  assert.equal(error, null);
  assert.ok(wrote);
});

const PLAN_CASES = [
  ["a plan not sold (5)", (p) => (row(p, "or-5d").plan = 5), /selection\[1\] \(or, weekdays, no breakfast\): plan 5 is not a count every individual plan sells \(4, 7, 10, 14, 21\)/],
  ["a plan above its meals (5 -> 7, rounded up)", (p) => (row(p, "or-5d").plan = 7), /selection\[1\] \(or, weekdays, no breakfast\): plan 7 is above its meals \(5\)/],
  ["a plan sold by one size only", (p) => (p.individual[0].counts = p.individual[0].counts.filter((c) => c.meals_per_week !== 10)), /plan 10 is not a count every individual plan sells/],
  ["a row missing", (p) => (p.selection = p.selection.filter((r) => r !== row(p, "and-5d-b"))), /no row for and-5d-b \(and, weekdays, breakfast\)/],
  ["two rows for one answer set", (p) => p.selection.push({ ...row(p, "or-7d") }), /two rows for or-7d/],
  ["a row's meals not what its answers come to", (p) => (row(p, "and-7d").meals = 15), /meals 15 is not what the answers come to \(14\)/],
  ["an unknown field on a row (a price)", (p) => (row(p, "or-7d").price_cents = 1250), /selection\[0\]: unknown field "price_cents"/],
  ["a row with no plan", (p) => delete row(p, "or-7d").plan, /selection\[0\]: missing field "plan"/],
  ["Q1 neither or nor and", (p) => (row(p, "or-7d").lunch_dinner = "both"), /lunch_dinner must be "or" or "and", got "both"/],
  ["weekends written as text", (p) => (row(p, "or-7d").weekends = "yes"), /weekends must be true or false, got "yes"/],
  ["no selection", (p) => delete p.selection, /selection must be a list/],
  ["no defaults", (p) => delete p.selection_defaults, /selection_defaults must be an object/],
  ["a default not a boolean", (p) => (p.selection_defaults.breakfast = "no"), /selection_defaults\.breakfast must be true or false/],
  ["an unknown default", (p) => (p.selection_defaults.lunch_dinner = "or"), /selection_defaults: unknown field "lunch_dinner"/],
  ["no snacks row", (p) => delete p.snacks, /snacks must be an object/],
  ["snacks.shown not a boolean", (p) => (p.snacks.shown = 1), /snacks\.shown must be true or false/],
  ["snacks carted (§ 4: not until the hand-off is shown carting one)", (p) => (p.snacks.carted = true), /snacks\.carted is true, but no link carries a snack/],
  ["snacks chosen by default while not shown", (p) => Object.assign(p.snacks, { shown: false }) && (p.selection_defaults.snacks = true), /selection_defaults\.snacks is true while snacks are not shown/],
];

for (const [label, change, reason] of PLAN_CASES) {
  test(`MS-6 (data/plans.json): ${label}: the build fails, naming the file, and writes nothing`, async () => {
    const { error, wrote } = await attemptPlans(change);
    assert.ok(error, "the build fails");
    assert.ok(error.message.startsWith("data/plans.json: "), `the message names the file: ${error.message}`);
    assert.match(error.message, reason);
    assert.equal(wrote, false, "nothing is written");
  });
}
