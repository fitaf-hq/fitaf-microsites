// MS-1 (SPEC-meal-selection.md § 6): the eight rows. Each answer set's result card shows its PLAN (§ 2): the plan's meals
// a week (§ 8 item 4, new), its price per meal and its weekly total, and Choose your meals is the plan's order page at
// the chosen size; 5 -> 4 and 15 -> 14 carry the rounded line (`plan_page.rounded`), and no other row does. At every size.
// The expectations are the contract's table (ms-harness TABLE), not data/plans.json's: a page rounding 5 up fails here.
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 1.2 item 1 (2026-10-23): the meals a week are the row's meals (5, 15), and the weekly
// total those meals at the plan's price a meal (ms-checks rowProblems).
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 5 item 2 (2026-10-26): the rounded line is never printed, on no row (rowProblems);
// the phrase stays in data/messages.json, and the rows 5 -> 4 and 15 -> 14 are still the plan's (their figures, their link).
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 7 item 4 (2026-10-26, the Advisor: "drop the meal count please"): the card shows
// the weekly total alone, no meals a week and no price a meal (rowProblems), and the second case is INVERTED: the meals a
// week are gone, and their unit (`plan_page.meals_unit`) with them, from the card and from data/messages.json.
import test from "node:test";
import assert from "node:assert/strict";
import { MESSAGES } from "./cc-harness.mjs";
import { rowProblems } from "./ms-checks.mjs";
import { open, pageOf, ROUNDED } from "./ms-harness.mjs";

test("MS-1: every answer set, at every size, shows its plan's meals, price and weekly total; 5 -> 4 and 15 -> 14 the rounded line", async () => {
  assert.deepEqual(ROUNDED, ["or-5d", "and-5d-b"], "fixture control: the contract's two rounded rows");
  assert.ok(MESSAGES.plan_page?.rounded?.includes("{meals}") && MESSAGES.plan_page.rounded.includes("{plan}"), "plan_page.rounded, with {meals} and {plan}");
  assert.deepEqual(rowProblems(await pageOf()), []);
});

test("MS-1: the meals a week are gone from the card, and their unit with them (SPEC-ui-and-copy-pass § 7 item 4)", async () => {
  const page = open(await pageOf(), "#lean-or-5d");
  assert.equal(page.el("result").hasAttribute("hidden"), false, "control: the card is shown");
  assert.equal(page.has("result-meals"), false, "no #result-meals");
  assert.ok(!("meals_unit" in MESSAGES.plan_page), "no plan_page.meals_unit");
  assert.doesNotMatch(page.el("result").querySelector(".price").textContent, /meals\/week/, "no meals a week in the price");
});
