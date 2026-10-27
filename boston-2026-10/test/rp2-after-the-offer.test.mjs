// RP2 (SPEC-ui-and-copy-pass.md § 7 item 6, item 1's "With no such offer current (after its `valid_to`, or an offer
// without `percent_off`), the first line is absent and the price is the second alone"): on a clock after the offer's
// valid_to, `$Y/week` alone, on both pages that carry the offer; on the production page with `production` false (no
// offer at all), the same; and on the development page with an offer current that carries no share (the S21–S26 fixture's
// offers), the same. The first two are rp-checks.mjs's.
import test from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_OFFERS } from "./offer-box-fixture.mjs";
import { weekPage } from "./uc-harness.mjs";
import { leadLine, priceAt, RESULTS, rp2Problems } from "./rp-checks.mjs";

/** A day the fixture's general offer A is current (its dates 2000-01-01 to 2026-12-31), noon in New York. */
const FIXTURE_DAY_MS = Date.parse("2026-10-15T16:00:00.000Z");

test("RP2: after valid_to, and on the page with no offer (production false), $Y/week alone", async () => {
  assert.deepEqual(await rp2Problems(), []);
});

test("RP2: an offer current without a share — $Y/week alone", async () => {
  assert.ok(FIXTURE_OFFERS.offers.every((o) => !("percent_off" in o)), "control: the fixture's offers carry no share");
  const html = await weekPage({ offers: FIXTURE_OFFERS });
  const problems = [];
  for (const r of RESULTS) {
    const got = priceAt(html, r.hash, FIXTURE_DAY_MS);
    if (JSON.stringify(got) !== JSON.stringify(leadLine(r))) problems.push(`${r.hash}: ${JSON.stringify(got)}`);
  }
  assert.deepEqual(problems, []);
});
