// SPEC-print-pieces.md §§ 2, 7, 9, 10, 12 and 17: the printed pieces' sizes, as named values in one place, to redirect when the
// vendor's specification is known. Inches throughout. A piece is one or two FACES of `face` (width × height); two faces are stacked
// on one flat sheet, the upper turned 180° so that, folded on the centre line into an A-frame, both read upright. Every
// PDF page is the sheet plus BLEED_IN on every edge; text and the QR code sit at least SAFE_IN inside a face's edges.
import { PX_PER_INCH } from "../mockups/pieces.mjs";
import { BACK_POSITIONS, TOUT_POSITION } from "./assign.mjs";

export const BLEED_IN = 0.125;
export const SAFE_IN = 0.125;
/** A photo's effective resolution at its printed size must be at least this (§ 3). */
export const MIN_PPI = 300;
export const POINTS_PER_INCH = 72;
/** The CSS inch: Chrome prints and measures in these. The mock-ups' layout (PX_PER_INCH a real inch) is drawn scaled to it. */
export const CSS_PX_PER_INCH = 96;
export const LAYOUT_PX_PER_INCH = PX_PER_INCH;

/**
 * § 12 item 2 (the Advisor, 2026-10-20): the flyer's front, the call to action larger. The offer is set at the headline's
 * size (mockups.css .headline, 34px, from the offer's own 24px), on at most this many lines; the QR code is this many
 * inches square (150 layout px, from the mock-up's 112; 1.4 in, § 12 item 2, put eatfitaf.com inside the safe margin under a two-line offer: § 12.1). Layout px are the mock-ups' (LAYOUT_PX_PER_INCH a real inch).
 */
export const FRONT_OFFER_PX = 34;
export const FRONT_OFFER_MAX_LINES = 2;
export const FRONT_QR_IN = 1.25;
/**
 * § 12 items 3 and 5: the flyer's back. No type on it smaller than BACK_MIN_TEXT_PX (8.4 pt). Its paragraphs are set at
 * BACK_TEXT_PX, their lines BACK_LINE_HEIGHT apart (the heading and the lede take the mock-ups' headline and tagline);
 * the words' blocks are BACK_GAP_PX apart, the mock-up flyer body's own gap (mockups.css .flyer-body), and the words must
 * end at least that far above the bottom row (eatfitaf.com and the logo), or the build refuses: nothing is shrunk.
 */
export const BACK_MIN_TEXT_PX = 14;
export const BACK_TEXT_PX = 14;
export const BACK_LINE_HEIGHT = 1.4;
export const BACK_GAP_PX = 10;
/**
 * § 13 (2026-10-20): front B's sizes, in the mock-ups' layout px (120 an inch) but the QR code's. The headline at 40px
 * (24 pt printed), the lede at 17px, the offer at 26px beside the code, the callout's disc 92px across, and the QR code
 * 1 in square (the mock-up's was 0.93 in; at a handout's reading distance a phone reads it at well under a foot).
 */
export const FRONT_B_HEAD_PX = 40;
export const FRONT_B_LEDE_PX = 17;
export const FRONT_B_OFFER_PX = 32;
export const FRONT_B_CALLOUT_PX = 92;
export const FRONT_B_QR_IN = 1;

/**
 * The two printed pieces (§ 2): `id` is the mock-up whose face is printed (mockups/pieces.mjs PIECES), `stem` the output
 * file's name before "-PROOF" and the extension, `positions` the photo positions it shows (one face's).
 */
export const PRINT_PIECES = [
  // § 9 (2026-10-17): the flyer's photo window, width to height, across the face at its top (the glam photos' own shape)
  // § 12 (2026-10-20): two sides, the front then the back, each a page of its own (the back upright, for a flip on the
  // long edge); the back's three photo positions, each window square
  {
    id: "flyer",
    stem: "flyer",
    face: { w: 4.25, h: 5.5 },
    faces: 1,
    sides: 2,
    positions: ["flyer"],
    photoWindow: { w: 3, h: 2 },
    // § 15 item 8 (2026-10-21): the back's three windows the glam photos' own 3:2, the names in one band under them
    back: { positions: BACK_POSITIONS, photoWindow: { w: 3, h: 2 } },
  },
  // § 7 (2026-10-17): the mock-up's own face, portrait 4 × 6 in (§ 2's 6 × 4 landscape was wrong), on a 4 × 12 in sheet;
  // § 10 (2026-10-18): its three photo windows, each this shape (square), the large one's side two tiles and their gap
  { id: "tent-card", stem: "tent-card", face: { w: 4, h: 6 }, faces: 2, positions: ["tent-large", "tent-top", "tent-bottom"], photoWindow: { w: 1, h: 1 } },
];

/**
 * § 17 (2026-10-23): the giveaway tout's sizes, in layout px but the inches: front B's look laid out landscape. The band
 * and the photo beside it are TOUT_TOP_IN tall (inside the trim), the photo TOUT_PHOTO_W_IN wide; the foot takes the rest.
 * The headline at 42px (a words file's `size` wins), the band's logo 104px wide, the lede at 18px, `scan` at 18px beside the QR code, which is
 * TOUT_QR_IN square and never under TOUT_QR_MIN_IN; the fine print at the type floor, TYPE_FLOOR_PX (§ 12 item 3's 14
 * layout px, 8.4 pt), and no type on the tout or the entry card under it.
 */
