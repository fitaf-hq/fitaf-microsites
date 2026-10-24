// WC-8 (SPEC-week-content.md § 2.1, § 5): the build with no picks files carries the Chef's Choice card (the PICKS_STYLE,
// PICKS_CARD and PICKS_SCRIPT slots) with a #picks-data holding no week, the card hidden; the VISIBLE page is today's
// no-picks page. "Today's" is renderPage() with NO_PICKS, the page the build wrote before this contract, whose bytes are
// S20's golden as recorded at 45549a9 (the control below proves the reference is that page). Visible: the body after the
// page's scripts ran at a fragment, without what is hidden, scripts and styles (wc-harness visible()). Both builds.
// Since § 7's ruling no build embeds a week at all, so "the build with no picks files" is every build: this one runs
// with data/picks/ as committed (two weeks in it), which the build does not read (WC-12 and CC-4 say so).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyticsSlot, build, NO_PICKS, PROD_SLOTS, renderPage } from "../build.mjs";
import events from "../data/events.json" with { type: "json" };
import { card, hiddenInTree, MESSAGES, openPlanPage, PLANS } from "./cc-harness.mjs";
import { devPage } from "./dev-page.mjs";
import { TABLE } from "./ms-harness.mjs";
import { picksText, sha256, visible } from "./wc-harness.mjs";

/** index.html of the production build with no week, at 45549a9 (test/s20-production-golden.json there), re-recorded once
 *  at 5f55cbc for SPEC-meal-selection § 12 (the page MEANT to change: each pair's default first, *Weekdays only* the
 *  default, the snack block inside the card's list; § 12.1 lists the lines). It was 03fcc0c1… until then. Re-recorded
 *  once more at f02807e for SPEC-why-fit-af § 2 (the footer's "Why Fit AF?" button, its dialog and its no-script link;
 *  its § 4 lists the lines). It was bb17e256… until then. Re-recorded once more at e2284f1 for SPEC-why-fit-af § 6 (the
 *  /why/ page's link back to the plan page closes the dialog: app.js's seven added lines, its § 6.1 lists them). It was
 *  1c68a68b… until then. Re-recorded once more at 5231265 for SPEC-every-menu-and-nutrition § 11 (2026-10-22: Why Fit
 *  AF? above the tabs, the card's rings and circled i; its § 11.1 says which lines): renderPage at ce91cba's own tree
 *  reproduces 21abbe56…, at 5231265's gives 321da0a6…. Re-recorded once more at 773e597 for § 11.2 (Why Fit AF? an
 *  outline button in the unselected chip's look): 5231265's tree reproduces 321da0a6…, 773e597's gives 01270dca….
 *  Re-recorded once more at dbfcb62 for SPEC-ui-and-copy-pass § 1.2 item 1 (the card's meals and its weekly total at the
 *  plan's price a meal: #plan-data's answers and app.js's lines): 9b1438c's tree reproduces 01270dca…, dbfcb62's gives
 *  this. */
const TODAY_NO_PICKS_SHA256 = "f3cd8763780ae518d591b37797982e67909213c5baea18c5b7d8faa1705750a8";

/** Every answer set (§ 8 item 2 of SPEC-meal-selection) at one size, today's fragments, the Family tab, and none.
 *  ⚠ Not a `-s` fragment (snacks chosen): with snacks carted, today's no-picks page has no Q4 and takes `-s` as the
 *  size alone; the card's page carries Q4 (hidden by its script) and takes `-s` as its answer set without snacks, as
 *  a page whose week was not live always did. MS-7's no-week case states that difference; SPEC-week-content § 7. */
const HASHES = ["", "#family", "#individual", "#lean", "#lean-7", "#signature-14", "#meals-14", ...TABLE.map((r) => `#performance-${r.key}`)];
const NOW = Date.parse("2026-10-11T16:00:00Z");

async function built(target) {
  const outDir = await mkdtemp(join(tmpdir(), `boston-wc8-${target}-`));
  try {
    await build({ target, outDir });
    return await readFile(join(outDir, "index.html"), "utf8");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

// Since SPEC-analytics.md § 4 every page carries the analytics script (the ANALYTICS slot, one line before #plan-data),
// so the reference is today's no-picks page plus exactly that slot: without it, byte for byte the page pinned above.
test("WC-8 (control): the reference is today's no-picks page, byte for byte (but for the analytics slot)", async () => {
  const reference = await renderPage(PLANS, PROD_SLOTS, MESSAGES, NO_PICKS);
  const slot = `${await analyticsSlot(events)}\n`;
  assert.equal(reference.split(slot).length - 1, 1, "the analytics slot is on the page once");
  assert.equal(sha256(reference.replace(slot, "")), TODAY_NO_PICKS_SHA256);
});

for (const target of ["prod", "dev"]) {
  test(`WC-8 (${target}): the build: the card is on the page, hidden, holding no week; the visible page is today's`, async () => {
    const reference = target === "prod" ? await renderPage(PLANS, PROD_SLOTS, MESSAGES, NO_PICKS) : await devPage();
    const html = await built(target);
    assert.notEqual(html, reference, "control: the page is not the old bytes (the card is carried)");
    assert.deepEqual(JSON.parse(picksText(html)).weeks, [], "#picks-data holds no week");
    for (const id of ["cc-list", "cc-heading", "cc-meals", "cc-checkout", "cc-own"]) {
      assert.ok(html.includes(`id="${id}"`), `the card's #${id} is in the markup`);
    }
    for (const hash of HASHES) {
      const page = openPlanPage(html, { hash, now: NOW });
      for (const id of ["cc-list", "cc-own"]) assert.ok(hiddenInTree(page.document.getElementById(id)), `${hash}: #${id} hidden`);
      assert.equal(card(page).list, false, `${hash}: no list`);
      assert.equal(visible(html, { hash, now: NOW }), visible(reference, { hash, now: NOW }), `${hash || "(none)"}: the visible page`);
    }
  });
}
