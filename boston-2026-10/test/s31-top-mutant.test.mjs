// S31 (SPEC-rung4-save-offer.md § 2b): mutant — Flow 1 rendered at the top again -> S27 fails. Two mutants, each on a COPY
// of the built page, in memory (no file is written): the build's (Flow 1's section back under the offer box, where rung
// 4 had it) and the script's (Flow 1's render placing it in the offer box once a plan is chosen). The control first: the
// page as built passes S27.
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 1 item 2 (2026-10-23): the step is shown only beside a week's Continue to
// checkout, so the page carries the fixture week (#lean-or-7d its cart, where S27 reads Flow 1), and the script's one
// place for the step is ANCHOR (Family has none since that item).
import test from "node:test";
import assert from "node:assert/strict";
import { assertOfferBoxThenFlowTwo } from "./save-end-fixture.mjs";
import { weekPage } from "./uc-harness.mjs";

const html = await weekPage();
const once = (text, site) => assert.equal(text.split(site).length - 1, 1, `the mutation site occurs exactly once: ${site.slice(0, 60)}`);

test("S31: mutant — Flow 1's section back at the top, under the offer box -> S27 fails", () => {
  assertOfferBoxThenFlowTwo(html); // control
  const section = /\n\s*<section class="save js-only" id="save"[\s\S]*?<\/section>/.exec(html)?.[0];
  assert.ok(section);
  once(html, section);
  const boxEnd = /<section class="offer-box js-only" id="offer-box"[\s\S]*?<\/section>/.exec(html)?.[0];
  assert.ok(boxEnd);
  once(html, boxEnd);
  const mutant = html.replace(section, "").replace(boxEnd, boxEnd + section.replace(" hidden>", ">"));
  assert.notEqual(mutant, html, "the copy is mutated");
  assert.throws(
    () => assertOfferBoxThenFlowTwo(mutant),
    (err) => err instanceof assert.AssertionError && /in the markup: no Flow 1 above the store button/.test(err.message),
    "S27 must fail on the mutant, by its own assertion",
  );
});

test("S31: mutant — Flow 1's render places it in the offer box once a plan is chosen -> S27 fails", () => {
  assertOfferBoxThenFlowTwo(html); // control
  const site = 'var ANCHOR = "save-end";';
  once(html, site);
  const mutant = html.replace(site, 'var ANCHOR = "offer-box";');
  assert.throws(
    () => assertOfferBoxThenFlowTwo(mutant),
    // The first of S27's run checks to see it: in the offer box, Flow 1 is read before question 1.
    (err) => err instanceof assert.AssertionError && /#lean-or-7d: nothing of Flow 1 before question 1/.test(err.message),
    "S27 must fail on the mutant, by its own assertion",
  );
});
