// `npm run build:print`: the printed tent card and quarter-sheet flyer (SPEC-print-pieces.md), written to dist-print/
// (git-ignored, emptied at every run): the tent card (§ 10: no variants), the flyer (§ 9: no variants) and flyer-1 to
// flyer-4, each a PDF and a PNG proof at 1× (one pixel per CSS pixel, 96 per inch); a PNG preview of the four flyers side
// by side (flyer-1-4.png); and assignment.json (which photo went where). A page still carrying a placeholder (a photo, or
// the offer) is a proof: its files end "-PROOF", and the report's last line says what remains. The pages are OUTPUTS of
// the mock-ups' own faces, parts and inputs (mockups/), with § 8's words and §§ 9–10's layouts; the legend is not printed.
// § 12 (2026-10-20): every flyer PDF has two pages, the front and the back; the back is the same for every flyer, its
// words data/flyer-back.md's (print/back.mjs), and it has one PNG proof, flyer-back(-PROOF).png. A back whose words do not
// fit is refused, never shrunk; until the words are marked approved the back, and so every flyer, is a proof.
//
//   node print/build-print.mjs [--photos-dir DIR --rungs FILE --deliverable FILE] [--on YYYY-MM-DD] [--event ID]
//                             [--front-words FILE] [--back-words FILE] [--out-dir DIR]
//                             [--tout-words FILE] [--entry-words FILE]
//
// § 13: --front-words names front B's words (print/front.mjs; without it every flyer is front A); --back-words a back's
// words other than data/flyer-back.md's (a draft kept outside this repository, read and checked as the committed one);
// --out-dir writes the pieces there instead of dist-print/ (emptied first, as dist-print/ is).
// § 17 (2026-10-23): --tout-words FILE (JSON, print/tout.mjs) adds the giveaway tout, tout(-PROOF).pdf and .png, and its
// US Letter sheet of two, letter-touts(-PROOF).pdf and .png (§ 17.2 item 1); --entry-words FILE (Markdown, print/entry.mjs)
// its entry card, one side (§ 17.3), entry-card(-PROOF).pdf and .png, and its US Letter sheet, letter-entry-cards(-PROOF)
// .pdf and .png, eight cards a page if they fit, else six; without them the build writes what it wrote before. Their words
// are not approved and are kept outside this repository; a [bracket] in either is a placeholder, named.
//
// --photos-dir: the glam set's files, `<id>.jpg` as composed and `<id>-sq-<key>.jpg` each square; --rungs: Image Gauge's
// image-rungs.json for it (§ 3's rule, as § 7 amends it, picks the photos); --deliverable: Image Gauge's deliverable.json
// for it, of which only each tent photo's first square key is read (§ 7 item 2, § 10 item 3). The three go together;
// without them every photo position shows the mock-ups' labelled placeholder. --on and --event as the mock-ups', but with
// no --event the pieces carry PRINT_EVENT (`boston`, § 11 item 2), where the mock-ups carry the first event.
//
// Before printing, a measuring pass (measure.js, in Chrome, over a copy of each page) finds every photo's window, every
// run of text, the QR code and every painted field; the build refuses, printing nothing, when a photo is below MIN_PPI at
// its window, or a field meets a cut edge without running into the bleed, or a page is not its size; it REPORTS text or
// the QR code less than SAFE_IN inside a cut edge, which § 7 (no part moved) leaves it unable to change (checks.mjs).
//
// ⛔ The photographs never enter this repository. They are read from --photos-dir, copied under their position's own file
// name (mockups/photos.json) into a temporary folder that the pages are printed from and that is removed after; only
// dist-print/ (ignored) holds what carries them, and only dist-print/assignment.json names their IDs.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PNG } from "pngjs";
import { copyStatic, loadJson, ROOT, writeQrCodes, writeQrCodesH } from "../build.mjs";
import { loadInputs, MANIFEST_PATH, readManifest } from "../mockups/inputs.mjs";
import { campaign } from "../mockups/parts.mjs";
import { CHROME_DEFAULT, runChrome, screenshot, SETTLE_MS } from "../mockups/png.mjs";
import { assignPhotos, BACK_POSITIONS, backPhotoIds, FLYER_POSITION, fourFlyerPhotos, photoFiles, skippedLines, SQUARE_POSITIONS, TENT_POSITIONS, TOUT_POSITION } from "./assign.mjs";
import { BACK_PATH, BACK_SOURCE, readBack } from "./back.mjs";
import { readEntry } from "./entry.mjs";
import { readFront } from "./front.mjs";
import { backFindings, frontFindings, giveawayFindings, layoutFindings, letterFindings, resolution, showing } from "./checks.mjs";
import { jpegSize } from "./jpeg.mjs";
import { backPlaceholders, giveawayDocument, giveawayPlaceholders, letterDocument, pagesToPrint, placeholdersOf, printDocument } from "./pages.mjs";
import { readTout } from "./tout.mjs";
import { BACK_MIN_TEXT_PX, CSS_PX_PER_INCH, LETTER, LETTER_MARGIN_IN, pageOf, PRINT_PIECES, TYPE_FLOOR_PX } from "./sizes.mjs";

export const PRINT_DIR = dirname(fileURLToPath(import.meta.url));
/** § 15 item 1: the print-only images (the logo drawn for a dark ground), never the page's (copyStatic copies src/assets). */
export const PRINT_ASSETS_DIR = join(PRINT_DIR, "assets");

