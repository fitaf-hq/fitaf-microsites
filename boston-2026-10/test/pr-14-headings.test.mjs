// PR-14 (SPEC-plan-page-refinement § 8 item 3), as written: no step numbers; the centring is measured in Chrome
// (tools/storybook's pr-chrome case).
// Updated (SPEC-meal-selection § 1, § 8 item 5): the meals question is four, each with its heading; Q1's is the old
// second heading, now a phrase of data/messages.json (`plan_page.questions.<question>.heading`), as Q2–Q4's are.
import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { renderPage } from "../build.mjs";
import { MESSAGES, PLANS } from "./cc-harness.mjs";

test("PR-14: no step number", async () => {
  const { document } = parseHTML(await renderPage(PLANS));
  const headings = [...document.querySelectorAll(".step-label")].map((h) => h.textContent.trim());
  const q = MESSAGES.plan_page.questions;
  assert.equal(q.lunch_dinner.heading, "Which meals should we cover?", "Q1's heading is the old second heading");
  assert.deepEqual(headings, ["What's your goal?", q.lunch_dinner.heading, q.weekends.heading, q.breakfast.heading, q.snacks.heading]);
  assert.equal(document.querySelectorAll(".step-num").length, 0);
});
