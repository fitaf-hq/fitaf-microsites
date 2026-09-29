// P1: no photograph is in the repository. This repository is PUBLIC and a photograph's usage rights are
// the Owner's: the mock-ups read photos from boston-2026-10/mockups/photos/, which git ignores, and the
// rendered PNGs (which carry the photos) are written to the ignored dist-mockups/.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "../build.mjs";

const REPO = join(ROOT, "..");
const PACKAGE = "boston-2026-10";
const IMAGE = /\.(jpe?g|png|gif|webp|heic|heif|avif|tiff?|bmp|svg|raw|dng|cr2|nef)$/i;
/** The only image the repository may hold: the store's public logo (B1), byte-identical to the store's file. */
const ALLOWED_IMAGES = [`${PACKAGE}/src/assets/fitaf-logo.png`];

const git = (...args) => spawnSync("git", ["-C", REPO, ...args], { encoding: "utf8" });

/** Tracked image files other than the allowed brand asset. */
export const trackedPhotos = (paths) => paths.filter((p) => IMAGE.test(p) && !ALLOWED_IMAGES.includes(p));

test("P1: git tracks no image but the store's logo", () => {
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
