// SPEC-print-pieces.md § 2 and § 7: the printed pieces' sizes, as named values in one place, to redirect when the vendor's
// specification is known. Inches throughout. A piece is one or two FACES of `face` (width × height); two faces are stacked
// on one flat sheet, the upper turned 180° so that, folded on the centre line into an A-frame, both read upright. Every
// PDF page is the sheet plus BLEED_IN on every edge; text and the QR code sit at least SAFE_IN inside a face's edges.
import { PX_PER_INCH } from "../mockups/pieces.mjs";

export const BLEED_IN = 0.125;
export const SAFE_IN = 0.125;
/** A photo's effective resolution at its printed size must be at least this (§ 3). */
export const MIN_PPI = 300;
export const POINTS_PER_INCH = 72;
/** The CSS inch: Chrome prints and measures in these. The mock-ups' layout (PX_PER_INCH a real inch) is drawn scaled to it. */
export const CSS_PX_PER_INCH = 96;
export const LAYOUT_PX_PER_INCH = PX_PER_INCH;

/**
 * The two printed pieces (§ 2): `id` is the mock-up whose face is printed (mockups/pieces.mjs PIECES), `stem` the output
 * file's name before "-PROOF" and the extension, `positions` the photo positions it shows (one face's).
 */
export const PRINT_PIECES = [
  // § 9 (2026-10-17): the flyer's photo window, width to height, across the face at its top (the glam photos' own shape)
  { id: "flyer", stem: "flyer", face: { w: 4.25, h: 5.5 }, faces: 1, positions: ["flyer"], photoWindow: { w: 3, h: 2 } },
  // § 7 (2026-10-17): the mock-up's own face, portrait 4 × 6 in (§ 2's 6 × 4 landscape was wrong), on a 4 × 12 in sheet
  { id: "tent-card", stem: "tent-card", face: { w: 4, h: 6 }, faces: 2, positions: ["tent-large", "tent-top", "tent-bottom"] },
];

/** The flat sheet (the faces stacked) and the PDF page (the sheet plus the bleed), in inches. */
export const sheetOf = (piece) => ({ w: piece.face.w, h: piece.face.h * piece.faces });
export const pageOf = (piece) => {
  const sheet = sheetOf(piece);
  return { w: sheet.w + 2 * BLEED_IN, h: sheet.h + 2 * BLEED_IN };
};
/** The PDF page in points, as its media box carries it. */
export const pagePoints = (piece) => {
  const page = pageOf(piece);
  return { w: page.w * POINTS_PER_INCH, h: page.h * POINTS_PER_INCH };
};