/** Copies print/assets/*.png into the stage's assets/, beside the page's logo. */
async function copyPrintAssets(stage) {
  await mkdir(join(stage, "assets"), { recursive: true });
  for (const name of (await readdir(PRINT_ASSETS_DIR)).filter((n) => n.endsWith(".png")).sort()) {
    await copyFile(join(PRINT_ASSETS_DIR, name), join(stage, "assets", name));
  }
}
export const DIST_PRINT = join(ROOT, "dist-print");
export const PROOF_SUFFIX = "-PROOF";
/** SPEC-print-pieces.md § 11 item 2 (§ 4's "the Boston event"): the event whose QR code the pieces carry when no --event
 *  names one, by its id in data/events.json. The mock-ups' default stays the first event (`demo`). */
export const PRINT_EVENT = "boston";
const PROOF_SCALE = 1;
const MEASURED = /<script\b[^>]*\bid="print-measure"[^>]*>([\s\S]*?)<\/script>/;
const DUMPED_UNMEASURED = Symbol("the page was dumped without its measurement");
const PDF_END = /%%EOF\s*$/;
const PDF_TAIL_BYTES = 64;
/**
 * A Chrome run silent this long has stalled (a healthy one took at most 2.0 s, measured 2026-10-17 over 270 runs at loads
 * to 137); it is run again, fresh, up to STALL_ATTEMPTS runs in all, each retry named in the report. A hang that is the
 * page's stalls every attempt and still fails (mockups/png.mjs runChrome; test/qc-chrome-stall.test.mjs).
 */
const STALL_MS = 30_000;
const STALL_ATTEMPTS = 3;
/** § 14 item 4: a meal's name on its photo, as the KMS names it; it wraps inside its chip, and nothing shrinks it. */
const PHOTO_NAME_MAX_CHARS = 60;

/** The file name before its extension: a page with a placeholder left is a proof. */
export const stemOf = (page, placeholders) => page.base + (placeholders.length ? PROOF_SUFFIX : "");
/** § 12 item 1: the flyer's one back proof, named as a page is (flyer-back, or flyer-back-PROOF). */
export const BACK_BASE = "flyer-back";
/** A piece's sides: the flyer's two since § 12, each a PDF page; every other piece one. */
const sidesOf = (piece) => piece.sides ?? 1;
/** § 8 item 4's preview of the four flyers: their PNG proofs side by side, this far apart and from the edge (CSS px). */
const PREVIEW_GUTTER_PX = 24;

/** A photo file's upright pixel size, from its header; a file missing or unreadable is refused, naming it. */
function sizeOfFile(photosDir, file) {
  const path = join(photosDir, file);
  if (!existsSync(path)) throw new Error(`${file} is not in --photos-dir`);
  try {
    return jpegSize(readFileSync(path));
  } catch (err) {
    throw new Error(`${file}: ${err.message}`);
  }
}

/**
 * §§ 3, 7, 8, 10 and 12: the rule's photos (the flyer's rung-1 photo read for its shape), each position's file (a tent
 * window's square, by the deliverable), each checked to be in --photos-dir and read for its pixel size, copied under its
 * position's name; with the four flyers, rung 4's four (as composed), copied as flyer-1.jpg to flyer-4.jpg; and with the
 * flyer's back (`withBack`), its three, rung 3's first array holding none of those (§ 12 item 6), each its square.
 */
async function stagePhotos({ photosDir, rungsPath, deliverablePath, manifest, stagedPhotos, fourFlyers, withBack, withTout }) {
  const rungs = await loadJson(rungsPath);
  const front = assignPhotos(rungs, { sizeOf: (id) => sizeOfFile(photosDir, `${id}.jpg`) });
  const chosenFour = fourFlyers ? fourFlyerPhotos(rungs, TENT_POSITIONS.map((p) => front.positions[p])) : null;
  const assignment = withBack ? withBackAssignment(front, backPhotoIds(rungs, [...Object.values(front.positions), ...(chosenFour?.ids ?? [])])) : front;
  const files = photoFiles(assignment, await loadJson(deliverablePath));
  await mkdir(stagedPhotos, { recursive: true });
  const pixels = {};
  for (const [position, file] of Object.entries(files)) {
    const staged = BACK_POSITIONS.includes(position) ? `${position}.jpg` : manifest.slots[position];
    if (!staged) throw new Error(`photo position ${position} is not in mockups/photos.json`);
    try {
      pixels[position] = sizeOfFile(photosDir, file);
    } catch (err) {
      throw new Error(`photo position ${position} (${assignment.from[position]}): ${err.message}`);
    }
    await copyFile(join(photosDir, file), join(stagedPhotos, staged));
  }
  const four = [];
  if (chosenFour) {
    for (const [i, id] of chosenFour.ids.entries()) {
      const number = i + 1;
      const from = `${chosenFour.from}, photo ${number}`;
      const file = `${id}.jpg`;
      let size;
      try {
        size = sizeOfFile(photosDir, file);
      } catch (err) {
        throw new Error(`flyer-${number} (${from}): ${err.message}`);
      }
      await copyFile(join(photosDir, file), join(stagedPhotos, `flyer-${number}.jpg`));
      four.push({ number, id, from, file, staged: `flyer-${number}.jpg`, pixels: size });
    }
  }
  // § 17.3 item 2: the tout's photo is the flyer's, as composed, staged as the tout's own position (its window is its own)
  const tout = withTout ? { id: assignment.positions[FLYER_POSITION], from: `the flyer's photo (${assignment.from[FLYER_POSITION]})`, file: files[FLYER_POSITION] } : null;
  if (tout) {
    await copyFile(join(photosDir, tout.file), join(stagedPhotos, `${TOUT_POSITION}.jpg`));
    files[TOUT_POSITION] = tout.file;
    pixels[TOUT_POSITION] = pixels[FLYER_POSITION];
  }
  return { assignment, files, pixels, four, tout };
}

