import test from "node:test";
import assert from "node:assert/strict";
import { shownCounts } from "../build.mjs";
import { loadPlans } from "./helpers.mjs";

test("T1: every plan x shown count has an integer mpid and integer cents; no mpid shared", async () => {
  const plans = await loadPlans();
  assert.equal(plans.read_on, "2026-09-27");
  assert.equal(plans.read_from, "https://fitafnutrition.com/meal-plans");
  const counts = shownCounts(plans);
  assert.deepEqual(counts, [7, 14]);
  const all = [...plans.individual, plans.family];
  const seen = new Map();
  for (const plan of all) {
    for (const cell of plan.counts) {
      assert.ok(Number.isInteger(cell.mpid), `${plan.id} ${cell.meals_per_week}: mpid integer`);
      assert.ok(Number.isInteger(cell.meals_per_week), `${plan.id}: meals_per_week integer`);
      assert.ok(Number.isInteger(cell.price_per_meal_cents), `${plan.id} ${cell.meals_per_week}: cents integer`);
      assert.ok(!seen.has(cell.mpid), `mpid ${cell.mpid} shared by ${seen.get(cell.mpid)} and ${plan.id}`);
      seen.set(cell.mpid, `${plan.id}-${cell.meals_per_week}`);
    }
  }
  for (const plan of plans.individual) {
    for (const n of counts) {
      assert.ok(plan.counts.some((c) => c.meals_per_week === n), `${plan.id} lacks a ${n}-meal cell`);
    }
  }
  assert.equal(seen.size, 16, "15 individual cells + 1 family");
});
