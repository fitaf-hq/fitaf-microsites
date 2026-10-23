// PV2 (SPEC-preview-sites.md § 1 item 2, § 4): the banner at the top of a preview names the week's date ("Preview of
// the week delivered {date}. Ordering is off."), and adds "Not yet approved." only when the week's `approved` is false.
// The words are data/messages.json's `preview`, carried by no source file. The fixture's 2026-11-01 (approved false) and
// 2026-10-25 (approved true).
import test from "node:test";
import assert from "node:assert/strict";
import { bannerProblems } from "./pv-checks.mjs";

test("PV2: the banner names the date, and says \"Not yet approved.\" only when approved is false", async () => {
  assert.deepEqual(await bannerProblems(), []);
});
