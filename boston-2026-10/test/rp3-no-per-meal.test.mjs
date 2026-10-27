// RP3 (SPEC-ui-and-copy-pass.md § 7 item 6, items 1 and 4: "Nothing else: no price a meal, no meal count, no other
// words"; "Removed: `#result-per-meal`, `#result-meals` and the units only they use"): no price a meal and no meal count
// in `.price`, on every page (both carrying the offer, and production false), inside the offer's dates and after them,
// for every total the result can show; neither removed element in the markup. rp-checks.mjs's check.
import test from "node:test";
import assert from "node:assert/strict";
import { rp3Problems } from "./rp-checks.mjs";

test("RP3: no price a meal and no meal count in the result's price; #result-per-meal and #result-meals gone", async () => {
  assert.deepEqual(await rp3Problems(), []);
});
