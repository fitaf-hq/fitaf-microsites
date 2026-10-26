// S27 (SPEC-rung4-save-offer.md § 2b items 1-2): the development page, in document order. The offer box (§ 2a's heading
// and label) first; Flow 2's question 1 next; no Flow 1 form above the store button — in the markup, and as the page
// runs, at its opening and again with a plan chosen and on Family. The assertion is save-end-fixture.mjs's, which S31
// runs on two mutants.
import test from "node:test";
import assert from "node:assert/strict";
import { devPage } from "./dev-page.mjs";
import { assertOfferBoxThenFlowTwo, NOW } from "./save-end-fixture.mjs";
import { openPlanPage } from "./cc-harness.mjs";
import { weekPage } from "./uc-harness.mjs";

test("S27: the offer box (heading and label) first; Flow 2's question 1 next; no Flow 1 form above the store button", async () => {
  // Since SPEC-ui-and-copy-pass § 1 item 2 the step is shown only beside a week's Continue to checkout, so the page with the
  // fixture week is the one where Flow 1 is read at all (#lean-or-7d: its cart); the pages without a week as before.
  for (const html of [await devPage(), await devPage({ card: true }), await weekPage()]) assertOfferBoxThenFlowTwo(html);
});

test("S27: the offer box holds § 2a's heading and offers.json's label, and nothing of Flow 1", async () => {
  const page = openPlanPage(await devPage({ card: true }), { now: NOW });
  const box = page.el("offer-box");
  assert.equal(page.el("save-title").textContent, "Your Boston offer");
  assert.ok(box.contains(page.el("save-offer-label")), "the label is in the box");
  for (const id of ["save-form", "save-out-of-area", "save-collapsed", "save-done"]) assert.ok(!box.contains(page.el(id)), `#${id} is not in the box`);
  assert.doesNotMatch(box.textContent, /Not ready today|Save my offer|Tell me when/, "no Flow 1 line in the box");
});