/** § 12 item 6: the assignment with the back's three positions, left to right, from the back's rung-3 array. */
function withBackAssignment(front, back) {
  const at = (j) => `${back.from}, photo ${j + 1}`;
  return {
    ...front,
    positions: { ...front.positions, ...Object.fromEntries(BACK_POSITIONS.map((p, j) => [p, back.ids[j]])) },
    from: { ...front.from, ...Object.fromEntries(BACK_POSITIONS.map((p, j) => [p, at(j)])) },
  };
}

/**
 * A page's inputs: the build's, but for flyer-1 to flyer-4, whose hero is their own photo (or the placeholder); and, given
 * meal names (§ 13 item 8, --photo-names), each of the flyer's photo positions' name (`captions`), its hero's and its
 * back's three, by the photo the rules placed there. A photo the flyer carries with no name is refused, so a flyer never
 * names some of its meals and not others.
 */
function inputsFor(page, inputs, chosen, photoNames) {
  const own = page.number ? chosen?.four[page.number - 1] : null;
  const flyer = page.number ? (own ? { file: own.staged, present: true } : inputs.photos.flyer) : inputs.photos.flyer;
  const withHero = { ...inputs, photos: { ...inputs.photos, flyer } };
  // § 17.3 item 2: the tout's one photo, the flyer's, its caption the flyer's name for it (a flyer names all its meals)
  if (photoNames && chosen?.tout && page.piece.id === "tout") {
    const name = photoNames[chosen.tout.id];
    if (!name) throw new Error(`--photo-names names no meal for the tout's photo, the flyer's (§ 17.3 item 2)`);
    return { ...withHero, captions: { [TOUT_POSITION]: name } };
  }
  if (!photoNames || page.piece.id !== "flyer" || !chosen) return withHero;
  const ids = { flyer: own ? own.id : chosen.assignment.positions.flyer, ...Object.fromEntries(BACK_POSITIONS.map((p) => [p, chosen.assignment.positions[p]])) };
  const missing = Object.entries(ids).filter(([, id]) => !photoNames[id]).map(([position]) => position);
  if (missing.length) throw new Error(`--photo-names names no meal for ${page.base}'s photo at ${missing.join(", ")} (§ 13 item 8)`);
  return { ...withHero, captions: Object.fromEntries(Object.entries(ids).map(([position, id]) => [position, photoNames[id]])) };
}

/** § 13 item 8: the meal names file, { "<photo id>": "<the meal's name>" }, each a short line of text. */
async function readPhotoNames(path) {
  const names = JSON.parse(await readFile(path, "utf8"));
  for (const [id, name] of Object.entries(names)) {
    if (typeof name !== "string" || !name.trim() || name.length > PHOTO_NAME_MAX_CHARS || /[<>]/.test(name)) {
      throw new Error(`${path}: the name for ${id} must be a line of at most ${PHOTO_NAME_MAX_CHARS} characters (§ 13 item 8)`);
    }
  }
  return names;
}

/** The pixels each of a page's photo positions prints from (its front's; the back's are backPixels'). */
function pixelsFor(page, chosen) {
  if (!chosen) return {};
  if (page.number) return { flyer: chosen.four[page.number - 1].pixels };
  return Object.fromEntries(Object.entries(chosen.pixels).filter(([position]) => !BACK_POSITIONS.includes(position)));
}

/** § 12: the pixels each of the back's photo positions prints from, the same for every flyer. */
const backPixels = (chosen) => (chosen ? Object.fromEntries(BACK_POSITIONS.filter((p) => chosen.pixels[p]).map((p) => [p, chosen.pixels[p]])) : {});

/** How each photo shows in its window, by position, on a face (§§ 9–10, and § 12's back). */
const showsOf = (face, pixels) => Object.fromEntries(face.photos.filter((ph) => pixels[ph.slot]).map((ph) => [ph.slot, showing(pixels[ph.slot], ph, face.trim)]));

/**
 * § 12 items 3–6: a flyer's back as measured (the second sheet of its document), checked: its page and trim, its fields'
 * bleed, its photos' resolution, and whether its words fit (checks.mjs backFindings). What stands in on it, too.
 */
function planBack(page, measured, pageInputs, words, chosen) {
  const sheet = measured.sheets[1];
  if (!sheet) return { refusals: ["the back was not drawn: the page has one sheet"], placeholders: [] };
  const pixels = backPixels(chosen);
  const photos = resolution(sheet.faces.flatMap((f) => f.photos), pixels);
  const fit = backFindings(page.piece, sheet);
  const refusals = [...layoutFindings(page.piece, sheet).refusals, ...photos.refusals, ...fit.refusals];
  const shows = showsOf(sheet.faces[0], pixels);
  return { measured: sheet, photos: photos.rows, shows, refusals, spacePx: fit.spacePx, smallestPx: fit.smallestPx, placeholders: backPlaceholders(pageInputs, words) };
}

