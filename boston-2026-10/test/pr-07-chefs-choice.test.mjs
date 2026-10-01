// PR-7 (SPEC-plan-page-refinement § 2 item 5, § 5): Chef's Choice, always open. With the fixture week on the page, the
// list shows on load with no press and there is no toggle; each meal has a tile to the left of its name: its cell of the
// week's sheet (the fixture manifest, by the store name exactly as the picks file writes it, a 🟠NEW: tag included), or
// a plain tile.
import test from "node:test";
import assert from "node:assert/strict";
import { card, DAYS, FIXTURE as picks, midday, openPlanPage } from "./cc-harness.mjs";
import { FIXTURE_PHOTOS as photos, photoPage } from "./pr-harness.mjs";

const WEEK = "2026-10-04";

test("PR-7: the list visible on load with no press; no toggle; a thumbnail cell for each meal in the sheet, a plain tile for the others", async () => {
  const html = await photoPage("prod");
  const sheet = photos.chefs_choice[WEEK];
  for (const count of ["7", "14"]) {
    const page = openPlanPage(html, { hash: `#lean-${count}`, now: midday(DAYS["S-5"]) });
    const state = card(page);
    assert.equal(page.has("cc-toggle"), false, `${count}: no toggle`);
    assert.equal(state.list, true, `${count}: the list is shown with no press`);
    const expected = picks.menus[count].map((m) => (sheet.cells[m.name] ? "photo" : "plain"));
    assert.ok(expected.includes("photo") && expected.includes("plain"), `control: ${count} has both kinds`);
    const tiles = state.tiles.map((t) => {
      assert.ok(t && t.parentElement.firstElementChild === t, `${count}: each meal's tile is first, left of its name`);
      return /background-image:url\("([^"]+)"\)/.exec(t.getAttribute("style") ?? "")?.[1] === photos.base + sheet.file ? "photo" : "plain";
    });
    assert.deepEqual(tiles, expected, `${count}: the sheet's meals have its cell, the others a plain tile`);
  }
});
