// PV6 (SPEC-preview-sites.md § 2, § 4): `npm run content -- --preview --week 2026-11-01 --from <dir> --out <dir>`, the
// program, twice: exit 0, the same files byte for byte at § 2's keys (previews/<delivery>/picks-data.json and the
// sheet), the same report but for --out; the data the week's, marked a preview, its tiles' sheet at the Worker's path.
import test from "node:test";
import assert from "node:assert/strict";
import { determinismProblems, sheetEntryProblems } from "./pv-checks.mjs";

test("PV6: the preview content command is deterministic", async () => {
  assert.deepEqual(await determinismProblems(), []);
});

// PV6b (§ 2, ruled 2026-10-20: one file per week): the week's sheet entry is <from>/photo-sheets/chefs-choice-<delivery>.json,
// the sheet beside it; a shared <from>/photo-sheets.json is not read; no entry, plain tiles; a broken entry refused.
test("PV6b: the preview's sheet is the week's own entry, photo-sheets/chefs-choice-<delivery>.json, and nothing else", async () => {
  assert.deepEqual(await sheetEntryProblems(), []);
});
