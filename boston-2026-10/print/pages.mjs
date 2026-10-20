// The printed pieces' pages (SPEC-print-pieces.md §§ 1, 7–10, 12): each mock-up's FACE, with § 8's words and §§ 9–10's
// layout, made by the mock-ups' own pieces and parts (mockups/pieces.mjs flyerFace and tentFace, mockups/parts.mjs) from
// the mock-ups' own inputs, on a page of the sheet plus the bleed. Nothing on a page is typed here: the words, prices,
// plans, colours, photos and the QR code are the mock-ups'. § 12: the flyer has two sides, each a sheet and a page of the
// PDF: the front (printPage) and the back (backPage), whose words are data/flyer-back.md's (print/back.mjs) and the same
// for every flyer; printDocument is the two together, the document a flyer's PDF is printed from.
// No legend, no caption and no script: the legend is a screen-share device and is not printed (Q8). The style is the
// mock-ups' (the template's tokens and fonts, then mockups.css), then print.css, then the sizes (sizes.mjs) as rules.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { campaign, esc, makeParts } from "../mockups/parts.mjs";
import { flyerFace, PIECES, tentFace } from "../mockups/pieces.mjs";
import {
  BACK_GAP_PX,
  BACK_LINE_HEIGHT,
  BACK_TEXT_PX,
  BLEED_IN,
  CSS_PX_PER_INCH,
  FRONT_OFFER_PX,
  FRONT_QR_IN,
  LAYOUT_PX_PER_INCH,
  pageOf,
  PRINT_PIECES,
  SAFE_IN,
} from "./sizes.mjs";

/** § 8 item 4: the flyer is also made this many times, flyer-1 to flyer-4, each with a photo of a rung-4 array. */
export const FOUR_FLYERS = 4;
/** § 9 (the Advisor, 2026-10-17): the flyer's face: § 8's words, no header, one logo at the bottom right. */
export const FLYER_FACE = { short: true, header: false, logo: "corner" };
/**
 * § 10 (the Advisor, 2026-10-18): the tent card's face, both of them: § 8's words, no bar, one logo at the bottom right
 * ("like the flyer"). § 8's three logo variants are withdrawn for the tent as § 9 withdrew them for the flyer: one tent card.
 */
export const TENT_FACE = { short: true, header: false, logo: "corner" };
/** § 12 (the Advisor, 2026-10-20): the flyer's back, its second side (flyerFace's option, which the mock-ups never pass). */
export const FLYER_BACK = { side: "back" };
/** Each piece's face function and its printed options. */
const FACES = { flyer: [flyerFace, FLYER_FACE], "tent-card": [tentFace, TENT_FACE] };
/** What the back's print-only photo positions cite: the list that names them (not mockups/photos.json, the mock-ups'). */
const BACK_PHOTO_SOURCE = "print/assign.mjs#BACK_POSITIONS";
const flyerPiece = () => PRINT_PIECES.find((p) => p.id === "flyer");

/**
 * Every page the build prints, in order: the tent card, then the flyer, then flyer-1 to flyer-4 (unless `fourFlyers` is
 * false). `base` is the file name before "-PROOF" and the extension (tent-card, flyer, flyer-3).
 */
export function pagesToPrint({ fourFlyers = true } = {}) {
  const [tent, flyer] = ["tent-card", "flyer"].map((id) => PRINT_PIECES.find((p) => p.id === id));
  const four = fourFlyers ? Array.from({ length: FOUR_FLYERS }, (_, i) => ({ piece: flyer, number: i + 1, base: `flyer-${i + 1}` })) : [];
  return [{ piece: tent, number: null, base: "tent-card" }, { piece: flyer, number: null, base: "flyer" }, ...four];
}

/** Inches to the mock-ups' layout pixels, which the page is zoomed from (to the CSS inch). */
const px = (inches) => Number((inches * LAYOUT_PX_PER_INCH).toFixed(3));

/**
 * The sizes (sizes.mjs) as CSS: the PDF page; the sheet, the page's printed size, which clips; inside it the page box, laid
 * out in the mock-ups' own pixels (so every part is laid out exactly as on the mock-up's sheet, its text at the same
 * size) and DRAWN scaled to the CSS inch (a transform, not a zoom: a zoom lays the text out at 0.8× and its widths drift,
 * test Q9); each face's box and its trim (the .board). One face fills the page, its trim BLEED_IN in from every edge. Two
 * faces are stacked, each the trim plus the bleed on its three outer edges (none at the fold), and the first, the upper,
 * is turned 180° (print.css), so the sheet's centre line is the fold.
 */
export function sizeRules(piece) {
  const page = pageOf(piece);
  const one = piece.faces === 1;
  const box = one ? page : { w: page.w, h: piece.face.h + BLEED_IN };
  return [
    `@page { size: ${page.w}in ${page.h}in; margin: 0; }`,
    `.print-sheet { width: ${page.w}in; height: ${page.h}in; }`,
    `.print-page { --bleed: ${px(BLEED_IN)}px; --safe: ${px(SAFE_IN)}px; width: ${px(page.w)}px; height: ${px(page.h)}px; transform: scale(${CSS_PX_PER_INCH / LAYOUT_PX_PER_INCH}); }`,
    `.print-face { width: ${px(box.w)}px; height: ${px(box.h)}px; }`,
    `.print-face + .print-face { top: ${px(box.h)}px; }`,
    `.print-face > .board { left: ${px(BLEED_IN)}px; top: ${px(one ? BLEED_IN : 0)}px; width: ${px(piece.face.w)}px; height: ${px(piece.face.h)}px; }`,
    // §§ 9–10: the face's width and its photo windows' shape, for print.css (the flyer's photo, 3:2 across the face; the
    // tent's three, square)
    `.print-face > .board { --face-w: ${px(piece.face.w)}px;${piece.photoWindow ? ` --photo-ratio: ${piece.photoWindow.w / piece.photoWindow.h};` : ""} }`,
    // § 12: the flyer's front, its offer at the headline's size and its QR code 1.4 in (print.css reads them for the flyer
    // alone); and, for a piece with a back, the back's paragraphs' type, their lines and the gap between the words' blocks
    `.print-face > .board { --offer-size: ${FRONT_OFFER_PX}px; --qr-side: ${px(FRONT_QR_IN)}px; }`,
    ...(piece.back ? [`.print-face > .board { --back-text: ${BACK_TEXT_PX}px; --back-line: ${BACK_LINE_HEIGHT}; --back-gap: ${BACK_GAP_PX}px; }`] : []),
  ].join("\n");
}

