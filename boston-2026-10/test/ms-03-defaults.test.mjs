// MS-3 (SPEC-meal-selection.md § 6, § 1): defaults. Answering Q1 alone gives TODAY's result: *or* is 7, *and* is 14, with
// Q2–Q4 at their defaults (every day, no breakfast, no snacks), shown as pressed; the result card's figures and Choose
// your meals, and with a week open the Chef's Choice links, byte-identical to the page before the meal selection
// (test/ms-golden.json, recorded at 985f777 from that tree's own build). Q4 is asserted, so the first case builds from
// its own data with snacks shown (ms-harness SNACKS_SHOWN, § 11), never the committed flags.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { card } from "./cc-harness.mjs";
import { answer, GOALS, open, pageOf, questionsOf, resultOf, SNACKS_SHOWN, V1_DIR } from "./ms-harness.mjs";

const golden = JSON.parse(await readFile(new URL("./ms-golden.json", import.meta.url), "utf8"));
const TODAY = [["or", 7], ["and", 14]];

test("MS-3: Q1 alone gives today's 7 and 14 results, and Q2–Q4 their defaults, pressed", async () => {
  const html = await pageOf({ snacks: SNACKS_SHOWN });
  for (const goal of GOALS) {
    for (const [ld, n] of TODAY) {
      const page = open(html, `#${goal}`);
      assert.equal(resultOf(page).shown, false, `#${goal}: no card before Q1`);
      answer(page, "lunch_dinner", ld);
      assert.equal(page.hash(), `#${goal}-${ld}-7d`, "the fragment");
      const q = questionsOf(page);
      assert.deepEqual(
        [q.lunch_dinner.pressed, q.weekends.pressed, q.breakfast.pressed, q.snacks.pressed],
        [ld, "yes", "no", "no"],
        `#${goal}, ${ld}: Q1 as pressed, Q2–Q4 at their defaults`,
      );
      const r = resultOf(page);
      const was = golden.cards[`#${goal}-${n}`];
      assert.deepEqual([r.total, r.perMeal, r.cta], [was.total, was.per_meal, was.no_picks_cta], `#${goal}, ${ld}: today's ${n}`);
    }
  }
});

test("MS-3: with a week open, Q1 alone gives today's Chef's Choice: the same lines and links, byte for byte", async () => {
  const html = await pageOf({ picks: V1_DIR });
  for (const goal of GOALS) {
    for (const [ld, n] of TODAY) {
      const page = open(html, `#${goal}`);
      answer(page, "lunch_dinner", ld);
      const s = card(page);
      const was = golden.cards[`#${goal}-${n}`];
      assert.deepEqual(
        { cta: s.chooseHref, checkout: s.checkout, own: s.ownHref, meals: s.meals },
        { cta: was.result_cta, checkout: was.cc_checkout, own: was.cc_own, meals: was.meals },
        `#${goal}, ${ld}: today's ${n}`,
      );
    }
  }
});
