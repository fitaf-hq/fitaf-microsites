// EM-A2 (SPEC-analytics.md § 16 items 2 and 5): the plan page opened at `#from-email` sends `open` with `via` `email`; at
// no fragment, `#save` and `#lean-or-7d` (and a longer fragment, and the words in the query), `via` `""`; each `open`
// accepted by the Worker's own check, on both targets' built pages. Read once, at the start, from the fragment only, and
// the fragment not rewritten by it. The check is em-a-checks.mjs's, which the mutant "`via` read from the query instead of
// the fragment" runs on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { emailVisitProblems } from "./em-a-checks.mjs";

test("EM-A2: the plan page's open carries via email at #from-email exactly, and \"\" otherwise, read once from the fragment", async () => {
  assert.deepEqual(await emailVisitProblems(), []);
});