/**
 * § 12 item 6: the inputs with the back's three photo positions (print/assign.mjs BACK_POSITIONS), each its own file name
 * in the photos folder (`flyer-back-1.jpg` …), as the manifest's are: the photo when it is there, else the mock-ups'
 * labelled placeholder.
 */
export function withBackPhotos(inputs) {
  const back = Object.fromEntries(
    flyerPiece().back.positions.map((position) => {
      const file = `${position}.jpg`;
      return [position, { file, present: existsSync(join(inputs.photosDir, file)), source: BACK_PHOTO_SOURCE }];
    }),
  );
  return { ...inputs, photos: { ...inputs.photos, ...back } };
}

/**
 * One side of a piece as a sheet: its front face, as §§ 9–10 have it (the tent's twice, the upper turned); or, given the
 * back's words (§ 12), the flyer's back. The sheet is the PDF page's printed size.
 */
function sheetOf(piece, inputs, words) {
  const [faceOf, options] = FACES[piece.id];
  const back = words ? { ...FLYER_BACK, back: { positions: piece.back.positions, words } } : {};
  const face = faceOf(campaign(inputs), makeParts(inputs), { ...options, ...back }).trim();
  const turns = piece.faces === 1 ? [""] : [" print-face-turned", ""];
  const board = words ? `board board-${piece.id} board-${piece.id}-back` : `board board-${piece.id}`;
  const faces = turns.map((turn) => `<div class="print-face${turn}"><div class="${board}">\n${face}\n</div></div>`);
  return `<div class="print-sheet${words ? " print-sheet-back" : ""}"><div class="print-page">\n${faces.join("\n")}\n</div></div>`;
}

/**
 * A piece's print page: the tent card's face as § 10 has it (twice, the upper turned), or the flyer's face as § 9 has it;
 * and nothing else. Since § 12 that is the flyer's front: its back is backPage, and the two together printDocument.
 */
export function printPage(piece, inputs, printCss) {
  return pageHtml(piece, inputs, printCss, [sheetOf(piece, inputs)]);
}

/** § 12 item 3: the flyer's back alone, as a page (`back`: data/flyer-back.md read, print/back.mjs readBack). */
export function backPage(inputs, back, printCss) {
  const flyer = flyerPiece();
  return pageHtml(flyer, inputs, printCss, [sheetOf(flyer, withBackPhotos(inputs), back)]);
}

/**
 * § 12 item 1: the document a piece's PDF is printed from, a page per side: the tent card's one; the flyer's front then
 * its back (the back upright, for a flip on the long edge), the same back for every flyer.
 */
export function printDocument(piece, inputs, printCss, back) {
  const sheets = [sheetOf(piece, inputs)];
  if (piece.sides === 2) sheets.push(sheetOf(piece, withBackPhotos(inputs), back));
  return pageHtml(piece, inputs, printCss, sheets);
}

/** The page around a piece's sheets: the mock-ups' style, print.css and the sizes; no legend, caption or script. */
function pageHtml(piece, inputs, printCss, sheets) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(PIECES.find((p) => p.id === piece.id).title)}</title>
<style>
${inputs.site.root}
${inputs.site.fonts}
${inputs.css.trim()}
${printCss.trim()}
${sizeRules(piece)}
</style>
</head>
<body class="print print-${piece.id}">
${sheets.join("\n")}
</body>
</html>
`;
}

/**
 * § 4: the offer is a placeholder while data/offers.json says its offers are (`status`), or while the chosen offer's
 * label is a bracketed stand-in ("[The offer]"). Either keeps a piece a proof.
 */
export function offerIsPlaceholder(inputs) {
  const { offer } = campaign(inputs);
  return inputs.data.offers.status === "placeholder" || /^\[.*\]$/.test(offer.value.trim());
}

/** What still stands in on a piece: each photo position without a photo, and the offer while it is a placeholder. */
export function placeholdersOf(piece, inputs) {
  const photos = piece.positions.filter((position) => !inputs.photos[position]?.present).map((position) => `photo ${position}`);
  return offerIsPlaceholder(inputs) ? [...photos, `the offer "${campaign(inputs).offer.value}"`] : photos;
}

/**
 * § 12 item 4 and § 4's rule: what still stands in on the flyer's back: each of its photo positions without a photo, and
 * its words until data/flyer-back.md is marked approved. Either keeps every flyer, and the back's proof, a proof.
 */
export function backPlaceholders(inputs, back) {
  const { photos } = withBackPhotos(inputs);
  const missing = flyerPiece().back.positions.filter((position) => !photos[position].present).map((position) => `photo ${position}`);
  return back.approved ? missing : [...missing, `the back's words, ${back.source} not marked approved`];
}
