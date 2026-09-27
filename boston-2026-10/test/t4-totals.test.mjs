import test from "node:test";
import assert from "node:assert/strict";
import { gridCells, money, renderPage, weeklyTotalCents } from "../build.mjs";
import { anchors, loadPlans } from "./helpers.mjs";

test("T4: weekly total = meals x price for every cell", async () => {
  const plans = await loadPlans();
  for (const plan of [...plans.individual, plans.family]) {
    for (const cell of plan.counts) {
      assert.equal(weeklyTotalCents(cell), cell.meals_per_week * cell.price_per_meal_cents);
    }
  }
  const lean7 = plans.individual.find((p) => p.id === "lean").counts.find((c) => c.meals_per_week === 7);
  assert.equal(money(weeklyTotalCents(lean7)), "$87.50");
});

test("T4: the page shows each shown cell's per-meal price and computed total", async () => {
  const plans = await loadPlans();
  const html = await renderPage(plans);
  const byCell = new Map(anchors(html).filter((a) => a["data-cell"]).map((a) => [a["data-cell"], a]));
  for (const c of gridCells(plans)) {
    const label = byCell.get(`${c.plan}-${c.count}`)["aria-label"];
    assert.ok(label.includes(`${money(c.price_per_meal_cents)} per meal`), label);
    assert.ok(label.includes(`${money(c.count * c.price_per_meal_cents)} a week`), label);
  }
  assert.match(html, /\$87\.50/);
});

test("money() refuses non-integer cents", () => {
  assert.throws(() => money(12.5), TypeError);
  assert.equal(money(3800), "$38.00");
  assert.equal(money(5), "$0.05");
});
