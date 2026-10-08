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
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, ROOT } from "../build.mjs";
import { ON, picksDir } from "./cc-harness.mjs";
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

// The version-2 picks file (§ 5): each cart is checked as today's menus are (the link tool's own payloadFromArgs with
// the cart's plan as the count), its (lunch_dinner, weekends, breakfast) must be a row of data/plans.json's selection
// and its plan that row's; two carts for one row, a plan not sold, an unknown field or list, a version other than 1 or 2,
// and a snack list whose meals do not make its days (7 or 5) are refused. The refusal names the file and the cart. A
// missing cart is allowed (§ 4's fallback).
const V2 = JSON.parse(await readFile(join(ROOT, "test", "fixtures", "picks-v2", "2026-10-04.json"), "utf8"));
const FILE = "2026-10-04.json";
const changedV2 = (change) => {
  const week = structuredClone(V2);
  change(week);
  return week;
};
const carts = (w) => w.lists["chefs-choice"].carts;
const cartFor = (w, ld, weekends, breakfast) =>
  carts(w).find((c) => c.lunch_dinner === ld && c.weekends === weekends && c.breakfast === breakfast);

/** Build with one picks file, the week open on --on; the error (or null) and whether anything was written. */
async function attemptPicks(body) {
  const dir = await picksDir({ [FILE]: body });
  const outDir = join(await mkdtemp(join(tmpdir(), "boston-ms-06-picks-")), "out");
  try {
    let error = null;
    try {
      await build({ target: "prod", outDir, picksDir: dir, on: ON });
    } catch (err) {
      error = err;
    }
    return { error, wrote: existsSync(outDir) };
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(join(outDir, ".."), { recursive: true, force: true });
  }
}

test("MS-6 (control): the version-2 fixture builds; so does it with a cart missing (§ 4's fallback)", async () => {
  assert.equal((await attemptPicks(V2)).error, null);
  const missing = changedV2((w) => w.lists["chefs-choice"].carts.splice(1, 1));
  assert.equal((await attemptPicks(missing)).error, null);
});

const PICKS_CASES = [
  ["a cart whose qty does not make its plan", (w) => (cartFor(w, "or", false, false).items[0].qty += 1), /carts\[1\] \(or, weekdays, no breakfast\): the plan needs 4 meals; the link has 5/],
  ["a combination not in selection (Q1 both)", (w) => (carts(w)[0].lunch_dinner = "both"), /carts\[0\]: lunch_dinner "both", weekends true, breakfast false is not a row of data\/plans\.json's selection/],
  ["a combination not in selection (weekends as text)", (w) => (carts(w)[0].weekends = "yes"), /carts\[0\]: lunch_dinner "or", weekends "yes", breakfast false is not a row/],
  ["two carts for one row", (w) => carts(w).push(structuredClone(carts(w)[0])), /carts\[8\] \(or, every day, no breakfast\): a second cart for or-7d \(the first is carts\[0\]\)/],
  ["a plan not sold (5)", (w) => (cartFor(w, "or", false, false).plan = 5), /carts\[1\] \(or, weekdays, no breakfast\): plan 5 is not a plan the store sells \(4, 7, 10, 14, 21\)/],
  ["a plan sold but not the row's (7 for 5 meals)", (w) => (cartFor(w, "or", false, false).plan = 7), /carts\[1\] \(or, weekdays, no breakfast\): plan 7 is not its row's plan \(4\)/],
  ["an unknown field on a cart (a price)", (w) => (carts(w)[2].price_cents = 1250), /carts\[2\]: unknown field "price_cents"/],
  ["an unknown field on a meal (an internal id)", (w) => (carts(w)[2].items[0].slug = "x"), /carts\[2\] \(and, every day, no breakfast\)\.items\[0\] "Smoked Paprika Chicken Bowl": unknown field "slug"/],
  ["an unknown field on the file", (w) => (w.menus = {}), /the file: unknown field "menus"/],
  ["a list the page does not show", (w) => (w.lists["family-favourites"] = w.lists["chefs-choice"]), /lists: "family-favourites" is not a list the page shows \(chefs-choice\)/],
  ["no list", (w) => (w.lists = {}), /lists: no "chefs-choice"/],
  ["a version the page does not read", (w) => (w.version = 3), /version 3 is not one the page reads \(1, 2\)/],
  ["a cart with no meals", (w) => (carts(w)[0].items = []), /carts\[0\] \(or, every day, no breakfast\)\.items must be a list of meals/],
  ["snacks that do not make their days", (w) => (w.lists["chefs-choice"].snacks["7"][0].qty += 1), /snacks\.7: the snacks for 7 days are 7; the list has 8/],
  ["snacks for days the page does not offer", (w) => (w.lists["chefs-choice"].snacks["6"] = w.lists["chefs-choice"].snacks["7"]), /snacks: "6" is not 7 or 5 days/],
  ["a snack named twice", (w) => (w.lists["chefs-choice"].snacks["7"][1].name = w.lists["chefs-choice"].snacks["7"][0].name), /snacks\.7: .*named twice/],
];

for (const [label, change, reason] of PICKS_CASES) {
  test(`MS-6 (version 2): ${label}: the build fails, naming the file and the cart, and writes nothing`, async () => {
    const { error, wrote } = await attemptPicks(changedV2(change));
    assert.ok(error, "the build fails");
    assert.ok(error.message.includes(FILE), `the message names the file: ${error.message}`);
    assert.match(error.message, reason);
    assert.equal(wrote, false, "nothing is written");
  });
}
