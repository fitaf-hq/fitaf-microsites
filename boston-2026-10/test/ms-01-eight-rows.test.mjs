// MS-1 (SPEC-meal-selection.md § 6): the eight rows. Each answer set's result card shows its PLAN (§ 2): the plan's meals
// a week (§ 8 item 4, new), its price per meal and its weekly total, and Choose your meals is the plan's order page at
// the chosen size; 5 -> 4 and 15 -> 14 carry the rounded line (`plan_page.rounded`), and no other row does. At every size.
// The expectations are the contract's table (ms-harness TABLE), not data/plans.json's: a page rounding 5 up fails here.
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

test("MS-1: the meals a week carry their unit, a phrase of data/messages.json", async () => {
  const page = open(await pageOf(), "#lean-or-5d");
  const unit = page.el("result-meals").parentElement.querySelector(".unit");
  assert.equal(unit?.textContent, MESSAGES.plan_page.meals_unit, "plan_page.meals_unit beside the figure");
});
