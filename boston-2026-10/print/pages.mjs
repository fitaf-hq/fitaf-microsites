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
import { TOUT_POSITION } from "./assign.mjs";
import { campaign, esc, makeParts } from "../mockups/parts.mjs";
import { entryFace, flyerFace, PIECES, tentFace, toutFace } from "../mockups/pieces.mjs";
import {
  BACK_GAP_PX,
  BACK_LINE_HEIGHT,
  BACK_TEXT_PX,
  BLEED_IN,
  CSS_PX_PER_INCH,
  ENTRY_EMAIL_PITCH_IN,
  ENTRY_EMAIL_PX,
  ENTRY_HEAD_PX,
  ENTRY_LINE_PITCH_IN,
  ENTRY_LOGO_PX,
  CARD_CUT_IN,
  ENTRY_FINE_PX,
  ENTRY_RULE_GAP_IN,
  ENTRY_SUBHEAD_PX,
  ENTRY_TEXT_PX,
  FRONT_B_CALLOUT_PX,
  FRONT_B_HEAD_PX,
  FRONT_B_LEDE_PX,
  FRONT_B_OFFER_PX,
  FRONT_B_QR_IN,
  FRONT_OFFER_PX,
  FINE_PT,
  FRONT_QR_IN,
  GIVEAWAY_PIECES,
  LAYOUT_PX_PER_INCH,
  LETTER,
  GUIDE_SHORT_IN,
  LETTER_SHEETS,
  pageOf,
  PRINT_PIECES,
  ptPx,
  SAFE_IN,
  TOUT_HEAD_MIN_PX,
  TOUT_LEDE_PX,
  TOUT_LOGO_PX,
  TOUT_PHOTO_W_IN,
  TOUT_QR_IN,
  TOUT_SCAN_PX,
  TOUT_TOP_IN,
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
export function pagesToPrint({ fourFlyers = true, tout = false, entry = false } = {}) {
  const [tent, flyer] = ["tent-card", "flyer"].map((id) => PRINT_PIECES.find((p) => p.id === id));
  const four = fourFlyers ? Array.from({ length: FOUR_FLYERS }, (_, i) => ({ piece: flyer, number: i + 1, base: `flyer-${i + 1}` })) : [];
  // § 17: the giveaway's tout and entry card, last, each only when its words are given; § 17.2 item 1: each with its
  // letter sheet (`letter`: sizes.mjs LETTER_SHEETS), the sheet first, so that the card's own PDF takes the layout it uses
  const giveaway = GIVEAWAY_PIECES.filter((p) => (p.words === "tout" && tout) || (p.words === "entry" && entry)).flatMap((piece) => [
    ...LETTER_SHEETS.filter((sheet) => sheet.piece === piece.id).map((sheet) => ({ piece, number: null, base: sheet.base, letter: sheet })),
    { piece, number: null, base: piece.stem },
  ]);
  return [{ piece: tent, number: null, base: "tent-card" }, { piece: flyer, number: null, base: "flyer" }, ...four, ...giveaway];
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
    // § 12: the flyer's front, its offer at the headline's size and its QR code 1.25 in, § 12.1 (print.css reads them for the flyer
    // alone); and, for a piece with a back, the back's paragraphs' type, their lines and the gap between the words' blocks
    `.print-face > .board { --offer-size: ${FRONT_OFFER_PX}px; --qr-side: ${px(FRONT_QR_IN)}px; }`,
    // § 13: front B's sizes (print.css reads them for front B alone)
    `.print-face > .board { --fb-head: ${FRONT_B_HEAD_PX}px; --fb-lede: ${FRONT_B_LEDE_PX}px; --fb-offer: ${FRONT_B_OFFER_PX}px; --fb-callout: ${FRONT_B_CALLOUT_PX}px; --fb-qr: ${px(FRONT_B_QR_IN)}px; }`,
    ...(piece.back ? [`.print-face > .board { --back-text: ${BACK_TEXT_PX}px; --back-line: ${BACK_LINE_HEIGHT}; --back-gap: ${BACK_GAP_PX}px; }`] : []),
    ...giveawayRules(piece),
  ].join("\n");
}

