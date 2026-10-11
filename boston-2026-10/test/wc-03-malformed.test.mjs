// WC-3 (SPEC-week-content.md § 4.2, § 5): an object that is not JSON, JSON with `weeks: []`, with two weeks, with a week
// missing a key the page's script reads (and the other shapes test/wc-checks.mjs badObjects() names): each leaves the
// page the asset byte for byte, and nothing is thrown. The control (the valid object changes the page) is in the check.
import test from "node:test";
import assert from "node:assert/strict";
import { shapeProblems } from "./wc-checks.mjs";

test("WC-3: a malformed object, each, leaves the page the asset byte for byte", async () => {
  assert.deepEqual(await shapeProblems(), []);
});
