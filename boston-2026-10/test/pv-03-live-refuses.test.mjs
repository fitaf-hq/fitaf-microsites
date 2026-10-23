// PV3 (SPEC-preview-sites.md § 2, § 4): checkPicks refuses `preview: true` everywhere a preview is not read, so a preview
// can never reach the live site: checkPicks itself (and, the control, it accepts the file in a preview read), the live
// content command for the production Worker and, with --env dev, the development Worker (function and program; the
// preview file alone, and beside a live week), each refusal writing nothing; and the production and development builds,
// which read no picks file (SPEC-week-content § 7's ruling), embed no week with the preview file in data/picks/. Its
// mutant (the refusal removed from the live content command) is in pv-mutants.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { buildEmbedsNoPreviewProblems, liveRefusalProblems } from "./pv-checks.mjs";
import { pvMirror } from "./pv-harness.mjs";

test("PV3a: checkPicks and the live content command (production and development) refuse preview: true", async () => {
  assert.deepEqual(await liveRefusalProblems(), []);
});

test("PV3b: the production and development builds of a mirror whose data/picks/ holds the preview file embed no week", async () => {
  assert.deepEqual(await buildEmbedsNoPreviewProblems((edit) => pvMirror(edit)), []);
});
