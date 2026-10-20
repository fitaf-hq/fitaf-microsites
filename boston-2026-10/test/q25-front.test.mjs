// Q25 (SPEC-print-pieces.md § 12 item 2): the front, the call to action larger. Today's parts in today's order (§ 9: the
// 3:2 photo, the offer, the QR code with eatfitaf.com under it, the logo at the bottom right) and nothing added; the offer
// at the headline's size (the mock-ups' .headline, 34px, from its 24px), in its own field across the body's width, on at
// most two lines; the QR code 1.4 in square (168 layout px, from 112). Both named values (print/sizes.mjs). Built, on
// every flyer's front, as Chrome lays it out: the offer's type 34 layout px, its field the body's width; the code 168
// layout px; the photo, the offer, the code, in order; the logo's box in the bottom-right corner inside the safe margin.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MOCKUPS_DIR } from "../mockups/build-mockups.mjs";
import { FRONT_OFFER_MAX_LINES, FRONT_OFFER_PX, FRONT_QR_IN, LAYOUT_PX_PER_INCH, SAFE_IN } from "../print/sizes.mjs";
import { lockedBuild, NO_CHROME } from "./print-fixtures.mjs";
import { FRONT_OFFER_PX as WANT_OFFER_PX, FRONT_QR_PX, ON } from "./qb-checks.mjs";

const HALF_PX_IN = 0.5 / LAYOUT_PX_PER_INCH;
const CORNER_IN = 0.25;
const mockupsCss = await readFile(join(MOCKUPS_DIR, "mockups.css"), "utf8");
/** A size a mockups.css rule sets in its `font` shorthand, in px. */
const fontPx = (selector) => Number(new RegExp(`\\n${selector.replace(".", "\\.")} \\{[^}]*font: \\d+ (\\d+)px`).exec(mockupsCss)?.[1]);

test("Q25: the offer at the headline's size, the QR code 1.4 in, at most two lines: named values", () => {
  assert.equal(fontPx(".headline"), WANT_OFFER_PX, "the mock-ups' headline is 34px (control)");
  assert.equal(fontPx(".offer"), 24, "the mock-ups' offer is 24px (control: the front's is not the mock-up's)");
  assert.equal(FRONT_OFFER_PX, fontPx(".headline"), "the front's offer, the headline's size");
  assert.equal(FRONT_QR_IN, 1.4);
  assert.equal(Math.round(FRONT_QR_IN * LAYOUT_PX_PER_INCH), FRONT_QR_PX);
  assert.equal(FRONT_OFFER_MAX_LINES, 2);
});

test("Q25: built, every flyer's front: the offer 34 px across the body, the code 168 px, in § 9's order, the logo in the corner", { skip: NO_CHROME }, async () => {
  const dir = await mkdtemp(join(tmpdir(), "boston-q25-"));
  try {
    const built = await lockedBuild({ outDir: join(dir, "dist-print"), today: ON });
    const flyers = built.planned.filter((p) => p.piece.id === "flyer");
    assert.equal(flyers.length, 5, "the flyer and its four (control)");
    for (const p of flyers) {
      const label = p.page.base;
      const [face] = p.measured.faces;
      const { trim } = face;
      const block = (what) => face.blocks.find((b) => b.what.split(".").includes(what));
      const [offer, scan, body] = ["offer", "scan", "flyer-body"].map(block);
      const offerText = face.texts.find((t) => t.y >= offer.y - HALF_PX_IN && t.y + t.h <= offer.y + offer.h + HALF_PX_IN);
      assert.equal(offerText?.size, WANT_OFFER_PX, `${label}: the offer's type (${offerText?.size} layout px)`);
      assert.ok(offer.lines >= 1 && offer.lines <= 2, `${label}: the offer on ${offer.lines} line(s)`);
      assert.ok(Math.abs(offer.x - body.content.x) <= HALF_PX_IN && Math.abs(offer.w - body.content.w) <= HALF_PX_IN, `${label}: across the body's width`);
      const [qr] = face.qrs;
      assert.ok(Math.abs(qr.w * LAYOUT_PX_PER_INCH - FRONT_QR_PX) <= 0.5 && Math.abs(qr.h * LAYOUT_PX_PER_INCH - FRONT_QR_PX) <= 0.5, `${label}: the code ${(qr.w * LAYOUT_PX_PER_INCH).toFixed(2)} layout px`);
      const [photo] = face.photos;
      const photoBottom = Math.min(photo.y + photo.h, trim.y + trim.h);
      assert.ok(photoBottom <= offer.y + HALF_PX_IN && offer.y + offer.h <= scan.y && qr.y >= scan.y - HALF_PX_IN, `${label}: the photo, the offer, the code`);
      const [logo] = face.logos;
      const right = trim.x + trim.w - (logo.x + logo.w);
      const bottom = trim.y + trim.h - (logo.y + logo.h);
      assert.ok(right >= SAFE_IN - HALF_PX_IN && bottom >= SAFE_IN - HALF_PX_IN && right <= CORNER_IN && bottom <= CORNER_IN, `${label}: the logo in the corner, inside the safe margin (${right.toFixed(3)}, ${bottom.toFixed(3)} in)`);
      assert.ok(logo.x > qr.x + qr.w, `${label}: the logo right of the code`);
      assert.deepEqual(p.warnings, [], `${label}: no safe-margin finding`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
