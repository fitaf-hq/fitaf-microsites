// RP4 (SPEC-ui-and-copy-pass.md § 7 item 6, item 3: "The result and *See all plans* show the same struck figure for the
// same plan and count"): for each plan at each count the grid shows (7 and 14), at every answer set that comes to that
// count on that plan, the result's struck figure is the grid's struck price and its lead the store's price beside it, on
// both pages carrying the offer, inside its dates. rp-checks.mjs's check.
import test from "node:test";
import assert from "node:assert/strict";
import { PLANS } from "./cc-harness.mjs";
import { RESULTS, rp4Problems } from "./rp-checks.mjs";

test("RP4 (control): the grid's counts each have an answer set at that count on every plan", () => {
  for (const plan of PLANS.individual) {
    for (const { meals_per_week: n } of PLANS.shown_counts) {
      assert.ok(RESULTS.some((r) => r.plan === plan.id && r.meals === n && r.count === n), `${plan.id}-${n}`);
    }
  }
});

test("RP4: the result's struck figure is See all plans' for the same plan and count", async () => {
  assert.deepEqual(await rp4Problems(), []);
});
