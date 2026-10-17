// Q16 (SPEC-print-pieces.md § 9, the Advisor, 2026-10-17): the flyer without its header, the logo at the bottom right,
// and a taller photo; the four flyers likewise. On every flyer page: no header bar and none of its words; one logo, the
// body's last part, its box in the face's bottom-right corner inside the safe margin; the photo window (the photo's box
// inside the trim) 3:2 across the face's width at its top, within half a mock-up pixel, the box running into the bleed on
// the top, left and right; below it, in order, the offer, then the QR code with the address under it; the space left
// shared evenly above, between and below them (nothing stretched); and no safe-margin finding (it went with the bar). The
// report gives each flyer photo's shape against the window's and how much of its width and height show (checks.mjs
// showing). Fixtures only (print-fixtures.mjs): the composed photos are 3000 × 2000, 3:2.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { loadInputs, MOCKUPS_DIR } from "../mockups/build-mockups.mjs";
import { campaign } from "../mockups/parts.mjs";
import { PRINT_DIR } from "../print/build-print.mjs";
import { showing } from "../print/checks.mjs";
import { pagesToPrint, printPage } from "../print/pages.mjs";
import { LAYOUT_PX_PER_INCH, PRINT_PIECES, SAFE_IN } from "../print/sizes.mjs";
import { attrsOf, decode, hasClass, placedElements } from "./mockup-html.mjs";
import { lockedBuild, NO_CHROME, photoSet } from "./print-fixtures.mjs";

const printCss = await readFile(join(PRINT_DIR, "print.css"), "utf8");
const inputs = await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder"), today: "2026-10-20" });
const flyer = PRINT_PIECES.find((p) => p.id === "flyer");
const flyerPages = pagesToPrint().filter((p) => p.piece.id === "flyer");
/** Half a mock-up pixel, in inches: the most a measured length may be off. */
const HALF_MOCK_PX_IN = 0.5 / LAYOUT_PX_PER_INCH;
/** "In the corner": the logo's edges within this of the trim's right and bottom edges (the body's own padding is less). */
const CORNER_IN = 0.25;
const set = await photoSet();
after(() => rm(set.dir, { recursive: true, force: true }));

test("Q16: the flyer and its four: no header bar, none of its words, one logo after the QR code, no plate on the photo", () => {
  assert.equal(flyerPages.length, 5, "the flyer and flyer-1 to flyer-4 (control)");
  assert.deepEqual(flyer.photoWindow, { w: 3, h: 2 });
  const words = campaign(inputs).eventLine.map((v) => v.value);
  assert.ok(words.includes("Fit AF in Boston"), "the header's words, from the data (control)");
  for (const page of flyerPages) {
    const html = printPage(page.piece, inputs, printCss, page.variant);
    const els = placedElements(html);
    assert.deepEqual(els.filter((e) => hasClass(e, "event-bar")), [], `${page.base}: no header bar`);
    const body = /<body\b[^>]*>([\s\S]*)<\/body>/.exec(html)[1].replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");
    const says = [decode(body.replace(/<[^>]*>/g, " ")), ...[...body.matchAll(/<[a-z][a-z0-9]*\b([^>]*)>/gi)].flatMap((m) => Object.values(attrsOf(m[1])))].join("\n");
    for (const w of words) assert.ok(!says.includes(w), `${page.base} carries "${w}"`);
    const logos = els.filter((e) => e.tag === "img" && hasClass(e, "logo"));
    assert.equal(logos.length, 1, `${page.base}: one logo`);
    assert.ok(hasClass(logos[0], "logo-corner") && hasClass(logos[0].path.at(-1), "flyer-body"), `${page.base}: the logo is the body's`);
    assert.deepEqual(els.filter((e) => hasClass(e, "logo-plate")), [], `${page.base}: no plate on the photo`);
    // The body's parts in order: the offer, the QR code with the address under it, the logo
    const [face] = els.filter((e) => hasClass(e, "flyer-body"));
    const kids = els.filter((e) => e.path.at(-1) === face).map((e) => (e.attrs.class ?? "").split(/\s+/)[0]);
    assert.deepEqual(kids, ["offer", "scan", "logo"], `${page.base}: the body's parts`);
  }
});