export const TYPE_FLOOR_PX = BACK_MIN_TEXT_PX;
export const TOUT_TOP_IN = 2.1;
export const TOUT_PHOTO_W_IN = 2.5;
export const TOUT_HEAD_PX = 42;
export const TOUT_LOGO_PX = 104;
export const TOUT_LEDE_PX = 18;
export const TOUT_SCAN_PX = 18;
export const TOUT_FINE_PX = TYPE_FLOOR_PX;
export const TOUT_QR_IN = 1;
export const TOUT_QR_MIN_IN = 0.75;
/**
 * § 17 item 3, as §§ 17.2–17.3 have it: the entry card, plain for a pen, one side, landscape. Each field is a label above
 * a writing line, the lines ENTRY_LINE_PITCH_IN apart (never under ENTRY_LINE_PITCH_MIN_IN); the email field is its own
 * line, drawn as writing lines with its `@` and `.` between them at ENTRY_EMAIL_PX, ENTRY_EMAIL_PITCH_IN tall; the
 * heading at ENTRY_HEAD_PX with the logo ENTRY_LOGO_PX wide beside it; the fine print (the rules) at the floor; every word
 * CARD_CUT_IN inside the card's edge, which is a cut (§ 17.3 item 1: 0.25 in).
 */
export const ENTRY_LINE_PITCH_IN = 0.5;
export const ENTRY_LINE_PITCH_MIN_IN = 0.3;
export const ENTRY_EMAIL_PITCH_IN = 0.45;
export const ENTRY_EMAIL_PX = 24;
export const ENTRY_TEXT_PX = 15;
export const ENTRY_HEAD_PX = 18;
export const ENTRY_RULES_PX = TYPE_FLOOR_PX;
export const ENTRY_LOGO_PX = 48;
export const CARD_CUT_IN = 0.25;

/**
 * § 17.2 item 1 (2026-10-23, evening): office paper. Every letter sheet is a US Letter page, portrait, with no marks;
 * nothing printed within LETTER_MARGIN_IN of the paper's edge; each piece drawn at its trim, no bleed (its own edge is the
 * cut). Each sheet: `base` its file's name, `piece` the piece it repeats (GIVEAWAY_PIECES); its `layouts`, tried in
 * order, the first whose every copy's words fit used (§ 17.3 item 1: eight cards a page, else six), each `face` its
 * copies' trim and `cells` each copy's top left corner on the page (inches); `inset` how far inside each copy every word
 * sits; `guides` whether a light dashed cut guide runs along each cut between copies (stopping GUIDE_SHORT_IN short of the
 * copies' outer edges, which are at the paper's margin).
 */
export const LETTER = { w: 8.5, h: 11 };
export const LETTER_MARGIN_IN = 0.5;
export const TOUT_GAP_IN = 1;
export const GUIDE_SHORT_IN = 0.05;
const TOUT_FACE = { w: 6, h: 4 };
/** § 17.3 item 1: a grid of `cols` × `rows` cards filling the page inside its margin, each its share. */
const cardGrid = (cols, rows) => {
  const face = { w: (LETTER.w - 2 * LETTER_MARGIN_IN) / cols, h: (LETTER.h - 2 * LETTER_MARGIN_IN) / rows };
  const cells = Array.from({ length: cols * rows }, (_, i) => ({ x: LETTER_MARGIN_IN + (i % cols) * face.w, y: LETTER_MARGIN_IN + Math.floor(i / cols) * face.h }));
  return { count: cols * rows, cols, rows, face, cells };
};
export const CARD_LAYOUTS = [cardGrid(2, 4), cardGrid(2, 3)];
export const LETTER_SHEETS = [
  // two touts, centred, one above the other, the space above, between and below them shared evenly (1 in each)
  {
    base: "letter-touts",
    piece: "tout",
    inset: SAFE_IN,
    guides: false,
    layouts: [{ count: 2, face: TOUT_FACE, cells: [0, 1].map((i) => ({ x: (LETTER.w - TOUT_FACE.w) / 2, y: TOUT_GAP_IN + i * (TOUT_FACE.h + TOUT_GAP_IN) })) }],
  },
  // § 17.3 item 1: eight cards a page (2 × 4, each 3.75 × 2.5 in) if every card's words fit, else six (2 × 3)
  { base: "letter-entry-cards", piece: "entry-card", inset: CARD_CUT_IN, guides: true, layouts: CARD_LAYOUTS },
];

/**
 * § 17 (2026-10-23): the giveaway's two pieces, built only when their words are given (--tout-words, --entry-words), each
 * its own PDF at its trim plus the bleed (a shop's run) and its copies on the letter sheets (LETTER_SHEETS). Not in
 * PRINT_PIECES, whose `id` is a mock-up's (mockups/pieces.mjs PIECES): neither has a mock-up. `words` names the words file
 * that makes it; `look: "flyer"` gives the tout front B's rules (print.css's .print-flyer .fb-*). The tout, 6 × 4 in
 * landscape, its one photo the flyer's (§ 17.3 item 2), staged as its own position, captioned as the flyer's is. The
 * entry card, one side, landscape, at the letter sheet's first layout's size (the build takes the one it uses).
 */
export const GIVEAWAY_PIECES = [
  { id: "tout", stem: "tout", title: "Giveaway tout", words: "tout", look: "flyer", face: TOUT_FACE, faces: 1, positions: [TOUT_POSITION] },
  { id: "entry-card", stem: "entry-card", title: "Giveaway entry card", words: "entry", face: CARD_LAYOUTS[0].face, faces: 1, positions: [] },
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
