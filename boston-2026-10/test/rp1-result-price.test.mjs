// RP1 (SPEC-ui-and-copy-pass.md § 7 item 6; the Advisor, ts=2026-10-27T05:08:30.647Z: "Let's do B2 and drop the meal
// count please"): while the offer with a share is current, the result card's price is the weekly total before the offer's
// share, struck through, with its unit, then the weekly total as the store charges it, with its unit, the lead: exactly
// the struck `$X/week` then `$Y/week`, `Y` the store's total and `X` = round(`Y` ÷ (1 − the share)). For an individual
// answer set at its plan's count, one above it (5 meals on the 4-meal plan) and a Family answer, and every other total
// the result can show; on both pages that carry the offer (the development page, and the production page with
// `production` true), its clock inside the offer's dates. The checks are rp-checks.mjs's, which the mutant re-runs.
import test from "node:test";
import assert from "node:assert/strict";
import saveConfig from "../data/save.json" with { type: "json" };
import offersFile from "../data/offers.json" with { type: "json" };
import { offerForSave } from "../src/worker/offers.js";
import { zonedDate } from "../src/worker/zoned-time.js";
import { NOW } from "./uc-harness.mjs";
import { AFTER, dollars, OFFER, offerLines, pagesAt, priceAt, RESULTS, rp1Problems, struckCents, UNIT } from "./rp-checks.mjs";

/** The three the contract names: Lean 7 at its own count, five on the Lean 4 plan, Family's lunch or dinner. */
const NAMED = ["#lean-or-7d", "#lean-or-5d", "#family-or"];

test("RP1 (control): the cases' clock is inside the offer's dates and the offer carries its share; after valid_to none is current", () => {
  const zone = saveConfig.send_time_zone;
  assert.equal(offerForSave(zonedDate(NOW, zone), offersFile.offers)?.id, OFFER.id, "the offer current at NOW");
  assert.equal(OFFER.percent_off, 25, "its share");
  assert.equal(offerForSave(zonedDate(AFTER, zone), offersFile.offers), null, "none current the day after its valid_to");
  for (const hash of NAMED) assert.ok(RESULTS.some((r) => r.hash === hash), `the contract's ${hash} is among the results checked`);
  const five = RESULTS.find((r) => r.hash === "#lean-or-5d");
  assert.deepEqual([five.meals, five.count, dollars(five.cents), dollars(struckCents(five.cents))], [5, 4, "$65.00", "$86.67"], "five on Lean 4: $65.00, struck $86.67");
  assert.equal(UNIT, "/week", "the unit");
});

test("RP1: the struck $X/week, then $Y/week, for every total the result can show, on both pages carrying the offer", async () => {
  assert.deepEqual(await rp1Problems(), []);
});

test("RP1: the contract's three, as drawn on the development page", async () => {
  const { offer } = await pagesAt();
  assert.deepEqual(
    NAMED.map((hash) => priceAt(offer.development, hash, NOW)?.map((l) => l.text)),
    [
      ["$116.67/week", "$87.50/week"],
      ["$86.67/week", "$65.00/week"],
      ["$253.33/week", "$190.00/week"],
    ],
    "Lean 7 at its own count; five on the 4-meal plan; Family, lunch or dinner",
  );
  for (const hash of NAMED) {
    const r = RESULTS.find((x) => x.hash === hash);
    assert.deepEqual(priceAt(offer.production, hash, NOW), offerLines(r), `the production page, ${hash}`);
  }
});