test("Q16 control: how a photo shows in its window (its shape against the window's, the share of each side shown)", () => {
  const trim = { x: 0.125, y: 0.125, w: 4.25, h: 4.25 / 1.5 };
  const box = { x: 0, y: 0, w: 4.5, h: trim.h + 0.125 };
  const s32 = showing({ width: 3000, height: 2000 }, box, trim);
  assert.deepEqual([s32.shape, Number(s32.window.toFixed(6))], [1.5, 1.5]);
  assert.ok(Math.abs(s32.width - 4.25 / 4.5) < 1e-9 && Math.abs(s32.height - trim.h / 3) < 1e-9, "a 3:2 photo: the bleed alone is lost");
  const s43 = showing({ width: 4000, height: 3000 }, box, trim);
  assert.ok(Math.abs(s43.width - 4.25 / 4.5) < 1e-9 && Math.abs(s43.height - trim.h / 3.375) < 1e-9, "a 4:3 photo: its top and bottom cropped");
});

test("Q16: built, every flyer page: a 3:2 window at the top, into the bleed; the offer, then the code; even space; the logo in the corner", { skip: NO_CHROME }, async () => {
  const built = await lockedBuild({ outDir: join(set.dir, "dist-print"), ...set.photos, today: "2026-10-20", variants: ["a"] });
  const pages = built.planned.filter((p) => p.piece.id === "flyer");
  assert.equal(pages.length, 5, "the flyer and its four (control)");
  for (const p of pages) {
    const label = p.page.base;
    const [face] = p.measured.faces;
    const { trim } = face;
    const page = p.measured.page;
    const [photo] = face.photos;
    // The window: the photo's box inside the trim, across the face's width at its top, 3:2
    const win = { x: Math.max(photo.x, trim.x), y: Math.max(photo.y, trim.y), r: Math.min(photo.x + photo.w, trim.x + trim.w), b: Math.min(photo.y + photo.h, trim.y + trim.h) };
    const [w, h] = [win.r - win.x, win.b - win.y];
    assert.ok(Math.abs(w - trim.w) <= HALF_MOCK_PX_IN && Math.abs(win.y - trim.y) <= HALF_MOCK_PX_IN, `${label}: across the face, at its top`);
    assert.ok(Math.abs(h - (w * 2) / 3) <= HALF_MOCK_PX_IN, `${label}: 3:2 (${w.toFixed(4)} × ${h.toFixed(4)} in)`);
    assert.ok(photo.x <= page.x + HALF_MOCK_PX_IN && photo.y <= page.y + HALF_MOCK_PX_IN && photo.x + photo.w >= page.x + page.w - HALF_MOCK_PX_IN, `${label}: into the bleed, top, left and right`);
    // Below it, in order: the offer, then the QR code with the address under it
    const block = (what) => face.blocks.find((b) => b.what.split(".").includes(what));
    const [offer, scan, body] = ["offer", "scan", "flyer-body"].map(block);
    const [qr] = face.qrs;
    assert.ok(win.b <= offer.y + HALF_MOCK_PX_IN && offer.y + offer.h <= scan.y && qr.y >= scan.y - HALF_MOCK_PX_IN, `${label}: the photo, the offer, the code`);
    // The space left, shared evenly: above the offer, between it and the code, below the code
    const c = body.content;
    const gaps = [offer.y - c.y, scan.y - (offer.y + offer.h), c.y + c.h - (scan.y + scan.h)];
    assert.ok(Math.max(...gaps) - Math.min(...gaps) <= HALF_MOCK_PX_IN && Math.min(...gaps) > 0, `${label}: even (${gaps.map((g) => g.toFixed(4)).join(", ")} in)`);
    // The logo in the bottom-right corner, inside the safe margin
    const [logo] = face.logos;
    const right = trim.x + trim.w - (logo.x + logo.w);
    const bottom = trim.y + trim.h - (logo.y + logo.h);
    assert.ok(right >= SAFE_IN - HALF_MOCK_PX_IN && bottom >= SAFE_IN - HALF_MOCK_PX_IN, `${label}: inside the safe margin (${right.toFixed(3)}, ${bottom.toFixed(3)} in)`);
    assert.ok(right <= CORNER_IN && bottom <= CORNER_IN && logo.x > qr.x + qr.w, `${label}: in the bottom-right corner, right of the code`);
    assert.deepEqual(p.warnings, [], `${label}: no safe-margin finding (the bar is gone)`);
  }
  // The report: each flyer photo's shape against the window's, and the share of its width and height that shows
  const shown = "shape 1.50 against the window's 1.50: 94% of its width and 94% of its height show";
  for (const name of ["flyer", "flyer-1", "flyer-2", "flyer-3", "flyer-4"]) {
    assert.ok(built.lines.some((l) => l.startsWith(`photo ${name}:`) && l.endsWith(shown)), `${name}: ${built.lines.find((l) => l.startsWith(`photo ${name}:`))}`);
  }
  assert.ok(!built.lines.some((l) => l.startsWith("safe margin")), "no safe-margin line in the report");
});
