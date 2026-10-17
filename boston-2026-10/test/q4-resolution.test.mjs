// Q4 (SPEC-print-pieces.md § 3, § 5): resolution. Each photo's effective resolution at its printed size (its pixels
// against its window's printed size in inches; it fills the window, so the smaller of the two ratios) must be at least
// 300 ppi; below that the build refuses, naming the position and the ppi, and prints nothing. The photos are synthetic
// JPEGs made here (print-fixtures.mjs); their pixel size is read from the header, upright.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { effectivePpi, resolution } from "../print/checks.mjs";
import { jpegSize } from "../print/jpeg.mjs";
import { MIN_PPI } from "../print/sizes.mjs";
import { fixtureJpeg, lockedBuild, NO_CHROME, photoSet } from "./print-fixtures.mjs";

const set = await photoSet({ sizes: { flyer: [900, 400] } }); // the flyer's photo is far below 300 ppi across 4.5 in
after(() => rm(set.dir, { recursive: true, force: true }));

test("Q4: the threshold is 300 ppi", () => assert.equal(MIN_PPI, 300));

test("Q4: a JPEG's pixel size is read from its header, upright (an EXIF quarter turn swaps it)", () => {
  assert.deepEqual(jpegSize(fixtureJpeg(2400, 1600)), { width: 2400, height: 1600 });
  assert.deepEqual(jpegSize(fixtureJpeg(2400, 1600, { orientation: 1 })), { width: 2400, height: 1600 });
  for (const o of [5, 6, 7, 8]) assert.deepEqual(jpegSize(fixtureJpeg(2400, 1600, { orientation: o })), { width: 1600, height: 2400 }, `orientation ${o}`);
  assert.deepEqual(jpegSize(fixtureJpeg(2400, 1600, { orientation: 3 })), { width: 2400, height: 1600 }, "a half turn does not swap");
  assert.throws(() => jpegSize(Buffer.from("not a jpeg at all")), /not a JPEG/);
});

test("Q4: the effective resolution is the smaller ratio of pixels to the window's inches", () => {
  assert.equal(effectivePpi({ width: 1350, height: 3000 }, { w: 4.5, h: 2 }), 300);
  assert.equal(effectivePpi({ width: 3000, height: 580 }, { w: 4.5, h: 2 }), 290);
});

test("Q4: a photo below 300 ppi at its window is refused, naming the position and the ppi; 300 passes", () => {
  const windows = [
    { slot: "flyer", w: 4.5, h: 2 },
    { slot: "tent-top", w: 1, h: 2 },
    { slot: "tent-top", w: 1.05, h: 2 }, // the same position on the other face, a hair larger: the lower ppi counts
  ];
  const ok = resolution(windows, { flyer: { width: 1350, height: 600 }, "tent-top": { width: 316, height: 640 } });
  assert.deepEqual(ok.refusals, [], "control: 300 ppi and above pass");
  assert.deepEqual(ok.rows.map((r) => [r.slot, Math.floor(r.ppi)]), [["flyer", 300], ["tent-top", 300]]);
  const low = resolution(windows, { flyer: { width: 1349, height: 600 }, "tent-top": { width: 312, height: 630 } });
  assert.deepEqual(low.refusals, [
    "photo position flyer: 1349 × 600 px over its window of 4.50 × 2.00 in is 299 ppi, below 300",
    "photo position tent-top: 312 × 630 px over its window of 1.05 × 2.00 in is 297 ppi, below 300",
  ]);
  assert.deepEqual(resolution(windows, {}).rows, [], "a placeholder (no photo) has no resolution to check");
});

test("Q4: the build refuses a fixture photo below 300 ppi at its window, naming the position, and prints nothing", { skip: NO_CHROME }, async () => {
  const out = join(set.dir, "dist-print");
  await mkdir(out, { recursive: true });
  await writeFile(join(out, "flyer.pdf"), "a stale piece from an earlier run");
  await assert.rejects(
    lockedBuild({ outDir: out, ...set.photos, today: "2026-10-20", variants: ["a"], fourFlyers: false }),
    (err) => {
      assert.match(err.message, /^refused, nothing printed:/);
      assert.match(err.message, /flyer: photo position flyer: 900 × 400 px over its window of 4\.50 × \d\.\d\d in is \d+ ppi, below 300/);
      assert.doesNotMatch(err.message, /tent-(large|top|bottom)/, "the tent's photos (2400 px) pass");
      return true;
    },
  );
  assert.deepEqual(await readdir(out), [], "dist-print/ is emptied and left empty: nothing printed, nothing stale");
});
