// S25 (SPEC-rung4 § 2a): mutant — the page chooses with its own copy of the rule (the first live offer of any
// kind) instead of the Worker's offerForSave -> S21 fails. The mutation is made on a COPY of the built page,
// in memory; no file is written.
import test from "node:test";
import assert from "node:assert/strict";
import { offerForSave } from "../src/worker/offers.js";
import { devPage } from "./dev-page.mjs";
import { assertOfferBoxFollowsWorker, FIXTURE_OFFERS } from "./offer-box-fixture.mjs";

const OWN_RULE = `function offerForSave(today, offers) {
  return offers.find(function (o) { return o.valid_from <= today && today <= o.valid_to; });
}`;

test("S25: mutant — the page's own copy of the rule (first live offer of any kind) -> S21 fails", async () => {
  const html = await devPage({ offers: FIXTURE_OFFERS });
  assertOfferBoxFollowsWorker(html, FIXTURE_OFFERS.offers); // control: the page as built passes S21

  const site = offerForSave.toString();
  assert.equal(html.split(site).length - 1, 1, "the mutation site (the Worker's offerForSave, inlined) occurs exactly once");
  const mutant = html.split(site).join(OWN_RULE);
  assert.ok(!mutant.includes(site) && mutant.includes(OWN_RULE), "the copy is mutated");
  assert.throws(
    () => assertOfferBoxFollowsWorker(mutant, FIXTURE_OFFERS.offers),
    (err) =>
      err instanceof assert.AssertionError &&
      /the box shows the label offerForSave gives the Worker/.test(err.message) &&
      err.actual === "Fixture: general offer A" &&
      err.expected === "Fixture: the event offer",
    "S21 must fail on the mutant, by its own assertion: the general offer shown while the event offer is live",
  );
});
