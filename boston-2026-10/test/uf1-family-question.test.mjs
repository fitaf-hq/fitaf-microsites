// UF1 (SPEC-ui-and-copy-pass.md § 2.2 item 1): *Me and my family* asks ONE meal question, lunch or dinner / lunch and
// dinner, its heading and answers the individual Q1's (data/messages.json's `plan_page.questions.lunch_dinner`), and
// nothing else: no weekends, no breakfast, no snacks, no goal, no calculator. The fragment: `#family` lands on Family with
// nothing answered, `#family-or` and `#family-and` on their answer; a press writes it. Every individual answer is kept
// while Family is chosen and comes back with *Just me*, and Family's answer is kept the other way. Both builds.
import test from "node:test";
import assert from "node:assert/strict";
import { hiddenInTree, MESSAGES } from "./cc-harness.mjs";
import { answer, open, questionsOf, resultOf } from "./ms-harness.mjs";
import { answerFamily, familyOf } from "./uf-harness.mjs";
import { choose, pages, whoOf } from "./uq-harness.mjs";

const { production, development } = await pages();
const BUILDS = { production, development };
const q1 = MESSAGES.plan_page.questions.lunch_dinner;
/** What a visitor reads as text, the emphasis marks of the words removed. */
const plain = (phrase) => phrase.replace(/\*([^*]+)\*/g, "$1");

test("UF1: Family's one question — Q1's heading and answers, in Q1's look; nothing else asked, no goal, no calculator", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html, "#family");
    const panel = page.el("panel-family");
    const groups = [...panel.querySelectorAll('.step[role="group"]')];
    assert.equal(groups.length, 1, `${build}: one question in the Family panel`);
    const [group] = groups;
    assert.equal(group.id, "family-question", `${build}: its id`);
    const heading = group.querySelector("h2.step-label");
    assert.equal(group.getAttribute("aria-labelledby"), heading?.id, `${build}: the group named by its heading`);
    assert.equal(heading.textContent.trim(), q1.heading, `${build}: Q1's heading`);
    const buttons = [...group.querySelectorAll(".choices.counts > button.choice")];
    assert.deepEqual(buttons.map((b) => b.getAttribute("data-family")), ["or", "and"], `${build}: or on the left, and on the right`);
    assert.deepEqual(buttons.map((b) => b.textContent.trim()), [plain(q1.or), plain(q1.and)], `${build}: Q1's answers`);
    assert.deepEqual(buttons.map((b) => b.querySelector("em")?.textContent), ["or", "and"], `${build}: the or / and emphasised, as Q1's`);
    assert.equal(group.classList.contains("js-only"), true, `${build}: needs the page's script, as every question`);
    assert.equal(familyOf(page).shown, true, `${build}: shown on Family`);
    for (const id of ["q-lunch_dinner", "q-weekends", "q-breakfast", "q-snacks", "q-goal"]) assert.equal(hiddenInTree(page.el(id)), true, `${build}: #${id} not shown on Family`);
    if (page.has("share")) assert.equal(hiddenInTree(page.el("share")), true, `${build}: no calculator`);
    assert.equal(panel.querySelectorAll("[data-q], [data-goal]").length, 0, `${build}: no individual question or goal in the Family panel`);
  }
});

test("UF1: #family lands on Family, nothing answered; #family-or and #family-and on their answer; a press writes it", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    for (const [hash, pressed] of [["#family", []], ["#family-or", ["or"]], ["#family-and", ["and"]]]) {
      const page = open(html, hash);
      assert.deepEqual([whoOf(page).pressed, familyOf(page).pressed], [["family"], pressed], `${build}, ${hash}`);
      assert.equal(page.hash(), hash, `${build}, ${hash}: no fragment of its own on opening`);
    }
    for (const hash of ["#family-both", "#family-or-5d", "#family-"]) {
      assert.deepEqual([whoOf(open(html, hash)).pressed, familyOf(open(html, hash)).pressed], [["individual"], []], `${build}, ${hash}: not a Family fragment: the individual page`);
    }
    const page = open(html, "#family");
    answerFamily(page, "or");
    assert.equal(page.hash(), "#family-or", `${build}: or`);
    answerFamily(page, "or");
    assert.equal(page.hash(), "#family-or", `${build}: or again: nothing new`);
    answerFamily(page, "and");
    assert.deepEqual([page.hash(), familyOf(page).pressed], ["#family-and", ["and"]], `${build}: and`);
  }
});

test("UF1: Just me brings every individual answer back, and Family keeps its own", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html, "#signature-and-5d-b");
    const individual = { questions: questionsOf(page), result: resultOf(page) };
    assert.equal(individual.result.shown, true, `${build}: control: the individual result`);
    choose(page, "family");
    assert.equal(page.hash(), "#family", `${build}: Family, nothing answered yet`);
    answerFamily(page, "and");
    assert.equal(page.hash(), "#family-and");
    choose(page, "individual");
    assert.equal(page.hash(), "#signature-and-5d-b", `${build}: Just me: the state left`);
    assert.deepEqual({ questions: questionsOf(page), result: resultOf(page) }, individual, `${build}: every answer kept`);
    answer(page, "weekends", "yes");
    choose(page, "family");
    assert.deepEqual([page.hash(), familyOf(page).pressed], ["#family-and", ["and"]], `${build}: Family's answer kept`);
    choose(page, "individual");
    assert.equal(page.hash(), "#signature-and-7d-b", `${build}: and the individual's last change`);
  }
});
