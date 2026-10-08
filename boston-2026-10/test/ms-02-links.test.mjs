// MS-2 (SPEC-meal-selection.md § 6, ⭐ the links). With the version-2 fixture week open, each answer set's Continue to
// checkout, at every size, decodes with the SHIPPED reader of `#fitaf=` (fill C on the synthetic order page, as CC-2b
// reads a link) to its cart's keys and quantities, every meal pressed its count, and THE MPID OF THE ROW'S PLAN at the
// chosen size (§ 2: 5 -> the 4-meal mpid, never the 7's; 15 -> the 14's). The link's fragment is also the one written here
// from the cart's names by r2-harness's own key, so a key or encoder of the build's own is not trusted.
// The row's plan is the contract's (ms-harness TABLE), not data/plans.json's.
import test from "node:test";
import assert from "node:assert/strict";
import { linkProblems, ORDER } from "./ms-checks.mjs";
import { cardOf, GOALS, mpidOf, open, pageOf, TABLE, V2_CARTS, V2_DIR } from "./ms-harness.mjs";

test("MS-2: every answer set's link, at every size, decodes to its cart and the mpid of its row's plan", async () => {
  assert.equal(Object.keys(V2_CARTS).length, TABLE.length, "fixture control: a cart for every answer set");
  for (const row of TABLE) {
    assert.equal(V2_CARTS[row.key].plan, row.plan, `fixture control: ${row.key}'s cart is for the plan of § 2's row`);
  }
  assert.notEqual(mpidOf("lean", 4), mpidOf("lean", 7), "fixture control: the 4's mpid is not the 7's");
  assert.deepEqual(await linkProblems(await pageOf({ picks: V2_DIR })), []);
});

test("MS-2: or, weekdays goes through the 4-meal plan at every size; and, weekdays with breakfast the 14", async () => {
  const html = await pageOf({ picks: V2_DIR });
  for (const goal of GOALS) {
    for (const [key, plan, never] of [["or-5d", 4, 7], ["and-5d-b", 14, 21]]) {
      const s = cardOf(open(html, `#${goal}-${key}`));
      const mpid = Number(new URL(s.checkout).searchParams.get("mpid"));
      assert.equal(mpid, mpidOf(goal, plan), `#${goal}-${key}: the ${plan}'s mpid`);
      assert.notEqual(mpid, mpidOf(goal, never), `#${goal}-${key}: never the ${never}'s`);
      assert.equal(s.ownHref, `${ORDER}?mpid=${mpidOf(goal, plan)}`, `#${goal}-${key}: Choose my own meals, the plan's order page`);
    }
  }
});
