// RD5 (SPEC-the-redirect.md § 3 and § 1 item 5, § 7; SPEC-analytics.md § 1's bar): a counted request with a known IP and
// user agent (A4's), a query (?e=boston&via=email&secret=x) and a referrer: no field of the data point written (blob,
// index, double) contains any of them, nor a piece of the query's syntax or the path; and the Location carries nothing of
// the visitor's query but what § 2 derives from it. Control: the search finds each needle planted. Both Workers. The check
// is rd-checks.mjs's, which the mutant "the visitor's query passed through" runs on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { identifyingProblems } from "./rd-checks.mjs";

test("RD5: no written field carries the IP, the user agent, the query or the referrer; the Location none of the query", async () => {
  assert.deepEqual(await identifyingProblems(), []);
});
