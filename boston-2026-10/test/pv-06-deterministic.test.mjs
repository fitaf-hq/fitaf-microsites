// PV6 (SPEC-preview-sites.md § 2, § 4): `npm run content -- --preview --week 2026-11-01 --from <dir> --out <dir>`, the
// program, twice: exit 0, the same files byte for byte at § 2's keys (previews/<delivery>/picks-data.json and the
// sheet), the same report but for --out; the data the week's, marked a preview, its tiles' sheet at the Worker's path.
import test from "node:test";
import assert from "node:assert/strict";
import { determinismProblems } from "./pv-checks.mjs";

test("PV6: the preview content command is deterministic", async () => {
  assert.deepEqual(await determinismProblems(), []);
});
