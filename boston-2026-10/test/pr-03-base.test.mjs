// PR-3 (SPEC-plan-page-refinement § 3, § 5): ⭐ base. Every photo URL the page carries is built from the manifest's
// `base`: set to a CDN, every one starts with it (and no sheet is copied); null, with src/assets/photo-sheets/ deleted,
// the page builds with no photograph: no carousel, no URL naming a sheet, the list's tiles plain. Each in a mirror (a
// copy of the package's inputs with the FIXTURE manifest and sheets put in data/ and src/assets/photo-sheets/, and the
// fixture week in data/picks/), built by the program (`node build.mjs`), both builds. And the tree as committed, which
// holds no manifest (§ 3's producer is held): the same page as base null.
import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { builtPage, card, DAYS, FIXTURE_DIR, midday, mirror, ON, openPlanPage, withFixtureInData } from "./cc-harness.mjs";
import { FIXTURE_PHOTOS_PATH, FIXTURE_SHEETS_DIR, photoUrls, programBuild } from "./pr-harness.mjs";

const CDN = "https://cdn.example/x/";
const SHEETS = ["carousel.jpg", "chefs-choice-2026-10-04.jpg"];

/** A mirror whose data/photo-sheets.json has `base`; `removeDir` deletes its src/assets/photo-sheets/. The development
 *  build reads wrangler.jsonc (its Turnstile key), so the mirror has a copy. */
const withBase = (base, { removeDir = false } = {}) =>
  mirror(async (dir) => {
    await copyFile(join(ROOT, "wrangler.jsonc"), join(dir, "wrangler.jsonc"));
    await rm(join(dir, "data", "picks"), { recursive: true, force: true });
    await withFixtureInData(dir);
    const manifest = JSON.parse(await readFile(FIXTURE_PHOTOS_PATH, "utf8"));
    manifest.base = base;
    await writeFile(join(dir, "data", "photo-sheets.json"), JSON.stringify(manifest, null, 2));
    const sheets = join(dir, "src", "assets", "photo-sheets");
    await mkdir(sheets, { recursive: true });
    for (const file of SHEETS) await copyFile(join(FIXTURE_SHEETS_DIR, file), join(sheets, file));
    if (removeDir) await rm(sheets, { recursive: true });
  });

test("PR-3: base a CDN: every photo URL in the page starts with it, and no sheet is copied beside the page", async () => {
  const dir = await withBase(CDN);
  try {
    for (const target of ["prod", "dev"]) {
      const { html, files } = await programBuild(dir, target);
      const urls = photoUrls(html);
      assert.ok(SHEETS.every((s) => urls.some((u) => u.endsWith(s))), `${target}: control: the page names both sheets`);
      assert.deepEqual(urls.filter((u) => !u.startsWith(CDN)), [], `${target}: every photo URL starts with the base`);
      assert.deepEqual(files.filter((f) => f.endsWith(".jpg")), [], `${target}: no sheet beside the page`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("PR-3: base null and no directory: the page builds; no URL names a photo; no carousel; the tiles plain", async () => {
  const dir = await withBase(null, { removeDir: true });
  try {
    for (const target of ["prod", "dev"]) {
      const { html } = await programBuild(dir, target);
      assert.ok(html.includes('id="picks-data"'), `${target}: control: the week is on the page`);
      assert.deepEqual(photoUrls(html), [], `${target}: no URL names a photo`);
      assert.doesNotMatch(html, /id="carousel"/, `${target}: no carousel`);
      if (target === "prod") {
        const state = card(openPlanPage(html, { hash: "#lean-7", now: midday(DAYS["S-5"]) }));
        assert.ok(state.list && state.tiles.length > 0, "control: the list and its tiles are shown");
        assert.deepEqual(state.tiles.filter((t) => t.hasAttribute("style")), [], "every tile plain");
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("PR-3: the tree as committed (no data/photo-sheets.json) builds the page of base null: no carousel, plain tiles", async () => {
  const { html } = await builtPage({ picks: FIXTURE_DIR, on: ON });
  assert.deepEqual(photoUrls(html), [], "no URL names a photo");
  assert.doesNotMatch(html, /id="carousel"/, "no carousel");
  const state = card(openPlanPage(html, { hash: "#lean-7", now: midday(DAYS["S-5"]) }));
  assert.ok(state.list && state.tiles.length > 0 && state.tiles.every((t) => !t.hasAttribute("style")), "the tiles plain");
});
