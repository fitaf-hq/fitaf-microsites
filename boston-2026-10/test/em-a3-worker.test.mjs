// EM-A3 (SPEC-analytics.md § 16 items 1, 2 and 5): the Worker accepts `offer` with each `kind` and refuses another `kind`,
// an `offer` with a `via`, and an `open` with `via` other than `email` or `""`; the data point's blob13 (the offer page's
// kind) and blob14 (the open's via) as stated, blobs 1–12 in § 15's places. On production's Worker and the development
// Worker, in Miniflare (a-harness startBeacon). The check is em-a-checks.mjs's.
// ⚠ Amended at the merge review (2026-10-27, the coordinator): an `open` WITHOUT `via` is accepted, written with blob14
// "", since every page loaded before the release sends one (an open tab, a cached copy, a phone resuming last night's
// tab), and refusing it would drop that visit's `open` out of the funnel. Its body is the page's own: bc4ea03's (§ 16's
// contract commit, none of its code) production page, built from that commit's tree (`git archive`) and opened in
// a-harness's stub (em-a-checks openOfPage), never written here. A `via` that is present stays strict.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openOfPage, workerProblems } from "./em-a-checks.mjs";

/** The release line's commit before § 16's code: its page sends `open` without `via`. */
const BEFORE = "bc4ea03";

const scratch = await realpath(await mkdtemp(join(tmpdir(), "boston-em-a3-")));
test.after(() => rm(scratch, { recursive: true, force: true }));
const oldOpen = await openOfPage(BEFORE, scratch);

test("EM-A3: offer of each kind and open with each via written in blob13 and blob14, blobs 1–12 in their places; the rest refused", async () => {
  assert.deepEqual(await workerProblems(undefined, { before: [[`open from ${BEFORE}'s page (no via)`, oldOpen]] }), []);
});
