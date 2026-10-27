// IX4 (SPEC-analytics.md § 15 items 4 and 5): the page opened at #lean-and-7d (the whole answer set: a reload, a restored
// tab, Back from the store, a shared link) sends `result` (and-7d, its mpid) with no tap, in the stub where the analytics
// script runs before app.js as on the built page and its timer runs while the parser is paused between them (a-harness
// openVisit `yieldBetweenScripts`): there the timer finds no plan drawn, and the read after every script
// (DOMContentLoaded) finds it. In the stub where the timer runs after every script, too, one result (`shown`). Then the
// plan shown, a tap elsewhere that changes nothing sends no second `result`. On both targets. The check is
// ix-checks.mjs's, which the mutant "the DOMContentLoaded read dropped" (ix-mutants.test.mjs) runs on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { loadResultProblems } from "./ix-checks.mjs";

test("IX4: opened at a whole answer set, the page sends its result with no tap, once, on both targets", async () => {
  assert.deepEqual(await loadResultProblems(), []);
});
