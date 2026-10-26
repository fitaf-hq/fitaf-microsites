// SV2 (SPEC-analytics.md § 14 items 1 and 4): the same visit as SV1's with its save answered with an error (a 500, the
// network failing), with a refusal (the Worker's: 429, 403, 400; an answer that is not both ok and ok: true; the page's
// own, and Turnstile's, before any request), never answered (still being checked), and an expansion save stored (out of
// area, then Tell me when you deliver here): no `save`, and the events of the visit with no save, each accepted by
// `checkedEvent`. Its control: the same visit answered as stored sends one. On both targets, with the fixture week. The
// check is sv-checks.mjs's, which the mutant "flow1.js dispatching on an error too" (sv-mutants.test.mjs) runs on a
// mirror. Nothing is requested.
import test from "node:test";
import assert from "node:assert/strict";
import { unsavedProblems } from "./sv-checks.mjs";

test("SV2: a save that errs, is refused, is still being checked, or is an expansion's sends no save", async () => {
  assert.deepEqual(await unsavedProblems(), []);
});
