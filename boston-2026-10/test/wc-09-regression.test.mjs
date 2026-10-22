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
// sheet still 409b805's.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PHOTO_SHEETS_DIR, ROOT } from "../build.mjs";
import { rangeless } from "./cc-harness.mjs";
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
  assert.equal(golden.visible_at, "5231265", "the visible pages: 5231265's served page (SPEC-every-menu-and-nutrition § 11)");
});

test("WC-9a: the program's week/picks-data.json is 409b805's #picks-data with the sheet's URL at /week/, and nothing else changed", async () => {
  const out = await mkdtemp(join(tmpdir(), "boston-wc9-"));
  try {
    execFileSync(process.execPath, [join(ROOT, "scripts", "week-content.mjs"), "--week", WEEK_1018, "--out", out], { stdio: "pipe" });
    const written = (await readdir(join(out, "week"))).sort();
    assert.deepEqual(written, ["chefs-choice-2026-10-18.jpg", "picks-data.json"], "the week's data and its one sheet");
    const text = await readFile(join(out, WEEK_DATA_KEY), "utf8");
    const before = JSON.stringify(golden.picks_data);
    // ⚠ Amended for SPEC-every-menu-and-nutrition § 11 item 1 (2026-10-22): each heading is the menu's name alone, a
    // phrase the content fills, so 409b805's is read with each heading's " (<range>)" removed (cc-harness rangeless),
    // every other byte its own.
    const read = rangeless(Buffer.from(asWeekUrls(before), "utf8"), WEEK_1018);
    assert.ok(read.headings > 0, "control: 409b805's headings name the week's range");
    const after = read.bytes.toString("utf8");
    assert.ok(sheetUrlCount(before) > 0 && sheetUrlCount(after) === 0, "control: the URLs were rewritten");
    assert.equal(sheetUrlCount(text), 0, "no URL of the build's sheet path is left");
    assert.ok(text.includes(WEEK_SHEET_URL), `the sheet at ${WEEK_SHEET_URL}`);
    assert.deepEqual(JSON.parse(text), JSON.parse(after), "the JSON value, the sheet's URL apart");
    assert.equal(text, scriptJsonRef(JSON.parse(after)), "the bytes: the element's text as the build writes it, the URL apart");
    assert.notDeepEqual(JSON.parse(text), golden.picks_data, "control: the URL and the headings' range are the differences");
    const sheet = await readFile(join(out, sheetKeyOf(SHEET_1018)));
    assert.ok(sheet.equals(SHEET), "the sheet byte-identical to src/assets/photo-sheets/");
    assert.equal(sha256(sheet), golden.sheet.sha256, "and to 409b805's");
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("WC-9c: the page production's Worker serves with that content is, visibly, visible_at's page at every fragment", async () => {
  const asset = await noWeekPage();
  const { text, files } = await contentOf({ week: WEEK_1018 });
  const site = await startSite({ assets: { "/": pageAsset(asset) }, objects: { [WEEK_DATA_KEY]: text, [sheetKeyOf(SHEET_1018)]: files[sheetKeyOf(SHEET_1018)] } });
  try {
    const served = (await site.get("/")).text;
    assert.notEqual(served, asset, "control: the week reached the page");
    for (const hash of REGRESSION_HASHES) {
      assert.equal(sha256(visible(served, { hash, now: REGRESSION_NOW })), golden.visible[hash], `${hash || "(none)"}: the visible page`);
    }
    const tile = await site.get(WEEK_SHEET_URL);
    assert.ok(tile.body.equals(SHEET), "the tiles' sheet is served at its new URL");
  } finally {
    await site.dispose();
  }
});
