// EM-A5 (SPEC-analytics.md § 16 items 3, 4 and 5): the report over a fixture with offer-only visits and email visits
// (test/fixtures/analytics/points-offer-email.json, invented data points, the report's own SQL evaluated over them in
// em-a-checks.mjs): every earlier figure as without them, `offer_pages` by kind and `email_visits` as stated, in the
// document and the text, and the text says a repeat opening is counted again. "Exactly as before" is held against the
// release line's own report, bc4ea03 (§ 16's contract commit, whose report is § 15's), its scripts/, src/worker/, data/
// and package.json extracted by `git archive` (AJ2's way): this tree's text, § 16's two lines removed, is the base's
// byte for byte over the points without their offer rows and over each of AJ's answer sets (A11's fixture). Nothing is
// requested. The check is em-a-checks.mjs's, which the mutant "the report counting offer-only visits as visits" runs on a
// mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractBase, reportProblems } from "./em-a-checks.mjs";

/** The release line's commit carrying § 16's contract and none of its code: the report "before this section". */
const BASE = "bc4ea03";

const scratch = await realpath(await mkdtemp(join(tmpdir(), "boston-em-a5-")));
test.after(() => rm(scratch, { recursive: true, force: true }));
const base = extractBase(BASE, scratch);

test(`EM-A5: offer-only visits counted apart, every earlier figure as without them and the text ${BASE}'s; offer pages by kind, email visits`, async () => {
  assert.deepEqual(await reportProblems(undefined, base), []);
});
