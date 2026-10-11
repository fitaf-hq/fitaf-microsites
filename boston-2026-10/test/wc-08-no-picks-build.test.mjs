// WC-8 (SPEC-week-content.md § 2.1, § 5): the build with no picks files carries the Chef's Choice card (the PICKS_STYLE,
// PICKS_CARD and PICKS_SCRIPT slots) with a #picks-data holding no week, the card hidden; the VISIBLE page is today's
// no-picks page. "Today's" is renderPage() with NO_PICKS, the page the build wrote before this contract, whose bytes are
// S20's golden as recorded at 45549a9 (the control below proves the reference is that page). Visible: the body after the
// page's scripts ran at a fragment, without what is hidden, scripts and styles (wc-harness visible()). Both builds; no
// picks directory and an empty one.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, NO_PICKS, PROD_SLOTS, renderPage } from "../build.mjs";
import { card, hiddenInTree, MESSAGES, openPlanPage, PLANS } from "./cc-harness.mjs";
import { devPage } from "./dev-page.mjs";
import { TABLE } from "./ms-harness.mjs";
import { picksText, sha256, visible } from "./wc-harness.mjs";

/** index.html of the production build with no week, at 45549a9 (test/s20-production-golden.json there). */
const TODAY_NO_PICKS_SHA256 = "03fcc0c145b4e4bc310c23f5d721241e5a461bb9b08a7a451fbd2b40e7b757c6";

/** Every answer set (§ 8 item 2 of SPEC-meal-selection) at one size, today's fragments, the Family tab, and none. */
const HASHES = ["", "#family", "#individual", "#lean", "#lean-7", "#signature-14", "#meals-14", ...TABLE.map((r) => `#performance-${r.key}`)];
const NOW = Date.parse("2026-10-11T16:00:00Z");

async function builtWithout(target, picks) {
  const outDir = await mkdtemp(join(tmpdir(), `boston-wc8-${target}-`));
  try {
    await build({ target, outDir, picksDir: picks });
    return await readFile(join(outDir, "index.html"), "utf8");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

test("WC-8 (control): the reference is today's no-picks page, byte for byte", async () => {
  const reference = await renderPage(PLANS, PROD_SLOTS, MESSAGES, NO_PICKS);
  assert.equal(sha256(reference), TODAY_NO_PICKS_SHA256);
});

for (const target of ["prod", "dev"]) {
  test(`WC-8 (${target}): no picks files: the card is on the page, hidden, holding no week; the visible page is today's`, async () => {
    const reference = target === "prod" ? await renderPage(PLANS, PROD_SLOTS, MESSAGES, NO_PICKS) : await devPage();
    const parent = await mkdtemp(join(tmpdir(), "boston-wc8-picks-"));
    try {
      for (const [label, picks] of [["no directory", join(parent, "none")], ["an empty directory", parent]]) {
        const html = await builtWithout(target, picks);
        assert.notEqual(html, reference, `${label}: control, the page is not the old bytes (the card is carried)`);
        const data = JSON.parse(picksText(html));
        assert.deepEqual(data.weeks, [], `${label}: #picks-data holds no week`);
        for (const id of ["cc-list", "cc-heading", "cc-meals", "cc-checkout", "cc-own"]) {
          assert.ok(html.includes(`id="${id}"`), `${label}: the card's #${id} is in the markup`);
        }
        for (const hash of HASHES) {
          const page = openPlanPage(html, { hash, now: NOW });
          for (const id of ["cc-list", "cc-own"]) assert.ok(hiddenInTree(page.document.getElementById(id)), `${label} ${hash}: #${id} hidden`);
          assert.equal(card(page).list, false, `${label} ${hash}: no list`);
          assert.equal(visible(html, { hash, now: NOW }), visible(reference, { hash, now: NOW }), `${label} ${hash || "(none)"}: the visible page`);
        }
      }
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
}
