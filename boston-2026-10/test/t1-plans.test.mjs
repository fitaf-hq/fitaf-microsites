import test from "node:test";
import assert from "node:assert/strict";
import { shownCounts } from "../build.mjs";
import { loadPlans } from "./helpers.mjs";

test("T1: every plan x shown count has an integer mpid and integer cents; no mpid shared", async () => {
  const plans = await loadPlans();
  // ⚠ AMENDED by SPEC-ui-and-copy-pass § 2 item 5 (2026-10-25): every price re-read that day, unchanged (UQ5).
  assert.equal(plans.read_on, "2026-10-25");
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
      // ⚠ AMENDED by SPEC-ui-and-copy-pass § 2.2 (2026-10-25): Family's counts, 5 and 10, are the store's one Family
      // product, so they share its mpid; no individual cell shares one.
      const shared = seen.get(cell.mpid);
      assert.ok(!shared || (plan.id === "family" && shared.startsWith("family-")), `mpid ${cell.mpid} shared by ${shared} and ${plan.id}`);
      seen.set(cell.mpid, `${plan.id}-${cell.meals_per_week}`);
    }
  }
  for (const plan of plans.individual) {
    for (const n of counts) {
      assert.ok(plan.counts.some((c) => c.meals_per_week === n), `${plan.id} lacks a ${n}-meal cell`);
    }
  }
  assert.equal(seen.size, 16, "15 individual cells + Family's one product");
  assert.deepEqual(plans.family.counts.map((c) => c.meals_per_week), [5, 10], "Family's two counts (§ 2.2)");
});
