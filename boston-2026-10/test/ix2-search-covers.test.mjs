// IX2 (SPEC-analytics.md § 15 items 2 and 5): A4's search for the IP and the user agent (a-checks needlesIn, the search
// A4's ipUaProblems runs) covers blob12 and the index: the points a visit writes from a known IP and user agent hold
// twelve blobs and one index each, none carrying either; and the search finds the IP and the user agent planted in a
// written point's blob12 and in its index.
import test from "node:test";
import assert from "node:assert/strict";
import { searchProblems } from "./ix-checks.mjs";

test("IX2: A4's search reads blob12 and the index, and finds the IP and the user agent planted in either", async () => {
  assert.deepEqual(await searchProblems(), []);
});
