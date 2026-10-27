// UC6 (SPEC-ui-and-copy-pass.md § 1.2 item 1, the Advisor on § 1.1's item 6: "yes please fix this math"): the card's
// count is the meals it lists, and its weekly price the plan's price a meal times that count, as the store charges it
// (the 2026-10-16 smoke: five meals on Lean 4 at $13.00, $65.00): "$65.00/week · $13.00/meal · 5 meals/week"; the
// 15-meal cart on the 14 plan by the same rule; a row whose meals equal its plan's count unchanged. On the production
// page (production false: the card is in it) and the development page, every size. Worked out here from
// data/plans.json's cents and selection rows, on their own.
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 7 item 4 (2026-10-26, the Advisor: "drop the meal count please"): the card's price
// is its weekly total alone (no price a meal, no meal count: #result-per-meal and #result-meals are gone), so the rule is
// held by that total; the struck line above it while an offer is current is RP1's.
import test from "node:test";
import assert from "node:assert/strict";
import plans from "../data/plans.json" with { type: "json" };
import { renderPage } from "../build.mjs";
import { openPlanPage } from "./cc-harness.mjs";
import { devPage } from "./dev-page.mjs";
import { loadPlans } from "./helpers.mjs";
import { NOW } from "./uc-harness.mjs";

const dollars = (cents) => `$${Math.floor(cents / 100).toLocaleString("en-US")}.${String(cents % 100).padStart(2, "0")}`;
const answerKey = (r) => `${r.lunch_dinner}-${r.weekends ? "7d" : "5d"}${r.breakfast ? "-b" : ""}`;
const centsOf = (goal, count) => plans.individual.find((p) => p.id === goal).counts.find((c) => c.meals_per_week === count).price_per_meal_cents;
const pages = async () => [
  ["the production page", await renderPage(await loadPlans())],
  ["the development page", await devPage()],
];

/** The card at `hash` as drawn: its weekly total. */
function cardAt(html, hash) {
  const page = openPlanPage(html, { hash, now: NOW });
  const text = (id) => page.el(id).textContent.trim();
  assert.equal(page.el("result").hasAttribute("hidden"), false, `${hash}: control: the card is shown`);
  return { total: text("result-total") };
}

test("UC6 (control): the selection sends 5 meals through the 4 plan and 15 through the 14, and no other row above its plan", () => {
  const above = plans.selection.filter((r) => r.meals !== r.plan).map((r) => [answerKey(r), r.meals, r.plan]);
  assert.deepEqual(above, [["or-5d", 5, 4], ["and-5d-b", 15, 14]]);
});

test("UC6: a 5-meal and a 15-meal row — the meals it lists, at the plan's price a meal ($65.00 for five on Lean 4)", async () => {
  for (const [name, html] of await pages()) {
    for (const goal of plans.individual.map((p) => p.id)) {
      for (const row of plans.selection.filter((r) => r.meals !== r.plan)) {
        const hash = `#${goal}-${answerKey(row)}`;
        const cents = centsOf(goal, row.plan);
        assert.deepEqual(
          cardAt(html, hash),
          { total: dollars(cents * row.meals) },
          `${name}, ${hash}: ${row.meals} meals at the ${row.plan} plan's ${dollars(cents)}`,
        );
      }
    }
    assert.deepEqual(cardAt(html, "#lean-or-5d"), { total: "$65.00" }, `${name}: the Advisor's example`);
  }
});

test("UC6: a row whose meals equal its plan's count is unchanged", async () => {
  for (const [name, html] of await pages()) {
    for (const goal of plans.individual.map((p) => p.id)) {
      for (const row of plans.selection.filter((r) => r.meals === r.plan)) {
        const hash = `#${goal}-${answerKey(row)}`;
        const cents = centsOf(goal, row.plan);
        assert.deepEqual(cardAt(html, hash), { total: dollars(cents * row.plan) }, `${name}, ${hash}`);
      }
    }
  }
});
