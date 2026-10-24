// The checks a printed piece must pass before it is printed (SPEC-print-pieces.md §§ 2–3, 12), over what the measuring pass
// (measure.js, in headless Chrome) found on the page: inches from the page's top-left corner. Each returns the refusals,
// one sentence each; none means the piece passes.
import {
  BACK_GAP_PX,
  BACK_MIN_TEXT_PX,
  BLEED_IN,
  CSS_PX_PER_INCH,
  ENTRY_LINE_PITCH_MIN_IN,
  FINE_FLOOR_PX,
  FRONT_OFFER_MAX_LINES,
  LAYOUT_PX_PER_INCH,
  LETTER,
  LETTER_MARGIN_IN,
  MIN_PPI,
  pageOf,
  SAFE_IN,
  TOUT_QR_MIN_IN,
  TYPE_FLOOR_PX,
} from "./sizes.mjs";

/** Half a CSS pixel: a measured edge this close to another is on it. */
const TOLERANCE_IN = 0.5 / CSS_PX_PER_INCH;
const near = (a, b) => Math.abs(a - b) <= TOLERANCE_IN;
const edgesOf = (r) => ({ left: r.x, right: r.x + r.w, top: r.y, bottom: r.y + r.h });
const SIDES = ["left", "right", "top", "bottom"];
/** Which way is inward from each side. */
const INWARD = { left: 1, top: 1, right: -1, bottom: -1 };
const inches = (n) => n.toFixed(2);

/**
 * A photo's effective resolution at its printed size: it fills its window (object-fit: cover), so it is scaled by the
 * larger of the two ratios, and the pixels per inch are the smaller of its width over the window's and its height over
 * the window's.
 */
export const effectivePpi = (pixels, window) => Math.min(pixels.width / window.w, pixels.height / window.h);

/**
 * § 3: every photo shown, against its window. `windows`: [{ slot, w, h }] as measured (a position on two faces counts
 * once, at its lower resolution); `pixels`: { position: { width, height } } for the positions that have a photo.
 * Returns { rows: [{ slot, width, height, w, h, ppi }], refusals }.
 */
export function resolution(windows, pixels) {
  const bySlot = new Map();
  for (const { slot, w, h } of windows) {
    const px = pixels[slot];
    if (!px) continue;
    const ppi = effectivePpi(px, { w, h });
    if (!bySlot.has(slot) || ppi < bySlot.get(slot).ppi) bySlot.set(slot, { slot, width: px.width, height: px.height, w, h, ppi });
  }
  const rows = [...bySlot.values()];
  const refusals = rows
    .filter((r) => r.ppi < MIN_PPI)
    .map((r) => `photo position ${r.slot}: ${r.width} × ${r.height} px over its window of ${inches(r.w)} × ${inches(r.h)} in is ${Math.floor(r.ppi)} ppi, below ${MIN_PPI}`);
  return { rows, refusals };
}

/**
 * § 2, over one piece's measurement, as § 7 leaves it. REFUSED: a page that is not the sheet plus the bleed, a face that
 * is not its trim, and a painted field (a photo, a colour) that meets a cut edge of the trim without running on to the
 * page's edge. REPORTED (warnings): text or the QR code less than SAFE_IN inside a cut edge. § 7 forbids moving a part, so
 * where the approved layout itself puts text that close the build can only say so (the flyer's bar, 0.10 in below the
 * top trim). A cut edge is one BLEED_IN inside the page's; the tent's fold is not one. Returns { refusals, warnings }.
 */
export function layoutFindings(piece, measure) {
  const refusals = [];
  const warnings = [];
  const page = pageOf(piece);
  if (!near(measure.page.w, page.w) || !near(measure.page.h, page.h)) {
    refusals.push(`the page is ${inches(measure.page.w)} × ${inches(measure.page.h)} in, not ${inches(page.w)} × ${inches(page.h)}`);
  }
  if (measure.faces.length !== piece.faces) refusals.push(`${measure.faces.length} face(s) drawn, not ${piece.faces}`);
  const pageEdges = edgesOf(measure.page);
  measure.faces.forEach((face, f) => {
    const name = piece.faces > 1 ? `face ${f + 1}` : "the face";
    const trim = edgesOf(face.trim);
    if (!near(face.trim.w, piece.face.w) || !near(face.trim.h, piece.face.h)) {
      refusals.push(`${name}: its trim is ${inches(face.trim.w)} × ${inches(face.trim.h)} in, not ${piece.face.w} × ${piece.face.h}`);
    }
    const cuts = cutsOf(trim, pageEdges);
    for (const item of [...face.texts.map((t) => ({ ...t, what: `the text "${t.text}"` })), ...face.qrs.map((q) => ({ ...q, what: "the QR code" }))]) {
      const short = shortOf(edgesOf(item), trim, cuts);
      if (short.length) warnings.push(`${name}: ${item.what} is less than ${SAFE_IN} in inside the trim (${short.join(", ")})`);
    }
    for (const field of face.fields) {
      const r = edgesOf(field);
      for (const side of cuts) {
        const meets = (r[side] - trim[side]) * INWARD[side] <= TOLERANCE_IN;
        const bleeds = (r[side] - pageEdges[side]) * INWARD[side] <= TOLERANCE_IN;
        if (meets && !bleeds) refusals.push(`${name}: ${field.what} meets the trim's ${side} edge and does not run into the bleed`);
      }
    }
  });
  return { refusals, warnings };
}

