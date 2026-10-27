// IX1 (SPEC-analytics.md § 15 items 1, 2 and 5): through the Worker (a-harness startBeacon, both entries: production's
// and the development Worker), a visit's seven events give seven data points with seven different indexes, each 16 hex
// digits, and blob12 the visit's `v` on every one: the `v` § 2 makes (and A5 reads), the first 16 hex digits of SHA-256
// over the day's salt, the IP, the user agent and the host. So no index is written to twice, and Analytics Engine's
// write-time sampling has nothing to thin. The check is ix-checks.mjs's, which the mutants "the index written as v" and
// "blob12 left empty" (ix-mutants.test.mjs) run on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { indexProblems } from "./ix-checks.mjs";

test("IX1: a visit's seven events, seven data points, seven indexes, blob12 the visit's v on each, on both Workers", async () => {
  assert.deepEqual(await indexProblems(), []);
});
