// Q3 (SPEC-print-pieces.md § 3, § 5): the assignment, by rule, over fixture rungs in the shape Image Gauge publishes for
// the glam set (pool `glam`). The flyer takes rung 1's first photo; the tent card's tent-large, tent-top and tent-bottom
// take, in its order, the first array of rung 3 that does not contain the flyer's photo (an array containing it is
// skipped), so no photo is on both pieces; a missing pool, rung or array is refused, naming it. No photograph: IDs only.
import test from "node:test";
import assert from "node:assert/strict";
import { assignPhotos, POOL } from "../print/assign.mjs";
import { randomId, rungsDoc } from "./print-fixtures.mjs";

const [a, b, c, d, e, f, g] = Array.from({ length: 7 }, randomId);

test("Q3: the pool is glam", () => assert.equal(POOL, "glam"));

test("Q3: the flyer is rung 1's first; the tent is rung 3's first array, in its order", () => {
  const doc = rungsDoc({ strongest: [], alsoGood: [a, b], arrays: { 2: [[a, b]], 3: [[c, d, e], [a, f, g]] } });
  const got = assignPhotos(doc);
  assert.deepEqual(got.positions, { flyer: a, "tent-large": c, "tent-top": d, "tent-bottom": e });
  assert.equal(got.pool, "glam");
  assert.equal(got.from.flyer, "rung 1, photo 1");
  assert.match(got.from["tent-top"], /^rung 3, array 1\b.*photo 2$/);
});

test("Q3: rung 1's first is its strongest when it names one (Image Gauge's order: strongest, then also good)", () => {
  const doc = rungsDoc({ strongest: [b], alsoGood: [a], arrays: { 3: [[c, d, e]] } });
  assert.equal(assignPhotos(doc).positions.flyer, b);
});

test("Q3: an array containing the flyer's photo is skipped, wherever in it the photo is", () => {
  for (const first of [[a, c, d], [c, a, d], [c, d, a]]) {
    const doc = rungsDoc({ alsoGood: [a, b], arrays: { 3: [first, [e, f, g]] } });
    const got = assignPhotos(doc);
    assert.deepEqual([got.positions["tent-large"], got.positions["tent-top"], got.positions["tent-bottom"]], [e, f, g], first.join(","));
    assert.match(got.from["tent-large"], /^rung 3, array 2\b/);
    const all = Object.values(got.positions);
    assert.equal(new Set(all).size, all.length, "no photo on both pieces");
  }
});

test("Q3: a missing pool, rung or array is refused, naming it", () => {
  const ok = rungsDoc({ alsoGood: [a], arrays: { 3: [[b, c, d]] } });
  assert.doesNotThrow(() => assignPhotos(ok), "control: the fixture is accepted");
  const cases = [
    [{ ...ok, pools: {} }, /no pool "glam"/],
    [rungsDoc({ alsoGood: [a], arrays: { 3: [[b, c, d]] } }, "glam_with_overhead_in_thin_groups"), /no pool "glam"/],
    [(() => { const x = structuredClone(ok); delete x.pools.glam.rungs["1"]; return x; })(), /pool "glam" has no rung 1/],
    [rungsDoc({ strongest: [], alsoGood: [], arrays: { 3: [[b, c, d]] } }), /pool "glam", rung 1 names no photo/],
    [rungsDoc({ alsoGood: [a], arrays: { 2: [[b, c]] } }), /pool "glam" has no rung 3/],
    [rungsDoc({ alsoGood: [a], arrays: { 3: [] } }), /pool "glam", rung 3 has no array/],
    [rungsDoc({ alsoGood: [a], arrays: { 3: [[a, b, c], [d, a, e]] } }), /rung 3: every array contains the flyer's photo/],
    [rungsDoc({ alsoGood: [a], arrays: { 3: [[b, c, d], [e, f]] } }), /rung 3, array 2: not 3 photo IDs/],
    [rungsDoc({ alsoGood: ["../x"], arrays: { 3: [[b, c, d]] } }), /rung 1, photo 1: "\.\.\/x" is not a photo ID/],
    [rungsDoc({ alsoGood: [a], arrays: { 3: [[b, "c/d", e]] } }), /rung 3, array 1, photo 2: "c\/d" is not a photo ID/],
  ];
  for (const [doc, expected] of cases) assert.throws(() => assignPhotos(doc), expected, String(expected));
});
