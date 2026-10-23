// MS-3 (SPEC-meal-selection.md § 6, § 1; INVERTED by § 12 item 2, 2026-10-20): defaults. Since § 12 the default days are
// *weekdays*, so answering Q1 alone gives *or, weekdays* (5 a week, through the 4-meal plan, the rounded line) and *and,
// weekdays* (10), not 7 and 14: the fragment `#<size>-or-5d` / `#<size>-and-5d`, Q2–Q4 pressed at their defaults
// (weekdays, no breakfast, no snacks), the result card's figures the plan's (§ 2's table, written here), and with a week
// open the Chef's Choice of the `or-5d` / `and-5d` carts, their links the week's own, byte for byte as the same answers
// opened by their fragment. Today's fragments keep their meaning (§ 3; § 12 item 2): `#<size>-7` still opens *or, every
// day* and `#<size>-14` *and, every day*, their card byte-identical to the page before the meal selection
// (test/ms-golden.json, recorded at 985f777), and a fragment naming its days is read as written. Q4 is asserted, so the
// first case builds from its own data with snacks shown (ms-harness SNACKS_SHOWN, § 11), never the committed flags.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { card, picksData, PLANS } from "./cc-harness.mjs";
import { answer, centsOf, dollars, GOALS, mpidOf, open, pageOf, questionsOf, resultOf, SNACKS_SHOWN, TABLE, V1_DIR, V2_DIR } from "./ms-harness.mjs";

const golden = JSON.parse(await readFile(new URL("./ms-golden.json", import.meta.url), "utf8"));
/** § 12 item 2: Q1 alone is the answer set with the default days (weekdays) and no breakfast. */
const DEFAULT_OF = { or: "or-5d", and: "and-5d" };
const rowOf = (key) => TABLE.find((r) => r.key === key);
/** What the card offers, its tiles as their styles (a tile is an element of its own page). */
const offered = (page) => {
  const { tiles, ...rest } = card(page);
  return { ...rest, tiles: tiles.map((t) => t?.getAttribute("style") ?? null) };
};

test("MS-3 (§ 12): Q1 alone gives or, weekdays and and, weekdays: their fragments, Q2–Q4 at their defaults, the plan's figures", async () => {
  assert.deepEqual([rowOf("or-5d").plan, rowOf("and-5d").plan], [4, 10], "fixture control: § 2's table, 5 -> 4, 10 -> 10");
  const html = await pageOf({ snacks: SNACKS_SHOWN });
  for (const goal of GOALS) {
    for (const [ld, key] of Object.entries(DEFAULT_OF)) {
      const page = open(html, `#${goal}`);
      assert.equal(resultOf(page).shown, false, `#${goal}: no card before Q1`);
      answer(page, "lunch_dinner", ld);
      assert.equal(page.hash(), `#${goal}-${key}`, "the fragment");
      const q = questionsOf(page);
      assert.deepEqual(
        [q.lunch_dinner.pressed, q.weekends.pressed, q.breakfast.pressed, q.snacks.pressed],
        [ld, "no", "no", "no"],
        `#${goal}, ${ld}: Q1 as pressed, Q2–Q4 at their defaults (weekdays, no breakfast, no snacks)`,
      );
      const { plan, meals } = rowOf(key);
      const r = resultOf(page);
      assert.equal(r.selection, key, `#${goal}, ${ld}: the card's answer set`);
      assert.deepEqual(
        [r.meals, r.perMeal, r.total, r.cta],
        [String(plan), dollars(centsOf(goal, plan)), dollars(plan * centsOf(goal, plan)), `${PLANS.order_base_url}?mpid=${mpidOf(goal, plan)}`],
        `#${goal}, ${ld}: the ${plan}-meal plan`,
      );
      assert.equal(r.rounded !== null, plan < meals, `#${goal}, ${ld}: the rounded line only where ${meals} goes through as ${plan}`);
      assert.deepEqual(r, resultOf(open(html, `#${goal}-${key}`)), `#${goal}, ${ld}: the card as #${goal}-${key} opens it`);
    }
  }
});

test("MS-3 (§ 12): with a week open, Q1 alone gives the or-5d and and-5d carts, their links the week's own", async () => {
  const html = await pageOf({ picks: V2_DIR });
  const [week] = picksData(html).weeks;
  for (const goal of GOALS) {
    for (const [ld, key] of Object.entries(DEFAULT_OF)) {
      const page = open(html, `#${goal}`);
      answer(page, "lunch_dinner", ld);
      const s = offered(page);
      const mpid = mpidOf(goal, rowOf(key).plan);
      assert.equal(s.list, true, `#${goal}, ${ld}: the week's list`);
      assert.equal(s.checkout, week.carts[key].links[mpid], `#${goal}, ${ld}: Continue to checkout is ${key}'s link at mpid ${mpid}`);
      assert.deepEqual(s, offered(open(html, `#${goal}-${key}`)), `#${goal}, ${ld}: the card as #${goal}-${key} opens it, byte for byte`);
    }
  }
});

test("MS-3 (§ 12 item 2): today's fragments keep their meaning; a fragment naming its days is read as written", async () => {
  const html = await pageOf({ picks: V1_DIR });
  for (const goal of GOALS) {
    for (const [n, ld] of [[7, "or"], [14, "and"]]) {
      const page = open(html, `#${goal}-${n}`);
      const q = questionsOf(page);
      assert.deepEqual([q.lunch_dinner.pressed, q.weekends.pressed, q.breakfast.pressed], [ld, "yes", "no"], `#${goal}-${n}: ${ld}, every day`);
      const r = resultOf(page);
      const s = card(page);
      const was = golden.cards[`#${goal}-${n}`];
      assert.deepEqual(
        { total: r.total, perMeal: r.perMeal, cta: s.chooseHref, checkout: s.checkout, own: s.ownHref, meals: s.meals },
        { total: was.total, perMeal: was.per_meal, cta: was.result_cta, checkout: was.cc_checkout, own: was.cc_own, meals: was.meals },
        `#${goal}-${n}: today's ${n}, byte for byte`,
      );
    }
    for (const row of TABLE) {
      const q = questionsOf(open(html, `#${goal}-${row.key}`));
      assert.equal(q.weekends.pressed, row.weekends ? "yes" : "no", `#${goal}-${row.key}: its days as written`);
    }
  }
});
