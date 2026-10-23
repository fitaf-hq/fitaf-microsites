// MS-19 (SPEC-meal-selection.md § 13 items 1-3, the Owner's rule to try: *"Weekdays get 3 snacks … Plus weekends get 2
// snacks"*; the Advisor, 2026-10-22: *"the snack rules were not implemented – we should not be doing 1 snack per day"*):
// a week's snack list holds between 1 and one a day, not exactly one. A fixture week (the v2 fixture, invented names) with
// a list of 5 for every day and of 3 for weekdays builds and makes its content; the card shows each list, its lines
// counting 5 and 3, and its checkout link carries them, 5 and 3 snack units (the units the store's recap counts:
// `recap_snacks`' {s} is the link's snack units, SN-2f); a list of 8 for 7 days and an empty list are refused, each
// naming its file and its list. ⭐ Mutant: the old exact check (the list's total must BE its days) in a mirror turns
// MS-19 red; the unchanged mirror passes. Every expectation is the contract's, worked out here from the fixture.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mealLine, mirror, picksDir } from "./cc-harness.mjs";
import { cardOf, keysOf, open, pageOf, SNACKS_CARTED, V2, withSnacks } from "./ms-harness.mjs";

const FILE = "2026-10-04.json";
const LIST = "chefs-choice";
/** § 13: the Owner's rule as Fit AF's picks hold it, 5 for every day and 3 for weekdays (invented names: the fixture's). */
const SEVEN = V2.lists[LIST].snacks["7"].slice(0, 3).map((m, i) => ({ ...m, qty: [2, 2, 1][i] }));
const FIVE = V2.lists[LIST].snacks["7"].slice(0, 3).map((m) => ({ ...m, qty: 1 }));
const total = (list) => list.reduce((n, m) => n + m.qty, 0);
const weekWith = (seven, five) => {
  const week = structuredClone(V2);
  week.lists[LIST].snacks = { 7: seven, ...(five ? { 5: five } : {}) };
  return week;
};

/** A temporary plans.json with the snacks shown and carted (SPEC-snacks-in-the-cart § 4: the link carries the list). */
async function cartedPlans() {
  const dir = await mkdtemp(join(tmpdir(), "boston-ms-19-plans-"));
  const path = join(dir, "plans.json");
  await writeFile(path, JSON.stringify(withSnacks(SNACKS_CARTED), null, 2));
  return { path, done: () => rm(dir, { recursive: true, force: true }) };
}

/** The page of the package at `root` with `week` in it (the content's refusal thrown as is). */
async function pageWithWeek(root, week) {
  const picks = await picksDir({ [FILE]: week });
  const plans = await cartedPlans();
  try {
    return await pageOf({ root, picks, plansPath: plans.path });
  } finally {
    await plans.done();
    await rm(picks, { recursive: true, force: true });
  }
}

/** MS-19's acceptance on the package at `root`: one line per thing it does not hold; [] when all do. */
export async function countProblems(root) {
  assert.deepEqual([total(SEVEN), total(FIVE)], [5, 3], "fixture control: lists of 5 and 3");
  let html;
  try {
    html = await pageWithWeek(root, weekWith(SEVEN, FIVE));
  } catch (err) {
    return [`refused: ${err.message}`];
  }
  const problems = [];
  for (const [hash, list, days] of [["#lean-or-7d-s", SEVEN, 7], ["#lean-or-5d-s", FIVE, 5]]) {
    const card = cardOf(open(html, hash));
    const want = list.map((m) => mealLine(m));
    if (JSON.stringify(card.snackLines) !== JSON.stringify(want)) problems.push(`${hash}: the card's snacks ${JSON.stringify(card.snackLines)}, not ${JSON.stringify(want)}`);
    const units = Object.entries(keysOf(card.checkout ?? "https://x.invalid/#fitaf=2")).filter(([k]) => k.startsWith("_")).reduce((n, [, q]) => n + q, 0);
    if (units !== total(list)) problems.push(`${hash}: the checkout link carries ${units} snack units, not the list's ${total(list)} (for ${days} days)`);
  }
  return problems;
}

/** MS-19's refusals on the package at `root`: [label, the week, the refusal after the file's name]. */
const REFUSALS = [
  ["a list of 8 for 7 days", weekWith(SEVEN.map((m, i) => (i ? m : { ...m, qty: m.qty + 3 })), FIVE), /lists\.chefs-choice\.snacks\.7: the snacks for 7 days are at least 1 and at most 7; the list has 8/],
  ["an empty list", weekWith(SEVEN, []), /lists\.chefs-choice\.snacks\.5\b/],
];

test("MS-19: lists of 5 (every day) and 3 (weekdays) build; the card shows them and its link carries 5 and 3 snack units", async () => {
  assert.deepEqual(await countProblems(), []);
});

for (const [label, week, refusal] of REFUSALS) {
  test(`MS-19: refused, naming the file and its list: ${label}`, async () => {
    await assert.rejects(pageWithWeek(undefined, week), (err) => {
      assert.match(err.message, new RegExp(`${FILE.replace(/\./g, "\\.")}: (.*)?${refusal.source}`));
      return true;
    });
  });
}

/** § 13 item 1's check, the one line of scripts/chefs-choice.mjs that bounds a list's total, and the check it replaced. */
const CHECK = "if (total < 1 || total > Number(d)) throw new Error(`${where}: the snacks for ${d} days are at least 1 and at most ${d}; the list has ${total}`);";
const EXACT = "if (total !== Number(d)) throw new Error(`${where}: the snacks for ${d} days are ${d}; the list has ${total}`);";

test("MS-19 (mutant): the old exact check (the list's total its days) in a mirror fails MS-19; the unchanged mirror passes", async () => {
  const control = await mirror();
  const mutant = await mirror(async (dir) => {
    const path = join(dir, "scripts", "chefs-choice.mjs");
    const text = await readFile(path, "utf8");
    assert.equal(text.split(CHECK).length - 1, 1, "fixture control: the check, once");
    await writeFile(path, text.replace(CHECK, EXACT));
  });
  try {
    assert.deepEqual(await countProblems(control), [], "control: the unchanged mirror");
    const problems = await countProblems(mutant);
    // The exact check refuses the first list it reads that is not its days (the 5-day list of 3, or the 7-day list of 5).
    assert.ok(problems.some((p) => /^refused: .*snacks\.(5|7): the snacks for (5|7) days are \2; the list has (3|5)$/.test(p)), problems.join("\n"));
  } finally {
    await rm(control, { recursive: true, force: true });
    await rm(mutant, { recursive: true, force: true });
  }
});
