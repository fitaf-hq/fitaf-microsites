// Q22 (SPEC-print-pieces.md § 12 items 3 and 6, § 15 item 8): the back's three photos. By rule (pool glam): the first
// array of rung 3 holding none of the photos the build places elsewhere (the flyer's, the four flyers', the tent's
// three), its three in order, left to right; an array holding any of them skipped; none left refused, naming the rung
// (qb-checks.mjs backRuleProblems, which the mutant "the rule allows a photo used elsewhere" runs on a mirror). Since
// § 15 item 8 (2026-10-21) each window is the glam photos' own 3:2 and prints the photo as composed, no longer a square
// (the case held 1:1 windows and `-sq-` files until then, amended on purpose): built with fixture photos, the three
// windows (each photo's box inside the trim) are 3:2 within half a layout px, three equal windows and two gaps across the
// face's width at its top, running into the bleed on the top and on the outer edge of the outer two; each prints the
// photo as composed, though the deliverable lists squares for two of them; assignment.json records flyer-back-1 to
// flyer-back-3 as the other positions, at 300 ppi or more.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { BACK_POSITIONS, photoFiles, SQUARE_POSITIONS } from "../print/assign.mjs";
import { LAYOUT_PX_PER_INCH, MIN_PPI, PRINT_PIECES } from "../print/sizes.mjs";
import { deliverableDoc, lockedBuild, NO_CHROME, photoSet, randomId } from "./print-fixtures.mjs";
import { backRuleProblems, ON } from "./qb-checks.mjs";

const HALF_PX_IN = 0.5 / LAYOUT_PX_PER_INCH;
const near = (a, b) => Math.abs(a - b) <= HALF_PX_IN;
/** The mock-ups' own gap between photo windows (mockups.css .tent-photos), in inches. */
const GAP_IN = 4 / LAYOUT_PX_PER_INCH;
/** § 15 item 8: each back window's shape, width to height (the glam photos' own). */
const WINDOW = { w: 3, h: 2 };
const set = await photoSet({ noSquare: ["back3"] });
after(() => rm(set.dir, { recursive: true, force: true }));

test("Q22: the back's three positions, 3:2 windows, each the photo as composed", () => {
  assert.deepEqual(BACK_POSITIONS, ["flyer-back-1", "flyer-back-2", "flyer-back-3"]);
  const flyer = PRINT_PIECES.find((p) => p.id === "flyer");
  assert.deepEqual(flyer.back, { positions: BACK_POSITIONS, photoWindow: WINDOW });
  assert.ok(BACK_POSITIONS.every((p) => !SQUARE_POSITIONS.includes(p)), "no back position prints from a square");
  const ids = BACK_POSITIONS.map(() => randomId());
  const files = photoFiles({ positions: Object.fromEntries(BACK_POSITIONS.map((p, i) => [p, ids[i]])) }, deliverableDoc(ids));
  assert.deepEqual(files, Object.fromEntries(BACK_POSITIONS.map((p, i) => [p, `${ids[i]}.jpg`])), "each the photo as composed, though the deliverable lists its squares");
});

test("Q22: the rule: the first rung-3 array holding no photo placed elsewhere, in order; none left refused", async () => {
  assert.deepEqual(await backRuleProblems(ROOT), []);
});

test("Q22: built, three 3:2 windows across the top, into the bleed; each the photo as composed", { skip: NO_CHROME }, async () => {
  const out = join(set.dir, "dist-print");
  const built = await lockedBuild({ outDir: out, ...set.photos, today: ON });
  const [p] = built.planned.filter((q) => q.page.base === "flyer");
  const { page, faces: [face] } = p.back.measured;
  const { trim } = face;
  const box = Object.fromEntries(face.photos.map((ph) => [ph.slot, ph]));
  assert.deepEqual(Object.keys(box), BACK_POSITIONS, "the three photos, left to right");
  const win = (r) => {
    const x = Math.max(r.x, trim.x);
    const y = Math.max(r.y, trim.y);
    const right = Math.min(r.x + r.w, trim.x + trim.w);
    const bottom = Math.min(r.y + r.h, trim.y + trim.h);
    return { x, y, w: right - x, h: bottom - y, r: right, b: bottom };
  };
  const [a, b, c] = BACK_POSITIONS.map((slot) => win(box[slot]));
  for (const [slot, w] of [[BACK_POSITIONS[0], a], [BACK_POSITIONS[1], b], [BACK_POSITIONS[2], c]]) {
    assert.ok(near(w.h, (w.w * WINDOW.h) / WINDOW.w), `${slot} is 3:2 (${(w.w * LAYOUT_PX_PER_INCH).toFixed(3)} × ${(w.h * LAYOUT_PX_PER_INCH).toFixed(3)} layout px)`);
    assert.ok(near(w.y, trim.y), `${slot}: at the top of the face`);
  }
  assert.ok(near(a.w, b.w) && near(b.w, c.w) && near(a.h, b.h) && near(b.h, c.h), "three equal windows");
  assert.ok(near(b.x - a.r, GAP_IN) && near(c.x - b.r, GAP_IN), "two 4px gaps");
  assert.ok(near(a.x, trim.x) && near(c.r, trim.x + trim.w), "across the face's width");
  for (const slot of BACK_POSITIONS) assert.ok(box[slot].y <= page.y + HALF_PX_IN, `${slot} runs into the bleed on the top`);
  assert.ok(box[BACK_POSITIONS[0]].x <= page.x + HALF_PX_IN, "the first runs into the bleed on the left");
  assert.ok(box[BACK_POSITIONS[2]].x + box[BACK_POSITIONS[2]].w >= page.x + page.w - HALF_PX_IN, "the third on the right");
  assert.ok(near(box[BACK_POSITIONS[1]].x, b.x) && near(box[BACK_POSITIONS[1]].w, b.w), "the middle one meets no side edge");

  const { positions } = JSON.parse(await readFile(join(out, "assignment.json"), "utf8"));
  const { ids } = set;
  // back1 and back2 have squares in the deliverable, back3 none: all three print as composed
  const want = {
    "flyer-back-1": [ids.back1, `${ids.back1}.jpg`, [3000, 2000]],
    "flyer-back-2": [ids.back2, `${ids.back2}.jpg`, [3000, 2000]],
    "flyer-back-3": [ids.back3, `${ids.back3}.jpg`, [3000, 2000]],
  };
  for (const [slot, [id, file, pixels]] of Object.entries(want)) {
    const r = positions[slot];
    assert.deepEqual([r?.id, r?.file, r?.pixels], [id, file, pixels], slot);
    assert.match(r.from, /^rung 3, array 4 \(the first holding no photo placed elsewhere\), photo [123]$/, slot);
    assert.ok(r.ppi >= MIN_PPI, `${slot}: ${r.ppi} ppi`);
  }
  const placed = [ids.flyer, ids.large, ids.top, ids.bottom, ids.one, ids.two, ids.three, ids.four];
  assert.ok(Object.values(want).every(([id]) => !placed.includes(id)), "no photo placed elsewhere");
  const line = (slot) => built.lines.find((l) => l.startsWith(`photo ${slot}:`)) ?? "";
  for (const slot of BACK_POSITIONS) assert.match(line(slot), /, as composed; .*; shape 1\.50 against the window's 1\.50: \d+% of its width and \d+% of its height show$/, line(slot));
});
