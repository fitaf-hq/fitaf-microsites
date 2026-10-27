// WC-9 (SPEC-week-content.md § 5), ⭐ the regression: `npm run content -- --week 2026-10-18` at this commit writes a
// week/picks-data.json equal to the #picks-data the production build of 409b805, built --on 2026-10-11, embeds for that
// week, except the photo sheet's URL (now /week/…); and the sheet byte-identical to
// src/assets/photo-sheets/chefs-choice-2026-10-18.jpg. The "before" is test/wc-09-golden.json, recorded from 409b805's
// own tree by test/wc-09-record.mjs (re-run it and diff to check the golden). Also the PAGE a visitor
// gets from production's Worker (the no-week build, the content in the bucket) is, visibly, the page of 409b805 at noon
// on 2026-10-11 in New York, at every fragment of REGRESSION_HASHES (§ 2.3: everything else on the page is unchanged).
// ⚠ RE-RECORDED for SPEC-meal-selection.md § 12 (2026-10-20: each pair's default on the left, *Weekdays only* the
// default, the snacks in the card's list; the page MEANT to change visibly, the content not): `visible` only, by
// `node test/wc-09-record.mjs --visible-at 5f55cbc`, is now the page production's Worker serves from 5f55cbc's own tree
// with the same content (`visible_at`); picks_data, page_sha256 and the sheet are still 409b805's, so WC-9a is unchanged.
// Against 409b805's, "" and #family were byte-identical and the 18 answered fragments moved (§ 12.1).
// ⚠ RE-RECORDED for SPEC-why-fit-af.md § 2 (2026-10-21: the footer's "Why Fit AF?" button, its dialog and its no-script
// link; the page MEANT to change visibly, the content not): `visible` only, by `node test/wc-09-record.mjs --visible-at
// f02807e`. Against 5f55cbc's, all 20 fragments moved ("" and #family too: the footer is on every one), each 6e0f6bd's
// byte for byte once those three additions are removed (SPEC-why-fit-af § 4); picks_data, page_sha256 and the sheet
// still 409b805's.
// ⚠ RE-RECORDED for SPEC-why-fit-af.md § 6 (2026-10-21: the /why/ page's link back to the plan page closes the dialog, in
// app.js, inlined in the page) by `node test/wc-09-record.mjs --visible-at e2284f1`, as § 6 item 4 asks: only
// `visible_at` moved. All 20 visible pages are f02807e's byte for byte (visible() reads the page without its scripts,
// and the change is script alone); picks_data, page_sha256 and the sheet still 409b805's.
// ⚠ RE-RECORDED for SPEC-every-menu-and-nutrition.md § 11 (2026-10-22, with SPEC-meal-selection § 13, which moves no
// page) by `node test/wc-09-record.mjs --visible-at 5231265`: `visible` at all 20 fragments (the heading the menu's name
// alone, Why Fit AF? and its no-script link above the tabs), each the page production's Worker serves from 5231265's tree
// with its content, which is 409b805's with the headings' range removed (WC-9a, amended); picks_data, page_sha256 and the
// sheet still 409b805's. Re-recorded once more by `--visible-at 773e597` for § 11.2 (the button an outline button in the
// unselected chip's look: its class): `visible` at all 20 fragments, nothing else.
// ⚠ RE-RECORDED by `--visible-at ede2e07` for SPEC-ui-and-copy-pass § 1 item 8 (2026-10-23: the chips in their grid, a
// meal's count as a badge on its tile): `visible` at the 18 answered fragments (the card's list attribute, and a counted
// meal's badge and hidden words); "" and #family, picks_data, page_sha256 and the sheet unchanged (409b805's).
// ⚠ RE-RECORDED by `--visible-at dbfcb62` for SPEC-ui-and-copy-pass § 1.2 item 1 (the card's meals and weekly total):
// `visible` at the four fragments of the two answer sets above their plan (or-5d and and-5d-b, with and without snacks).
// ⚠ RE-RECORDED by `--visible-at 8bfe4f8 --release-a` for SPEC-ui-and-copy-pass § 2 (2026-10-25: who it is for first, the
// goal last; the Family line): `visible` at all 20 fragments (the first question in the tabs' place on every one; the
// goal after the meal questions; #family's line). Recorded as WC-9c serves it since SPEC-save-offer-production § 12
// (production false: the recorder's new --release-a, which at c6dd3a5 reproduces dbfcb62's record exactly);
// picks_data, page_sha256 and the sheet unchanged (409b805's).
// ⚠ RE-RECORDED by `--visible-at 077f472 --release-a` for § 2.2 (Family's own question; the result card shared by both
// panels): `visible` at all 20 fragments (the result card's place in the markup; #family's card without its figures and
// with its question); the recorder at 8bfe4f8 reproduces 8bfe4f8's record; picks_data, page_sha256 and the sheet 409b805's.
// ⚠ RE-RECORDED by `--visible-at d0f1a97 --release-a --without-snack-cells` for SPEC-ui-and-copy-pass § 4 (2026-10-26: the
// questions revealed one by one, Why Fit AF? a banner at the foot): `visible` at all 20 fragments. The recorder gains
// `--without-snack-cells` (u-04-record.mjs's, since SPEC-analytics § 13): as it was, it read each visible page with a snack
// link's cells, which this case removes since SPEC-rung2-progress-and-checkout § 31.2 item 1, so it no longer reproduced
// the record; with it, at 62b8627 (§ 4's cases, the code before) it reproduces 077f472's record (visible_at and
// visible_built_as apart). picks_data, page_sha256 and the sheet 409b805's.
// ⚠ RE-RECORDED by `--visible-at cb0980f --release-a --without-snack-cells` for § 4.2 (the start the first question
// alone): `visible` at the empty fragment alone; at d03fafb (its cases, the code before) the recorder reproduces
// d0f1a97's record (visible_at apart).
// ⚠ RE-RECORDED by `--visible-at 27cc0df --release-a --without-snack-cells` for § 5 (the result card reordered, Choose my
// own meals a chip, no rounded line): `visible` at every fragment with a result; at fb7b110 (its cases, the code before)
// the recorder reproduces cb0980f's record (visible_at apart).
// ⚠ RE-RECORDED by `--visible-at f60e19c --release-a --without-snack-cells` for § 7 (the result's price: the week's price
// alone, no price a meal, no meal count; the struck line, hidden on this page, which carries no offer): `visible` at the 18
// fragments with a result ("" and #family unchanged); at 27cc0df the recorder reproduces the committed record byte for
// byte, and at bc39ee0 (its cases, the code before) it is 27cc0df's (visible_at apart). picks_data, page_sha256 and the
// sheet 409b805's.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PHOTO_SHEETS_DIR, ROOT } from "../build.mjs";
import { rangeless, productionFalseMirror, productionFalseSavePath } from "./cc-harness.mjs";
import { withoutFamilyLinks } from "./uf-harness.mjs";
import { withoutSnackCells, withSnackCells } from "./snack-cells.mjs";
import { scriptJsonRef } from "./wc-checks.mjs";
import { asWeekUrls, REGRESSION_HASHES, REGRESSION_NOW, sheetUrlCount, WEEK_SHEET_URL } from "./wc-regression.mjs";
import { contentOf, noWeekPage, pageAsset, sha256, SHEET_1018, sheetKeyOf, startSite, visible, WEEK_1018, WEEK_DATA_KEY } from "./wc-harness.mjs";

