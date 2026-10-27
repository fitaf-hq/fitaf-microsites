// EM-A3 (SPEC-analytics.md § 16 items 1, 2 and 5): the Worker accepts `offer` with each `kind` and refuses another `kind`,
// an `offer` with a `via`, and an `open` with `via` other than `email` or `""`; the data point's blob13 (the offer page's
// kind) and blob14 (the open's via) as stated, blobs 1–12 in § 15's places. On production's Worker and the development
// Worker, in Miniflare (a-harness startBeacon). The check is em-a-checks.mjs's.
import test from "node:test";
import assert from "node:assert/strict";
import { workerProblems } from "./em-a-checks.mjs";

test("EM-A3: offer of each kind and open with each via written in blob13 and blob14, blobs 1–12 in their places; the rest refused", async () => {
  assert.deepEqual(await workerProblems(), []);
});
