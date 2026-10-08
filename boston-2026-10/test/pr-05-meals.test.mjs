// PR-5 (SPEC-plan-page-refinement § 2 item 3, § 5): which meals, two buttons: "Lunch or dinner" and "Lunch and dinner",
// the or / and emphasised, the words from data/messages.json (`plan_page`).
// Updated (§ 8 item 4): the numeral first, then "meals/week", then the meals line (the order is PR-15's).
// Updated again (SPEC-meal-selection § 1, § 7 and § 9 item 2, ruled "Words only"): the two buttons are Q1, *or* / *and*,
// and lose their numeral and unit (the meals a week change with Q2 and Q3); their words are
// `plan_page.questions.lunch_dinner`, and the result card carries the meals a week instead (`plan_page.meals_unit`, MS-1).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseHTML } from "linkedom";
import { renderPage, ROOT } from "../build.mjs";
import { MESSAGES, PLANS } from "./cc-harness.mjs";

const EXPECTED = { or: ["Lunch or dinner", "or"], and: ["Lunch and dinner", "and"] };

test("PR-5: two buttons with § 2 item 3's words from data/messages.json, or / and emphasised", async () => {
  const { document } = parseHTML(await renderPage(PLANS));
  const buttons = [...document.querySelectorAll('[data-q="lunch_dinner"]')];
  assert.deepEqual(buttons.map((b) => b.getAttribute("data-a")), ["or", "and"]);
  for (const b of buttons) {
    const [name, word] = EXPECTED[b.getAttribute("data-a")];
    assert.equal(b.textContent, name, "the words alone");
    assert.equal(b.querySelector("em")?.textContent, word, `${name}: "${word}" emphasised`);
    assert.equal(b.querySelectorAll(".count-n, .count-unit").length, 0, `${name}: no numeral, no unit`);
  }
  const words = MESSAGES.plan_page;
  assert.deepEqual(
    [words.questions.lunch_dinner.or, words.questions.lunch_dinner.and, words.meals_unit],
    ["Lunch *or* dinner", "Lunch *and* dinner", "meals/week"],
    "the words are data's",
  );
  for (const file of ["src/template.html", "build.mjs", "src/app.js"]) {
    assert.ok(!(await readFile(join(ROOT, file), "utf8")).includes("meals/week"), `${file} types none of them`);
  }
});
