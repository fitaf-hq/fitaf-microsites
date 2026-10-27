// UF2 (SPEC-ui-and-copy-pass.md § 2.2 items 2–3): data/plans.json's `family` carries its two counts, 5 and 10, each the
// store's one Family product (mpid 35) at 3800 cents, and the answer → count mapping as data (`family.selection`, shaped
// as `selection` is: Q1's answer, the days and breakfast its cart is the individual's for, and the meals they come to);
// `servings` 3–4 stays. On the page, *or* gives 5 family meals a week and *and* 10, at $38.00 a meal: the result card's
// weekly total N × $38.00, its price a meal and its meals a week, from the data (a copy with another price moves them),
// and its plain link the store's Family order page. Before an answer, no result. The build refuses a mapping that does
// not hold, naming it. Copies only; no file in the repository is edited.
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 7 item 4 (2026-10-26): the card shows its weekly total alone (no price a meal, no
// meals a week), so the data's figures are held there: N × $38.00, and a copy at $40.00 a meal moves it.
import test from "node:test";
import assert from "node:assert/strict";
import { PLANS } from "./cc-harness.mjs";
import { open, pageOf, plansCopy, resultOf } from "./ms-harness.mjs";
import { dollars, FAMILY_CART, FAMILY_CENTS, FAMILY_MEALS, FAMILY_MPID } from "./uf-harness.mjs";
import { pages } from "./uq-harness.mjs";

const { production, development } = await pages();
const BUILDS = { production, development };

test("UF2: data/plans.json's family: two counts, 5 and 10, each mpid 35 at 3800 cents; or → 5, and → 10; servings 3–4", () => {
  const f = PLANS.family;
  assert.deepEqual(
    f.counts.map((c) => [c.meals_per_week, c.mpid, c.price_per_meal_cents]),
    Object.values(FAMILY_MEALS).map((n) => [n, FAMILY_MPID, FAMILY_CENTS]),
    "the two counts",
  );
  assert.deepEqual(f.servings, { min: 3, max: 4 }, "servings unchanged");
  assert.deepEqual(
    f.selection.map((r) => [r.lunch_dinner, r.meals, `${r.lunch_dinner}-${r.weekends ? "7d" : "5d"}${r.breakfast ? "-b" : ""}`]),
    Object.entries(FAMILY_MEALS).map(([ld, n]) => [ld, n, FAMILY_CART[ld]]),
    "the mapping: Q1's answer, its meals, the cart it takes",
  );
});

test("UF2: or → 5 and and → 10 family meals a week at $38.00 a meal; the plain link the Family order page; before an answer, no result", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    assert.equal(resultOf(open(html, "#family")).shown, false, `${build}, #family: no result before an answer`);
    for (const [ld, n] of Object.entries(FAMILY_MEALS)) {
      const page = open(html, `#family-${ld}`);
      const r = resultOf(page);
      assert.deepEqual(
        { shown: r.shown, total: r.total, rounded: r.rounded, cta: r.cta },
        { shown: true, total: dollars(n * FAMILY_CENTS), rounded: null, cta: `${PLANS.order_base_url}?mpid=${FAMILY_MPID}` },
        `${build}, #family-${ld}`,
      );
      assert.equal(page.el("result").getAttribute("data-accent"), "family", `${build}, #family-${ld}: the card's accent Family's`);
      assert.equal(r.selection, FAMILY_CART[ld], `${build}, #family-${ld}: the answer set whose cart it takes`);
    }
  }
});

test("UF2: the figures are the data's: a copy of data/plans.json with Family at $40.00 a meal moves them", async () => {
  const other = await plansCopy((p) => p.family.counts.forEach((c) => (c.price_per_meal_cents = 4000)));
  try {
    const r = resultOf(open(await pageOf({ plansPath: other.path }), "#family-and"));
    assert.deepEqual([r.total], [dollars(10 * 4000)]);
  } finally {
    await other.done();
  }
});

const REFUSALS = [
  ["a row's meals not what its answers come to", (f) => (f.selection[0].meals = 6), /data\/plans\.json: family\.selection\[0\] \(or, weekdays, no breakfast\): meals 6 is not what the answers come to \(5\)/],
  ["a row's meals not one of the counts", (f) => (f.counts = f.counts.filter((c) => c.meals_per_week !== 5)), /data\/plans\.json: family\.selection\[0\] \(or, weekdays, no breakfast\): 5 meals is not one of family\.counts \(10\)/],
  ["a count with no row", (f) => f.counts.push({ meals_per_week: 15, mpid: 35, price_per_meal_cents: 3800 }), /data\/plans\.json: family\.counts: 15 meals a week is no row of family\.selection/],
  ["two rows for one answer", (f) => f.selection.push({ ...f.selection[0] }), /data\/plans\.json: family\.selection: two rows for or/],
  ["no row for an answer", (f) => f.selection.pop(), /data\/plans\.json: family\.selection: no row for and/],
  ["an unknown field", (f) => (f.selection[1].snacks = false), /data\/plans\.json: family\.selection\[1\]: unknown field "snacks"/],
];

for (const [what, change, message] of REFUSALS) {
  test(`UF2: the build refuses ${what}, naming it`, async () => {
    const copy = await plansCopy((p) => change(p.family));
    try {
      await assert.rejects(pageOf({ plansPath: copy.path }), message);
    } finally {
      await copy.done();
    }
  });
}
