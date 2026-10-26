// Shared by fc-08-extra-meal.test.mjs and fc-08-mutants.test.mjs (SPEC-rung2-fill-c § 8: a plan carries the extra meal
// its data/plans.json `selection` row gives, 5 meals on the 4 plan, 15 on the 14). Not a test file itself. Each check
// returns the problems it finds (none: the case holds), so a mutant made in a MIRROR of the package runs through the
// same check the case runs on the tree (§ 8 item 5; MS-10's way, test/ms-checks.mjs).
//
// The expectations are the CONTRACT's, written here from § 8's own words ("4 → 4 or 5; 14 → 14 or 15; 7, 10, 21 and
// Family's unchanged"; "the plan takes 4 or 5 meals; the link has 6"), never read back from countTable.
import { LOG_PREFIX, MEALS } from "./r2-harness.mjs";
import { EXTRA, fcRun } from "./fc-harness.mjs";
import { PLANS } from "./cc-harness.mjs";

/** An individual plan's mpid at `meals` a week, from data/plans.json: the cases name plans, not numbers. */
export const mpidOf = (id, meals) => PLANS.individual.find((p) => p.id === id).counts.find((c) => c.meals_per_week === meals).mpid;
export const LEAN_4 = mpidOf("lean", 4);
export const LEAN_14 = mpidOf("lean", 14);
export const pathOf = (mpid) => `/order?mpid=${mpid}`;

/** A 5-meal link on Lean 4: four meals, one of them twice (so the store's "+" is pressed too). */
export const FIVE = {
  mpid: LEAN_4,
  items: [{ name: MEALS[0], qty: 2 }, { name: MEALS[1], qty: 1 }, { name: MEALS[2], qty: 1 }, { name: EXTRA[0], qty: 1 }],
};
/** The link's meals, one name per unit. */
export const unitsOf = (payload) => payload.items.flatMap((it) => Array(it.qty).fill(it.name));
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

/**
 * FC-8a (and FC-8d's 15): `text` given a link one meal above its plan's count (by default 5 on Lean 4's mpid), on a
 * store that takes one meal above the plan's count (`above: 1`) and counts every press at once: the log names the plan,
 * every unit is pressed, the store's CHECKOUT is pressed once with the plan holding exactly the link's meals, and the
 * fill says done.
 */
export async function extraMealProblems(text, { width = "bar", payload = FIVE } = {}) {
  const r = await fcRun({ text, payload, path: pathOf(payload.mpid), width, above: 1 });
  const problems = [];
  if (!r.ours.includes(`${LOG_PREFIX} fill C, mpid ${payload.mpid}`)) problems.push(`no "fill C, mpid ${payload.mpid}": ${JSON.stringify(r.ours)}`);
  if (r.last !== `${LOG_PREFIX} done: /checkout`) problems.push(`not done: ${r.last}`);
  if (JSON.stringify(r.page.controls) !== JSON.stringify(["checkout:shown"])) problems.push(`CHECKOUT not pressed once: ${JSON.stringify(r.page.controls)}`);
  if (!same(r.page.atCheckout ?? [], unitsOf(payload))) problems.push(`the plan at CHECKOUT is not the link's: ${JSON.stringify(r.page.atCheckout)}`);
  return problems;
}

/**
 * FC-8e (§ 8 item 3): § 1.4 waits for the LINK's total, not the plan's count. The store takes the fifth meal (its cards
 * count 5, its CHECKOUT enabled, the plan's count of 4 being met) but its plan's own count reads 4: CHECKOUT must not be
 * pressed, and after § 1.4's 10 s the stop names the counts. Returns the problems and the run.
 */
export async function showsFourProblems(text, { width = "bar" } = {}) {
  const r = await fcRun({ text, payload: FIVE, path: pathOf(LEAN_4), width, above: 1, planShowsAtMost: 4 });
  const problems = [];
  const enabled = r.page.displayed().filter((label) => /^CHECKOUT( NOW)?$/.test(label));
  if (!enabled.length) problems.push(`fixture control: the store's CHECKOUT is not displayed and enabled at the end: ${JSON.stringify(r.page.displayed())}`);
  if (r.page.controls.length) problems.push(`CHECKOUT pressed with the plan showing 4 of a 5-meal link: ${JSON.stringify(r.page.controls)}`);
  const want = `${LOG_PREFIX} stopped: the store counted 5 of 5; the plan shows 4`;
  if (r.last !== want) problems.push(`the stop line is ${JSON.stringify(r.last)}, not ${JSON.stringify(want)}`);
  return { problems, r };
}

/** FC-8h's fixture (test/fixtures/fc-08-plans.json): plans of 7 (mpid 101), 8 (102) and Family's 1 (103); 9 meals go
 *  through the 8. What § 8 item 1 says countTable gives for it. */
export const FIXTURE_TOTALS = { 101: [7], 102: [8, 9], 103: [1] };

/** FC-8h: `table` (countTable over the fixture) is § 8 item 1's, exactly. */
export function fixtureTableProblems(table) {
  const got = JSON.stringify(table);
  const want = JSON.stringify(FIXTURE_TOTALS);
  return got === want ? [] : [`countTable over the fixture is ${got}, not ${want}`];
}

/**
 * § 8 item 1 over today's data/plans.json, as the contract words it: every individual plan's 4 takes 4 or 5, its 14 takes
 * 14 or 15, its 7, 10 and 21 their own count alone, and Family (since SPEC-ui-and-copy-pass § 2.2) its 5 or 10.
 * mpid -> allowed totals.
 */
export function contractTotals() {
  const extra = { 4: [4, 5], 14: [14, 15] };
  const out = {};
  for (const plan of PLANS.individual) for (const c of plan.counts) out[c.mpid] = extra[c.meals_per_week] ?? [c.meals_per_week];
  // ⚠ AMENDED by SPEC-ui-and-copy-pass § 2.2 item 4 (2026-10-25): Family's one product takes its counts, 5 or 10.
  for (const c of PLANS.family.counts) out[c.mpid] = [5, 10];
  return out;
}
