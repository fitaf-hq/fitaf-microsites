// Q17 (SPEC-print-pieces.md § 10, the Advisor, 2026-10-18): the tent card without its bar, the logo at the bottom right,
// and square windows. On both faces of the one tent page (the upper read turned back): no bar and none of its words; one
// logo, the body's last part, its box in the face's bottom-right corner inside the safe margin, at the mock-up's size; the
// three photo windows (each photo's box inside the trim) each 1:1 within half a mock-up pixel, at the top of the face (the
// fold), spanning its width, the large window's side two tiles and the gap between them, the large photo running into
// the bleed on the left and the tiles on the right; below them, in order, the rule and the headline, the offer, then the
// QR code with the address under it, the space left shared evenly above, between and below them (nothing stretched; the
// rule keeps the mock-up's gap to its headline); no safe-margin finding. The report gives each window's shape against its
// photo's and how much of the photo's width and height show (checks.mjs showing): each a square, so only the bleed is
// lost. Fixtures only (print-fixtures.mjs): every square 1200 × 1200.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { loadInputs, MOCKUPS_DIR } from "../mockups/build-mockups.mjs";
import { campaign } from "../mockups/parts.mjs";
import { PRINT_DIR } from "../print/build-print.mjs";
import { pagesToPrint, printPage } from "../print/pages.mjs";
import { BLEED_IN, LAYOUT_PX_PER_INCH, PRINT_PIECES, SAFE_IN } from "../print/sizes.mjs";
import { attrsOf, decode, hasClass, placedElements } from "./mockup-html.mjs";
import { lockedBuild, NO_CHROME, photoSet } from "./print-fixtures.mjs";

const printCss = await readFile(join(PRINT_DIR, "print.css"), "utf8");
const inputs = await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder"), today: "2026-10-20" });
const tent = PRINT_PIECES.find((p) => p.id === "tent-card");
/** Half a mock-up pixel, in inches: the most a measured length may be off. */
const HALF_MOCK_PX_IN = 0.5 / LAYOUT_PX_PER_INCH;
const near = (a, b) => Math.abs(a - b) <= HALF_MOCK_PX_IN;
/** "In the corner": the logo's edges within this of the trim's right and bottom edges (the body's own padding is less). */
const CORNER_IN = 0.25;
/** The mock-up's own sizes (mockups.css): the tent's logo 112px wide; the rule's gap to its headline, the body's 11px. */
const MOCK_LOGO_IN = 112 / LAYOUT_PX_PER_INCH;
const MOCK_RULE_GAP_IN = 11 / LAYOUT_PX_PER_INCH;
const POSITIONS = ["tent-large", "tent-top", "tent-bottom"];
const set = await photoSet();
after(() => rm(set.dir, { recursive: true, force: true }));

test("Q17: the tent: one page; no bar, none of its words; one logo per face, the body's last; the body's parts in order", () => {
  const tents = pagesToPrint().filter((p) => p.piece.id === "tent-card");
  assert.deepEqual(tents.map((p) => p.base), ["tent-card"], "one tent card, no variants");
  assert.deepEqual(tent.photoWindow, { w: 1, h: 1 }, "square windows");
  const words = campaign(inputs).eventLine.map((v) => v.value);
  assert.ok(words.includes("Fit AF in Boston"), "the bar's words, from the data (control)");
  const html = printPage(tent, inputs, printCss);
  const els = placedElements(html);
  assert.deepEqual(els.filter((e) => hasClass(e, "event-bar")), [], "no bar");
  const body = /<body\b[^>]*>([\s\S]*)<\/body>/.exec(html)[1].replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");
  const says = [decode(body.replace(/<[^>]*>/g, " ")), ...[...body.matchAll(/<[a-z][a-z0-9]*\b([^>]*)>/gi)].flatMap((m) => Object.values(attrsOf(m[1])))].join("\n");
  for (const w of words) assert.ok(!says.includes(w), `the tent carries "${w}"`);
  const logos = els.filter((e) => e.tag === "img" && hasClass(e, "logo"));
  assert.equal(logos.length, 2, "one logo per face");
  for (const logo of logos) assert.ok(hasClass(logo, "logo-corner") && hasClass(logo.path.at(-1), "tent-body"), "the logo is the body's");
  assert.deepEqual(els.filter((e) => hasClass(e, "logo-plate") || hasClass(e, "bar-plate") || hasClass(e, "logo-large")), [], "no variant's plate or larger logo");
  // Each face's photos, the three, in the grid's order; and the body's parts: the rule and headline, the offer, the code, the logo
  for (const grid of els.filter((e) => hasClass(e, "tent-photos"))) {
    assert.deepEqual(els.filter((e) => e.path.at(-1) === grid).map((e) => e.attrs["data-slot"]), POSITIONS, "the three photos");
  }
  for (const face of els.filter((e) => hasClass(e, "tent-body"))) {
    const kids = els.filter((e) => e.path.at(-1) === face).map((e) => (e.attrs.class ?? "").split(/\s+/)[0]);
    assert.deepEqual(kids, ["rule", "headline", "offer", "scan", "logo"], "the body's parts");
  }
});

