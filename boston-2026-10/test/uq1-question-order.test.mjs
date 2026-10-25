// UQ1 (SPEC-ui-and-copy-pass.md § 2 item 1, the Advisor 2026-10-25: "please move "What's your goal" to the *end* of the
// set of questions (after snacks)"): on both builds the five questions' headings are, in document order, who it is for
// (item 2), the four meal questions in today's order (lunch or dinner, weekends, breakfast, snacks), and the goal last,
// their answers and defaults unchanged; the result (the price, the card, Choose your meals) follows the goal, no
// question between them. As run, the result still appears once the questions it needs (the goal and Q1) are answered,
// in either order, and the same answers give the same card (its answer set, figures and links). Q2–Q4 still wait for Q1.
// ⚠ AMENDED by § 2.2 (2026-10-25, Family's own question, in the Family panel after the individual's): the five headings
// are the first question's and the individual panel's; the result card, shared with Family since § 2.2, follows the
// goal as a visitor reads the page (the Family panel, hidden, between them in the markup).
import test from "node:test";
import assert from "node:assert/strict";
import { card, hiddenInTree, MESSAGES } from "./cc-harness.mjs";
import { answer, chooseGoal, open, questionsOf, resultOf } from "./ms-harness.mjs";
import { GOAL_HEADING, inOrder, ORDER, pages, WHO } from "./uq-harness.mjs";

const { production, development } = await pages();
const BUILDS = { production, development };
const q = MESSAGES.plan_page.questions;
/** The Chef's Choice card as a visitor reads it (its tiles counted, not compared as elements). */
const cardOf = (page) => {
  const { tiles, ...rest } = card(page);
  return { ...rest, tiles: tiles.length };
};

test("UQ1: the five headings in order — who it is for, the four meal questions, the goal last (both builds)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const { document } = open(html);
    const labels = [...document.querySelectorAll("#who .step-label, #panel-individual .step-label")];
    assert.deepEqual(labels.map((h) => h.id), ORDER, `${build}: the headings' order`);
    assert.deepEqual(
      labels.map((h) => h.textContent.trim()),
      [WHO.heading, q.lunch_dinner.heading, q.weekends.heading, q.breakfast.heading, q.snacks.heading, GOAL_HEADING[build]],
      `${build}: the headings' words`,
    );
    for (const h of labels) assert.equal(h.closest('.step[role="group"]')?.getAttribute("aria-labelledby"), h.id, `${build}: #${h.id} names its own group`);
  }
});

test("UQ1: the result follows the goal, no question between them; every question before the goal", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html, "#lean-or-7d");
    const { document } = page;
    // As a visitor reads it: the displayed elements, in document order (the hidden Family panel not among them).
    const all = inOrder(document).filter((n) => !hiddenInTree(n));
    const goal = document.getElementById("q-goal").closest(".step");
    const lastOfGoal = all.indexOf([...goal.querySelectorAll("*")].filter((n) => !hiddenInTree(n)).at(-1));
    const result = all.indexOf(document.getElementById("result"));
    assert.ok(result > lastOfGoal, `${build}: #result after the goal's group, whole`);
    const between = all.slice(lastOfGoal + 1, result).filter((n) => n.matches(".step-label, [data-q], [data-goal], [data-who]"));
    assert.deepEqual(between.map((n) => n.id || n.outerHTML.slice(0, 60)), [], `${build}: no question between the goal and the result`);
    for (const id of ORDER.slice(0, -1)) assert.ok(all.indexOf(document.getElementById(id)) < all.indexOf(document.getElementById("q-goal")), `${build}: #${id} before the goal`);
  }
});

test("UQ1: as run, the result waits for the goal and Q1 — in either order — and Q2–Q4 still wait for Q1", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const meals = open(html, "#meals-or-7d");
    assert.equal(resultOf(meals).shown, false, `${build}: Q1 answered, no goal: no result`);
    chooseGoal(meals, "lean");
    assert.deepEqual([resultOf(meals).shown, resultOf(meals).selection, meals.hash()], [true, "or-7d", "#lean-or-7d"], `${build}: then the goal, last: the result`);

    const size = open(html, "#lean");
    assert.equal(resultOf(size).shown, false, `${build}: the goal alone: no result`);
    assert.equal(questionsOf(size).weekends.shown, false, `${build}: Q2–Q4 wait for Q1`);
    answer(size, "lunch_dinner", "and");
    assert.deepEqual([resultOf(size).shown, resultOf(size).selection], [true, "and-5d"], `${build}: the goal first still works`);

    const start = open(html);
    assert.equal(hiddenInTree(start.el("result")), true, `${build}: nothing chosen, no result`);
  }
});

test("UQ1: the same answers give the same card whichever order they were given in", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const goalLast = open(html);
    answer(goalLast, "lunch_dinner", "and");
    answer(goalLast, "breakfast", "yes");
    chooseGoal(goalLast, "performance");
    const goalFirst = open(html);
    chooseGoal(goalFirst, "performance");
    answer(goalFirst, "lunch_dinner", "and");
    answer(goalFirst, "breakfast", "yes");
    const opened = open(html, "#performance-and-5d-b");
    for (const page of [goalLast, goalFirst]) {
      assert.equal(page.hash(), "#performance-and-5d-b", `${build}: the fragment`);
      assert.deepEqual(resultOf(page), resultOf(opened), `${build}: the result card`);
      assert.deepEqual(cardOf(page), cardOf(opened), `${build}: the Chef's Choice card and its links`);
    }
    assert.ok(cardOf(opened).checkout, `${build}: control: the fixture week has a cart for and, weekdays, breakfast`);
  }
});
