// P1: no photograph is in the repository. This repository is PUBLIC and a photograph's usage rights are
// the Owner's: the mock-ups read photos from boston-2026-10/mockups/photos/, which git ignores, and the
// rendered PNGs (which carry the photos) are written to the ignored dist-mockups/.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { loadPhotos, ROOT } from "../build.mjs";
import { flowBlocks } from "../scripts/flow-sources.mjs";

const REPO = join(ROOT, "..");
const PACKAGE = "boston-2026-10";
const IMAGE = /\.(jpe?g|png|gif|webp|heic|heif|avif|tiff?|bmp|svg|raw|dng|cr2|nef)$/i;
/**
 * The only images the repository may hold, and none is a photograph: the store's public logo (B1), byte-identical
 * to the store's file, and the flow diagrams, each an SVG drawn from a mermaid block in committed text, named by
 * the block (F1 keeps each current). Named one by one: a folder or an extension is never the exemption.
 */
const FLOW_DIAGRAMS = (await flowBlocks()).map((b) => `${PACKAGE}/flows/rendered/${b.name}.svg`);
/**
 * Updated (SPEC-plan-page-refinement § 3, the Advisor's ruling): the plan page's photographs may be committed as sprite
 * sheets in ONE directory, src/assets/photo-sheets/, each named by the manifest data/photo-sheets.json (none is yet: the
 * producer is held); and the photo-sheet cases' FIXTURE sheets, generated flat colours, each named by the fixture's own
 * manifest. Still one by one: a sheet no manifest names, or a photograph anywhere else, is flagged.
 */
const sheetsOf = (manifest, dir) =>
  [manifest.carousel, ...Object.values(manifest.chefs_choice ?? {})].filter(Boolean).map((s) => `${PACKAGE}/${dir}/${s.file}`);
const PHOTO_SHEETS = [
  ...sheetsOf(await loadPhotos(), "src/assets/photo-sheets"),
  ...sheetsOf(await loadPhotos(join(ROOT, "test", "fixtures", "photo-sheets", "photo-sheets.json")), "test/fixtures/photo-sheets"),
];
const ALLOWED_IMAGES = [`${PACKAGE}/src/assets/fitaf-logo.png`, ...FLOW_DIAGRAMS, ...PHOTO_SHEETS];

const git = (...args) => spawnSync("git", ["-C", REPO, ...args], { encoding: "utf8" });

/** Tracked image files other than the allowed brand asset. */
export const trackedPhotos = (paths) => paths.filter((p) => IMAGE.test(p) && !ALLOWED_IMAGES.includes(p));

test("P1: git tracks no image but the store's logo, the flow diagrams and the photo sheets a manifest names", () => {
  const res = git("ls-files", "-z");
  assert.equal(res.status, 0, res.stderr);
  const tracked = res.stdout.split("\0").filter(Boolean);
  assert.ok(tracked.includes(ALLOWED_IMAGES[0]), "the listing sees the repository (control)");
  assert.deepEqual(trackedPhotos(tracked), []);
  assert.deepEqual(
    tracked.filter((p) => p.startsWith(`${PACKAGE}/mockups/photos/`)),
    [],
    "nothing under mockups/photos/ is tracked",
  );
});

test("P1 control: the check flags a photograph, whatever its case or folder", () => {
  const listing = [
    ALLOWED_IMAGES[0],
    `${PACKAGE}/mockups/photos/hero.jpg`,
    `${PACKAGE}/mockups/Beef Barbacoa.JPEG`,
    `${PACKAGE}/dist-mockups/tent-card.png`,
    `${PACKAGE}/data/plans.json`,
  ];
  assert.deepEqual(trackedPhotos(listing), listing.slice(1, 4));
});

test("P1 control: a JPEG in the photo sheets' directory that no manifest names is flagged", () => {
  assert.ok(PHOTO_SHEETS.length > 0, "a manifest names sheets (control)");
  const stray = `${PACKAGE}/src/assets/photo-sheets/stray.jpg`;
  assert.deepEqual(trackedPhotos([...PHOTO_SHEETS, stray, `${PACKAGE}/src/assets/carousel.jpg`]), [stray, `${PACKAGE}/src/assets/carousel.jpg`]);
});

test("P1 control: beside the flow diagrams, a photograph or an SVG no flow block names is still flagged", () => {
  assert.ok(FLOW_DIAGRAMS.length > 0, "the flows have blocks (control)");
  const listing = [
    ...FLOW_DIAGRAMS,
    `${PACKAGE}/flows/rendered/hero.jpg`,
    `${PACKAGE}/flows/rendered/01-save-offer.png`,
    `${PACKAGE}/flows/rendered/not-a-flow.svg`,
  ];
  assert.deepEqual(trackedPhotos(listing), listing.slice(FLOW_DIAGRAMS.length));
});

test("P1: the photos folder and the rendered mock-ups are ignored; the manifest is not", () => {
  for (const path of [
    `${PACKAGE}/mockups/photos/hero.jpg`,
    `${PACKAGE}/mockups/photos/Beef Barbacoa.jpg`,
    `${PACKAGE}/dist-mockups/tent-card.png`,
    `${PACKAGE}/dist-mockups/photos/hero.jpg`,
  ]) {
    assert.equal(git("check-ignore", "-q", "--no-index", path).status, 0, `${path} must be ignored`);
  }
  // Control: a committed input is NOT ignored, so the check can tell the difference.
  assert.equal(git("check-ignore", "-q", "--no-index", `${PACKAGE}/mockups/photos.json`).status, 1);
});