/** The cut edges of a face: its trim's sides that are BLEED_IN inside the page's (the tent's fold is not one). */
const cutsOf = (trim, pageEdges) => SIDES.filter((side) => near((trim[side] - pageEdges[side]) * INWARD[side], BLEED_IN));
/** How far inside the trim a box must sit at each cut edge, and the sides where it does not. */
const shortOf = (r, trim, cuts) => cuts.filter((side) => (r[side] - trim[side]) * INWARD[side] < SAFE_IN - TOLERANCE_IN);
/** Words that end this close above the gap are on it: a hundredth of a layout px. */
const FIT_TOLERANCE_PX = 0.01;
const blockOf = (face, what) => face.blocks.find((b) => b.what.split(".").includes(what));

/**
 * § 12 item 2, over the flyer's front as measured: the offer, at the headline's size, wraps to at most
 * FRONT_OFFER_MAX_LINES lines. More is REFUSED, naming the count (its words are the Owner's: fewer of them, nothing
 * shrunk). Returns { refusals }.
 */
export function frontFindings(measure) {
  const refusals = [];
  for (const face of measure.faces) {
    const offer = blockOf(face, "offer");
    if (offer && offer.lines > FRONT_OFFER_MAX_LINES) refusals.push(`the offer runs to ${offer.lines} lines, more than ${FRONT_OFFER_MAX_LINES} (§ 12 item 2: fewer words; nothing is shrunk)`);
  }
  return { refusals };
}

/**
 * § 12 items 3 and 5, over the flyer's back as measured (its sheet: { page, faces }): it must FIT, not shrink. REFUSED:
 * words that do not end at least BACK_GAP_PX above the bottom row's top (eatfitaf.com and the logo), naming how many
 * layout px over they are; any run of text less than SAFE_IN inside a cut edge (on the back that is refused: nothing here
 * is an approved layout that may not move); any type below BACK_MIN_TEXT_PX. Returns { refusals, spacePx, smallestPx }:
 * the layout px to spare above the bottom row (below zero, over), and the smallest type on the back.
 */
export function backFindings(piece, sheet) {
  const refusals = [];
  const [face] = sheet.faces;
  const trim = edgesOf(face.trim);
  const cuts = cutsOf(trim, edgesOf(sheet.page));
  const words = blockOf(face, "flyer-back-words");
  const foot = blockOf(face, "flyer-back-foot");
  const spacePx = (foot.y - (words.y + words.h)) * LAYOUT_PX_PER_INCH - BACK_GAP_PX;
  if (spacePx < -FIT_TOLERANCE_PX) refusals.push(`the back's words do not fit between the photos and the bottom row: ${(-spacePx).toFixed(1)} layout px over (§ 12 item 5: fewer words; nothing is shrunk)`);
  for (const t of face.texts) {
    const short = shortOf(edgesOf(t), trim, cuts);
    if (short.length) refusals.push(`the back: the text "${t.text}" is less than ${SAFE_IN} in inside the trim (${short.join(", ")})`);
    if (t.size < BACK_MIN_TEXT_PX) refusals.push(`the back: "${t.text}" is ${t.size} layout px, below the floor of ${BACK_MIN_TEXT_PX}`);
  }
  const smallestPx = Math.min(...face.texts.map((t) => t.size));
  return { refusals, spacePx, smallestPx };
}

/**
 * The room a box of words leaves inside its content box on each side, in layout px (below zero, it runs over); across
 * only, for words measured across alone (measure.js: a headline line).
 */
