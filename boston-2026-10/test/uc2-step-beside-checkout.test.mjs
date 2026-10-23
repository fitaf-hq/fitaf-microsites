// UC2 (SPEC-ui-and-copy-pass.md § 1 item 2, the Advisor's note f-save-after: "It should go away. Also "Not ready
// today?" should only appear when the Checkout button appears. This is a UX evolution from the initial brief."): the
// save step is shown only while the card's Continue to checkout (#cc-checkout, a week's cart for the answers) is shown,
// in its place after the card as before (SPEC-rung4 § 2b); never with Choose your meals alone, never on Family, never on
// a page with no week. After a save it goes away: the step's offer line, the lead and the form (its fine print with it)
// hidden, the done line where the step was. Both builds that carry the step.
// ⭐ Mutant (on a copy of the built page, in memory): the step placed by the result card alone, as it was before this
// contract -> UC2 fails, by its own assertion.
import test from "node:test";
import assert from "node:assert/strict";
import { hiddenInTree, openPlanPage } from "./cc-harness.mjs";
import { devPage } from "./dev-page.mjs";
import { assertFlowOneAbsent, assertFlowOneDirectlyAfterStoreButton, storeButton } from "./save-end-fixture.mjs";
import { approvedWeekPage, CHECKOUT, NEAR_ZIP, NO_CART, NOW, openStep, saveWith, settle, shown, stepRead, weekPage } from "./uc-harness.mjs";

const dev = await weekPage();
const pages = [
  ["the development page", dev],
  ["the production page (production true)", (await approvedWeekPage()).html],
];
const noWeek = await devPage({ card: true });

/** What is drawn of the card: whether Continue to checkout shows, and whether Choose your meals does. */
const cardAt = (page) => ({ checkout: !hiddenInTree(page.el("cc-checkout")), choose: !hiddenInTree(page.el("result-cta")) });

/** UC2's placement, on any page carrying a week (so a mutant can be run on it): beside Continue to checkout, and only there. */
function assertStepOnlyBesideCheckout(html, where) {
  const at = openPlanPage(html, { hash: CHECKOUT, now: NOW });
  assert.deepEqual(cardAt(at), { checkout: true, choose: false }, `${where}, ${CHECKOUT}: control: the card shows Continue to checkout`);
  const { button } = assertFlowOneDirectlyAfterStoreButton(at);
  assert.equal(button.id, "cc-own", `${where}, ${CHECKOUT}: the step directly after the card (its last link, Choose my own meals)`);
  for (const hash of [NO_CART, "#lean-or-5d-b", "", "#lean", "#family"]) {
    const page = openPlanPage(html, { hash, now: NOW });
    assert.equal(cardAt(page).checkout, false, `${where}, ${hash || "(no fragment)"}: control: no Continue to checkout`);
    try {
      assertFlowOneAbsent(page);
    } catch (err) {
      err.message = `${where}, ${hash || "(no fragment)"}: no Continue to checkout, so no step: ${err.message}`;
      throw err;
    }
  }
  assert.equal(cardAt(openPlanPage(html, { hash: NO_CART, now: NOW })).choose, true, `${where}, ${NO_CART}: control: Choose your meals alone`);
}

test("UC2: the step is shown beside Continue to checkout, and only there (no cart for the answers, no plan, Family)", () => {
  for (const [where, html] of pages) assertStepOnlyBesideCheckout(html, where);
});

test("UC2: a page with no week has no Continue to checkout, so no step, whatever is chosen", () => {
  for (const hash of [CHECKOUT, "#lean-or-7d", "#signature-and-5d-b", "#family"]) {
    const page = openPlanPage(noWeek, { hash, now: NOW });
    assertFlowOneAbsent(page);
  }
  assert.equal(hiddenInTree(openPlanPage(noWeek, { hash: CHECKOUT, now: NOW }).el("result-cta")), false, "control: Choose your meals is shown");
});

