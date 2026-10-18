// S28 (SPEC-rung4-save-offer.md § 2b item 2): with a plan chosen (and on Family), Flow 1's form is read directly after
// the button that leaves for the store (flows/02-choose.md § 7, "Choose your meals"; with a week, the Chef's Choice
// card's last link); before a plan is chosen it is not shown. Its states and transitions are flows/01's, unchanged.
import test from "node:test";
import assert from "node:assert/strict";
import { devPage } from "./dev-page.mjs";
import { DAYS, FIXTURE_DIR, midday, openPlanPage, pageWithPicks } from "./cc-harness.mjs";
import { answer, chooseGoal } from "./ms-harness.mjs";
import { assertFlowOneAbsent, assertFlowOneDirectlyAfterStoreButton, NOW } from "./save-end-fixture.mjs";

const html = await devPage({ card: true });

test("S28: before a plan is chosen, Flow 1 is absent (no fragment, a size alone, the meals alone, #individual)", () => {
  for (const hash of ["", "#lean", "#meals-or-7d", "#individual"]) {
    const page = openPlanPage(html, { hash, now: NOW });
    assert.equal(page.el("result").hasAttribute("hidden"), true, `${hash || "(no fragment)"}: control: no plan chosen`);
    assertFlowOneAbsent(page);
  }
});

test("S28: a plan chosen — Flow 1's form directly after Choose your meals", () => {
  for (const hash of ["#lean-or-7d", "#signature-and-5d-b", "#performance-14", "#lean-7"]) {
    const { button } = assertFlowOneDirectlyAfterStoreButton(openPlanPage(html, { hash, now: NOW }));
    assert.equal(button.id, "result-cta", hash);
    assert.equal(button.textContent.trim(), "Choose your meals", hash);
  }
});

test("S28: Family — Flow 1's form directly after the Family card's Choose your meals", () => {
  const { button } = assertFlowOneDirectlyAfterStoreButton(openPlanPage(html, { hash: "#family", now: NOW }));
  assert.equal(button.getAttribute("data-plan"), "family");
  assert.equal(button.textContent.trim(), "Choose your meals");
});

test("S28: as a visitor goes — absent, then after the plan's button, then Family's, then the plan's again; what was typed is kept", () => {
  const page = openPlanPage(html, { now: NOW });
  assertFlowOneAbsent(page);
  chooseGoal(page, "signature");
  assertFlowOneAbsent(page);
  answer(page, "lunch_dinner", "and");
  assertFlowOneDirectlyAfterStoreButton(page);
  page.el("save-email").value = "dummy-s28@example.com";
  page.el("tab-family").click();
  assertFlowOneDirectlyAfterStoreButton(page);
  assert.equal(page.el("save-email").value, "dummy-s28@example.com", "on Family: what was typed is kept");
  page.el("tab-individual").click();
  const { button } = assertFlowOneDirectlyAfterStoreButton(page);
  assert.equal(button.id, "result-cta");
  assert.equal(page.el("save-email").value, "dummy-s28@example.com", "back on the plan: what was typed is kept");
  assert.equal(page.document.querySelectorAll("#save").length, 1, "one Flow 1, moved, never copied");
});

test("S28: with a week's Chef's Choice, Flow 1 directly after the card's last link to the store (Choose my own meals)", async () => {
  const { html: withWeek } = await pageWithPicks({ target: "dev", picks: FIXTURE_DIR });
  const page = openPlanPage(withWeek, { hash: "#lean-7", now: midday(DAYS["S-5"]) });
  assert.equal(page.el("cc-list").hasAttribute("hidden"), false, "control: the week's list is shown");
  const { button } = assertFlowOneDirectlyAfterStoreButton(page);
  assert.equal(button.id, "cc-own");
});
