// N3 (SPEC-analytics.md § 12 items 3 and 6): POST /a carrying the cookie `fitaf_no_tracking=1` is answered 204, as every
// beacon is, and nothing is done: no data point, and the salt neither read nor written (SALTS untouched: no read, no
// write, no key after). Every event of § 3, the cookie alone and among others; on production's Worker (as committed, and
// with production false, the rollback) and the development Worker. The check is n-checks.mjs's, which the mutant "the
// beacon ignoring the cookie" runs on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { productionFalseMirror } from "./cc-harness.mjs";
import { uncountedProblems } from "./n-checks.mjs";

test("N3: POST /a carrying the cookie is a 204 with zero data points and SALTS untouched, on both Workers", async () => {
  assert.deepEqual(await uncountedProblems(), []);
});

test("N3: production's Worker with production false (the rollback) does the same", async () => {
  const falseRoot = await productionFalseMirror();
  try {
    assert.deepEqual(await uncountedProblems(falseRoot, ["site"]), []);
  } finally {
    await rm(falseRoot, { recursive: true, force: true });
  }
});
