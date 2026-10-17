// Q15 (SPEC-print-pieces.md § 8 item 4): four flyers, four different photos, from the rule. flyer-1 to flyer-4 each take,
// in order, a photo of the first rung-4 array without any of the tent's three photos (else the first array), as composed;
// each is a full single flyer with its own bleed (its own one-page PDF at the flyer's size); a PNG preview shows the four
// side by side. A missing rung 4, or an array not of four, is refused. Fixtures only (print-fixtures.mjs).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "pngjs";
import { fourFlyerPhotos } from "../print/assign.mjs";
import { pageOf, pagePoints, PRINT_PIECES } from "../print/sizes.mjs";
import { CSS_PX_PER_INCH } from "../print/sizes.mjs";
import { lockedBuild, NO_CHROME, pdfPages, photoSet, randomId, rungsDoc } from "./print-fixtures.mjs";

const [t1, t2, t3, a, b, c, d, e, f, g, h] = Array.from({ length: 11 }, randomId);
const tent = [t1, t2, t3];
const doc = (arrays) => rungsDoc({ alsoGood: [a], arrays: { 3: [tent], 4: arrays } });
const set = await photoSet();
after(() => rm(set.dir, { recursive: true, force: true }));
const flyer = PRINT_PIECES.find((p) => p.id === "flyer");

test("Q15: the four are the first rung-4 array without the tent's photos, in its order", () => {
  const got = fourFlyerPhotos(doc([[t2, a, b, c], [a, t3, b, c], [d, e, f, g], [h, a, b, c]]), tent);
  assert.deepEqual(got.ids, [d, e, f, g]);
  assert.equal(got.from, "rung 4, array 3 (the first without the tent's photos)");
  assert.equal(new Set(got.ids).size, 4, "four different photos");
});

test("Q15: when every rung-4 array holds a tent photo, the first array", () => {
  const got = fourFlyerPhotos(doc([[a, b, c, t1], [d, t2, e, f]]), tent);
  assert.deepEqual(got.ids, [a, b, c, t1]);
  assert.equal(got.from, "rung 4, array 1 (every array holds one of the tent's photos)");
});

test("Q15: a missing rung 4, an empty one, or an array not of four photo IDs is refused, naming it", () => {
  assert.throws(() => fourFlyerPhotos(rungsDoc({ alsoGood: [a], arrays: { 3: [tent] } }), tent), /pool "glam" has no rung 4/);
  assert.throws(() => fourFlyerPhotos(doc([]), tent), /pool "glam", rung 4 has no array/);
  assert.throws(() => fourFlyerPhotos(doc([[a, b, c, d], [e, f, g]]), tent), /pool "glam", rung 4, array 2: not 4 photo IDs/);
  assert.throws(() => fourFlyerPhotos(doc([[a, b, "c/d", e]]), tent), /rung 4, array 1, photo 3: "c\/d" is not a photo ID/);
});

test("Q15: built, four flyers of four different photos from the rule, each a one-page flyer with its bleed, and a preview of the four", { skip: NO_CHROME }, async () => {
  const out = join(set.dir, "dist-print");
  const built = await lockedBuild({ outDir: out, ...set.photos, today: "2026-10-20", variants: ["a"] });
  const record = JSON.parse(await readFile(join(out, "assignment.json"), "utf8"));
  const { ids } = set;
  assert.deepEqual(
    record.four_flyers.map((r) => [r.id, r.file, r.from]),
    ["one", "two", "three", "four"].map((role, k) => [ids[role], `${ids[role]}.jpg`, `rung 4, array 2 (the first without the tent's photos), photo ${k + 1}`]),
  );
  const { w, h } = pagePoints(flyer);
  for (const k of [1, 2, 3, 4]) {
    const { pages, boxes } = pdfPages(await readFile(join(out, `flyer-${k}-PROOF.pdf`)));
    assert.deepEqual([pages, ...boxes], [1, [0, 0, w, h]], `flyer-${k}-PROOF.pdf`);
    assert.ok(built.lines.some((l) => l.startsWith(`photo flyer-${k}: rung 4, array 2`)), `the report names flyer-${k}'s photo`);
  }
  const preview = PNG.sync.read(await readFile(join(out, "flyer-1-4-PROOF.png")));
  const one = { w: Math.round(pageOf(flyer).w * CSS_PX_PER_INCH), h: Math.round(pageOf(flyer).h * CSS_PX_PER_INCH) };
  assert.ok(preview.width >= 4 * one.w && preview.width < 4 * one.w + 4 * 40 && preview.height >= one.h, `the four side by side: ${preview.width} × ${preview.height}`);
});
