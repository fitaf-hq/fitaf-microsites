// S28 (SPEC-rung4-save-offer.md § 2b item 2): with a plan chosen (and on Family), Flow 1's form is read directly after
// the button that leaves for the store (flows/02-choose.md § 7, "Choose your meals"; with a week, the Chef's Choice
// card's last link); before a plan is chosen it is not shown. Its states and transitions are flows/01's, unchanged.
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 1 item 2 (2026-10-23, the Advisor: ""Not ready today?" should only appear when the
// Checkout button appears"): "a plan chosen" is now "the card's Continue to checkout shown", which only a week's cart for
// the answers draws, so Flow 1 is read directly after the Chef's Choice card; with Choose your meals alone (no week, or
// no cart for the answers) and on Family it is not shown. UC2 holds the rule and its mutant.
import test from "node:test";
import assert from "node:assert/strict";
import { devPage } from "./dev-page.mjs";
import { openPlanPage } from "./cc-harness.mjs";
import { answer, chooseGoal } from "./ms-harness.mjs";
import { assertFlowOneAbsent, assertFlowOneDirectlyAfterStoreButton, NOW } from "./save-end-fixture.mjs";
import { CHECKOUT, weekPage } from "./uc-harness.mjs";

const html = await devPage({ card: true });
const withWeek = await weekPage();

test("S28: before a plan is chosen, Flow 1 is absent (no fragment, a size alone, the meals alone, #individual)", () => {
  for (const page of [html, withWeek]) {
    for (const hash of ["", "#lean", "#meals-or-7d", "#individual"]) {
      const at = openPlanPage(page, { hash, now: NOW });
      assert.equal(at.el("result").hasAttribute("hidden"), true, `${hash || "(no fragment)"}: control: no plan chosen`);
      assertFlowOneAbsent(at);
    }
  }
});

test("S28 (§ 1 item 2): a plan chosen on a page with no week — Choose your meals alone, so no Flow 1", () => {
  for (const hash of ["#lean-or-7d", "#signature-and-5d-b", "#performance-14", "#lean-7"]) {
    const page = openPlanPage(html, { hash, now: NOW });
    assert.equal(page.el("result-cta").textContent.trim(), "Choose your meals", `${hash}: control: the store button`);
    assertFlowOneAbsent(page);
  }
});

test("S28 (§ 1 item 2): Family — no Continue to checkout, so no Flow 1", () => {
  for (const page of [html, withWeek]) assertFlowOneAbsent(openPlanPage(page, { hash: "#family", now: NOW }));
});

test("S28: as a visitor goes — absent, then after the card's Continue to checkout, gone on Family, back on the plan; what was typed is kept", () => {
  const page = openPlanPage(withWeek, { now: NOW });
  assertFlowOneAbsent(page);
  chooseGoal(page, "lean");
  assertFlowOneAbsent(page);
  answer(page, "lunch_dinner", "or");
  answer(page, "weekends", "yes");
  assertFlowOneDirectlyAfterStoreButton(page);
  page.el("save-email").value = "dummy-s28@example.com";
  // ⚠ AMENDED by SPEC-ui-and-copy-pass § 2 item 2 (2026-10-25): the tabs are the first question's two answers.
  page.el("who-family").click();
  assertFlowOneAbsent(page);
  page.el("who-individual").click();
  const { button } = assertFlowOneDirectlyAfterStoreButton(page);
  assert.equal(button.id, "cc-checkout"); // ⚠ AMENDED by SPEC-ui-and-copy-pass § 5 item 1: the card's last link
  assert.equal(page.el("save-email").value, "dummy-s28@example.com", "back on the plan: what was typed is kept");
  assert.equal(page.document.querySelectorAll("#save").length, 1, "one Flow 1, never copied");
});

// ⚠ AMENDED by SPEC-ui-and-copy-pass § 5 item 1 (2026-10-26): the card's last link to the store is Continue to checkout
// (Choose my own meals a chip above the list).
test("S28: with a week's Chef's Choice, Flow 1 directly after the card's last link to the store (Continue to checkout)", () => {
  const page = openPlanPage(withWeek, { hash: CHECKOUT, now: NOW });
  assert.equal(page.el("cc-list").hasAttribute("hidden"), false, "control: the week's list is shown");
  const { button } = assertFlowOneDirectlyAfterStoreButton(page);
  assert.equal(button.id, "cc-checkout");
});
