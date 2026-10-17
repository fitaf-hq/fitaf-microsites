// Q10 (SPEC-print-pieces.md § 7 item 2): the square file chosen. The tent's two tiles (tent-top, tent-bottom) take the
// photo's first good square from Image Gauge, `<id>-sq-<key>.jpg` for the FIRST key the glam deliverable lists for it
// (`photos.<id>.squares[].key`); the large photo and the flyer's hero take the photo as composed, `<id>.jpg`. A photo the
// deliverable lacks, one with no square, or a key that is not a plain name is refused, naming the position and the photo.
// Fixtures only: synthetic JPEGs and IDs made at random (print-fixtures.mjs).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { photoFiles, SQUARE_POSITIONS } from "../print/assign.mjs";
import { deliverableDoc, lockedBuild, NO_CHROME, photoSet, randomId, SQUARE_KEYS } from "./print-fixtures.mjs";

const [f, l, t, b] = Array.from({ length: 4 }, randomId);
const assignment = { positions: { flyer: f, "tent-large": l, "tent-top": t, "tent-bottom": b } };
const set = await photoSet({ squareSizes: { top: [1000, 1000], bottom: [1100, 1100] } });
after(() => rm(set.dir, { recursive: true, force: true }));

test("Q10: the tiles are the squares, the large photo and the hero the photos as composed", () => {
  assert.deepEqual(SQUARE_POSITIONS, ["tent-top", "tent-bottom"]);
  assert.deepEqual(photoFiles(assignment, deliverableDoc([f, l, t, b])), {
    flyer: `${f}.jpg`,
    "tent-large": `${l}.jpg`,
    "tent-top": `${t}-sq-${SQUARE_KEYS[0]}.jpg`,
    "tent-bottom": `${b}-sq-${SQUARE_KEYS[0]}.jpg`,
  });
});

test("Q10: the square is the deliverable's FIRST key for that photo, whatever it is named", () => {
  const doc = deliverableDoc([f, l, b]);
  doc.photos[t] = { squares: [{ key: "plate-left" }, { key: "tight" }, { key: "as-composed" }] };
  assert.equal(photoFiles(assignment, doc)["tent-top"], `${t}-sq-plate-left.jpg`);
});

test("Q10: a photo the deliverable lacks, one with no square, or a key that is not a plain name is refused, naming it", () => {
  const cases = [
    [deliverableDoc([f, l, b]), new RegExp(`photo position tent-top: the deliverable has no photo ${t}`)],
    [{ ...deliverableDoc([f, l, b]), photos: { ...deliverableDoc([f, l, b]).photos, [t]: { squares: [] } } }, new RegExp(`photo position tent-top: the deliverable lists no square for ${t}`)],
    [{ ...deliverableDoc([f, l, t]), photos: { ...deliverableDoc([f, l, t]).photos, [b]: { squares: [{ key: "../x" }] } } }, new RegExp(`photo position tent-bottom: ${b}'s first square key "\\.\\./x" is not a plain name`)],
    [{}, /the deliverable has no "photos"/],
  ];
  for (const [doc, expected] of cases) assert.throws(() => photoFiles(assignment, doc), expected, String(expected));
  assert.doesNotThrow(() => photoFiles(assignment, deliverableDoc([f, l, t, b])), "control");
  // The composed photos need no entry in the deliverable: only the tiles are looked up
  assert.doesNotThrow(() => photoFiles(assignment, deliverableDoc([t, b])));
});

test("Q10: built, the tiles are printed from their square files, at the squares' own resolution", { skip: NO_CHROME }, async () => {
  const out = join(set.dir, "dist-print");
  await lockedBuild({ outDir: out, ...set.photos, today: "2026-10-20" });
  const { positions } = JSON.parse(await readFile(join(out, "assignment.json"), "utf8"));
  const { ids } = set;
  assert.deepEqual(
    Object.fromEntries(Object.entries(positions).map(([p, r]) => [p, [r.file, r.pixels]])),
    {
      flyer: [`${ids.flyer}.jpg`, [3000, 2000]],
      "tent-large": [`${ids.large}.jpg`, [3000, 2000]],
      "tent-top": [`${ids.top}-sq-${SQUARE_KEYS[0]}.jpg`, [1000, 1000]],
      "tent-bottom": [`${ids.bottom}-sq-${SQUARE_KEYS[0]}.jpg`, [1100, 1100]],
    },
  );
  assert.ok(positions["tent-top"].ppi < positions["tent-bottom"].ppi, "each tile's resolution is its own square's");
});
