// MS-16 (SPEC-meal-selection.md § 9 item 3): snacks shown, not carted. With `snacks` shown and not carted (each case's
// own copy of data/plans.json, ms-harness SNACKS_SHOWN, never the committed flags: § 11): Q4 is on the page; *Add
// snacks* shows the week's snack list for the days of Q2 (7 every day, 5 weekdays) under `chefs_choice.snacks_heading`,
// and the not-carted line (`chefs_choice.snacks_not_carted`); with no snack list for those days (the fixture has none
// for 5), the line alone; *No snacks* shows neither. EVERY link (Choose your meals, Continue to checkout, Choose my own
// meals) is byte-identical to the same answers with *No snacks*, at every size and answer set, and the plan's meals and
// price do not move.
// SPEC-snacks-in-the-cart § 4.3, § 5 item 5 (its own data, ms-harness SNACKS_CARTED; a week with lists for 7 and 5
// days): carted, *Add snacks* shows the list under its heading and NO not-carted line (the phrase is not on the page);
// the plan's figures do not move; *Choose your meals* and *Choose my own meals* stay No snacks' (only Continue to
// checkout carries the snacks: MS-7's carted half).
import test from "node:test";
import assert from "node:assert/strict";
import { mealLine, MESSAGES } from "./cc-harness.mjs";
import { cardOf, fragmentOf, GOALS, open, pageOf, questionsOf, resultOf, SNACKS_CARTED, SNACKS_SHOWN, TABLE, V2_DIR, V2_SNACKS, V2_SNACKS_FIVE, v2WithFiveDays } from "./ms-harness.mjs";

test("MS-16: with snacks shown and not carted (its own data), Q4 is on the page", async () => {
  const q = questionsOf(open(await pageOf({ picks: V2_DIR, snacks: SNACKS_SHOWN }), "#lean-or-7d"));
  assert.deepEqual([q.snacks?.shown, q.snacks?.answers], [true, ["yes", "no"]]);
});

test("MS-16: Add snacks shows the week's list and the not-carted line; every link is the one with No snacks", async () => {
  assert.ok(V2_SNACKS["7"] && !V2_SNACKS["5"], "fixture control: a snack list for 7 days, none for 5");
  const html = await pageOf({ picks: V2_DIR, snacks: SNACKS_SHOWN });
  const words = MESSAGES.chefs_choice;
  for (const goal of GOALS) {
    for (const row of TABLE) {
      const without = open(html, fragmentOf(goal, row));
      const withSnacks = open(html, fragmentOf(goal, row, true));
      const [a, b] = [cardOf(without), cardOf(withSnacks)];
      const where = fragmentOf(goal, row, true);
      assert.deepEqual([b.chooseHref, b.checkout, b.ownHref], [a.chooseHref, a.checkout, a.ownHref], `${where}: the links are No snacks'`);
      const [ra, rb] = [resultOf(without), resultOf(withSnacks)];
      assert.deepEqual([rb.total, rb.perMeal, rb.meals, rb.rounded], [ra.total, ra.perMeal, ra.meals, ra.rounded], `${where}: the plan's figures`);
      assert.equal(a.snacks, false, `${fragmentOf(goal, row)}: No snacks shows no snacks`);
      const list = V2_SNACKS[row.weekends ? "7" : "5"];
      assert.deepEqual(
        { shown: b.snacks, heading: b.snackHeading, lines: b.snackLines, note: b.snackNote },
        { shown: true, heading: list ? words.snacks_heading : null, lines: list ? list.map((m) => mealLine(m)) : null, note: words.snacks_not_carted },
        where,
      );
    }
  }
});

test("MS-16 (carted): Add snacks shows the week's list under its heading, no not-carted line; the plan's figures and the other links unmoved", async () => {
  const week = await v2WithFiveDays();
  try {
    const html = await pageOf({ picks: week.dir, snacks: SNACKS_CARTED });
    const words = MESSAGES.chefs_choice;
    assert.ok(!html.includes('id="cc-snacks-note"') && !html.includes(words.snacks_not_carted), "the not-carted line is not on the page");
    for (const goal of GOALS) {
      for (const row of TABLE) {
        const without = open(html, fragmentOf(goal, row));
        const withSnacks = open(html, fragmentOf(goal, row, true));
        const [a, b] = [cardOf(without), cardOf(withSnacks)];
        const where = fragmentOf(goal, row, true);
        assert.deepEqual([b.chooseHref, b.ownHref], [a.chooseHref, a.ownHref], `${where}: Choose your meals and Choose my own meals are No snacks'`);
        assert.notEqual(b.checkout, a.checkout, `${where}: Continue to checkout carries the snacks`);
        const [ra, rb] = [resultOf(without), resultOf(withSnacks)];
        assert.deepEqual([rb.total, rb.perMeal, rb.meals, rb.rounded], [ra.total, ra.perMeal, ra.meals, ra.rounded], `${where}: the plan's figures`);
        const list = row.weekends ? V2_SNACKS["7"] : V2_SNACKS_FIVE;
        assert.deepEqual(
          { shown: b.snacks, heading: b.snackHeading, lines: b.snackLines, note: b.snackNote },
          { shown: true, heading: words.snacks_heading, lines: list.map((m) => mealLine(m)), note: null },
          where,
        );
        assert.equal(a.snacks, false, `${fragmentOf(goal, row)}: No snacks shows no snacks`);
      }
    }
  } finally {
    await week.done();
  }
});
