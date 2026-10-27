// RD9 (SPEC-the-redirect.md § 5, § 7): the report over a fixture with redirect-only visits beside plan-page visits
// (test/fixtures/analytics/points-redirect.json, invented; the report's own SQL evaluated in em-a-checks.mjs's
// evaluator): every earlier figure as without them, and a day's `redirects` by source and by device as stated, in the
// document and the text, on a day with redirects alone too; a day without one reads as before. "As before" is held
// against the contract commit's own report, d59aec4 (SPEC-analytics.md § 16's), its scripts/, src/worker/, data/ and
// package.json extracted by `git archive` (AJ2's way). Nothing is requested. The check is rd-checks.mjs's, which the mutant
// "the report counting redirect-only visits as visits" runs on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractBase } from "./em-a-checks.mjs";
import { reportProblems } from "./rd-checks.mjs";

/** SPEC-the-redirect.md's contract commit: § 16's report, none of the redirect's code. */
const RD9_BASE = "d59aec4";

const scratch = await realpath(await mkdtemp(join(tmpdir(), "boston-rd9-")));
test.after(() => rm(scratch, { recursive: true, force: true }));
const base = extractBase(RD9_BASE, scratch);

test(`RD9: redirect-only visits counted apart, every earlier figure as without them and the text ${RD9_BASE}'s; redirects by source and device`, async () => {
  assert.deepEqual(await reportProblems(undefined, base), []);
});