/**
 * § 17: the giveaway pieces' sizes (sizes.mjs) as CSS, for print.css's .print-tout and .print-entry-card rules: the tout's
 * band and photo, front B's sizes as the tout sets them, its scan line and fine print; the entry card's type, its lines'
 * pitch and its logo. Nothing for any other piece.
 */
function giveawayRules(piece) {
  if (piece.id === "tout") {
    return [
      `.print-face > .board { --tout-top: ${px(TOUT_TOP_IN)}px; --tout-photo-w: ${px(TOUT_PHOTO_W_IN)}px; --tout-logo: ${TOUT_LOGO_PX}px; --tout-scan: ${TOUT_SCAN_PX}px; --tout-fine: ${ptPx(FINE_PT)}px; }`,
      `.print-face > .board { --fb-head: ${TOUT_HEAD_MIN_PX}px; --fb-lede: ${TOUT_LEDE_PX}px; --fb-qr: ${px(TOUT_QR_IN)}px; }`,
    ];
  }
  if (piece.id === "entry-card") {
    return [
      `.print-face > .board { --entry-text: ${ENTRY_TEXT_PX}px; --entry-head: ${ENTRY_HEAD_PX}px; --entry-rules: ${ENTRY_FINE_PX}px; --entry-pitch: ${px(ENTRY_LINE_PITCH_IN)}px; --entry-logo: ${ENTRY_LOGO_PX}px; }`,
      `.print-face > .board { --entry-inset: ${px(CARD_CUT_IN)}px; --entry-email: ${ENTRY_EMAIL_PX}px; --entry-email-pitch: ${px(ENTRY_EMAIL_PITCH_IN)}px; --entry-sub: ${ENTRY_SUBHEAD_PX}px; --entry-rule-gap: ${px(ENTRY_RULE_GAP_IN)}px; }`,
    ];
  }
  return [];
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
function sheetOf(piece, inputs, words, front) {
  const [faceOf, options] = FACES[piece.id];
  const back = words ? { ...FLYER_BACK, back: { positions: piece.back.positions, words } } : {};
  // § 13: front B, given its words (print/front.mjs readFront); the back is the same whichever front a flyer has
  const b = !words && front && piece.id === "flyer" ? { front } : {};
  const face = faceOf(campaign(inputs), makeParts(inputs), { ...options, ...back, ...b }).trim();
  const turns = piece.faces === 1 ? [""] : [" print-face-turned", ""];
  const board = words ? `board board-${piece.id} board-${piece.id}-back` : b.front ? `board board-${piece.id} board-${piece.id}-b` : `board board-${piece.id}`;
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
export function printDocument(piece, inputs, printCss, back, front) {
  const sheets = [sheetOf(piece, inputs, undefined, front)];
  if (piece.sides === 2) sheets.push(sheetOf(piece, withBackPhotos(inputs), back));
  return pageHtml(piece, inputs, printCss, sheets);
}

/**
 * § 17: one side of a giveaway piece as a sheet, its one face (print/, its own words): the tout's (mockups/pieces.mjs
 * toutFace), or the entry card's front or back (entryFace).
 */
function giveawayFace(piece, inputs, words, side) {
  const c = campaign(inputs);
  const face = (piece.id === "tout" ? toutFace(c, makeParts(inputs), words) : entryFace(c, makeParts(inputs), words)).trim();
  return `<div class="board board-${piece.id} board-${piece.id}-${side}">\n${face}\n</div>`;
}

function giveawaySheet(piece, inputs, words, side) {
  return `<div class="print-sheet${side === "back" ? " print-sheet-back" : ""}"><div class="print-page">\n<div class="print-face">${giveawayFace(piece, inputs, words, side)}</div>\n</div></div>`;
}

/**
 * § 17.2 item 3: the inputs with the tout's photo position (print/assign.mjs TOUT_POSITION), its own file name in the
 * photos folder (`tout.jpg`), as the back's are: the photo when it is there, else the mock-ups' labelled placeholder.
 */
export function withToutPhoto(inputs) {
  const file = `${TOUT_POSITION}.jpg`;
  const tout = { file, present: existsSync(join(inputs.photosDir, file)), source: "print/assign.mjs#TOUT_POSITION" };
  return { ...inputs, photos: { ...inputs.photos, [TOUT_POSITION]: tout } };
}

/**
 * § 17 items 1–3: the document a giveaway piece's PDF is printed from, a page per side: the tout's one; the entry card's
 * front (the fields) then its back (the rules), the back upright, for a flip on the long edge. `words`: the piece's words
 * file read (print/tout.mjs readTout, print/entry.mjs readEntry).
 */
export function giveawayDocument(piece, inputs, printCss, words) {
  const sides = (piece.sides ?? 1) === 1 ? ["front"] : ["front", "back"];
  return pageHtml(piece, withToutPhoto(inputs), printCss, sides.map((side) => giveawaySheet(piece, withToutPhoto(inputs), words, side)));
}

/**
 * § 17.2 item 1: a letter sheet's sizes as CSS, for one of its layouts: the US Letter page, no bleed; each cell the layout's
 * face, placed by its own style, its board the cell; and the piece's own sizes (sizeRules', as each face needs them).
 */
export function letterRules(layout, piece) {
  const { face } = layout;
  const board = sizeRules({ ...piece, face }).split("\n").filter((rule) => rule.startsWith(".print-face > .board { --"));
  return [
    `@page { size: ${LETTER.w}in ${LETTER.h}in; margin: 0; }`,
    `.print-sheet { width: ${LETTER.w}in; height: ${LETTER.h}in; }`,
    `.print-page { --bleed: ${px(BLEED_IN)}px; --safe: ${px(SAFE_IN)}px; width: ${px(LETTER.w)}px; height: ${px(LETTER.h)}px; transform: scale(${CSS_PX_PER_INCH / LAYOUT_PX_PER_INCH}); }`,
    `.print-face { width: ${px(face.w)}px; height: ${px(face.h)}px; }`,
    `.print-face > .board { left: 0; top: 0; width: ${px(face.w)}px; height: ${px(face.h)}px; }`,
    ...board,
  ].join("\n");
}

/**
 * § 17.3 item 1: the light dashed cut guides of a grid of copies: one along each cut between two columns and between two
 * rows, spanning the grid, GUIDE_SHORT_IN short of its outer edges (which are at the paper's margin), each placed by its
 * own style (layout px).
 */
function guidesOf(layout) {
  const [x0, y0] = [layout.cells[0].x, layout.cells[0].y];
  const [w, h] = [layout.cols * layout.face.w, layout.rows * layout.face.h];
  const v = Array.from({ length: layout.cols - 1 }, (_, i) => `<span class="letter-guide letter-guide-v" style="left: ${px(x0 + (i + 1) * layout.face.w)}px; top: ${px(y0 + GUIDE_SHORT_IN)}px; height: ${px(h - 2 * GUIDE_SHORT_IN)}px"></span>`);
  const hz = Array.from({ length: layout.rows - 1 }, (_, i) => `<span class="letter-guide letter-guide-h" style="top: ${px(y0 + (i + 1) * layout.face.h)}px; left: ${px(x0 + GUIDE_SHORT_IN)}px; width: ${px(w - 2 * GUIDE_SHORT_IN)}px"></span>`);
  return [...v, ...hz].join("");
}

/**
 * § 17.2 item 1: the document a letter sheet's PDF is printed from, in one of its layouts: a US Letter page holding a copy
 * of the piece's face in each cell, drawn at its trim without bleed (the cell clips what front B's rules run into a
 * bleed), and, when the sheet has them, the light dashed cut guides between its copies (§ 17.3 item 1: one page).
 */
export function letterDocument(sheet, layout, piece, inputs, printCss, words) {
  const own = withToutPhoto(inputs);
  const cells = layout.cells.map((cell) => `<div class="print-face" style="left: ${px(cell.x)}px; top: ${px(cell.y)}px">${giveawayFace({ ...piece, face: layout.face }, own, words, "front")}</div>`);
  const page = `<div class="print-sheet print-sheet-letter"><div class="print-page">\n${cells.join("\n")}${sheet.guides ? `\n${guidesOf(layout)}` : ""}\n</div></div>`;
  return pageHtml(piece, own, printCss, [page], { rules: letterRules(layout, piece), letter: true });
}

/** The page around a piece's sheets: the mock-ups' style, print.css and the sizes; no legend, caption or script. */
function pageHtml(piece, inputs, printCss, sheets, { rules = sizeRules(piece), letter = false } = {}) {
  // § 17: a giveaway piece names its own title (it has no mock-up), and the tout takes front B's rules (`look`)
  const title = piece.title ?? PIECES.find((p) => p.id === piece.id).title;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
${inputs.site.root}
${inputs.site.fonts}
${inputs.css.trim()}
${printCss.trim()}
${rules}
</style>
</head>
<body class="print print-${piece.id}${piece.look ? ` print-${piece.look}` : ""}${letter ? " print-letter" : ""}">
${sheets.join("\n")}
</body>
</html>
`;
}

/**
 * § 4: the offer is a placeholder while data/offers.json says its offers are (`status`), or while the chosen offer's
 * label is a bracketed stand-in ("[The offer]"). Either keeps a piece a proof. § 12.2 (2026-10-20): an offer whose
 * words the Owner approved carries `label_approved` (the date) and is final for print, although the file's codes and
 * terms, and its other offers, are still placeholders; a bracketed label is a placeholder whatever it carries.
 */
export function offerIsPlaceholder(inputs) {
  const { offer } = campaign(inputs);
  if (/^\[.*\]$/.test(offer.value.trim())) return true;
  if (inputs.data.offers.offers.find((o) => o.id === offer.id)?.label_approved) return false;
  return inputs.data.offers.status === "placeholder";
}

/**
 * What still stands in on a piece: each photo position without a photo, the offer while it is a placeholder, and § 13's
 * front B's words until they are approved (a flyer made with front B).
 */
export function placeholdersOf(piece, inputs, front) {
  const photos = piece.positions.filter((position) => !inputs.photos[position]?.present).map((position) => `photo ${position}`);
  const offer = offerIsPlaceholder(inputs) ? [`the offer "${campaign(inputs).offer.value}"`] : [];
  const words = front && piece.id === "flyer" && !front.approved ? [`front B's words, ${front.source} not approved`] : [];
  return [...photos, ...offer, ...words];
}

/** § 17 item 4: a `[bracket]` in a words file is a value not given yet (the prize, its value …), each once, in order. */
const BRACKET = /\[[^\][]*\]/g;
export const bracketsOf = (texts) => [...new Set(texts.flatMap((t) => t.match(BRACKET) ?? []))];

/**
 * § 17 item 4 (§ 1's rule, and § 13 item 3's for words not yet approved): what still stands in on a giveaway piece: its
 * photo position without a photo (the tout's, the flyer's photo), its words until they are approved (the tout's
 * `"approved": true`, the entry card's `<!-- approved -->` last line), and each `[bracket]` its words file holds, named.
 * Any one keeps the piece a proof.
 */
export function giveawayPlaceholders(piece, inputs, words) {
  const { photos: shown } = withToutPhoto(inputs);
  const photos = piece.positions.filter((position) => !shown[position]?.present).map((position) => `photo ${position}`);
  const unapproved = words.approved ? [] : [`the ${piece.title.toLowerCase().replace(/^giveaway /, "")}'s words, ${words.source} not approved`];
  return [...photos, ...unapproved, ...bracketsOf(words.texts).map((b) => `${b} in ${words.source}`)];
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
