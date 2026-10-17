// The checks a printed piece must pass before it is printed (SPEC-print-pieces.md §§ 2–3), over what the measuring pass
// (measure.js, in headless Chrome) found on the page: inches from the page's top-left corner. Each returns the refusals,
// one sentence each; none means the piece passes.
import { BLEED_IN, CSS_PX_PER_INCH, MIN_PPI, pageOf, SAFE_IN } from "./sizes.mjs";

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
    const cuts = SIDES.filter((side) => near((trim[side] - pageEdges[side]) * INWARD[side], BLEED_IN));
    for (const item of [...face.texts.map((t) => ({ ...t, what: `the text "${t.text}"` })), ...face.qrs.map((q) => ({ ...q, what: "the QR code" }))]) {
      const r = edgesOf(item);
      const short = cuts.filter((side) => (r[side] - trim[side]) * INWARD[side] < SAFE_IN - TOLERANCE_IN);
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
