// SV1 (SPEC-analytics.md § 14 items 1, 2 and 4): a whole visit in the page's stub (a-harness openVisit), the save step's
// Worker answering an offer save as stored (the answer ok and its JSON's ok true, the step going to SAVED): it sends open
// … save (`s` only) … leave, and `save` is accepted by `checkedEvent`, the Worker's own check (src/worker/beacon.js). The
// visit's other events are those of the same visit with no save, the `leave`'s step among them (a save is not a step of
// the funnel). On both targets, each with the fixture week (the step is drawn beside a week's checkout alone). And the
// Worker's half: a `save` posted to either Worker is one data point in the layout of § 10 (blob1 the event, blob2 the
// visit; since § 15 blob12 the visitor). The checks are sv-checks.mjs's, which the mutant "the Worker's FIELDS without save" (sv-mutants.test.mjs) runs
// on a mirror. Nothing is requested.
import test from "node:test";
import assert from "node:assert/strict";
import { saveDataPointProblems, storedSaveProblems } from "./sv-checks.mjs";

test("SV1: a visit whose offer save is stored sends save, s only, before its leave; each event accepted by checkedEvent", async () => {
  assert.deepEqual(await storedSaveProblems(), []);
});

test("SV1: either Worker writes a save as one data point, blob1 the event, blob2 the visit, blob12 the visitor, nothing else", async () => {
  assert.deepEqual(await saveDataPointProblems(), []);
});