function roomOf(fit) {
  const [w, c] = [edgesOf(fit.words), edgesOf(fit.content)];
  const sides = fit.words.y === null ? ["left", "right"] : SIDES;
  return Object.fromEntries(sides.map((side) => [side, (w[side] - c[side]) * INWARD[side] * LAYOUT_PX_PER_INCH]));
}

/**
 * § 17 items 2–3, over one side of a giveaway piece as measured (its sheet: { page, faces }): it must FIT, not shrink.
 * REFUSED, each naming by how much: words that run past the box they must stay in (each [data-fit]: the tout's band, its
 * headline's lines and its foot; the entry card's front and its rules), in layout px; any run of text, or the QR code,
 * less than `inset` (SAFE_IN) inside a cut edge (refused, as on the flyer's back: no approved layout here forbids moving
 * a part), the cut edges a face's sides one BLEED_IN inside the page's or, on a letter sheet (`everySide`), all four
 * (§ 17.2 item 1: each piece's own edge is a cut); any type below TYPE_FLOOR_PX; a QR code under TOUT_QR_MIN_IN square; the
 * entry card's writing lines closer than ENTRY_LINE_PITCH_MIN_IN. Every face of the sheet. Returns { refusals,
 * smallestPx, spacePx } (spacePx: the least room any fit box leaves below its words or to their right, in layout px;
 * below zero, over).
 */
export function giveawayFindings(piece, sheet, { inset = SAFE_IN, everySide = false } = {}) {
  const refusals = [];
  const said = [];
  const many = sheet.faces.length > 1;
  sheet.faces.forEach((face, f) => {
    const name = (r) => (many ? `copy ${f + 1}: ${r}` : r);
    const trim = edgesOf(face.trim);
    const cuts = everySide ? SIDES : cutsOf(trim, edgesOf(sheet.page));
    const fits = face.fits.filter((fit) => fit.words);
    for (const fit of fits) {
      const room = roomOf(fit);
      const over = Object.fromEntries(Object.entries(room).filter(([, px]) => px < -FIT_TOLERANCE_PX).map(([side, px]) => [side, -px]));
      const worst = Math.max(0, ...Object.values(over));
      if (worst > 0) refusals.push(name(`${fit.what} does not fit: its words run ${worst.toFixed(1)} layout px over (${Object.keys(over).join(", ")}) (§ 17 item 2: fewer words; nothing is shrunk)`));
      // the room said is below and to the right: words are set from their box's top left, so its other two sides hold none
      said.push(...Object.entries(room).filter(([side]) => side === "right" || side === "bottom").map(([, px]) => px));
    }
    for (const item of [...face.texts.map((t) => ({ ...t, what: `the text "${t.text}"` })), ...face.qrs.map((q) => ({ ...q, what: "the QR code" }))]) {
      // a run of text across by its glyphs, down by its lines as set (§ 17.6 item 3: the fine print on the inset)
      const box = edgesOf(item.set ? { x: item.x, w: item.w, y: Math.max(item.y, item.set.y), h: Math.min(item.y + item.h, item.set.y + item.set.h) - Math.max(item.y, item.set.y) } : item);
      const short = cuts.filter((side) => (box[side] - trim[side]) * INWARD[side] < inset - TOLERANCE_IN);
      if (short.length) refusals.push(name(`${item.what} is less than ${inset} in inside the trim (${short.join(", ")})`));
      // § 17.4: the fine print's floor is its own (6.5 pt), every other run's the type floor
      const floor = item.fine ? FINE_FLOOR_PX : TYPE_FLOOR_PX;
      if (item.size !== undefined && item.size < floor - FIT_TOLERANCE_PX) refusals.push(name(`"${item.text}" is ${item.size} layout px, below the ${item.fine ? "fine print's " : ""}floor of ${Number(floor.toFixed(2))}`));
    }
    for (const qr of face.qrs) if (Math.min(qr.w, qr.h) < TOUT_QR_MIN_IN - TOLERANCE_IN) refusals.push(name(`the QR code is ${inches(Math.min(qr.w, qr.h))} in, under ${TOUT_QR_MIN_IN} in square`));
    face.lines.slice(1).forEach((line, i) => {
      const pitch = line.y - face.lines[i].y;
      if (pitch < ENTRY_LINE_PITCH_MIN_IN - TOLERANCE_IN) refusals.push(name(`writing lines ${i + 1} and ${i + 2} are ${inches(pitch)} in apart, under ${ENTRY_LINE_PITCH_MIN_IN} in`));
    });
  });
  // the smallest type but the fine print's (which has its own floor), and the fine print's size and lines
  const texts = sheet.faces.flatMap((face) => face.texts);
  const smallestPx = Math.min(...texts.filter((t) => !t.fine).map((t) => t.size));
  const fine = texts.filter((t) => t.fine);
  const finePx = fine.length ? Math.min(...fine.map((t) => t.size)) : null;
  const fineLines = fine.length ? Math.max(...sheet.faces.map((face) => face.fineLines)) : null;
  return { refusals, smallestPx, spacePx: said.length ? Math.min(...said) : null, finePx, fineLines };
}

