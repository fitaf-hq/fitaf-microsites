// MS-12 (SPEC-meal-selection.md § 8 item 3, § 8.1): partial fragments. `#lean` (a size, Q1 not answered),
// `#meals-or-7d` (the answers, no size) and `#individual` (neither) open as their states and round-trip; today's
// `#meals-14` opens the answers of *and*, every day. Q2–Q4 are not shown until Q1 is answered (§ 7, ruled "After Q1").
// The two cases that read Q4 build from their own data with snacks shown (ms-harness SNACKS_SHOWN, § 11).
import test from "node:test";
import assert from "node:assert/strict";
import { answer, chooseGoal, open, pageOf, questionsOf, resultOf, SNACKS_SHOWN } from "./ms-harness.mjs";

const pressedGoals = (page) =>
  [...page.document.querySelectorAll("[data-goal]")].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.getAttribute("data-goal"));

test("MS-12: #lean is the size alone: Q1 waits, Q2–Q4 hidden, no card; pressing Lean again writes nothing", async () => {
  const page = open(await pageOf({ snacks: SNACKS_SHOWN }), "#lean");
  const q = questionsOf(page);
  assert.deepEqual(pressedGoals(page), ["lean"]);
  assert.equal(q.lunch_dinner.shown, true, "Q1 shown");
  assert.equal(q.lunch_dinner.pressed, null, "Q1 not answered");
  assert.deepEqual([q.weekends.shown, q.breakfast.shown, q.snacks.shown], [false, false, false], "Q2–Q4 wait for Q1");
  assert.equal(resultOf(page).shown, false);
  chooseGoal(page, "lean");
  assert.equal(page.hash(), "#lean", "round trip");
});

test("MS-12: #meals-or-7d is the answers alone: Q2–Q4 shown at the fragment's answers, no size, no card", async () => {
  const page = open(await pageOf({ snacks: SNACKS_SHOWN }), "#meals-or-7d");
  const q = questionsOf(page);
  assert.deepEqual(pressedGoals(page), []);
  assert.deepEqual([q.lunch_dinner.pressed, q.weekends.pressed, q.breakfast.pressed, q.snacks.pressed], ["or", "yes", "no", "no"]);
  assert.deepEqual([q.weekends.shown, q.breakfast.shown, q.snacks.shown], [true, true, true], "Q2–Q4 shown once Q1 is answered");
  assert.equal(resultOf(page).shown, false, "no card without a size");
  answer(page, "lunch_dinner", "or");
  assert.equal(page.hash(), "#meals-or-7d", "round trip");
  answer(page, "weekends", "no");
  assert.equal(page.hash(), "#meals-or-5d", "a partial state keeps its fragment as the answers change");
  chooseGoal(page, "signature");
  assert.equal(page.hash(), "#signature-or-5d", "and a size completes it");
  assert.equal(resultOf(page).shown, true);
});

test("MS-12: #individual is neither: nothing pressed; the Individual tab writes #individual again", async () => {
  const page = open(await pageOf(), "#individual");
  const q = questionsOf(page);
  assert.deepEqual([pressedGoals(page), q.lunch_dinner.pressed, q.weekends.shown, resultOf(page).shown], [[], null, false, false]);
  page.el("tab-individual").click();
  assert.equal(page.hash(), "#individual", "round trip");
});

test("MS-12: today's #meals-14 opens and, every day; #meals-7 or, every day", async () => {
  const html = await pageOf();
  for (const [hash, ld] of [["#meals-14", "and"], ["#meals-7", "or"]]) {
    const page = open(html, hash);
    const q = questionsOf(page);
    assert.deepEqual([pressedGoals(page), q.lunch_dinner.pressed, q.weekends.pressed, q.breakfast.pressed], [[], ld, "yes", "no"], hash);
    chooseGoal(page, "lean");
    assert.equal(page.hash(), `#lean-${ld}-7d`, `${hash}, then a size: the new grammar`);
  }
});

test("MS-12: after the Family tab, the Individual tab returns to the state left", async () => {
  const page = open(await pageOf(), "#lean-and-5d-b");
  page.el("tab-family").click();
  assert.equal(page.hash(), "#family");
  page.el("tab-individual").click();
  assert.equal(page.hash(), "#lean-and-5d-b");
});