test("UC2: as a visitor goes — beside checkout, gone without it and on Family, back again; what was typed is kept", () => {
  const page = openPlanPage(dev, { hash: CHECKOUT, now: NOW });
  assertFlowOneDirectlyAfterStoreButton(page);
  page.el("save-email").value = "dummy-uc2@example.com";
  page.go(NO_CART);
  assertFlowOneAbsent(page);
  page.go("#family");
  assertFlowOneAbsent(page);
  page.go(CHECKOUT);
  assertFlowOneDirectlyAfterStoreButton(page);
  assert.equal(page.el("save-email").value, "dummy-uc2@example.com", "what was typed is kept");
  assert.equal(page.document.querySelectorAll("#save").length, 1, "one step, never copied");
});

test("UC2: after a save the step goes away — only the done line, where the step was", async () => {
  for (const [where, html] of pages) {
    const page = openStep(html);
    const draft = where.startsWith("the development") ? [".draft-tag"] : [];
    assert.deepEqual(
      stepRead(page).filter((id) => ["save-step-offer-label", "save-lead", "save-email", "save-done"].includes(id)),
      ["save-step-offer-label", "save-lead", "save-email"],
      `${where}: control: before the save, the offer's line, the lead and the form`,
    );
    await saveWith(page);
    assert.equal(page.fetches.length, 1, `${where}: control: the save was sent`);
    assert.deepEqual(stepRead(page), [...draft, "save-done", "save-done-email"], `${where}: SAVED: the done line alone (the development page's DRAFT tag apart)`);
    for (const id of ["save-step-offer", "save-lead", "save-form"]) assert.equal(shown(page, id), false, `${where}: #${id} hidden`);
    const { flowOne } = assertFlowOneDirectlyAfterStoreButton(page, { form: false, done: true });
    assert.ok(flowOne.includes(page.el("save-done")), `${where}: the done line where the step was, directly after the store button`);
  }
});

test("UC2: out of area, then Tell me when you deliver here — the step goes away, the expansion's done line in its place", async () => {
  const page = openStep(dev);
  await saveWith(page, { zip: NEAR_ZIP });
  assert.equal(shown(page, "save-out-of-area"), true, "control: out of area");
  page.el("save-expansion").click();
  await settle();
  assert.deepEqual(stepRead(page), [".draft-tag", "save-expansion-done"], "EXPANSION_SAVED: its done line alone");
  for (const id of ["save-step-offer", "save-lead", "save-form", "save-out-of-area"]) assert.equal(shown(page, id), false, `#${id} hidden`);
  assert.equal(storeButton(page).id, "cc-own", "control: still beside checkout");
});

test("UC2: #from-email — the one-line Save my offer only beside checkout", () => {
  const page = openPlanPage(dev, { hash: "#from-email", now: NOW });
  assertFlowOneAbsent(page);
  page.go(CHECKOUT);
  assertFlowOneDirectlyAfterStoreButton(page, { form: false });
  page.go(NO_CART);
  assertFlowOneAbsent(page);
  page.go("#family");
  assertFlowOneAbsent(page);
});

test("UC2: mutant — the step placed by the result card alone (before this contract) -> UC2 fails", () => {
  assertStepOnlyBesideCheckout(dev, "control"); // the page as built passes
  const site = '  return !!checkout && !el("panel-individual").hidden && !el("result").hidden && !el("cc-list").hidden && !checkout.hidden;';
  assert.equal(dev.split(site).length - 1, 1, "the mutation site occurs exactly once");
  const mutant = dev.replace(site, '  return !el("panel-individual").hidden && !el("result").hidden;');
  assert.throws(
    () => assertStepOnlyBesideCheckout(mutant, "mutant"),
    (err) => err instanceof assert.AssertionError && /mutant, #lean-or-5d: no Continue to checkout, so no step/.test(err.message),
    "UC2 must fail on the mutant, by its own assertion",
  );
});
