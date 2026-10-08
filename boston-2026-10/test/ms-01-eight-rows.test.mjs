// MS-1 (SPEC-meal-selection.md § 6): the eight rows. Each answer set's result card shows its PLAN (§ 2): the plan's meals
// a week (§ 8 item 4, new), its price per meal and its weekly total, and Choose your meals is the plan's order page at
// the chosen size; 5 -> 4 and 15 -> 14 carry the rounded line (`plan_page.rounded`), and no other row does. At every size.
// The expectations are the contract's table (ms-harness TABLE), not data/plans.json's: a page rounding 5 up fails here.
import test from "node:test";
import assert from "node:assert/strict";
import { MESSAGES } from "./cc-harness.mjs";
import { centsOf, dollars, fragmentOf, GOALS, mpidOf, open, pageOf, resultOf, ROUNDED, TABLE } from "./ms-harness.mjs";

const fill = (phrase, values) => phrase.replace(/\{([a-z]+)\}/g, (whole, k) => (k in values ? String(values[k]) : whole));

/** One line per thing the card at `fragment` gets wrong against the contract's row; [] when it is right. */
export function rowProblems(html) {
  const problems = [];
  for (const goal of GOALS) {
    for (const row of TABLE) {
      const hash = fragmentOf(goal, row);
      const r = resultOf(open(html, hash));
      const want = {
        shown: true,
        selection: row.key,
        meals: String(row.plan),
        perMeal: dollars(centsOf(goal, row.plan)),
        total: dollars(row.plan * centsOf(goal, row.plan)),
        rounded: row.plan < row.meals ? fill(MESSAGES.plan_page.rounded, { meals: row.meals, plan: row.plan }) : null,
        cta: `https://fitafnutrition.com/order?mpid=${mpidOf(goal, row.plan)}`,
      };
      for (const [k, v] of Object.entries(want)) if (r[k] !== v) problems.push(`${hash}: ${k} ${JSON.stringify(r[k])}, not ${JSON.stringify(v)}`);
    }
  }
  return problems;
}

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