/** The measuring pass: a copy of the page with measure.js, its DOM dumped by Chrome, the measurement read back. */
async function measure(run, html, measureJs) {
  const copy = html.replace(/\.html$/, ".measure.html");
  const page = await readFile(html, "utf8");
  await writeFile(copy, page.replace("</body>", `<script>\n${measureJs.trim()}\n</script>\n</body>`));
  const json = await runChrome({
    ...run,
    html: copy,
    args: [`--virtual-time-budget=${SETTLE_MS}`, "--dump-dom"],
    // A whole page dumped without the measurement will never gain it: say so at once rather than wait out the timeout
    ready: ({ stdout }) => MEASURED.exec(stdout)?.[1] ?? (stdout.includes("</html>") ? DUMPED_UNMEASURED : undefined),
    what: `measure ${basename(html)}`,
  });
  if (json === DUMPED_UNMEASURED) throw new Error(`Chrome dumped ${basename(copy)} before the measuring pass wrote its result`);
  return JSON.parse(json);
}

const completePdf = (path) => existsSync(path) && PDF_END.test(readFileSync(path).subarray(-PDF_TAIL_BYTES).toString("latin1"));

async function printPdf(run, html, pdf) {
  await runChrome({
    ...run,
    html,
    args: [`--virtual-time-budget=${SETTLE_MS}`, "--no-pdf-header-footer", `--print-to-pdf=${pdf}`],
    ready: () => completePdf(pdf),
    what: `write ${pdf}`,
  });
  return pdf;
}

/**
 * § 17: a giveaway piece's page, measured and checked, and nothing printed. Its own PDF: each side's page, trim and bleed
 * (layoutFindings), its photo's resolution (the tout's), and whether its words fit, inside the safe margin and at the floor
 * or above (giveawayFindings: refused, never shrunk). A letter sheet (§ 17.2 item 1): each of its layouts in order, the
 * first whose page passes letterFindings used (§ 17.3 item 1: eight cards a page, else six), what each one before it
 * failed by kept for the report; none passes, refused with every layout's refusals. The entry card's own PDF takes the
 * layout its sheet used (`giveaway.cardFace`, set by the sheet, planned first). What stands in on it: its photo, its
 * words until approved, each bracket.
 */
async function planGiveaway({ run, stage, page, pageInputs, printCss, measureJs, chosen, giveaway }) {
  const words = giveaway[page.piece.words];
  const letter = page.letter;
  const piece = !letter && page.piece.id === "entry-card" && giveaway.cardFace ? { ...page.piece, face: giveaway.cardFace } : page.piece;
  const html = join(stage, `${page.base}.html`);
  const pixels = pixelsFor(page, chosen);
  const tried = [];
  let measured;
  let sides;
  for (const layout of letter ? letter.layouts : [null]) {
    await writeFile(html, layout ? letterDocument(letter, layout, piece, pageInputs, printCss, words) : giveawayDocument(piece, pageInputs, printCss, words));
    measured = await measure(run, html, measureJs);
    sides = measured.sheets.map((sheet, k) => ({ side: k ? "the back" : "the front", sheet, layout, ...(layout ? letterFindings(letter, layout, piece, sheet) : ownFindings(piece, sheet)) }));
    const failed = sides.flatMap((s) => s.refusals);
    if (!layout || !failed.length) break;
    // the fit refusals first (what the report says a layout failed by), then the rest
    const fit = failed.filter((r) => overOf(r) > 0);
    tried.push({ layout, refusals: [...fit, ...failed.filter((r) => !fit.includes(r))], overPx: Math.max(0, ...failed.map(overOf)) });
  }
  const used = letter && tried.length === letter.layouts.length ? null : (sides[0].layout ?? null);
  if (used && piece.id === "entry-card") giveaway.cardFace = used.face;
  const photos = resolution(measured.sheets.flatMap((sheet) => sheet.faces.flatMap((f) => f.photos)), pixels);
  const refusals = [
    ...(letter && !used ? tried.flatMap((t) => t.refusals.map((r) => `${t.layout.count} a page: ${r}`)) : []),
    ...(letter ? [] : measured.sheets.length === sidesOf(piece) ? [] : [`${measured.sheets.length} side(s) drawn, not ${sidesOf(piece)}`]),
    ...(letter ? [] : sides.flatMap((s) => s.refusals)),
    ...photos.refusals,
  ];
  const placeholders = giveawayPlaceholders(piece, pageInputs, words);
  const shows = showsOf(measured.faces[0], pixels);
  return { page, piece, html, measured, photos: photos.rows, shows, refusals, warnings: [], placeholders, stem: stemOf(page, placeholders), giveaway: { words, sides, used, tried } };
}

/** The layout px a fit refusal names over, or 0 (checks.mjs giveawayFindings: "… its words run N layout px over"). */
const overOf = (refusal) => Number(/its words run (\d+(?:\.\d+)?) layout px over/.exec(refusal)?.[1] ?? 0);

/** § 17: a giveaway piece's own PDF's side: its page, trim and bleed (layoutFindings) and its words (giveawayFindings). */
function ownFindings(piece, sheet) {
  const words = giveawayFindings(piece, sheet);
  return { ...words, refusals: [...layoutFindings(piece, sheet).refusals, ...words.refusals] };
}

