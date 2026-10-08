// SN-4 (SPEC-snacks-in-the-cart § 3.5, § 5 item 3; § 1a): CHECKOUT by width. The plan's count is read where the store
// displays it (plan(): the sidebar's .cart__items-count at 1025 px and wider, the bar's "Items" below), and § 1a found
// the two count differently: the sidebar counts the snacks' units beside the meals (17 here), the bar the meals only
// (14). The shipped text checks each by its own: CHECKOUT is pressed at both widths with the full plan and cart. ⭐ Two
// mutants, made IN MEMORY from the shipped text, each with ONE rule for both elements: "meals" (as before snacks) stops
// at the sidebar ("the plan shows 17") and passes at the bar; "meals and snack units" stops at the bar ("the plan shows
// 14") and passes at the sidebar. So each reading is pinned, and each fails the other's rule.
import test from "node:test";
import assert from "node:assert/strict";
import { LOG_PREFIX, script } from "./r2-harness.mjs";
import { assertFullCart, snRun, SN_UNITS } from "./sn-harness.mjs";

const RULE = "n[0] === (n[1] ? p.units : p.total)";
const mutant = async (rule) => {
  const text = await script();
  assert.equal(text.split(RULE).length, 2, "the rule the mutant replaces is in the shipped text, once");
  return text.replace(RULE, rule);
};

for (const width of ["sidebar", "bar"]) {
  test(`SN-4: at the ${width}, CHECKOUT pressed with the full plan and cart`, async () => {
    const r = await snRun({ width });
    assert.equal(r.last, `${LOG_PREFIX} done: /checkout`, JSON.stringify(r.ours));
    assert.match(r.page.shownText(), width === "sidebar" ? new RegExp(`\\b${SN_UNITS} items\\b`) : /Items 14\b/, `control: the ${width} shows its count`);
    assertFullCart(r.page);
  });
}

test("SN-4 (mutant): the meals for both — the sidebar's count (17) refused, the bar's passes", async () => {
  const text = await mutant("n[0] === p.total");
  const side = await snRun({ text, width: "sidebar" });
  assert.match(side.last ?? "", /stopped: the store counted 17 of 17; the plan shows 17$/, JSON.stringify(side.ours));
  assert.deepEqual(side.page.controls, [], "CHECKOUT never pressed");
  const bar = await snRun({ text, width: "bar" });
  assert.equal(bar.last, `${LOG_PREFIX} done: /checkout`);
});

test("SN-4 (mutant): meals and snack units for both — the bar's count (14) refused, the sidebar's passes", async () => {
  const text = await mutant("n[0] === p.units");
  const bar = await snRun({ text, width: "bar" });
  assert.match(bar.last ?? "", /stopped: the store counted 17 of 17; the plan shows 14$/, JSON.stringify(bar.ours));
  assert.deepEqual(bar.page.controls, [], "CHECKOUT never pressed");
  const side = await snRun({ text, width: "sidebar" });
  assert.equal(side.last, `${LOG_PREFIX} done: /checkout`);
});
