// F2 (SPEC-analytics.md § 13 items 1, 2 and 5): a whole Family visit in the page's stub (a-harness openVisit): open, *Me
// and my family*, *lunch or dinner*, the result shown, the result card's order link, leave. It sends open, answer
// who/family, answer family/or, result (or-5d, 35), click (order, 35) and leave (step click), and each is accepted by
// `checkedEvent`, the Worker's own check (src/worker/beacon.js), not a copy of it. Until § 13 such a visit was recorded as
// open, click, leave: counted as a visit, invisible in the funnel. The check is af-checks.mjs's, which the mutants "the
// page's selector without [data-who]" and "RESULT_MPIDS without Family's" (af-mutants.test.mjs) run on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { familyVisitProblems } from "./af-checks.mjs";

test("F2 (analytics § 13): a Family visit, lunch or dinner, sends its answers, its result and its click, each accepted", async () => {
  assert.deepEqual(await familyVisitProblems(undefined, "or"), []);
});