/** The pages, each measured and checked; nothing printed. Throws the refusals, every page's, when there are any. */
async function planPages({ run, stage, inputs, pages, chosen, words, front, photoNames, giveaway }) {
  const printCss = await readFile(join(PRINT_DIR, "print.css"), "utf8");
  const measureJs = await readFile(join(PRINT_DIR, "measure.js"), "utf8");
  const planned = [];
  for (const page of pages) {
    const pageInputs = inputsFor(page, inputs, chosen, photoNames);
    if (page.piece.words) {
      planned.push(await planGiveaway({ run, stage, page, pageInputs, printCss, measureJs, chosen, giveaway }));
      continue;
    }
    const html = join(stage, `${page.base}.html`);
    await writeFile(html, printDocument(page.piece, pageInputs, printCss, words, front));
    const measured = await measure(run, html, measureJs);
    const pixels = pixelsFor(page, chosen);
    const photos = resolution(measured.faces.flatMap((f) => f.photos), pixels);
    const layout = layoutFindings(page.piece, measured);
    // § 12 item 2: the flyer's offer on at most two lines
    const offerRefusals = page.piece.id === "flyer" ? frontFindings(measured).refusals : [];
    const back = sidesOf(page.piece) === 2 ? planBack(page, measured, pageInputs, words, chosen) : null;
    const refusals = [...layout.refusals, ...photos.refusals, ...offerRefusals, ...(back?.refusals ?? [])];
    const placeholders = [...placeholdersOf(page.piece, pageInputs, front), ...(back?.placeholders ?? [])];
    // §§ 9–10: how each photo shows in its window, by position, on the last face (the tent's lower, upright; its upper is
    // the same turned)
    const shows = showsOf(measured.faces.at(-1), pixels);
    planned.push({ page, piece: page.piece, html, measured, photos: photos.rows, shows, refusals, warnings: layout.warnings, placeholders, stem: stemOf(page, placeholders), back });
  }
  const refused = planned.flatMap((p) => p.refusals.map((r) => `${p.page.base}: ${r}`));
  if (refused.length) throw new Error(`refused, nothing printed:\n${refused.join("\n")}`);
  return planned;
}

/**
 * § 12: a page's PNG proof, one PNG per side. A one-sided page is screenshot as it is. A two-sided one (the flyer) is
 * screenshot whole, its sides stacked as its document lays them out, and cut into its sides: the front is the page's
 * proof (`<stem>.png`); the back is returned, its PNG and its pixels' hash, for the one back proof and for the check that
 * every flyer's back is the same page (Q19).
 */
async function writeProof({ run, stage, outDir, p }) {
  // § 17.2 item 1: a letter sheet's proof is its US Letter pages
  const page = p.page.letter ? LETTER : pageOf(p.piece);
  const [w, h] = [page.w, page.h].map((n) => Math.round(n * CSS_PX_PER_INCH));
  const sides = p.page.letter ? 1 : sidesOf(p.piece);
  const png = join(outDir, `${p.stem}.png`);
  if (sides === 1) return { png: await screenshot({ ...run, html: p.html, png, width: w, height: h, scale: PROOF_SCALE }) };
  const whole = await screenshot({ ...run, html: p.html, png: join(stage, `${p.page.base}.sides.png`), width: w, height: h * sides, scale: PROOF_SCALE });
  const [front, back] = splitSides(readFileSync(whole), sides);
  await writeFile(png, front.png);
  return { png, back };
}

/** A PNG of `sides` equal bands stacked, cut into one PNG per band: each its bytes and its pixels' SHA-256 (RGBA). */
function splitSides(bytes, sides) {
  const whole = PNG.sync.read(bytes);
  const height = whole.height / sides;
  if (!Number.isInteger(height)) throw new Error(`a proof of ${whole.height} px does not cut into ${sides} sides`);
  const row = whole.width * 4;
  return Array.from({ length: sides }, (_, i) => {
    const side = new PNG({ width: whole.width, height });
    whole.data.copy(side.data, 0, i * height * row, (i + 1) * height * row);
    return { png: PNG.sync.write(side), pixels: createHash("sha256").update(side.data).digest("hex") };
  });
}

/**
 * § 12 item 1: the one back proof, flyer-back(-PROOF).png, from the flyers' backs as each flyer's document draws them,
 * which must be the same page, pixel for pixel (the vendor imposes four fronts on one side and four backs on the other).
 */
async function writeBackProof({ outDir, planned }) {
  const backs = planned.filter((p) => p.back);
  if (backs.length === 0) return [];
  const differ = backs.filter((p) => p.back.pixels !== backs[0].back.pixels).map((p) => p.page.base);
  if (differ.length) throw new Error(`the flyers' backs are not the same page: ${differ.join(", ")} differ from ${backs[0].page.base}'s`);
  const png = join(outDir, `${backStem(backs[0])}.png`);
  await writeFile(png, backs[0].back.png);
  return [png];
}

/** The back proof's name: a proof while anything on the back stands in (its photos, its words until approved). */
const backStem = (p) => BACK_BASE + (p.back.placeholders.length ? PROOF_SUFFIX : "");

