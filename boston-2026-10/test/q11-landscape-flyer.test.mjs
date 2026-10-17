// Q11 (SPEC-print-pieces.md § 7 item 3): the landscape rule. The flyer takes the first photo of rung 1 whose pixel width
// EXCEEDS its height (the flyer's window is landscape; a square is not), each photo read upright as composed (`<id>.jpg`),
// and the report names any skipped; none landscape is refused. The tent's array rule is unchanged: the first array of
// rung 3 without the flyer's photo (the chosen one, not a skipped one). Fixtures only (print-fixtures.mjs).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { assignPhotos, skippedLines } from "../print/assign.mjs";
import { lockedBuild, NO_CHROME, photoSet, randomId, rungsDoc } from "./print-fixtures.mjs";

const [p, s, l, l2, x, y, z, w] = Array.from({ length: 8 }, randomId);
const SIZES = { [p]: [2000, 3000], [s]: [2400, 2400], [l]: [3000, 2000], [l2]: [4000, 2000] };
const sizeOf = (id) => {
  if (!SIZES[id]) throw new Error(`${id}.jpg is not in --photos-dir`);
  return { width: SIZES[id][0], height: SIZES[id][1] };
};
const set = await photoSet({ rung1: ["portrait", "flyer", "other"] });
after(() => rm(set.dir, { recursive: true, force: true }));

test("Q11: the flyer is rung 1's first landscape photo; a portrait and a square before it are skipped and named", () => {
  const doc = rungsDoc({ strongest: [p], alsoGood: [s, l, l2], arrays: { 3: [[l, x, y], [p, z, w]] } });
  const got = assignPhotos(doc, { sizeOf });
  assert.equal(got.positions.flyer, l);
  assert.equal(got.from.flyer, "rung 1, photo 3");
  assert.deepEqual(got.skipped, [
    { id: p, from: "rung 1, photo 1", width: 2000, height: 3000 },
    { id: s, from: "rung 1, photo 2", width: 2400, height: 2400 },
  ]);
  assert.deepEqual(skippedLines(got), [
    "flyer: skipped rung 1, photo 1 (2000 × 3000 px, not landscape)",
    "flyer: skipped rung 1, photo 2 (2400 × 2400 px, not landscape)",
  ]);
  // The tent's rule, unchanged: the first array without the flyer's photo (l), which may hold a skipped one (p)
  assert.deepEqual([got.positions["tent-large"], got.positions["tent-top"], got.positions["tent-bottom"]], [p, z, w]);
});

test("Q11: a landscape first photo is taken, and nothing is skipped", () => {
  const got = assignPhotos(rungsDoc({ alsoGood: [l2, p], arrays: { 3: [[x, y, z]] } }), { sizeOf });
  assert.equal(got.positions.flyer, l2);
  assert.deepEqual([got.skipped, skippedLines(got)], [[], []]);
});

test("Q11: no landscape photo in rung 1 is refused; a photo whose size cannot be read is refused, naming it", () => {
  assert.throws(() => assignPhotos(rungsDoc({ alsoGood: [p, s], arrays: { 3: [[x, y, z]] } }), { sizeOf }), /pool "glam", rung 1: no photo is landscape \(width above height\): 2 skipped/);
  assert.throws(() => assignPhotos(rungsDoc({ alsoGood: [x], arrays: { 3: [[l, y, z]] } }), { sizeOf }), new RegExp(`pool "glam", rung 1, photo 1: ${x}\\.jpg is not in --photos-dir`));
  assert.throws(() => assignPhotos(rungsDoc({ alsoGood: [l], arrays: { 3: [[x, y, z]] } })), /needs each photo's size/, "the rule cannot run without sizes");
});

test("Q11: built, the report names the skipped photo and assignment.json records it", { skip: NO_CHROME }, async () => {
  const out = join(set.dir, "dist-print");
  const built = await lockedBuild({ outDir: out, ...set.photos, today: "2026-10-20" });
  assert.ok(built.lines.includes("flyer: skipped rung 1, photo 1 (2000 × 3000 px, not landscape)"), built.lines.join("\n"));
  const record = JSON.parse(await readFile(join(out, "assignment.json"), "utf8"));
  assert.equal(record.positions.flyer.id, set.ids.flyer);
  assert.equal(record.positions.flyer.from, "rung 1, photo 2");
  assert.deepEqual(record.flyer_skipped, [{ id: set.ids.portrait, from: "rung 1, photo 1", width: 2000, height: 3000 }]);
});
