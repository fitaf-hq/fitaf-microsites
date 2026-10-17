// The printed pieces' pages (SPEC-print-pieces.md §§ 1, 7, 8): each mock-up's FACE, with § 8's words and a logo variant,
// made by the mock-ups' own pieces and parts (mockups/pieces.mjs flyerFace and tentFace, mockups/parts.mjs) from the
// mock-ups' own inputs, on a page of the sheet plus the bleed. Nothing on a page is typed here: the words, prices, plans,
// colours, photos and the QR code are the mock-ups'.
// No legend, no caption and no script: the legend is a screen-share device and is not printed (Q8). The style is the
// mock-ups' (the template's tokens and fonts, then mockups.css), then print.css, then the sizes (sizes.mjs) as rules.
import { campaign, esc, makeParts } from "../mockups/parts.mjs";
import { flyerFace, PIECES, tentFace } from "../mockups/pieces.mjs";
import { BLEED_IN, CSS_PX_PER_INCH, LAYOUT_PX_PER_INCH, pageOf, PRINT_PIECES, SAFE_IN } from "./sizes.mjs";

const FACES = { flyer: flyerFace, "tent-card": tentFace };

/**
 * § 8 item 3: the logo's placements, each a proof named by its letter: (a) in the navy bar at its left, (b) on a plate over
 * the main photo's corner, (c) larger, above the tent's headline and the flyer's offer.
 */
export const LOGO_VARIANTS = { a: "bar", b: "photo", c: "large" };
/**
 * ⭐ THE ONE NAMED VALUE: the variants the build prints. When the Advisor chooses, this becomes that one letter (["b"],
 * say), and that variant alone is the build's output.
 */
export const VARIANTS = ["a", "b", "c"];
/** § 8 item 4: the flyer is also made this many times, flyer-1 to flyer-4, each with a photo of a rung-4 array. */
export const FOUR_FLYERS = 4;

/**
 * Every page the build prints, in order: for each variant, the tent card, the flyer, then flyer-1 to flyer-4 (unless
 * `fourFlyers` is false). `base` is the file name before "-PROOF" and the extension (tent-card-a, flyer-3-b).
 */
export function pagesToPrint({ variants = VARIANTS, fourFlyers = true } = {}) {
  const [tent, flyer] = ["tent-card", "flyer"].map((id) => PRINT_PIECES.find((p) => p.id === id));
  return variants.flatMap((variant) => {
    if (!(variant in LOGO_VARIANTS)) throw new Error(`no logo variant "${variant}" (pages.mjs LOGO_VARIANTS: ${Object.keys(LOGO_VARIANTS).join(", ")})`);
    const four = fourFlyers ? Array.from({ length: FOUR_FLYERS }, (_, i) => ({ piece: flyer, variant, number: i + 1, base: `flyer-${i + 1}-${variant}` })) : [];
    return [{ piece: tent, variant, number: null, base: `tent-card-${variant}` }, { piece: flyer, variant, number: null, base: `flyer-${variant}` }, ...four];
  });
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
  ].join("\n");
}

/** A piece's print page in a logo variant: its face with § 8's words (twice for a tent, the upper turned), and nothing else. */
export function printPage(piece, inputs, printCss, variant = VARIANTS[0]) {
  const logo = LOGO_VARIANTS[variant];
  if (!logo) throw new Error(`no logo variant "${variant}"`);
  const face = FACES[piece.id](campaign(inputs), makeParts(inputs), { short: true, logo }).trim();
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
