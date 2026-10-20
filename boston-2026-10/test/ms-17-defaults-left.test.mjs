// MS-17 (SPEC-meal-selection.md § 12 items 1 and 5): every pair's default on the left. Q1 keeps *Lunch or dinner* ·
// *Lunch and dinner* (no default: the card waits for Q1); Q2 is *Weekdays only* · *Every day*, Q3 *No breakfast* ·
// *Add breakfast*, Q4 *No snacks* · *Add snacks*, each pair's default FIRST. The default is data
// (data/plans.json `selection_defaults`, *weekdays* since § 12), and the order is the build's, following the default: a
// copy of the data with other defaults puts those answers first (the order is not a second list). The words are written
// here from § 12's table, never read back from data/messages.json. Q4 is asserted, so the pages build from their own data
// with snacks shown (ms-harness SNACKS_SHOWN, § 11), never the committed flags.
import test from "node:test";
import assert from "node:assert/strict";
import { PLANS } from "./cc-harness.mjs";
import { answer, chooseGoal, open, pageOf, plansCopy, questionsOf, SNACKS_SHOWN } from "./ms-harness.mjs";

/** § 12 item 1's table: each question's answers as the page shows them, left to right ("Q2's *no* answer reads
 *  *Weekdays only*"). `data-a` is the answer's id (Q1 or/and; Q2–Q4 yes/no), its words what a visitor reads. */
const LEFT_TO_RIGHT = {
  lunch_dinner: [["or", "Lunch or dinner"], ["and", "Lunch and dinner"]],
  weekends: [["no", "Weekdays only"], ["yes", "Every day"]],
  breakfast: [["no", "No breakfast"], ["yes", "Add breakfast"]],
  snacks: [["no", "No snacks"], ["yes", "Add snacks"]],
};

/** Each question's buttons in document order: [data-a, the words a visitor reads]. */
function buttonsOf(page) {
  const out = {};
  for (const b of page.document.querySelectorAll("[data-q]")) {
    (out[b.getAttribute("data-q")] ??= []).push([b.getAttribute("data-a"), b.textContent.replace(/\s+/g, " ").trim()]);
  }
  return out;
}

for (const target of ["prod", "dev"]) {
  test(`MS-17 (${target}): every pair's default on the left, in § 12's words; Q1 or · and`, async () => {
    const page = open(await pageOf({ target, snacks: SNACKS_SHOWN }), "#lean");
    assert.deepEqual(buttonsOf(page), LEFT_TO_RIGHT);
  });
}

test("MS-17: the default is data: data/plans.json's selection_defaults is weekdays, no breakfast, no snacks", () => {
  assert.deepEqual(PLANS.selection_defaults, { weekends: false, breakfast: false, snacks: false });
});

test("MS-17: after Q1 alone, the pressed answer of Q2–Q4 is each pair's left one", async () => {
  const page = open(await pageOf({ snacks: SNACKS_SHOWN }), "#lean");
  answer(page, "lunch_dinner", "or");
  const left = buttonsOf(page);
  const q = questionsOf(page);
  for (const name of ["weekends", "breakfast", "snacks"]) {
    assert.equal(q[name].pressed, left[name][0][0], `${name}: the default, pressed, is the left answer`);
  }
});

/** The order follows the default (§ 12 item 1: "a future default change keeps the default on the left"): pages built
 *  from copies of the data with other defaults, each question's first answer its default's. */
for (const defaults of [
  { weekends: true, breakfast: true, snacks: true },
  { weekends: false, breakfast: true, snacks: false },
  { weekends: true, breakfast: false, snacks: true },
]) {
  test(`MS-17: the order follows the default, not a second list (${JSON.stringify(defaults)})`, async () => {
    const copy = await plansCopy((p) => {
      p.snacks = { ...SNACKS_SHOWN };
      p.selection_defaults = { ...defaults };
    });
    try {
      const page = open(await pageOf({ plansPath: copy.path }), "#lean");
      const shown = buttonsOf(page);
      assert.deepEqual(shown.lunch_dinner, LEFT_TO_RIGHT.lunch_dinner, "Q1 has no default: or · and");
      for (const [name, on] of Object.entries(defaults)) {
        const first = on ? "yes" : "no";
        assert.deepEqual(shown[name].map(([a]) => a), [first, first === "yes" ? "no" : "yes"], `${name}: its default (${first}) first`);
      }
      chooseGoal(page, "lean");
      answer(page, "lunch_dinner", "and");
      const q = questionsOf(page);
      for (const name of Object.keys(defaults)) assert.equal(q[name].pressed, shown[name][0][0], `${name}: the left answer pressed after Q1`);
    } finally {
      await copy.done();
    }
  });
}
