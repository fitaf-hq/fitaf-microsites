// EM1 (SPEC-every-menu-and-nutrition.md § 1, § 6): the file. A version-2 week may carry more lists than `chefs-choice`,
// each named by the page's words (data/messages.json `menus`), and an optional `meals` map, each meal's nutrition per
// individual size, its ingredients and its Contains. The fixture week (test/fixtures/picks-menus/: Chef's Choice, an
// invented list, and `meals`) builds and makes its content with the fixture's words; each refusal names the file and
// its place, and writes nothing (test/em-checks.mjs holds the cases, which EM1's mutant runs on a mirror). Since § 1 item 2's
// amendment (1fb2b19): an entry of numbers alone, or of ingredients alone, is accepted, and `"meals": {}` too.
import test from "node:test";
import assert from "node:assert/strict";
import { ACCEPTED, acceptanceProblems, acceptedProblems, REAL_LIST, realListProblems, REFUSALS, refusalProblems } from "./em-checks.mjs";
import { BOTH, CC_ONLY, FIXTURE_LIST, MENUS, SIZES } from "./em-harness.mjs";

test("EM1 (fixture control): the week has two lists, a cart for some answers in both and for others in Chef's Choice alone, and meals", () => {
  assert.deepEqual(Object.keys(MENUS.lists), ["chefs-choice", FIXTURE_LIST]);
  assert.ok(BOTH.length >= 2 && CC_ONLY.length >= 2, `answer sets in both lists (${BOTH}) and in Chef's Choice alone (${CC_ONLY})`);
  const entries = Object.values(MENUS.meals);
  assert.ok(entries.some((e) => SIZES.every((s) => s in e.nutrition)), "a meal with every size");
  assert.ok(entries.some((e) => !SIZES.every((s) => s in e.nutrition)), "a meal without every size");
  assert.ok(entries.some((e) => e.ingredients !== undefined && e.contains === undefined), "a meal with ingredients and no Contains");
  assert.ok(entries.some((e) => e.nutrition && e.ingredients === undefined), "a meal of numbers alone (§ 1 item 2, amended)");
  assert.ok(entries.some((e) => e.ingredients && e.nutrition === undefined), "a meal of ingredients alone (§ 1 item 2, amended)");
});

test("EM1: the fixture week builds and makes its content with the fixture's words", async () => {
  assert.deepEqual(await acceptanceProblems(), []);
});

test(`EM1: a week naming a real list (${REAL_LIST}) builds and makes its content with data/messages.json as committed`, async () => {
  assert.deepEqual(await realListProblems(), []);
});

for (const [label] of ACCEPTED) {
  test(`EM1: accepted (§ 1 item 2, amended): ${label}`, async () => {
    assert.deepEqual(await acceptedProblems(undefined, [label]), []);
  });
}

for (const [label] of REFUSALS) {
  test(`EM1: refused, naming the file and its place: ${label}`, async () => {
    assert.deepEqual(await refusalProblems(undefined, [label]), []);
  });
}
