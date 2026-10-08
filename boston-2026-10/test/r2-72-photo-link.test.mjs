// R2-72 (SPEC-rung2-progress-and-checkout § 17.1, § 17.4): the link carries each meal's cell, and the block's reader
// decodes the same cells (one writer, one reader). The WRITER is the link tool (scripts/handoff-link.mjs: payloadFromArgs
// reading the manifest, then handoffLink) as scripts/chefs-choice.mjs runs it for the plan page, over the FIXTURE
// manifest and the fixture week; no cell geometry is a literal in the tool or the block (§ 17.1), so the cells must come
// from the manifest. The READER is the shipped text, run on the synthetic order page holding the week's cards (their
// images never load): each slide's photograph is read back from the DOM as the window it shows onto the sheet.
import test from "node:test";
import assert from "node:assert/strict";
import { loadJson, PLANS_PATH } from "../build.mjs";
import { countTable } from "../scripts/build-storefront.mjs";
import * as cc from "../scripts/chefs-choice.mjs";
import * as link from "../scripts/handoff-link.mjs";
import { script } from "./r2-harness.mjs";
import { DELIVERY, expectedWindow, HOSTS, MENU, NAMES, observe, photoText, PHOTOS, readPhotoPart, SHEET, weekFragment, weekPage } from "./r2-photos.mjs";

const PLANS = await loadJson(PLANS_PATH);
const COUNTS = new Map(Object.entries(countTable(PLANS)).map(([mpid, n]) => [Number(mpid), n]));
const ARGS = ["--mpid", "21", ...MENU.flatMap((m) => ["--item", `${m.name}:${m.qty}`])];

test("R2-72a: the link tool, given the week's sheet, writes each meal's cell from the manifest (none for a meal without one)", () => {
  assert.deepEqual(link.PHOTO_HOSTS, HOSTS, "the tool's list of the sheet's hosts is § 17.1's");
  for (const code of [0, 1]) {
    const href = link.handoffLink(PLANS, link.payloadFromArgs([...ARGS, "--photos", DELIVERY, "--host", String(code)], COUNTS, PHOTOS));
    const part = readPhotoPart(href);
    assert.ok(part, `host ${code}: the link carries a photo part: ${href}`);
    assert.deepEqual(part, {
      host: code,
      path: `/${PHOTOS.base}${SHEET.file}`,
      width: SHEET.width,
      cells: NAMES.map((n) => SHEET.cells[n] ?? null),
    });
    assert.equal(href.slice(href.indexOf("#fitaf=")), weekFragment(photoText({ host: code })), "exactly the text the tests' own encoder writes");
  }
  assert.ok(NAMES.some((n) => !SHEET.cells[n]) && NAMES.some((n) => SHEET.cells[n]), "fixture control: some meals have a cell, some none");
});

// Updated (SPEC-meal-selection § 5): checkPicks returns carts by answer set; a version-1 week's 7 is the cart of or-7d.
test("R2-72b: the plan page's links (chefs-choice, through the tool) carry the week's cells; with no sheet, the links of today", () => {
  const week = cc.checkPicks(structuredClone(fixtureWeek()), `${DELIVERY}.json`, PLANS, { photos: PHOTOS, host: 0 });
  for (const href of Object.values(week.carts["or-7d"].links)) {
    assert.deepEqual(readPhotoPart(href)?.cells, NAMES.map((n) => SHEET.cells[n] ?? null), href);
  }
  const plain = cc.checkPicks(structuredClone(fixtureWeek()), `${DELIVERY}.json`, PLANS);
  for (const href of Object.values(plain.carts["or-7d"].links)) assert.equal(readPhotoPart(href), null, `no sheet, no photo part: ${href}`);
  const noBase = cc.checkPicks(structuredClone(fixtureWeek()), `${DELIVERY}.json`, PLANS, { photos: { ...PHOTOS, base: null }, host: 0 });
  for (const href of Object.values(noBase.carts["or-7d"].links)) assert.equal(readPhotoPart(href), null, `base null, no photo part: ${href}`);
});

test("R2-72c: the block's reader decodes the same cells — each slide shows its meal's cell, none for a meal without one", async () => {
  const href = link.handoffLink(PLANS, link.payloadFromArgs([...ARGS, "--photos", DELIVERY, "--host", "0"], COUNTS, PHOTOS));
  const page = await weekPage();
  const fragment = href.slice(href.indexOf("#"));
  const { h, last } = await observe(await script(), page, fragment);
  assert.ok(h.info.includes("[fitaf-handoff] done: /checkout"), JSON.stringify(h.info));
  assert.deepEqual(
    last.map((s) => [s.name, s.sheet]),
    NAMES.map((n) => [n, SHEET.cells[n] ? expectedWindow(n) : null]),
  );
});

/** The fixture week, as the plan page's build reads it. */
function fixtureWeek() {
  return { delivery: DELIVERY, menus: { 7: MENU } };
}