/** A box of a face turned 180° read back upright: mirrored in both axes within its trim. */
const turn = (r, t) => ({ ...r, x: 2 * t.x + t.w - r.x - r.w, y: 2 * t.y + t.h - r.y - r.h });
const turnedBack = (face) => {
  const t = face.trim;
  const each = (list) => list.map((r) => turn(r, t));
  return {
    ...face,
    photos: each(face.photos),
    qrs: each(face.qrs),
    logos: each(face.logos),
    blocks: face.blocks.map((b) => ({ ...turn(b, t), content: turn(b.content, t) })),
  };
};
/** A photo's window: its box inside the trim. */
const windowOf = (r, t) => {
  const x = Math.max(r.x, t.x);
  const y = Math.max(r.y, t.y);
  const right = Math.min(r.x + r.w, t.x + t.w);
  const bottom = Math.min(r.y + r.h, t.y + t.h);
  return { x, y, w: right - x, h: bottom - y, r: right, b: bottom };
};

test("Q17: built, both faces: three square windows across the top, into the bleed; the parts in order, evenly; the logo in the corner", { skip: NO_CHROME }, async () => {
  const built = await lockedBuild({ outDir: join(set.dir, "dist-print"), ...set.photos, today: "2026-10-20", fourFlyers: false });
  const pages = built.planned.filter((p) => p.piece.id === "tent-card");
  // One tent card; a proof or final as the offer stands (since SPEC-print-pieces.md § 12.2 the committed offer is approved)
  assert.deepEqual(pages.map((p) => p.stem.replace(/-PROOF$/, "")), ["tent-card"], "one tent card (control)");
  const [p] = pages;
  const page = p.measured.page;
  assert.equal(p.measured.faces.length, 2, "two faces (control)");
  p.measured.faces.forEach((measuredFace, f) => {
    const label = f === 0 ? "the upper face, turned back" : "the lower face";
    const face = f === 0 ? turnedBack(measuredFace) : measuredFace;
    const { trim } = face;
    const box = Object.fromEntries(face.photos.map((ph) => [ph.slot, ph]));
    assert.deepEqual(Object.keys(box).sort(), [...POSITIONS].sort(), `${label}: the three photos (control)`);
    const [large, top, bottom] = POSITIONS.map((slot) => windowOf(box[slot], trim));
    // Each window 1:1; at the fold; across the face; the large window's side two tiles and the gap between them
    for (const [slot, w] of [["tent-large", large], ["tent-top", top], ["tent-bottom", bottom]]) {
      assert.ok(near(w.w, w.h), `${label}: ${slot} is 1:1 (${w.w.toFixed(4)} × ${w.h.toFixed(4)} in)`);
    }
    const across = top.x - large.r;
    const between = bottom.y - top.b;
    assert.ok(across > 0 && near(across, between), `${label}: one gap across and between the tiles (${across.toFixed(4)}, ${between.toFixed(4)} in)`);
    assert.ok(near(large.h, top.h + between + bottom.h), `${label}: the large window's side is two tiles and the gap (${large.h.toFixed(4)} in)`);
    assert.ok(near(large.y, trim.y) && near(top.y, trim.y) && near(bottom.b, large.b), `${label}: at the top of the face`);
    assert.ok(near(large.x, trim.x) && near(top.r, trim.x + trim.w) && near(bottom.r, trim.x + trim.w), `${label}: across the face's width`);
    assert.ok(box["tent-large"].x <= page.x + HALF_MOCK_PX_IN, `${label}: the large photo runs into the bleed on the left`);
    for (const slot of ["tent-top", "tent-bottom"]) {
      assert.ok(box[slot].x + box[slot].w >= page.x + page.w - HALF_MOCK_PX_IN, `${label}: ${slot} runs into the bleed on the right`);
    }
    // Below them, in order: the rule and the headline, the offer, then the QR code with the address under it
    const block = (what) => face.blocks.find((b) => b.what.split(".").includes(what));
    const [rule, headline, offer, scan, body] = ["rule", "headline", "offer", "scan", "tent-body"].map(block);
    const [qr] = face.qrs;
    assert.ok(large.b <= rule.y + HALF_MOCK_PX_IN && rule.y + rule.h <= headline.y, `${label}: the photos, then the rule and the headline`);
    assert.ok(headline.y + headline.h <= offer.y && offer.y + offer.h <= scan.y && qr.y >= scan.y - HALF_MOCK_PX_IN, `${label}: the headline, the offer, the code`);
    assert.ok(near(headline.y - (rule.y + rule.h), MOCK_RULE_GAP_IN), `${label}: the rule keeps the mock-up's gap to its headline`);
    // The space left, shared evenly: above the rule, between the headline and the offer, the offer and the code, below the code
    const c = body.content;
    const gaps = [rule.y - c.y, offer.y - (headline.y + headline.h), scan.y - (offer.y + offer.h), c.y + c.h - (scan.y + scan.h)];
    assert.ok(Math.max(...gaps) - Math.min(...gaps) <= HALF_MOCK_PX_IN && Math.min(...gaps) > 0, `${label}: even (${gaps.map((g) => g.toFixed(4)).join(", ")} in)`);
    // One logo, at the mock-up's size, in the bottom-right corner, inside the safe margin
    assert.equal(face.logos.length, 1, `${label}: one logo`);
    const [logo] = face.logos;
    assert.ok(near(logo.w, MOCK_LOGO_IN), `${label}: the mock-up's logo size (${logo.w.toFixed(4)} in)`);
    const right = trim.x + trim.w - (logo.x + logo.w);
    const under = trim.y + trim.h - (logo.y + logo.h);
    assert.ok(right >= SAFE_IN - HALF_MOCK_PX_IN && under >= SAFE_IN - HALF_MOCK_PX_IN, `${label}: inside the safe margin (${right.toFixed(3)}, ${under.toFixed(3)} in)`);
    assert.ok(right <= CORNER_IN && under <= CORNER_IN && logo.x > qr.x + qr.w && logo.y > offer.y + offer.h, `${label}: in the bottom-right corner, beside the code, below the offer`);
  });
  assert.deepEqual(p.warnings, [], "no safe-margin finding (the bar is gone)");
  // The report: each window's shape against its photo's, and how much of the photo shows. A square covering its window and
  // the bleed loses the bleed alone: the large window, 318.67 mock-up px (two tiles and the gap; a tile (480 - 2 x 4) / 3),
  // shows 318.67 / (318.67 + 15) = 96% of each side; a tile, 157.33 / (157.33 + 15) = 91%
  const shown = { "tent-large": 96, "tent-top": 91, "tent-bottom": 91 };
  for (const [slot, pct] of Object.entries(shown)) {
    const line = built.lines.find((l) => l.startsWith(`photo ${slot}:`));
    assert.ok(line?.includes(", its first square;"), `${slot}: its square (${line})`);
    assert.ok(line.endsWith(`shape 1.00 against the window's 1.00: ${pct}% of its width and ${pct}% of its height show`), `${slot}: ${line}`);
  }
  assert.equal(BLEED_IN * LAYOUT_PX_PER_INCH, 15, "the bleed is 15 mock-up px (control for the arithmetic above)");
  assert.ok(!built.lines.some((l) => l.startsWith("safe margin")), "no safe-margin line in the report");
});
