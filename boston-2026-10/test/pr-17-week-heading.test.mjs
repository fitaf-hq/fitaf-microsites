// PR-17 (SPEC-plan-page-refinement § 8 item 6): Chef's Choice's heading names the week the meals are for, Monday to
// Sunday after the delivery: "Chef's Choice (October 5–11)" for the fixture week (delivered 2026-10-04), and across a
// month "September 28 – October 4". The phrase is data/messages.json's, its dates a placeholder; since
// SPEC-every-menu-and-nutrition § 4 (the Advisor's ruling of 2026-10-21) its menu too, `{menu}`, Chef's Choice's name for
// this one-list week, so the heading reads as it did.
// ⚠ AMENDED by SPEC-every-menu-and-nutrition § 11 item 1 (the Advisor's review of 2026-10-22: *"The name of the menu is
// just "Chef's Choice", etc – the date range is for internal reference"*): the heading is the menu's name alone; `{week}`
// stays a placeholder the build accepts (its range, weekRange, as before) and the committed words no longer use. EM7
// holds the heading for every menu.
import test from "node:test";
import assert from "node:assert/strict";
import { weekRange } from "../scripts/chefs-choice.mjs";
import { builtPage, card, DAYS, MESSAGES, midday, openPlanPage } from "./cc-harness.mjs";

test("PR-17: the heading for the fixture week, the menu's name alone (§ 11 item 1), and the range's cross-month form", async () => {
  const { html } = await builtPage();
  for (const hash of ["#lean-7", "#performance-14"]) {
    assert.equal(card(openPlanPage(html, { hash, now: midday(DAYS["S-5"]) })).heading, "Chef's Choice", hash);
  }
  assert.equal(weekRange("2026-09-27"), "September 28 – October 4");
  assert.equal(MESSAGES.chefs_choice.heading, "{menu}", "the phrase: the menu's name alone, no range");
  assert.equal(MESSAGES.menus["chefs-choice"], "Chef's Choice", "Chef's Choice's name, the {menu} of a one-list week");
});