/**
 * § 17.2 item 1, over one page of a letter sheet as measured, in one of its layouts: the page is US Letter; it holds a copy
 * of the piece in each of the layout's cells, each the layout's face; each copy's words fit and sit `sheet.inset` inside its own edge, a cut
 * (giveawayFindings, every side); and nothing is drawn within LETTER_MARGIN_IN of the paper's edge: no run of text, QR
 * code, logo, writing line or cut guide, and no painted field as drawn (a field is drawn inside its copy's cell, which
 * clips what runs past it). REFUSED, each naming it. Returns { refusals, smallestPx, spacePx }.
 */
export function letterFindings(sheet, layout, piece, measured) {
  const refusals = [];
  const { face } = layout;
  if (!near(measured.page.w, LETTER.w) || !near(measured.page.h, LETTER.h)) refusals.push(`the page is ${inches(measured.page.w)} × ${inches(measured.page.h)} in, not US Letter`);
  if (measured.faces.length !== layout.cells.length) refusals.push(`${measured.faces.length} copies drawn, not ${layout.cells.length}`);
  measured.faces.forEach((f, i) => {
    if (!near(f.trim.w, face.w) || !near(f.trim.h, face.h)) refusals.push(`copy ${i + 1}: its trim is ${inches(f.trim.w)} × ${inches(f.trim.h)} in, not ${face.w} × ${face.h}`);
  });
  const fit = giveawayFindings(piece, measured, { inset: sheet.inset, everySide: true });
  const page = edgesOf(measured.page);
  const clip = (r, cell) => ({ x: Math.max(r.x, cell.x), y: Math.max(r.y, cell.y), w: Math.min(r.x + r.w, cell.x + cell.w) - Math.max(r.x, cell.x), h: Math.min(r.y + r.h, cell.y + cell.h) - Math.max(r.y, cell.y) });
  const drawn = [
    ...measured.faces.flatMap((f, i) => [
      ...f.texts.map((t) => [`copy ${i + 1}: the text "${t.text}"`, t]),
      ...f.qrs.map((q) => [`copy ${i + 1}: the QR code`, q]),
      ...f.logos.map((l) => [`copy ${i + 1}: a logo`, l]),
      ...f.fields.map((field) => [`copy ${i + 1}: ${field.what}`, clip(field, f.trim)]).filter(([, r]) => r.w > 0 && r.h > 0),
    ]),
    ...measured.faces.flatMap((f, i) => f.lines.map((l) => [`copy ${i + 1}: a writing line`, l])),
    ...(measured.guides ?? []).map((g) => ["a cut guide", g]),
  ];
  for (const [what, r] of drawn) {
    const short = SIDES.filter((side) => (edgesOf(r)[side] - page[side]) * INWARD[side] < LETTER_MARGIN_IN - TOLERANCE_IN);
    if (short.length) refusals.push(`${what} is less than ${LETTER_MARGIN_IN} in from the paper's edge (${short.join(", ")})`);
  }
  return { refusals: [...refusals, ...fit.refusals], smallestPx: fit.smallestPx, spacePx: fit.spacePx, finePx: fit.finePx, fineLines: fit.fineLines };
}

/**
 * § 9 item 2: how a photo shows in its window. It covers its box (the window and its bleed), centred, so it is scaled by
 * the larger of the two ratios; what shows is the box's part inside the trim, the window. Returns the photo's shape (width
 * over height), the window's, and the fractions of the photo's width and height that show.
 */
export function showing(pixels, box, trim) {
  const inchesPerPixel = Math.max(box.w / pixels.width, box.h / pixels.height);
  const shown = { w: Math.min(box.x + box.w, trim.x + trim.w) - Math.max(box.x, trim.x), h: Math.min(box.y + box.h, trim.y + trim.h) - Math.max(box.y, trim.y) };
  return {
    shape: pixels.width / pixels.height,
    window: shown.w / shown.h,
    width: shown.w / (pixels.width * inchesPerPixel),
    height: shown.h / (pixels.height * inchesPerPixel),
  };
}
