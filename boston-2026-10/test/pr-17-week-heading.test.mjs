// PR-17 (SPEC-plan-page-refinement § 8 item 6): Chef's Choice's heading names the week the meals are for, Monday to
// Sunday after the delivery: "Chef's Choice (October 5–11)" for the fixture week (delivered 2026-10-04), and across a
// month "September 28 – October 4". The phrase is data/messages.json's, its dates a placeholder.
import test from "node:test";
import assert from "node:assert/strict";
import { weekRange } from "../scripts/chefs-choice.mjs";
import { builtPage, card, DAYS, MESSAGES, midday, ON, openPlanPage } from "./cc-harness.mjs";

test("PR-17: the heading for the fixture week, and the cross-month form", async () => {
  const { html } = await builtPage({ on: ON });
  for (const hash of ["#lean-7", "#performance-14"]) {
    assert.equal(card(openPlanPage(html, { hash, now: midday(DAYS["S-5"]) })).heading, "Chef's Choice (October 5–11)", hash);
  }
  assert.equal(weekRange("2026-09-27"), "September 28 – October 4");
  assert.equal(MESSAGES.chefs_choice.heading, "Chef's Choice ({week})", "the phrase, its dates a placeholder");
});
