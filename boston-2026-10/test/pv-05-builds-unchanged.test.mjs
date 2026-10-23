// PV5 (SPEC-preview-sites.md § 3, § 4): the production and development builds are byte-identical to the builds before
// the preview build existed: every file each writes has the SHA-256 that pv-05-golden.json recorded from the contract's
// commit's own tree (test/pv-05-record.mjs). S20 and the dev goldens (U4, MS-9, PR-10, CC-8) say the same in their terms.
// ⚠ AMENDED for SPEC-week-content § 9.2's rule (2026-10-23, found at the merge into the dev line): the photo sheets (every
// file under assets/photo-sheets/) are the emitter's weekly inputs, so they are compared as byte copies of the tree's own
// src/assets/photo-sheets/ (test/production-sheets.mjs), and every other file against recorded_at's; the golden's own
// sheet entries are left as the recorder wrote them (never edited by hand) and are not read.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ROOT } from "../build.mjs";
import { buildHashes } from "./pv-checks.mjs";
import { committedSheets, sheetsLine, splitSheets } from "./production-sheets.mjs";

const golden = JSON.parse(await readFile(new URL("./pv-05-golden.json", import.meta.url), "utf8"));

for (const target of ["prod", "dev"]) {
  test(`PV5 (${target}): every file the ${target === "prod" ? "production" : "development"} build writes is byte-identical to ${golden.recorded_at}'s`, async (t) => {
    assert.ok(Object.keys(golden.files[target]).length > 0, "the golden names files (control)");
    const { sheets, rest } = splitSheets(await buildHashes(ROOT, target));
    t.diagnostic(sheetsLine(sheets));
    assert.deepEqual(rest, splitSheets(golden.files[target]).rest, `every file but the sheets: ${golden.recorded_at}'s`);
    assert.deepEqual(sheets, await committedSheets(), `the sheets: ${sheetsLine(sheets)}`);
  });
}