/** § 8 item 4: the four flyers' PNG proofs side by side, as one PNG (a preview; the vendor imposes the PDFs). */
async function writePreviews({ run, stage, outDir, planned, inputs }) {
  const written = [];
  const four = planned.filter((p) => p.page.number);
  if (four.length) {
    const one = pageOf(four[0].piece);
    const [w, h] = [one.w, one.h].map((n) => Math.round(n * CSS_PX_PER_INCH));
    const imgs = four.map((p) => `<img src="${pathToFileURL(join(outDir, `${p.stem}.png`)).href}" width="${w}" height="${h}" alt="">`);
    const html = join(stage, "preview.html");
    await writeFile(
      html,
      `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>flyer-1 to flyer-4</title>\n<style>\n${inputs.site.root}\n` +
        `html, body { margin: 0; background: var(--ice); }\n.four { display: flex; gap: ${PREVIEW_GUTTER_PX}px; padding: ${PREVIEW_GUTTER_PX}px; }\nimg { display: block; }\n</style>\n</head>\n` +
        `<body>\n<div class="four">${imgs.join("")}</div>\n</body>\n</html>\n`,
    );
    const proof = four.some((p) => p.placeholders.length) ? PROOF_SUFFIX : "";
    const size = { width: four.length * w + (four.length + 1) * PREVIEW_GUTTER_PX, height: h + 2 * PREVIEW_GUTTER_PX };
    written.push(await screenshot({ ...run, html, png: join(outDir, `flyer-1-${four.length}${proof}.png`), ...size, scale: PROOF_SCALE }));
  }
  return written;
}

/** §§ 9–10, said: a photo's shape against its window's, and how much of its width and height show. */
const percent = (n) => `${Math.round(n * 100)}%`;
const showsLine = (s) =>
  `; shape ${s.shape.toFixed(2)} against the window's ${s.window.toFixed(2)}: ${percent(s.width)} of its width and ${percent(s.height)} of its height show`;

/**
 * Which file a position prints (§§ 7 and 10): its first square, or the photo as composed, and for a tent window, which
 * is square, why (§ 10 item 3: the deliverable has none for it).
 */
function fileKind(chosen, slot) {
  if (chosen.files[slot] !== `${chosen.assignment.positions[slot]}.jpg`) return "its first square";
  return SQUARE_POSITIONS.includes(slot) ? "as composed: the deliverable lists no square for it" : "as composed";
}

/** A photo's row for the record: its pixels, its window in inches and its ppi. */
const photoRecord = (r) => ({ pixels: [r.width, r.height], window_in: [r.w, r.h].map((n) => Number(n.toFixed(3))), ppi: Math.floor(r.ppi) });

function assignmentRecord(chosen, planned) {
  const pieces = planned.filter((p) => !p.page.number && !p.giveaway); // the tent card and the flyer
  const sides = pieces.flatMap((p) => [p, ...(p.back ? [p.back] : [])]); // and the flyer's back (§ 12)
  const rows = Object.fromEntries(sides.flatMap((p) => p.photos.map((r) => [r.slot, { row: r, shows: p.shows[r.slot] }])));
  const back = pieces.find((p) => p.back);
  const positions = [...PRINT_PIECES.flatMap((p) => p.positions), ...(back ? BACK_POSITIONS : [])].map((position) => {
    if (!chosen) return [position, null];
    const { positions: ids, from } = chosen.assignment;
    const { row, shows } = rows[position];
    return [position, { id: ids[position], from: from[position], file: chosen.files[position], ...photoRecord(row), shows }];
  });
  const four = (chosen?.four ?? []).map((f) => {
    const page = planned.find((p) => p.page.number === f.number);
    const [row] = page?.photos ?? [];
    return { number: f.number, id: f.id, from: f.from, file: f.file, ...(row ? photoRecord(row) : {}), shows: page?.shows.flyer };
  });
  return {
    about: "SPEC-print-pieces.md §§ 3, 7, 8, 9, 10, 12: which photo went where, by rule. Written by npm run build:print into dist-print/, which git ignores: never committed.",
    pool: chosen ? chosen.assignment.pool : null,
    positions: Object.fromEntries(positions),
    flyer_skipped: chosen ? chosen.assignment.skipped : [],
    four_flyers: four,
    pages: Object.fromEntries(planned.map((p) => [p.page.base, { pdf: `${p.stem}.pdf`, png: `${p.stem}.png`, placeholders: p.placeholders }])),
    back: back ? { png: `${backStem(back)}.png`, placeholders: back.back.placeholders, space_px: Number(back.back.spacePx.toFixed(1)), smallest_px: back.back.smallestPx } : null,
    // § 17: the tout's one photo, the flyer's, at the tout's window (only when the tout is built)
    ...toutRecord(chosen, planned),
  };
}

/** § 17: the tout's photo for assignment.json, as the flyer's is recorded; nothing when no tout is built. */
function toutRecord(chosen, planned) {
  const tout = planned.find((p) => p.piece.id === "tout" && !p.page.letter);
  if (!tout) return {};
  const [row] = tout.photos;
  if (!chosen || !row) return { tout: null };
  const own = chosen.tout;
  return { tout: { id: own.id, from: own.from, file: own.file, ...photoRecord(row), shows: tout.shows[TOUT_POSITION] } };
}

/** Lines of the same text joined, each naming the pages it is on (the pages in the build's order). */
function grouped(items) {
  const groups = new Map();
  for (const { text, name } of items) groups.set(text, [...(groups.get(text) ?? []), name]);
  return [...groups].map(([text, names]) => ({ text, names }));
}

