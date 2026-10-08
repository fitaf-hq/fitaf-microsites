// MS-7 (SPEC-meal-selection.md § 6, § 4), as § 9 item 3 amends it: `snacks.shown` decides whether Q4 is on the page and
// `snacks.carted` whether a snack reaches a link. With `shown` false (a copy of data/plans.json): no Q4, no snack block,
// no snack list in the page's data, a `-s` fragment is not an answer set the page offers (the size alone, as an unknown
// part), and no snack reaches any link. With `shown` true (as committed): Q4 shows and *Add snacks* shows the snack list,
// still OUTSIDE the plan's count: the link carries exactly its cart's meals, which make the plan. `carted` true is
// refused (MS-6): no link carries a snack in this build.
import test from "node:test";
import assert from "node:assert/strict";
import { picksData } from "./cc-harness.mjs";
import { cardOf, fragmentOf, GOALS, keysOf, open, pageOf, plansCopy, questionsOf, TABLE, V2_CARTS, V2_DIR, V2_SNACKS } from "./ms-harness.mjs";
import { refKey } from "./r2-harness.mjs";

const SNACK_KEYS = new Set(V2_SNACKS["7"].map((m) => refKey(m.name)));
const cartKeys = (key) => Object.fromEntries(V2_CARTS[key].items.map((m) => [refKey(m.name), m.qty]));

test("MS-7: snacks not shown: no Q4, no snack block or list, a -s fragment is the size alone, no snack in any link", async () => {
  const plans = await plansCopy((p) => (p.snacks.shown = false));
  try {
    const html = await pageOf({ picks: V2_DIR, plansPath: plans.path });
    assert.doesNotMatch(html, /data-q="snacks"|id="q-snacks"|id="cc-snacks"/, "no Q4, no snack block");
    assert.equal(picksData(html).weeks[0].snacks, undefined, "no snack list in the page's data");
    for (const m of V2_SNACKS["7"]) assert.ok(!html.includes(m.display), `the page does not carry the snack ${m.display}`);
    const page = open(html, "#lean-and-7d-s");
    assert.deepEqual([questionsOf(page).lunch_dinner.pressed, cardOf(page).result], [null, false], "#lean-and-7d-s: the size alone");
    for (const goal of GOALS) {
      for (const row of TABLE) {
        const s = cardOf(open(html, fragmentOf(goal, row)));
        for (const key of Object.keys(keysOf(s.checkout))) assert.ok(!SNACK_KEYS.has(key), `${fragmentOf(goal, row)}: a snack in the link`);
      }
    }
  } finally {
    await plans.done();
  }
});

test("MS-7: snacks shown (as committed): Q4 and the snack list; the link is the cart's meals, which make the plan", async () => {
  const html = await pageOf({ picks: V2_DIR });
  for (const goal of GOALS) {
    for (const row of TABLE.filter((r) => r.weekends)) {
      const page = open(html, fragmentOf(goal, row, true));
      const s = cardOf(page);
      assert.equal(questionsOf(page).snacks.pressed, "yes");
      assert.ok(s.snackLines?.length, `${fragmentOf(goal, row, true)}: the snack list`);
      const keys = keysOf(s.checkout);
      assert.deepEqual(keys, cartKeys(row.key), `${fragmentOf(goal, row, true)}: the cart's meals and no snack`);
      assert.equal(Object.values(keys).reduce((a, b) => a + b, 0), row.plan, "the link makes the plan's count");
    }
  }
});
