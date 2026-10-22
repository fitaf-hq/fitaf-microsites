// PR-17 (SPEC-plan-page-refinement § 8 item 6): Chef's Choice's heading names the week the meals are for, Monday to
// Sunday after the delivery: "Chef's Choice (October 5–11)" for the fixture week (delivered 2026-10-04), and across a
// month "September 28 – October 4". The phrase is data/messages.json's, its dates a placeholder; since
// SPEC-every-menu-and-nutrition § 4 (the Advisor's ruling of 2026-10-21) its menu too, `{menu}`, Chef's Choice's name for
// this one-list week, so the heading reads as it did.
import test from "node:test";
import assert from "node:assert/strict";
import { weekRange } from "../scripts/chefs-choice.mjs";
import { builtPage, card, DAYS, MESSAGES, midday, openPlanPage } from "./cc-harness.mjs";

test("PR-17: the heading for the fixture week, and the cross-month form", async () => {
  const { html } = await builtPage();
  for (const hash of ["#lean-7", "#performance-14"]) {
    assert.equal(card(openPlanPage(html, { hash, now: midday(DAYS["S-5"]) })).heading, "Chef's Choice (October 5–11)", hash);
  }
  assert.equal(weekRange("2026-09-27"), "September 28 – October 4");
  assert.equal(MESSAGES.chefs_choice.heading, "{menu} ({week})", "the phrase, its menu and its dates placeholders");
  assert.equal(MESSAGES.menus["chefs-choice"], "Chef's Choice", "Chef's Choice's name, the {menu} of a one-list week");
});