/**
 * § 17: the giveaway pieces' lines: the words each was made from, the tout's photo, and how each side's words fit (the
 * least room any of its boxes leaves) and its smallest type.
 */
function giveawayLines(planned, chosen, at, shown) {
  const lines = [];
  for (const p of planned.filter((q) => q.giveaway)) {
    const { words, sides, used, tried } = p.giveaway;
    const letter = p.page.letter;
    const page = used ? `, US Letter, ${used.count} a page (${used.face.w.toFixed(2)} × ${used.face.h.toFixed(2)} in), no bleed, nothing within ${LETTER_MARGIN_IN} in of the paper's edge` : "";
    lines.push(`${p.page.base}: the words of ${words.source} (§ 17)${page}${words.approved ? "" : ", not approved: a proof"}`);
    // § 17.3 item 1: which layout, and by how much each one before it did not fit
    for (const t of tried) lines.push(`${p.page.base}: ${t.layout.count} a page did not fit${t.overPx ? `, ${t.overPx.toFixed(1)} layout px over` : ""}: ${t.refusals[0]}${t.refusals.length > 1 ? ` (and ${t.refusals.length - 1} more)` : ""}`);
    for (const r of letter ? [] : p.photos) lines.push(`photo ${p.page.base}: ${p.piece.id === "tout" && chosen?.tout ? `${chosen.tout.from}, ` : ""}${at(r)}${shown(p, r.slot)}`);
    for (const s of sides) lines.push(`${p.page.base}, ${s.side}: the words fit, ${Number(s.spacePx.toFixed(1))} layout px to spare at the closest; the smallest type ${s.smallestPx} layout px (the floor ${TYPE_FLOOR_PX})`);
  }
  return lines;
}

/** The report: a line per file, the photos, the offer, the QR code, the findings, and LAST what placeholders remain. */
function reportLines({ written, chosen, planned, inputs, eventId, retries, backSource = BACK_SOURCE }) {
  const { offer } = campaign(inputs);
  const event = inputs.data.events[inputs.eventIndex];
  const lines = written.map((f) => `wrote ${f}`);
  if (!chosen) lines.push("photos: none given (--photos-dir, --rungs and --deliverable): every position shows its placeholder");
  const at = (r) => `${r.width} × ${r.height} px over ${r.w.toFixed(2)} × ${r.h.toFixed(2)} in = ${Math.floor(r.ppi)} ppi`;
  const shown = (p, slot) => (p.shows[slot] ? showsLine(p.shows[slot]) : "");
  for (const p of planned.filter((q) => !q.page.number && !q.giveaway)) {
    for (const r of p.photos) lines.push(`photo ${r.slot}: ${chosen.assignment.from[r.slot]}, ${fileKind(chosen, r.slot)}; ${at(r)}${shown(p, r.slot)}`);
  }
  if (chosen) lines.push(...skippedLines(chosen.assignment));
  for (const p of planned.filter((q) => q.page.number)) {
    for (const r of p.photos) lines.push(`photo flyer-${p.page.number}: ${chosen.four[p.page.number - 1].from}, as composed; ${at(r)}${shown(p, "flyer")}`);
  }
  // § 12: the flyer's back, once (it is the same page on every flyer): its photos, and how its words fit
  const back = planned.find((q) => q.back)?.back;
  if (back) {
    for (const r of back.photos) lines.push(`photo ${r.slot}: ${chosen.assignment.from[r.slot]}, ${fileKind(chosen, r.slot)}; ${at(r)}${shown(back, r.slot)}`);
    const flyers = planned.filter((q) => q.back).length;
    lines.push(
      `back: ${backSource}'s words fit, ${back.spacePx.toFixed(1)} layout px to spare above the bottom row; the smallest type ${back.smallestPx} layout px (the floor ${BACK_MIN_TEXT_PX}); the same page 2 on ${flyers === 1 ? "the flyer" : `all ${flyers} flyers`}`,
    );
  }
  lines.push(...giveawayLines(planned, chosen, at, shown));
  lines.push(`offer: ${offer.id} (offerForSave on ${inputs.today}): "${offer.value}"`);
  const which = eventId === undefined ? "the default, PRINT_EVENT" : "--event";
  lines.push(`QR: event "${event.id}" (${which}) carries ${event.url} (qr/${event.id}.svg, written by build.mjs writeQrCodes)`);
  const warnings = grouped(planned.flatMap((p) => p.warnings.map((text) => ({ text, name: p.page.base }))));
  for (const w of warnings) lines.push(`safe margin, ${w.names.join(", ")}: ${w.text} (the approved layout's; § 7: no part is moved)`);
  lines.push(...retries);
  const proofs = grouped(planned.filter((p) => p.placeholders.length).map((p) => ({ text: p.placeholders.join(", "), name: `${p.stem}.pdf` })));
  lines.push(
    proofs.length
      ? `placeholders remain: ${proofs.map((g) => `${g.names.join(", ")} (${g.text})`).join("; ")}`
      : `placeholders remain: none (${planned.map((p) => `${p.stem}.pdf`).join(", ")})`,
  );
  return lines;
}

