// AJ1 (SPEC-analytics.md § 11 item 4): `npm run analytics -- … --json` over a fixture of the SQL API's answers (A11's
// stub, test/fixtures/analytics/, and two answer sets derived from it in aj-checks.mjs) prints § 11 item 1's document,
// each of its figures equal to the text report's for the same answers: the text read back line by line, a duration
// within the text's rounding of it. And the fixture's document is the one written by hand from the fixture. The check
// is aj-checks.mjs's figureProblems, which the mutant (aj-mutants.test.mjs) runs on a mirror. Nothing is requested.
import test from "node:test";
import assert from "node:assert/strict";
import { figureProblems } from "./aj-checks.mjs";

test("AJ1: the --json document's figures are the text report's, for the same answers", async () => {
  assert.deepEqual(await figureProblems(), []);
});