const golden = JSON.parse(await readFile(new URL("./wc-09-golden.json", import.meta.url), "utf8"));
const SHEET = await readFile(join(PHOTO_SHEETS_DIR, SHEET_1018));

test("WC-9 (control): the golden is 409b805's production build, --on 2026-10-11, carrying the one week 2026-10-18", () => {
  assert.equal(golden.recorded_at, "409b805");
  assert.equal(golden.on, "2026-10-11");
  assert.deepEqual(golden.picks_data.weeks.map((w) => w.delivery), [WEEK_1018]);
  assert.ok(sheetUrlCount(JSON.stringify(golden.picks_data)) > 0, "the week's sheet is addressed in it");
  assert.equal(golden.visible_at, "f60e19c", "the visible pages: f60e19c's served page (SPEC-every-menu-and-nutrition §§ 11, 11.2; SPEC-ui-and-copy-pass § 1 item 8, § 1.2 item 1, §§ 2, 2.2, 4, 4.2, 5, 7)");
});

test("WC-9a: the program's week/picks-data.json is 409b805's #picks-data with the sheet's URL at /week/, and nothing else changed", async () => {
  const out = await mkdtemp(join(tmpdir(), "boston-wc9-"));
  try {
    execFileSync(process.execPath, [join(ROOT, "scripts", "week-content.mjs"), "--week", WEEK_1018, "--out", out], { stdio: "pipe" });
    const written = (await readdir(join(out, "week"))).sort();
    assert.deepEqual(written, ["chefs-choice-2026-10-18.jpg", "picks-data.json"], "the week's data and its one sheet");
    // ⚠ AMENDED by SPEC-ui-and-copy-pass § 2.2 (2026-10-25): the week's carts Family takes that hold its count carry
    // Family's link (and-5d here), taken out (uf-harness withoutFamilyLinks); every other byte compared as before.
    const family = withoutFamilyLinks(await readFile(join(out, WEEK_DATA_KEY)));
    assert.ok(family.taken > 0, "control: the week's and-5d carries Family's link");
    const text = family.bytes.toString("utf8");
    const before = JSON.stringify(golden.picks_data);
    // ⚠ Amended for SPEC-every-menu-and-nutrition § 11 item 1 (2026-10-22): each heading is the menu's name alone, a
    // phrase the content fills, so 409b805's is read with each heading's " (<range>)" removed (cc-harness rangeless),
    // every other byte its own.
    const read = rangeless(Buffer.from(asWeekUrls(before), "utf8"), WEEK_1018);
    assert.ok(read.headings > 0, "control: 409b805's headings name the week's range");
    // ⚠ Amended for SPEC-rung2-progress-and-checkout § 31.2 item 1 (2026-10-25): every snack link's photo part now
    // carries its snacks' cells, made to 409b805's data here (test/snack-cells.mjs) from the week's sheet; nothing else.
    const manifestSheet = JSON.parse(await readFile(join(ROOT, "data", "photo-sheets.json"), "utf8")).chefs_choice[WEEK_1018];
    const snacked = withSnackCells(read.bytes, manifestSheet);
    assert.ok(snacked.links > 0 && snacked.cells > 0, `control: 409b805's snack links gain the sheet's snack cells (${snacked.links} links, ${snacked.cells} cells)`);
    const after = snacked.bytes.toString("utf8");
    assert.ok(sheetUrlCount(before) > 0 && sheetUrlCount(after) === 0, "control: the URLs were rewritten");
    assert.equal(sheetUrlCount(text), 0, "no URL of the build's sheet path is left");
    assert.ok(text.includes(WEEK_SHEET_URL), `the sheet at ${WEEK_SHEET_URL}`);
    assert.deepEqual(JSON.parse(text), JSON.parse(after), "the JSON value, the sheet's URL apart");
    assert.equal(text, scriptJsonRef(JSON.parse(after)), "the bytes: the element's text as the build writes it, the URL apart");
    assert.notDeepEqual(JSON.parse(text), golden.picks_data, "control: the URL, the headings' range and the snack cells are the differences");
    const sheet = await readFile(join(out, sheetKeyOf(SHEET_1018)));
    assert.ok(sheet.equals(SHEET), "the sheet byte-identical to src/assets/photo-sheets/");
    assert.equal(sha256(sheet), golden.sheet.sha256, "and to 409b805's");
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

// SPEC-save-offer-production § 12: production's page and Worker as release (a) made them (production false), the rollback.
test("WC-9c: the page production's Worker serves with that content is, visibly, visible_at's page at every fragment", async () => {
  const falseRoot = await productionFalseMirror();
  const asset = await noWeekPage({ savePath: await productionFalseSavePath() });
  const { text, files } = await contentOf({ week: WEEK_1018 });
  const site = await startSite({ root: falseRoot, assets: { "/": pageAsset(asset) }, objects: { [WEEK_DATA_KEY]: text, [sheetKeyOf(SHEET_1018)]: files[sheetKeyOf(SHEET_1018)] } });
  try {
    const served = (await site.get("/")).text;
    assert.notEqual(served, asset, "control: the week reached the page");
    // ⚠ Amended for SPEC-rung2-progress-and-checkout § 31.2 item 1 (2026-10-25): a snack link's photo part now carries
    // its snacks' cells; each visible page is read with exactly those removed (test/snack-cells.mjs withoutSnackCells),
    // every other byte as visible_at's. (The recorder builds visible_at's own tree, production true since § 12 of
    // SPEC-save-offer-production, where this case reads release (a)'s page, so it is not re-run for this.)
    let cut = 0;
    for (const hash of REGRESSION_HASHES) {
      const read = withoutSnackCells(visible(served, { hash, now: REGRESSION_NOW }));
      cut += read.links;
      assert.equal(sha256(read.text), golden.visible[hash], `${hash || "(none)"}: the visible page`);
    }
    assert.ok(cut > 0, "control: the snack links' cells were there to remove");
    const tile = await site.get(WEEK_SHEET_URL);
    assert.ok(tile.body.equals(SHEET), "the tiles' sheet is served at its new URL");
  } finally {
    await site.dispose();
  }
});
