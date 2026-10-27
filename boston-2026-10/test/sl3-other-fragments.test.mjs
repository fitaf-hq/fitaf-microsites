// SL3 (SPEC-ui-and-copy-pass.md § 6 items 3 and 4): the page opened at #lean-and-7d (a whole answer set), #from-email
// (the emails' link back, the step collapsed, no dialog as today), no fragment, the card's checkout (#lean-7) or a
// fragment that only begins with the link's (#save-offer) opens no dialog, on both builds that carry the save step. The
// check is sl-checks.mjs's, which the mutant "the opening on any fragment" (sl-mutants.test.mjs) runs on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { otherFragmentsProblems } from "./sl-checks.mjs";

test("SL3: any other fragment, or none, opens no dialog, on both builds", async () => {
  assert.deepEqual(await otherFragmentsProblems(), []);
});
