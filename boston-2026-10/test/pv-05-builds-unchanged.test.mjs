// PV5 (SPEC-preview-sites.md § 3, § 4): the production and development builds are byte-identical to the builds before
// the preview build existed: every file each writes has the SHA-256 that pv-05-golden.json recorded from the contract's
// commit's own tree (test/pv-05-record.mjs). S20 and the dev goldens (U4, MS-9, PR-10, CC-8) say the same in their terms.
// ⚠ AMENDED for SPEC-week-content § 9.2's rule (2026-10-23, found at the merge into the dev line): the photo sheets (every
// file under assets/photo-sheets/) are the emitter's weekly inputs, so they are compared as byte copies of the tree's own
// src/assets/photo-sheets/ (test/production-sheets.mjs), and every other file against recorded_at's; the golden's own
// sheet entries are left as the recorder wrote them (never edited by hand) and are not read.
// ⚠ RE-RECORDED at 8bfe4f8 (`node test/pv-05-record.mjs --commit 8bfe4f8 --release-a`) for SPEC-ui-and-copy-pass § 2
// (2026-10-25), as this case builds since SPEC-save-offer-production § 12 (production false and release (a)'s wording: the
// recorder's new --release-a, which at c6dd3a5 reproduces e8fd524's record exactly): production's index.html (S20's pin)
// and the development build's index.html, demo/, boston/ and seminar/ moved, by § 2's lines; every other file, privacy/
// among them, byte-identical. Re-recorded at 077f472 (`--commit 077f472 --release-a`) for § 2.2: the same five pages moved,
// by its lines; the recorder at 8bfe4f8 reproduces 8bfe4f8's record. And at 5eaad96 (`--commit 5eaad96 --release-a`), the
// Family door's [hidden] rule: the same five pages, by that rule alone; the recorder at 077f472 reproduces 077f472's.
// And at f9273c0 (`--commit f9273c0 --release-a`), SPEC-analytics.md § 13 item 2 (the analytics script sends the first
// question's and Family's own question's answers): the same five pages, +202 bytes each, by the script's three lines
// alone; every other file byte-identical; the recorder at 5eaad96 reproduces 5eaad96's.
// And at 0233dbe (`--commit 0233dbe --release-a`), SPEC-ui-and-copy-pass.md § 3 (the desktop column): the same five pages,
// +686 bytes each; every other file byte-identical (the privacy page too: the token is not in :root); the recorder
// at 2b409bb reproduces f9273c0's (recorded_at apart).
// And at d0f1a97 (`--commit d0f1a97 --release-a`), SPEC-ui-and-copy-pass.md § 4 (the questions revealed one by one, Not
// ready? and the save step in a dialog, Why Fit AF? at the foot): production's index.html and development's index.html,
// demo/, boston/ and seminar/; every other file byte-identical, the privacy page too; the recorder at 62b8627 (its cases,
// the code before) reproduces 0233dbe's (recorded_at apart).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ROOT } from "../build.mjs";
import { buildHashes } from "./pv-checks.mjs";
import { committedSheets, sheetsLine, splitSheets } from "./production-sheets.mjs";
import { productionFalseSavePath, withReleaseAWording } from "./cc-harness.mjs";

const golden = JSON.parse(await readFile(new URL("./pv-05-golden.json", import.meta.url), "utf8"));

for (const target of ["prod", "dev"]) {
  test(`PV5 (${target}): every file the ${target === "prod" ? "production" : "development"} build writes is byte-identical to ${golden.recorded_at}'s`, async (t) => {
    assert.ok(Object.keys(golden.files[target]).length > 0, "the golden names files (control)");
    // SPEC-save-offer-production § 12: both builds as release (a) made them (its data/save.json, its wording), the rollback.
    const options = { savePath: await productionFalseSavePath(), transform: withReleaseAWording };
    const { sheets, rest } = splitSheets(await buildHashes(ROOT, target, options));
    t.diagnostic(sheetsLine(sheets));
    assert.deepEqual(rest, splitSheets(golden.files[target]).rest, `every file but the sheets: ${golden.recorded_at}'s`);
    assert.deepEqual(sheets, await committedSheets(), `the sheets: ${sheetsLine(sheets)}`);
  });
}