export async function buildPrint({
  outDir = DIST_PRINT,
  chrome = process.env.CHROME || CHROME_DEFAULT,
  photosDir,
  rungsPath,
  deliverablePath,
  manifestPath = MANIFEST_PATH,
  backPath = BACK_PATH,
  today,
  eventId,
  fourFlyers = true,
  frontPath,
  photoNamesPath,
  backSource = BACK_SOURCE,
  toutPath,
  entryPath,
  ...paths
} = {}) {
  const pages = pagesToPrint({ fourFlyers, tout: Boolean(toutPath), entry: Boolean(entryPath) });
  // the flyer's back (§ 12); the entry card's two sides (§ 17) are its own words'
  const withBack = pages.some((p) => p.piece.back && sidesOf(p.piece) === 2);
  const given = [photosDir, rungsPath, deliverablePath].filter(Boolean).length;
  if (given !== 0 && given !== 3) throw new Error("--photos-dir, --rungs and --deliverable go together: give all three, or none for placeholders");
  // dist-print/ is wholly this build's output: emptied first, so a refused run leaves nothing to mistake for a piece.
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const stage = await mkdtemp(join(tmpdir(), "boston-print-"));
  const retries = [];
  const run = { chrome, timeoutMs: STALL_MS, attempts: STALL_ATTEMPTS, onRetry: (note) => retries.push(note) };
  try {
    const stagedPhotos = join(stage, "photos");
    const manifest = await readManifest(manifestPath);
    // § 12 item 4: the back's words, read and checked first (a file outside the subset is refused, naming its line)
    const words = withBack ? await readBack(backPath, backSource) : null;
    // § 13: front B, when --front-words names its words (checked first, as the back's are); without it every flyer is front A
    const front = frontPath ? await readFront(frontPath) : null;
    const photoNames = photoNamesPath ? await readPhotoNames(photoNamesPath) : null;
    // § 17: the giveaway's words, each read and checked first (refused outside its keys or its subset, naming them)
    const giveaway = { tout: toutPath ? await readTout(toutPath) : null, entry: entryPath ? await readEntry(entryPath) : null };
    const chosen = photosDir ? await stagePhotos({ photosDir, rungsPath, deliverablePath, manifest, stagedPhotos, fourFlyers, withBack, withTout: Boolean(toutPath) }) : null;
    const inputs = await loadInputs({ ...paths, manifestPath, photosDir: stagedPhotos, today, eventId: eventId ?? PRINT_EVENT });
    await copyStatic(stage, { base: null }); // the page's fonts and logo; no photo sheet
    await copyPrintAssets(stage); // § 15 item 1: the print-only logo drawn for a dark ground
    await writeQrCodes(inputs.data.events, stage); // the build's own QR codes
    // § 13 item 11: front B's code, the same URL by the same library and options at error correction H, for its logo
    await writeQrCodesH(inputs.data.events, stage);
    const planned = await planPages({ run, stage, inputs, pages, chosen, words, front, photoNames, giveaway });
    const written = [];
    for (const p of planned) {
      written.push(await printPdf(run, p.html, join(outDir, `${p.stem}.pdf`)));
      const proof = await writeProof({ run, stage, outDir, p });
      written.push(proof.png);
      if (p.back) Object.assign(p.back, proof.back);
    }
    written.push(...(await writeBackProof({ outDir, planned })));
    written.push(...(await writePreviews({ run, stage, outDir, planned, inputs })));
    const assignment = join(outDir, "assignment.json");
    await writeFile(assignment, `${JSON.stringify(assignmentRecord(chosen, planned), null, 2)}\n`);
    written.push(assignment);
    const first = planned.find((p) => p.back);
    const back = first ? { stem: backStem(first), placeholders: first.back.placeholders, spacePx: first.back.spacePx, smallestPx: first.back.smallestPx, words } : null;
    return { written, planned, inputs, chosen, back, front, retries, lines: [...(front ? [`front B: the words of ${front.source} (§ 13)${front.approved ? "" : ", not approved: every flyer a proof"}`] : []), ...reportLines({ written, chosen, planned, inputs, eventId, retries, backSource: words?.source })] };
  } catch (err) {
    if (retries.length) err.message += `\n(and Chrome runs retried before it: ${retries.join("; ")})`;
    throw err;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

function argsOf(argv) {
  const out = {};
  const value = (i) => {
    if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) throw new Error(`${argv[i]} needs a value`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === "--photos-dir") out.photosDir = value(i);
    else if (argv[i] === "--rungs") out.rungsPath = value(i);
    else if (argv[i] === "--deliverable") out.deliverablePath = value(i);
    else if (argv[i] === "--on") out.today = value(i);
    else if (argv[i] === "--event") out.eventId = value(i);
    else if (argv[i] === "--front-words") out.frontPath = value(i);
    else if (argv[i] === "--back-words") {
      // a draft outside the repository, named by its file name (its words cite it, and so does the report)
      out.backPath = value(i);
      out.backSource = basename(out.backPath);
    }
    else if (argv[i] === "--out-dir") out.outDir = value(i);
    else if (argv[i] === "--photo-names") out.photoNamesPath = value(i);
    else if (argv[i] === "--tout-words") out.toutPath = value(i);
    else if (argv[i] === "--entry-words") out.entryPath = value(i);
    else throw new Error(`unknown option ${argv[i]}`);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { lines } = await buildPrint(argsOf(process.argv.slice(2)));
  for (const line of lines) console.log(line);
}
