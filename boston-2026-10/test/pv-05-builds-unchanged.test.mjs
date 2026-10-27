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
// And at cb0980f (`--commit cb0980f --release-a`), § 4.2 (the start the first question alone; Not ready?'s words): the
// same five pages; every other file byte-identical; the recorder at d03fafb reproduces d0f1a97's (recorded_at apart).
// And at 27cc0df (`--commit 27cc0df --release-a`), § 5 (the result card reordered): the same five pages; every other
// file byte-identical; the recorder at fb7b110 reproduces cb0980f's (recorded_at apart). And at 8f36711, § 5 item 6 (the
// scroll stops' rules): the same five pages; the recorder at 4578c46 reproduces 27cc0df's (recorded_at apart). And at
// 4b77513, SPEC-why-fit-af § 7 (the Why page's draft 3): why/index.html alone, in both builds; the recorder at eec5c4c
// reproduces 8f36711's (recorded_at apart).
// And at 1fb4831 (`--commit 1fb4831 --release-a`), SPEC-analytics.md § 14 item 2 (a saved offer counted: the analytics
// script's listener for fitaf:saved, and on the development pages the save step's dispatch of it): the same five pages
// (production's +70 bytes, development's four +484); every other file byte-identical; the recorder at 9cdf963 (its cases,
// the code before) reproduces 4b77513's (recorded_at apart), and at 4b77513 its record byte for byte.
// And at 3f40698 (`--commit 3f40698 --release-a`), SPEC-analytics.md § 15 item 4 (the analytics script's read of the result
// card on DOMContentLoaded): the same five pages, +48 bytes each, that one line; every other file byte-identical; the
// recorder at 5a129e0 (its cases, the code before) reproduces 1fb4831's (recorded_at apart), and at 1fb4831 its record
// byte for byte.
// And at 63e243b (`--commit 63e243b --release-a`), SPEC-ui-and-copy-pass.md § 6 (the save dialog opened by a link,
// #save: flow1.js's lines): the development build's index.html, demo/, boston/ and seminar/ alone, +1,117 bytes each;
// production's (production false here, no save step) and every other file byte-identical; the recorder at 1a63f41 (its
// cases, the code before) reproduces 3f40698's (recorded_at apart), and at 3f40698 its record byte for byte.
// And at f60e19c (`--commit f60e19c --release-a`), SPEC-ui-and-copy-pass.md § 7 (the result's price: the week's price
// alone, its full value struck above it while an offer with a share is current): production's index.html (production false
// here: the price block's rules and markup, the struck line hidden, and app.js's lines) and the development build's
// index.html, demo/, boston/ and seminar/ (those, plan-prices.js's lines and save-data's struck_result); every other file
// byte-identical; the recorder at bc39ee0 (its cases, the code before) reproduces 63e243b's (recorded_at apart), and at
// 63e243b its record byte for byte.
// And at 0ef1455 (`--commit 0ef1455 --release-a`), SPEC-analytics.md § 16 items 1 and 2 (the analytics script's branch
// for the offer page, which no built page takes, and the open's via): production's index.html and the development build's
// index.html, demo/, boston/ and seminar/, +224 bytes each, those lines alone; every other file byte-identical; the
// recorder at 1c8cf8a (its cases, the code before) reproduces f60e19c's (recorded_at apart), and at f60e19c its record
// byte for byte.
// And at ac0ec8c (`--commit ac0ec8c --release-a`), SPEC-ui-and-copy-pass.md § 8 (E1 in the flyers' language): the
// development build gains E1's three images, assets/email/fitaf-logo-reversed.png, halftone-cta.png and halftone-ink.png
// (the builds whose Worker sends E1); every other file of both builds byte-identical, production's (production false here,
// whose Worker sends nothing) entirely; the recorder at 7961725 (its cases, the code before) reproduces 63e243b's
// (recorded_at apart).
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
