// The printed pieces' pages (SPEC-print-pieces.md §§ 1, 7–10): each mock-up's FACE, with § 8's words and §§ 9–10's layout,
// made by the mock-ups' own pieces and parts (mockups/pieces.mjs flyerFace and tentFace, mockups/parts.mjs) from the
// mock-ups' own inputs, on a page of the sheet plus the bleed. Nothing on a page is typed here: the words, prices, plans,
// colours, photos and the QR code are the mock-ups'.
// No legend, no caption and no script: the legend is a screen-share device and is not printed (Q8). The style is the
// mock-ups' (the template's tokens and fonts, then mockups.css), then print.css, then the sizes (sizes.mjs) as rules.
import { campaign, esc, makeParts } from "../mockups/parts.mjs";
import { flyerFace, PIECES, tentFace } from "../mockups/pieces.mjs";
import { BLEED_IN, CSS_PX_PER_INCH, LAYOUT_PX_PER_INCH, pageOf, PRINT_PIECES, SAFE_IN } from "./sizes.mjs";

/** § 8 item 4: the flyer is also made this many times, flyer-1 to flyer-4, each with a photo of a rung-4 array. */
export const FOUR_FLYERS = 4;
/** § 9 (the Advisor, 2026-10-17): the flyer's face: § 8's words, no header, one logo at the bottom right. */
export const FLYER_FACE = { short: true, header: false, logo: "corner" };
/**
 * § 10 (the Advisor, 2026-10-18): the tent card's face, both of them: § 8's words, no bar, one logo at the bottom right
 * ("like the flyer"). § 8's three logo variants are withdrawn for the tent as § 9 withdrew them for the flyer: one tent card.
 */
export const TENT_FACE = { short: true, header: false, logo: "corner" };
/** Each piece's face function and its printed options. */
const FACES = { flyer: [flyerFace, FLYER_FACE], "tent-card": [tentFace, TENT_FACE] };

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
  ].join("\n");
}

/**
 * A piece's print page: the tent card's face as § 10 has it (twice, the upper turned), or the flyer's face as § 9 has it;
 * and nothing else.
 */
export function printPage(piece, inputs, printCss) {
  const [faceOf, options] = FACES[piece.id];
  const face = faceOf(campaign(inputs), makeParts(inputs), options).trim();
  const turns = piece.faces === 1 ? [""] : [" print-face-turned", ""];
  const faces = turns.map((turn) => `<div class="print-face${turn}"><div class="board board-${piece.id}">\n${face}\n</div></div>`);
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
<div class="print-sheet"><div class="print-page">
${faces.join("\n")}
</div></div>
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
