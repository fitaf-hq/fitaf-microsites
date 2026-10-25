// S30 (SPEC-rung4-save-offer.md § 2b item 4): a visit carrying #from-email opens at Flow 2 (the offer box, then question
// 1), and Flow 1 is the one-line Save my offer link at the end: directly after the store button once a plan is chosen
// (before one is chosen, § 2b item 2: not shown). Pressing it opens the form there.
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 1 item 2 (2026-10-23): "once a plan is chosen" is now "while the card's Continue
// to checkout is shown" (a week's cart for the answers), so the page here carries the fixture week; on Family, none.
import test from "node:test";
import assert from "node:assert/strict";
import { openPlanPage } from "./cc-harness.mjs";
import { answer, chooseGoal } from "./ms-harness.mjs";
import { assertFlowOneAbsent, assertFlowOneDirectlyAfterStoreButton, assertOfferBoxThenFlowTwo, NOW } from "./save-end-fixture.mjs";
import { weekPage } from "./uc-harness.mjs";

const html = await weekPage();

test("S30: #from-email — Flow 2 first", () => {
  assertOfferBoxThenFlowTwo(html, { hash: "#from-email" });
  assertFlowOneAbsent(openPlanPage(html, { hash: "#from-email", now: NOW }));
});

test("S30: #from-email — Flow 1 as the one-line link at the end; not on Family (§ 1 item 2); it opens the form there", () => {
  const page = openPlanPage(html, { hash: "#from-email", now: NOW });
  chooseGoal(page, "lean");
  answer(page, "lunch_dinner", "or");
  answer(page, "weekends", "yes");
  assertFlowOneDirectlyAfterStoreButton(page, { form: false });
  // ⚠ AMENDED by SPEC-ui-and-copy-pass § 2 item 2 (2026-10-25): the tabs are the first question's two answers.
  page.el("who-family").click();
  assertFlowOneAbsent(page);
  page.el("who-individual").click();
  assertFlowOneDirectlyAfterStoreButton(page, { form: false });
  page.el("save-reopen").click();
  assertFlowOneDirectlyAfterStoreButton(page);
});

test("S30: without #from-email, the same plan shows the form, not the link (control)", () => {
  const page = openPlanPage(html, { hash: "#lean-or-7d", now: NOW });
  assertFlowOneDirectlyAfterStoreButton(page);
  assert.equal(page.el("save-collapsed").hasAttribute("hidden"), true);
});
