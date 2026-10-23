// SP1 (SPEC-save-offer-production.md § 1 item 1, § 5): "Save it" beside the offer it refers to. At the end of the process
// the step opens with the offer's line (the slot the offer box at the top shows: offerForSave's label, SPEC-rung4 § 2a)
// directly above "Not ready today? Save it …"; the offer box at the top unchanged; the step still at the end. Both builds:
// the development page here, on a plan, on Family and with a week; the production page with `production` true joins with
// SP4 (§ 3 item 2), whose approved fixtures it needs.
import test from "node:test";
import assert from "node:assert/strict";
import offersFile from "../data/offers.json" with { type: "json" };
import { offerForSave } from "../src/worker/offers.js";
import { devPage } from "./dev-page.mjs";
import { DAYS, FIXTURE_DIR, midday as ccMidday, openPlanPage, pageWithPicks } from "./cc-harness.mjs";
import { FIXTURE_OFFERS, midday, S21_DATES } from "./offer-box-fixture.mjs";
import { assertFlowOneDirectlyAfterStoreButton } from "./save-end-fixture.mjs";
import { assertOfferLineAsRun, assertOfferLineInMarkup, STEP_OFFER_LABEL } from "./sp-fixture.mjs";
import { approvedPage } from "./sp-production.mjs";

const html = await devPage({ card: true });
const fixture = await devPage({ offers: FIXTURE_OFFERS, card: true });

test("SP1: in the markup, the step's offer line directly above the save lead; the offer box at the top as it was", () => {
  assertOfferLineInMarkup(html);
  assertOfferLineInMarkup(fixture);
});

test("SP1: as run, on a plan and on Family, the step's line is offerForSave's label for the date (S21's dates), as the box's", () => {
  for (const hash of ["#lean-or-7d", "#family"]) {
    const shown = Object.values(S21_DATES).map((ymd) => assertOfferLineAsRun(fixture, FIXTURE_OFFERS.offers, { hash, now: midday(ymd) }));
    assert.equal(new Set(shown).size, 2, `${hash}: control: the dates straddle the event offer, so two labels are shown`);
  }
});

test("SP1: the step stays at the end, the line inside it: Flow 1 whole, directly after the store button", () => {
  for (const hash of ["#lean-or-7d", "#family"]) {
    const page = openPlanPage(fixture, { hash, now: midday(S21_DATES.inside) });
    const { flowOne } = assertFlowOneDirectlyAfterStoreButton(page);
    assert.ok(flowOne.includes(page.el(STEP_OFFER_LABEL)), `${hash}: the offer's line is read as part of Flow 1`);
  }
});

test("SP1: with a week's Chef's Choice, the line in the step after the card's last link", async () => {
  const { html: withWeek } = await pageWithPicks({ target: "dev", picks: FIXTURE_DIR });
  const now = ccMidday(DAYS["S-3"]); // a day of the week's window and of the offer (§ 10.7: it runs from 2026-10-01)
  const label = assertOfferLineAsRun(withWeek, offersFile.offers, { hash: "#lean-7", now });
  assert.ok(label, "control: data/offers.json gives a label on that date");
});

test("SP1: a label is written as text, never as markup; no offer to choose leaves the line empty and the page working", async () => {
  const marked = structuredClone(FIXTURE_OFFERS);
  for (const o of marked.offers) o.label = `<em>${o.id}</em> & "more"`;
  const page = await devPage({ offers: marked, card: true });
  assertOfferLineAsRun(page, marked.offers, { hash: "#lean-or-7d", now: midday(S21_DATES.inside) });

  const broken = structuredClone(FIXTURE_OFFERS);
  broken.offers.find((o) => o.id === "general-b-fixture").valid_from = "2026-09-01";
  assert.throws(() => offerForSave(S21_DATES.before, broken.offers), /at most one current general offer/, "control: no offer can be chosen");
  const run = openPlanPage(await devPage({ offers: broken, card: true }), { hash: "#lean-or-7d", now: midday(S21_DATES.before) });
  assert.equal(run.el(STEP_OFFER_LABEL).textContent, "", "the step's line shows nothing in place of a label");
  assert.equal(run.el("save-offer-label").textContent, "", "as the box at the top does");
  assert.equal(run.el("save-form").hasAttribute("hidden"), false, "the form is still there");
});

// The production half (§ 3 item 2: the production page with `production` true carries Flow 1 with § 1's tweaks), on the
// page sp-production.mjs builds from the approved fixtures.
test("SP1 (production true): the step's offer line directly above the save lead, the box at the top as it was", async () => {
  const { html, inputs } = await approvedPage();
  assertOfferLineInMarkup(html);
  // Since § 10.7 the file has one offer, so the dates where it is live show its line; on the others (before it, after
  // it) no step is drawn (SP16).
  const live = Object.values(S21_DATES).filter((ymd) => offerForSave(ymd, inputs.offers.offers));
  assert.ok(live.length >= 2 && live.length < Object.values(S21_DATES).length, `control: S21's dates straddle the offer (${live})`);
  for (const hash of ["#lean-or-7d", "#family"]) {
    const shown = live.map((ymd) => assertOfferLineAsRun(html, inputs.offers.offers, { hash, now: midday(ymd) }));
    assert.equal(new Set(shown).size, 1, `${hash}: the one offer's label`);
  }
});
