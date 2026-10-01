// PR-3 (SPEC-plan-page-refinement § 3, § 5): ⭐ base. Every photo URL the page carries is built from the manifest's
// `base`: set to a CDN, every one starts with it (and no sheet is copied); null, with src/assets/photo-sheets/ deleted,
// the page builds with no photograph: no carousel, no URL naming a sheet, the list's tiles plain. Each in a mirror (a
// copy of the package's inputs with the FIXTURE manifest and sheets put in data/ and src/assets/photo-sheets/, and the
// fixture week in data/picks/), built by the program (`node build.mjs`), both builds. With no data/photo-sheets.json at
// all (a mirror without it or the directory): the same page as base null. And the tree as committed, which since the
// KMS-side emitter's sheets landed carries the five carousel windows and a photo tile for each meal of the committed
// week the manifest has a cell for (the count read from the manifest, never a literal).
import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseHTML } from "linkedom";
import { loadPhotos, PICKS_DIR, ROOT } from "../build.mjs";
import { builtPage, card, DAYS, midday, mirror, ON, openPlanPage, withFixtureInData } from "./cc-harness.mjs";
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

test("PR-3: no data/photo-sheets.json and no directory (a mirror) builds the page of base null: no carousel, plain tiles", async () => {
  const dir = await mirror(async (d) => {
    await copyFile(join(ROOT, "wrangler.jsonc"), join(d, "wrangler.jsonc"));
    await rm(join(d, "data", "picks"), { recursive: true, force: true });
    await withFixtureInData(d);
    await rm(join(d, "data", "photo-sheets.json"), { force: true });
    await rm(join(d, "src", "assets", "photo-sheets"), { recursive: true, force: true });
  });
  try {
    for (const target of ["prod", "dev"]) {
      const { html } = await programBuild(dir, target);
      assert.ok(html.includes('id="picks-data"'), `${target}: control: the week is on the page`);
      assert.deepEqual(photoUrls(html), [], `${target}: no URL names a photo`);
      assert.doesNotMatch(html, /id="carousel"/, `${target}: no carousel`);
      const state = card(openPlanPage(html, { hash: "#lean-7", now: midday(DAYS["S-5"]) }));
      assert.ok(state.list && state.tiles.length > 0 && state.tiles.every((t) => !t.hasAttribute("style")), `${target}: the tiles plain`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("PR-3: the tree as committed carries the five carousel windows and a photo tile for each meal the manifest has a cell for", async () => {
  const photos = await loadPhotos();
  const { html } = await builtPage({ picks: PICKS_DIR, on: ON });
  const windows = [...parseHTML(html).document.querySelectorAll("#carousel .slide img")];
  assert.deepEqual(windows.map((img) => img.getAttribute("src")), Array(5).fill(photos.base + photos.carousel.file), "five windows onto the carousel sheet");
  // The counts are the manifest's and the picks file's own, never literals: the emitter decides which meals have a photo.
  const sheet = photos.chefs_choice["2026-10-04"];
  const menu = JSON.parse(await readFile(join(PICKS_DIR, "2026-10-04.json"), "utf8")).menus["14"].map((m) => m.name);
  const cells = menu.filter((name) => name in sheet.cells);
  assert.ok(cells.length > 0, "control: the manifest has a cell for some meal of the 14-meal list");
  const page = openPlanPage(html, { hash: "#lean-14", now: midday(DAYS["S-5"]) });
  const rows = [...page.document.querySelectorAll("#cc-meals li")];
  assert.equal(rows.length, menu.length, "control: the list shows the 14-meal menu");
  const withPhoto = rows.filter((li) => (li.querySelector(".cc-thumb").getAttribute("style") ?? "").includes(photos.base + sheet.file));
  assert.deepEqual(withPhoto.map((li) => li.querySelector(".cc-name").textContent).sort(), [...cells].sort(), `the ${cells.length} meals with a cell show their photo`);
  assert.equal(rows.length - withPhoto.length, menu.length - cells.length, `and ${menu.length - cells.length} plain tiles`);
});
