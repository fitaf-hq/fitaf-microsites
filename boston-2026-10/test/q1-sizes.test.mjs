// Q1 (SPEC-print-pieces.md § 2, § 5): the sizes. Each PDF is one page whose media box is the trim plus twice the bleed,
// in points (the flyer 324 × 414, the tent card 450 × 594). The build's measuring pass finds each face's trim at its size
// and holds the rest of § 2 (text and the QR code at least 0.125 in inside the trim; a photo or colour field that meets
// the trim runs into the bleed), and the checks it applies refuse a page that breaks them (controls, no Chrome).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { layoutRefusals } from "../print/checks.mjs";
import { pageOf, pagePoints, PRINT_PIECES } from "../print/sizes.mjs";
import { lockedBuild, NO_CHROME, pdfPages } from "./print-fixtures.mjs";

const piece = (id) => PRINT_PIECES.find((p) => p.id === id);
const tmp = await mkdtemp(join(tmpdir(), "boston-q1-"));
after(() => rm(tmp, { recursive: true, force: true }));

test("Q1: § 2's sizes, in points: the flyer 324 × 414, the tent card 450 × 594", () => {
  assert.deepEqual(pagePoints(piece("flyer")), { w: 324, h: 414 });
  assert.deepEqual(pagePoints(piece("tent-card")), { w: 450, h: 594 });
  assert.deepEqual(piece("flyer").face, { w: 4.25, h: 5.5 });
  assert.deepEqual([piece("tent-card").face, piece("tent-card").faces], [{ w: 6, h: 4 }, 2], "two 6 × 4 in faces on a 6 × 8 in sheet");
});

test("Q1: each PDF is one page, its media box the trim plus twice the bleed; each face's trim measured at its size", { skip: NO_CHROME }, async () => {
  const out = join(tmp, "dist-print");
  const built = await lockedBuild({ outDir: out, today: "2026-10-20" });
  for (const p of built.planned) {
    const { pages, boxes } = pdfPages(await readFile(join(out, `${p.stem}.pdf`)));
    const { w, h } = pagePoints(p.piece);
    assert.equal(pages, 1, `${p.stem}.pdf has one page`);
    assert.ok(boxes.length >= 1, `${p.stem}.pdf has a media box`);
    for (const box of boxes) assert.deepEqual(box, [0, 0, w, h], `${p.stem}.pdf: ${box}`);
    // The measured page and trims (the build refuses otherwise; asserted here so a silent pass is visible)
    const page = pageOf(p.piece);
    assert.ok(Math.abs(p.measured.page.w - page.w) < 0.01 && Math.abs(p.measured.page.h - page.h) < 0.01, `${p.piece.id}: the page`);
    assert.equal(p.measured.faces.length, p.piece.faces);
    for (const face of p.measured.faces) {
      assert.ok(Math.abs(face.trim.w - p.piece.face.w) < 0.01 && Math.abs(face.trim.h - p.piece.face.h) < 0.01, `${p.piece.id}: a face's trim`);
    }
    assert.deepEqual(layoutRefusals(p.piece, p.measured), [], `${p.piece.id}: § 2 holds`);
    assert.ok(p.measured.faces.every((f) => f.texts.length >= 5 && f.qrs.length === 1), `${p.piece.id}: the pass measured its text and its QR code (control)`);
  }
});

// Controls for the checks the build applies, over a made-up measurement of the flyer (inches from the page's corner).
const flyer = piece("flyer");
const page = { x: 0, y: 0, w: 4.5, h: 5.75 };
const trim = { x: 0.125, y: 0.125, w: 4.25, h: 5.5 };
const good = () => ({
  page,
  faces: [
    {
      trim,
      photos: [{ slot: "flyer", x: 0, y: 0.4, w: 4.5, h: 1.9 }],
      texts: [{ text: "Find your plan.", x: 0.4, y: 2.6, w: 2, h: 0.3 }],
      qrs: [{ x: 0.4, y: 4.6, w: 0.9, h: 0.9 }],
      fields: [
        { what: "the bar", x: 0, y: 0, w: 4.5, h: 0.48 },
        { what: "the photo flyer", x: 0, y: 0.48, w: 4.5, h: 1.9 },
        { what: "the offer", x: 0.32, y: 3.2, w: 3.9, h: 0.4 },
      ],
    },
  ],
});

test("Q1 control: the checks pass a page that holds § 2", () => {
  assert.deepEqual(layoutRefusals(flyer, good()), []);
});

test("Q1 control: text or the QR code less than 0.125 in inside the trim is refused, naming it and the side", () => {
  const m = good();
  m.faces[0].texts[0].x = 0.2; // 0.075 in inside the trim's left edge
  m.faces[0].qrs[0].y = 4.8; // its bottom 0.075 in inside the trim's bottom edge (5.625)
  const refusals = layoutRefusals(flyer, m);
  assert.equal(refusals.length, 2, refusals.join("\n"));
  assert.match(refusals[0], /"Find your plan\." is less than 0\.125 in inside the trim \(left\)/);
  assert.match(refusals[1], /the QR code is less than 0\.125 in inside the trim \(bottom\)/);
});

test("Q1 control: a field that meets the trim and stops there, or short of the page's edge, is refused", () => {
  const m = good();
  m.faces[0].fields[0] = { what: "the bar", x: 0.125, y: 0.125, w: 4.25, h: 0.35 }; // stops at the trim on three sides
  m.faces[0].fields[1] = { what: "the photo flyer", x: 0.06, y: 0.48, w: 4.38, h: 1.9 }; // half way into the bleed
  const refusals = layoutRefusals(flyer, m);
  assert.deepEqual(
    refusals.map((r) => r.replace(/^the face: /, "")),
    [
      "the bar meets the trim's left edge and does not run into the bleed",
      "the bar meets the trim's right edge and does not run into the bleed",
      "the bar meets the trim's top edge and does not run into the bleed",
      "the photo flyer meets the trim's left edge and does not run into the bleed",
      "the photo flyer meets the trim's right edge and does not run into the bleed",
    ],
  );
});

test("Q1 control: a page or a trim of another size is refused", () => {
  const m = good();
  m.page = { ...page, w: 4.25 };
  m.faces[0].trim = { ...trim, h: 5 };
  const refusals = layoutRefusals(flyer, m);
  assert.ok(refusals.some((r) => /the page is 4\.25 × 5\.75 in, not 4\.50 × 5\.75/.test(r)), refusals.join("\n"));
  assert.ok(refusals.some((r) => /its trim is 4\.25 × 5\.00 in, not 4\.25 × 5\.5/.test(r)), refusals.join("\n"));
});
