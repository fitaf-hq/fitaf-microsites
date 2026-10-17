// U3 (SPEC-week-content.md § 8 items 1 and 5): the Chef's Choice check (checkPicks) accepts § 8 item 1's file exactly,
// and refuses `updating` with any value but true, and an updating file with any list, each refusal naming its cause.
// The check is test/u-checks.mjs's, which § 8 item 5's mutant re-runs on a mirror (test/u-mutants.test.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { ROOT } from "../build.mjs";
import { updatingRefusalProblems } from "./u-checks.mjs";

test("U3: checkPicks accepts the updating file; refuses updating not true, and an updating file with any list", async () => {
  assert.deepEqual(await updatingRefusalProblems(ROOT), []);
});
