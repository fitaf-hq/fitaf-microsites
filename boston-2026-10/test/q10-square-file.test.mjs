// Q10 (SPEC-print-pieces.md § 7 item 2, § 10 item 3): the square file chosen. Since § 10 every tent window is square, and
// each takes the photo's first good square from Image Gauge, `<id>-sq-<key>.jpg` for the FIRST key the glam deliverable
// lists for it (`photos.<id>.squares[].key`): the large photo (tent-large) as well as the two tiles (tent-top,
// tent-bottom). The flyer's hero takes the photo as composed, `<id>.jpg`. A photo with no square in the deliverable (not
// listed, or listed with none) takes its composed photo, covered to the square window, and the report names it and how
// much of its width and height show; a key that is not a plain name, or a deliverable with no "photos", is refused.
// Fixtures only: synthetic JPEGs and IDs made at random (print-fixtures.mjs).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { photoFiles, SQUARE_POSITIONS } from "../print/assign.mjs";
import { deliverableDoc, lockedBuild, NO_CHROME, photoSet, randomId, SQUARE_KEYS } from "./print-fixtures.mjs";

const [f, l, t, b] = Array.from({ length: 4 }, randomId);
const assignment = { positions: { flyer: f, "tent-large": l, "tent-top": t, "tent-bottom": b } };
// The large photo's square 1300 px and the top tile's 1000; the bottom tile's photo has no square (its composed 3000 × 2000)
const set = await photoSet({ squareSizes: { large: [1300, 1300], top: [1000, 1000] }, noSquare: ["bottom"] });
after(() => rm(set.dir, { recursive: true, force: true }));

test("Q10: every tent window is a square file, the large photo's too (§ 10); the hero the photo as composed", () => {
  assert.deepEqual(SQUARE_POSITIONS, ["tent-large", "tent-top", "tent-bottom"]);
  assert.deepEqual(photoFiles(assignment, deliverableDoc([f, l, t, b])), {
    flyer: `${f}.jpg`,
    "tent-large": `${l}-sq-${SQUARE_KEYS[0]}.jpg`,
    "tent-top": `${t}-sq-${SQUARE_KEYS[0]}.jpg`,
    "tent-bottom": `${b}-sq-${SQUARE_KEYS[0]}.jpg`,
  });
});

test("Q10: the square is the deliverable's FIRST key for that photo, whatever it is named", () => {
  const doc = deliverableDoc([f, l, b]);
  doc.photos[t] = { squares: [{ key: "plate-left" }, { key: "tight" }, { key: "as-composed" }] };
  assert.equal(photoFiles(assignment, doc)["tent-top"], `${t}-sq-plate-left.jpg`);
  doc.photos[l] = { squares: [{ key: "centre" }] };
  assert.equal(photoFiles(assignment, doc)["tent-large"], `${l}-sq-centre.jpg`);
});

test("Q10: a photo with no square in the deliverable (not listed, or listed with none) takes its photo as composed", () => {
  const notListed = photoFiles(assignment, deliverableDoc([f, t, b]));
  assert.equal(notListed["tent-large"], `${l}.jpg`, "the large photo, not listed");
  assert.equal(notListed["tent-top"], `${t}-sq-${SQUARE_KEYS[0]}.jpg`, "the others keep their squares (control)");
  const none = photoFiles(assignment, deliverableDoc([f, l, t, b], SQUARE_KEYS, [b]));
  assert.equal(none["tent-bottom"], `${b}.jpg`, "the bottom tile, listed with no square");
  const noField = { photos: { ...deliverableDoc([f, l, b]).photos, [t]: {} } };
  assert.equal(photoFiles(assignment, noField)["tent-top"], `${t}.jpg`, "the top tile, listed without a squares field");
  // The flyer's hero needs no entry: only the tent's windows are looked up
  assert.equal(photoFiles(assignment, deliverableDoc([l, t, b])).flyer, `${f}.jpg`);
});

test("Q10: a key that is not a plain name, squares that are not a list, or a deliverable with no photos is refused, naming it", () => {
  const all = deliverableDoc([f, l, t, b]).photos;
  const cases = [
    [{ photos: { ...all, [b]: { squares: [{ key: "../x" }] } } }, new RegExp(`photo position tent-bottom: ${b}'s first square key "\\.\\./x" is not a plain name`)],
    [{ photos: { ...all, [l]: { squares: [{}] } } }, new RegExp(`photo position tent-large: ${l}'s first square key undefined is not a plain name`)],
    [{ photos: { ...all, [t]: { squares: { key: "tight" } } } }, new RegExp(`photo position tent-top: the deliverable's squares for ${t} are not a list`)],
    [{}, /the deliverable has no "photos"/],
  ];
  for (const [doc, expected] of cases) assert.throws(() => photoFiles(assignment, doc), expected, String(expected));
  assert.doesNotThrow(() => photoFiles(assignment, deliverableDoc([f, l, t, b])), "control");
});

test("Q10: built, each window prints its square at the square's own resolution; one without a square, its photo, named in the report", { skip: NO_CHROME }, async () => {
  const out = join(set.dir, "dist-print");
  const built = await lockedBuild({ outDir: out, ...set.photos, today: "2026-10-20", fourFlyers: false });
  const { positions } = JSON.parse(await readFile(join(out, "assignment.json"), "utf8"));
  const { ids } = set;
  assert.deepEqual(
    Object.fromEntries(Object.entries(positions).map(([p, r]) => [p, [r.file, r.pixels]])),
    {
      flyer: [`${ids.flyer}.jpg`, [3000, 2000]],
      "tent-large": [`${ids.large}-sq-${SQUARE_KEYS[0]}.jpg`, [1300, 1300]],
      "tent-top": [`${ids.top}-sq-${SQUARE_KEYS[0]}.jpg`, [1000, 1000]],
      "tent-bottom": [`${ids.bottom}.jpg`, [3000, 2000]],
    },
  );
  // Each window's resolution is its own file's: its pixels over the window's larger side (a square covers it)
  for (const [slot, side] of [["tent-large", 1300], ["tent-top", 1000]]) {
    const { ppi, window_in: [w, h] } = positions[slot];
    assert.ok(Math.abs(ppi - side / Math.max(w, h)) <= 1, `${slot}: ${ppi} ppi from ${side} px over ${w} × ${h} in`);
  }
  const line = (slot) => built.lines.find((l) => l.startsWith(`photo ${slot}:`)) ?? "";
  for (const slot of ["tent-large", "tent-top"]) {
    assert.match(line(slot), /, its first square; .*; shape 1\.00 against the window's 1\.00: \d+% of its width and \d+% of its height show$/, slot);
  }
  // The bottom tile: the composed 3:2 photo covered to the square window (and its bleed): its height shows whole, two
  // thirds of its width (157.33 / 236 mock-up px: the window over the photo drawn 157.33 px tall)
  assert.match(line("tent-bottom"), /, as composed: the deliverable lists no square for it; .*; shape 1\.50 against the window's 1\.00: 67% of its width and 100% of its height show$/, line("tent-bottom"));
  assert.deepEqual(positions["tent-bottom"].shows && [Math.round(positions["tent-bottom"].shows.width * 100), Math.round(positions["tent-bottom"].shows.height * 100)], [67, 100], "assignment.json records how it shows");
});
