// Shared by the cases of SPEC-print-pieces.md § 17 (the giveaway tout and its entry card: QG31–QG34) and its two mirror
// mutants (qg-mutants.test.mjs). Not a test file itself. "G" for the giveaway.
//
// ⚠ § 17 item 5 names its cases Q31–Q34, and Q31 is already § 16.1's (q31-owners-five). Here they are QG31–QG34, each
// numbered as § 17 numbers it, as § 11's were QE12–QE15 (qe-checks.mjs).
//
// Each check runs over a package tree `root` (this package, or a mirror of it: qe-checks.mjs printMirror) and returns its
// problems, [] when the tree holds § 17; the case runs it on this package and the mutant on a mirror. ⛔ The words are a
// fixture's, invented, never the giveaway's (they are not approved, and this repository is public); the photos are
// print-fixtures.mjs's synthetic JPEGs, their IDs made at random.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { CHROME, FITTING_BACK_PATH, oneAtATime, pdfPages, photoSet } from "./print-fixtures.mjs";
import { mealNames, NO_POPPLER } from "./qb-checks.mjs";
import { BOSTON_URL } from "./qe-checks.mjs";

export { NO_POPPLER };
/** The date the builds pick the offer on: fixed, so a run does not depend on today. */
export const ON = "2026-10-20";
/** § 17 item 1: each piece is 6 × 4 in landscape, its page the trim plus the bleed: 6.25 × 4.25 in, in points. */
export const GIVEAWAY_BOX = [0, 0, 450, 306];
/** § 17 items 2–3: the type floor (§ 12 item 3's, in layout px), the safe margin, the QR code's least side, the lines' least pitch. */
export const FLOOR_PX = 14;
export const SAFE_IN = 0.125;
export const QR_MIN_IN = 0.75;
export const PITCH_MIN_IN = 0.3;
const TOLERANCE_IN = 0.5 / 96;

const load = (root, rel) => import(pathToFileURL(join(root, rel)).href);

/** QG31: the tout's words, a fixture's: neutral, and no bracket (so a proof only for want of approval or a photo). */
export const TOUT_FIXTURE = {
  headline: ["FIXTURE", "LINE *TWO*", "THREE"],
  lede: "A fixture lede with *its accent* words.",
  banner: "Fixture banner words",
  scan: "Fixture scan line",
  fine: "Fixture fine print, set at the type floor and never shrunk: these words stand in for the giveaway's, which are not approved and are kept outside this repository. More words, to run over several lines.",
};

/**
 * QG32: the entry card's words, a fixture's, in § 17.3's shape: one side, its heading, its one field email-shaped (its
 * blanks writing lines, its @ and . printed), and its fine print, with **bold** runs. Short enough for eight a page.
 */
export const ENTRY_FIXTURE = `# Front

## Fixture heading words

- Mail: ______ @ ________ . ___

**Fixture rule one.** Its words after the bold. **A second bold run**: then plain words to the end of the paragraph.

A second paragraph of fine print, its words plain.
`;

/** The fixture's fine print as a reader sees it (its ** marks not printed), paragraph by paragraph. */
export const ENTRY_FINE = [
  "Fixture rule one. Its words after the bold. A second bold run: then plain words to the end of the paragraph.",
  "A second paragraph of fine print, its words plain.",
];
/** The runs the fixture's card carries, in its order: the heading, the email line's words, its @ and its ., the fine print. */
export const ENTRY_RUNS = ["Fixture heading words", "Mail:", "@", ".", ...ENTRY_FINE];

/**
 * § 17.3 item 1: the fixture with its fine print said `times` times over (as one paragraph each), to fit six a page but
 * not eight (`times` 4), or neither (12). Measured 2026-10-23 on this tree's first build; the case reports the layout
 * the build chose and checks it against what the report says, so a change of spacing that moves the line is its own.
 */
export const longEntry = (times) => `${ENTRY_FIXTURE.replace(/\n+$/, "")}${`\n\n${ENTRY_FINE[0]} More fixture words to fill the card.`.repeat(times)}\n`;

/** Write `text` (a string, or an object as JSON) to a new temporary folder as `name`; returns { dir, path }. */
export async function wordsFile(text, name) {
  const dir = await mkdtemp(join(tmpdir(), "boston-qg-words-"));
  const path = join(dir, name);
  await writeFile(path, typeof text === "string" ? text : JSON.stringify(text));
  return { dir, path };
}

async function withTmp(fn) {
  const dir = await mkdtemp(join(tmpdir(), "boston-qg-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** A build of `root`'s print pieces with the cases' Chrome, one at a time across the suite, the back's words that fit. */
const build = (root, options) =>
  load(root, "print/build-print.mjs").then(({ buildPrint }) => oneAtATime(() => buildPrint({ chrome: CHROME, today: ON, backPath: FITTING_BACK_PATH, ...options })));

const flat = (s) => s.replace(/\s+/g, "").toLowerCase();
const pdfText = (pdf, n, raw = false) => execFileSync("pdftotext", [...(raw ? ["-raw"] : []), "-f", String(n), "-l", String(n), pdf, "-"]).toString("utf8");
/** Whether page `n` of a PDF carries `run`, in poppler's reading order or the drawing order, case and spaces aside. */
const carries = (pdf, n, run) => [false, true].some((raw) => flat(pdfText(pdf, n, raw)).includes(flat(run)));

/** A page of a PDF drawn by pdftoppm at `dpi`, as a PNG read by pngjs. */
function drawn(pdf, n, dpi) {
  return PNG.sync.read(execFileSync("pdftoppm", ["-png", "-r", String(dpi), "-f", String(n), "-l", String(n), "-singlefile", pdf]));
}

/** The share of a box's pixels (inches from the page's corner) under half grey, in a page drawn at `dpi`. */
function darkShare(png, box, dpi) {
  const at = (inches) => Math.round(inches * dpi);
  let [dark, all] = [0, 0];
  for (let y = Math.max(0, at(box.y)); y < Math.min(png.height, at(box.y + box.h)); y += 1) {
    for (let x = Math.max(0, at(box.x)); x < Math.min(png.width, at(box.x + box.w)); x += 1) {
      const i = (y * png.width + x) * 4;
      all += 1;
      if ((png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3 < 128) dark += 1;
    }
  }
  return all ? dark / all : 0;
}

/** Each measured run of text and QR code on a sheet that is less than SAFE_IN inside the trim, or under the floor. */
function marginAndFloorProblems(name, sheet) {
  const problems = [];
  for (const face of sheet.faces) {
    const t = face.trim;
    const short = (r) => r.x - t.x < SAFE_IN - TOLERANCE_IN || r.y - t.y < SAFE_IN - TOLERANCE_IN || t.x + t.w - (r.x + r.w) < SAFE_IN - TOLERANCE_IN || t.y + t.h - (r.y + r.h) < SAFE_IN - TOLERANCE_IN;
    for (const r of face.texts) {
      if (short(r)) problems.push(`${name}: "${r.text}" is less than ${SAFE_IN} in inside the trim`);
      if (!(r.size >= FLOOR_PX)) problems.push(`${name}: "${r.text}" is ${r.size} layout px, under ${FLOOR_PX}`);
    }
    for (const q of face.qrs) if (short(q)) problems.push(`${name}: the QR code is less than ${SAFE_IN} in inside the trim`);
  }
  return problems;
}

/** A PDF's every page box: one of `pages` pages, each `box` (in points), landscape or portrait as `landscape` says. */
function pageProblems(name, bytes, pages, box = GIVEAWAY_BOX, landscape = true) {
  const got = pdfPages(bytes);
  const problems = [];
  if (got.pages !== pages) problems.push(`${name} has ${got.pages} page(s), not ${pages}`);
  for (const b of got.boxes) {
    if (b.join(" ") !== box.join(" ")) problems.push(`${name}: a page of ${b.join(" ")}, not ${box.join(" ")}`);
    if (b[2] - b[0] > b[3] - b[1] !== landscape) problems.push(`${name}: a page not ${landscape ? "landscape" : "portrait"}`);
  }
  return problems;
}

/** § 17.2 item 1: US Letter in points, portrait; the paper's margin (0.5 in) in points; the card, a quarter, with its bleed. */
export const LETTER_BOX = [0, 0, 612, 792];
export const MARGIN_PT = 36;
export const CARD_BOX = [0, 0, 324, 414];
/** A pixel drawn on: any channel under this (the paper is white, 255). */
const INK_LEVEL = 250;

/**
 * § 17.2 items 1 and 4, over page `n` of a letter PDF drawn at 72 dpi (a pixel a point): no drawing within MARGIN_PT of
 * the paper's edge, and none outside the pieces (`boxes`: each copy's trim, inches from the page's corner, as the build
 * measured them; a pixel on a box's edge is the box's). The problems.
 */
function paperProblems(name, pdf, n, boxes) {
  const page = drawn(pdf, n, 72);
  const inside = (x, y) => boxes.some((b) => x >= Math.floor(b.x * 72) - 1 && x <= Math.ceil((b.x + b.w) * 72) && y >= Math.floor(b.y * 72) - 1 && y <= Math.ceil((b.y + b.h) * 72));
  let [margin, outside] = [0, 0];
  for (let y = 0; y < page.height; y += 1) {
    for (let x = 0; x < page.width; x += 1) {
      const i = (y * page.width + x) * 4;
      if (Math.min(page.data[i], page.data[i + 1], page.data[i + 2]) >= INK_LEVEL) continue;
      if (x < MARGIN_PT || y < MARGIN_PT || x >= page.width - MARGIN_PT || y >= page.height - MARGIN_PT) margin += 1;
      else if (!inside(x, y)) outside += 1;
    }
  }
  const problems = [];
  if (margin) problems.push(`${name} page ${n}: ${margin} pixel(s) drawn within ${MARGIN_PT} pt of the paper's edge`);
  if (outside) problems.push(`${name} page ${n}: ${outside} pixel(s) drawn outside the pieces`);
  return problems;
}

/** The QR codes a PDF page carries, each cropped from the page drawn at `dpi` by its measured box and decoded (jsQR). */
function qrReads(pdf, n, qrs, dpi = 300) {
  const page = drawn(pdf, n, dpi);
  const pad = 0.15;
  return qrs.map((qr) => {
    const [x0, y0] = [Math.max(0, Math.round((qr.x - pad) * dpi)), Math.max(0, Math.round((qr.y - pad) * dpi))];
    const [w, h] = [Math.round((qr.w + 2 * pad) * dpi), Math.round((qr.h + 2 * pad) * dpi)];
    const crop = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y += 1) crop.set(page.data.subarray(((y0 + y) * page.width + x0) * 4, ((y0 + y) * page.width + x0 + w) * 4), y * w * 4);
    return jsQR(crop, w, h)?.data ?? null;
  });
}

/** How many times page `n` of a PDF carries `run`, in poppler's reading order, case and spaces aside. */
const timesOn = (pdf, n, run) => flat(pdfText(pdf, n)).split(flat(run)).length - 1;

/**
 * QG31 (§ 17 items 1–2, 5; § 17.2 item 1; § 17.3 items 2–3): the tout, built with the fixture's words (the file at
 * `toutPath`, holding `words`), the fixture photos and a name for each of them: its photo is the flyer's (assignment.json's
 * tout id the flyer's); tout(-PROOF).pdf is one page of 450 × 306 pt, landscape; its text carries the headline's lines,
 * the lede, the banner, the scan line, `eatfitaf.com`, the fine print whole and its photo's caption (the flyer's name); its QR code, drawn from the PDF at 300 dpi, decodes to the `boston` URL (jsQR) and is at least 0.75 in
 * square; no run of text or the code less than the safe margin inside the trim; no type under the floor. And
 * letter-touts(-PROOF).pdf is one US Letter page holding two touts, each its trim, at least 1 in apart, each code
 * decoding, each word twice; nothing drawn within 36 pt of the paper's edge or outside the two. The problems.
 */
export async function toutProblems(root, toutPath, words) {
  const set = await photoSet();
  try {
    return await withTmp(async (dir) => {
      const names = join(dir, "names.json");
      await writeFile(names, JSON.stringify(mealNames(set.ids)));
      const out = join(dir, "dist-print");
      const built = await build(root, { outDir: out, fourFlyers: false, toutPath, photoNamesPath: names, ...set.photos });
      const tout = built.planned.find((p) => p.piece.id === "tout" && !p.page.letter);
      const letter = built.planned.find((p) => p.page.base === "letter-touts");
      if (!tout || !letter) return [`the build made ${tout ? "" : "no tout"}${tout || letter ? "" : " and "}${letter ? "" : "no letter-touts"}`];
      const pdf = join(out, `${tout.stem}.pdf`);
      const problems = pageProblems(`${tout.stem}.pdf`, await readFile(pdf), 1);
      const record = JSON.parse(await readFile(join(out, "assignment.json"), "utf8"));
      const caption = mealNames(set.ids)[record.tout?.id];
      if (!caption) problems.push(`assignment.json names the tout's photo as ${JSON.stringify(record.tout?.id)}, not a fixture photo`);
      // § 17.3 item 2: the tout's photo is the flyer's
      if (record.tout?.id !== record.positions.flyer?.id) problems.push(`the tout's photo is ${record.tout?.id}, not the flyer's, ${record.positions.flyer?.id}`);
      const runs = [...words.headline, words.lede, words.banner, words.scan, "eatfitaf.com", words.fine, caption ?? ""].map((r) => r.replaceAll("*", ""));
      for (const run of runs) if (!carries(pdf, 1, run)) problems.push(`${tout.stem}.pdf lacks "${run}"`);
      const qrs = tout.measured.faces.flatMap((f) => f.qrs);
      if (qrs.length !== 1) problems.push(`the tout has ${qrs.length} QR codes, not 1`);
      for (const qr of qrs) if (Math.min(qr.w, qr.h) < QR_MIN_IN - TOLERANCE_IN) problems.push(`the QR code is ${qr.w.toFixed(2)} in, under ${QR_MIN_IN}`);
      for (const read of qrReads(pdf, 1, qrs)) if (read !== BOSTON_URL) problems.push(`the tout's QR code, drawn from its PDF at 300 dpi, decodes to ${JSON.stringify(read)}`);
      problems.push(...marginAndFloorProblems("the tout", tout.measured));
      // § 17.2 item 1: the letter sheet of two
      const sheet = join(out, `${letter.stem}.pdf`);
      problems.push(...pageProblems(`${letter.stem}.pdf`, await readFile(sheet), 1, LETTER_BOX, false));
      const faces = letter.measured.faces;
      if (faces.length !== 2) problems.push(`${letter.stem}.pdf measures ${faces.length} touts, not 2`);
      for (const f of faces) if (Math.abs(f.trim.w - 6) > TOLERANCE_IN || Math.abs(f.trim.h - 4) > TOLERANCE_IN) problems.push(`a tout on the sheet is ${f.trim.w.toFixed(2)} × ${f.trim.h.toFixed(2)} in, not 6 × 4`);
      if (faces.length === 2 && faces[1].trim.y - (faces[0].trim.y + faces[0].trim.h) < 1 - TOLERANCE_IN) problems.push("the two touts are less than 1 in apart");
      const reads = qrReads(sheet, 1, faces.flatMap((f) => f.qrs));
      if (reads.length !== 2 || reads.some((r) => r !== BOSTON_URL)) problems.push(`the sheet's QR codes decode to ${JSON.stringify(reads)}`);
      for (const run of [words.headline[1].replaceAll("*", ""), words.banner, words.fine]) if (timesOn(sheet, 1, run) !== 2) problems.push(`${letter.stem}.pdf carries "${run}" ${timesOn(sheet, 1, run)} times, not 2`);
      problems.push(...paperProblems(`${letter.stem}.pdf`, sheet, 1, faces.map((f) => f.trim)));
      return problems;
    });
  } finally {
    await rm(set.dir, { recursive: true, force: true });
  }
}

/** The overflow a fit refusal names, in layout px, for the box `what`, or null. */
export const fitOverOf = (message, what) => {
  const m = new RegExp(`${what} does not fit: its words run (\\d+(?:\\.\\d+)?) layout px over`).exec(message);
  return m ? Number(m[1]) : null;
};

/**
 * QG31's fit check (§ 17 item 2, § 12 item 5): anything that does not fit is refused, naming by how much, never shrunk.
 * The fixture with its first headline line made long enough to run into the logo, and with its fine print said four
 * times over, is each refused, nothing printed, the refusal naming the box and the layout px over (above zero); the
 * fixture as it is is not (the control). The problems.
 */
export async function toutFitProblems(root) {
  const problems = [];
  const cases = [
    ["headline line 1", { ...TOUT_FIXTURE, headline: ["FIXTURE HEADLINE LONGER", ...TOUT_FIXTURE.headline.slice(1)] }],
    ["the foot", { ...TOUT_FIXTURE, fine: Array.from({ length: 4 }, () => TOUT_FIXTURE.fine).join(" ") }],
  ];
  for (const [what, words] of cases) {
    const file = await wordsFile(words, "tout-words.json");
    try {
      await withTmp(async (dir) => {
        const out = join(dir, "dist-print");
        try {
          await build(root, { outDir: out, fourFlyers: false, toutPath: file.path });
          problems.push(`${what} too long was not refused`);
        } catch (err) {
          const over = fitOverOf(err.message, what);
          if (!/^refused, nothing printed:/.test(err.message) || !(over > 0)) problems.push(`${what} too long, refused as: ${err.message}`);
          const left = await readdir(out).catch(() => []);
          if (left.length) problems.push(`refused, yet the out folder holds ${left.join(", ")}`);
        }
      });
    } finally {
      await rm(file.dir, { recursive: true, force: true });
    }
  }
  const file = await wordsFile(TOUT_FIXTURE, "tout-words.json");
  try {
    await withTmp(async (dir) => {
      try {
        await build(root, { outDir: join(dir, "dist-print"), fourFlyers: false, toutPath: file.path });
      } catch (err) {
        problems.push(`the fixture's words were refused: ${err.message}`);
      }
    });
  } finally {
    await rm(file.dir, { recursive: true, force: true });
  }
  return problems;
}

/**
 * Whether page `n` of a PDF carries each of `runs` in that order (poppler's reading order, or its drawing order): the
 * first run missing, or null.
 */
function missingInOrder(pdf, n, runs) {
  let missing = null;
  for (const raw of [false, true]) {
    const text = flat(pdfText(pdf, n, raw));
    let at = 0;
    missing = runs.find((run) => {
      const i = text.indexOf(flat(run), at);
      if (i < 0) return true;
      at = i + flat(run).length;
      return false;
    });
    if (missing === undefined) return null;
  }
  return missing;
}

/** § 17.3 item 1: the card's copy count a page, its cut inset, and its two layouts (eight, else six), each its trim. */
export const CARD_CUT_IN = 0.25;
export const CARD_LAYOUTS = { 8: { w: 3.75, h: 2.5 }, 6: { w: 3.75, h: 10 / 3 } };

/**
 * QG32 (§ 17 items 1, 3, 5; § 17.2 items 1–2; § 17.3 items 1 and 3): the entry card, built with the words at `entryPath`.
 * letter-entry-cards(-PROOF).pdf: one US Letter page of `count` cards (8, or 6: what the build chose, which must be
 * `count`), each its layout's trim; on every card, read from the PDF in order, the heading, the email line's words, its
 * @ and its ., and the fine print whole (each run `count` times a page); each card's email line its writing lines,
 * drawn; no word of a card within 0.25 in of its cut; nothing drawn within 36 pt of the paper's edge or outside the
 * cards; no type under the floor. The card's own PDF, entry-card(-PROOF).pdf: one page, the chosen card's trim and the
 * bleed, carrying the same runs. The report names the layout, and the one before it that did not fit with the layout px it
 * was over. The problems.
 */
export async function entryProblems(root, entryPath, { count = 8, runs = ENTRY_RUNS } = {}) {
  return withTmp(async (dir) => {
    const out = join(dir, "dist-print");
    const built = await build(root, { outDir: out, fourFlyers: false, entryPath });
    const find = (base) => built.planned.find((p) => p.page.base === base);
    const [card, cards] = ["entry-card", "letter-entry-cards"].map(find);
    if (!card || !cards) return [`the build made ${built.planned.map((p) => p.page.base).join(", ")}`];
    const pdfOf = (p) => join(out, `${p.stem}.pdf`);
    const face = CARD_LAYOUTS[count];
    const ownBox = [0, 0, (face.w + 0.25) * 72, (face.h + 0.25) * 72].map((n) => Number(n.toFixed(2)));
    const problems = [...pageProblems(`${cards.stem}.pdf`, await readFile(pdfOf(cards)), 1, LETTER_BOX, false), ...pageProblems(`${card.stem}.pdf`, await readFile(pdfOf(card)), 1, ownBox, true)];
    const sheet = cards.measured.sheets[0];
    if (sheet.faces.length !== count) problems.push(`${cards.stem}.pdf measures ${sheet.faces.length} cards, not ${count}`);
    const said = built.lines.find((l) => l.startsWith(`letter-entry-cards: the words of`)) ?? "";
    if (!said.includes(`${count} a page`)) problems.push(`the report does not say ${count} a page: ${said}`);
    const over = built.lines.find((l) => l.startsWith("letter-entry-cards: 8 a page did not fit"));
    if (count === 6 && !/did not fit, \d+(\.\d+)? layout px over/.test(over ?? "")) problems.push(`the report does not say by how much eight did not fit: ${over}`);
    if (count === 8 && over) problems.push(`eight fit, yet the report says: ${over}`);
    for (const [p, n] of [[cards, 1], [card, 1]]) {
      const run = missingInOrder(pdfOf(p), n, runs);
      if (run !== null) problems.push(`${p.stem}.pdf lacks "${run}" in order`);
    }
    for (const run of [runs[0], "Mail:", runs.at(-1)]) if (timesOn(pdfOf(cards), 1, run) !== count) problems.push(`${cards.stem}.pdf carries "${run}" ${timesOn(pdfOf(cards), 1, run)} times, not ${count}`);
    const dpi = 300;
    const page = drawn(pdfOf(cards), 1, dpi);
    sheet.faces.forEach((f, c) => {
      if (Math.abs(f.trim.w - face.w) > TOLERANCE_IN || Math.abs(f.trim.h - face.h) > TOLERANCE_IN) problems.push(`card ${c + 1} is ${f.trim.w.toFixed(2)} × ${f.trim.h.toFixed(2)} in, not ${face.w} × ${face.h.toFixed(2)}`);
      const counts = f.entryFields.map((field) => field.lines.length);
      if (JSON.stringify(counts) !== "[3]") problems.push(`card ${c + 1}'s field has ${JSON.stringify(counts)} writing lines, not the email's [3]`);
      for (const line of f.entryFields.flatMap((field) => field.lines)) if (darkShare(page, line, dpi) < 0.5) problems.push(`card ${c + 1}: a writing line is not drawn in the PDF`);
      for (const t of f.texts) {
        const inset = Math.min(t.x - f.trim.x, t.y - f.trim.y, f.trim.x + f.trim.w - t.x - t.w, f.trim.y + f.trim.h - t.y - t.h);
        if (inset < CARD_CUT_IN - TOLERANCE_IN) problems.push(`card ${c + 1}: "${t.text.slice(0, 40)}" is ${inset.toFixed(3)} in from its cut, under ${CARD_CUT_IN}`);
        if (!(t.size >= FLOOR_PX)) problems.push(`card ${c + 1}: "${t.text.slice(0, 40)}" is ${t.size} layout px, under ${FLOOR_PX}`);
      }
    });
    problems.push(...paperProblems(`${cards.stem}.pdf`, pdfOf(cards), 1, sheet.faces.map((f) => f.trim)));
    for (const png of [`${card.stem}.png`, `${cards.stem}.png`]) {
      const ok = await readFile(join(out, png)).then(() => true, () => false);
      if (!ok) problems.push(`no ${png}`);
    }
    return problems;
  });
}

/**
 * QG32 (§ 17.3 item 1): words too long for six a page either are refused, nothing printed, the refusal naming each
 * layout and the layout px it was over. The problems.
 */
export async function entryTooLongProblems(root, entryPath) {
  return withTmp(async (dir) => {
    const out = join(dir, "dist-print");
    try {
      await build(root, { outDir: out, fourFlyers: false, entryPath });
      return ["words too long for six a page were not refused"];
    } catch (err) {
      const problems = [];
      for (const n of [8, 6]) if (!new RegExp(`letter-entry-cards: ${n} a page: copy 1: the card does not fit: its words run \\d+(\\.\\d+)? layout px over`).test(err.message)) problems.push(`the refusal does not name ${n} a page's overflow: ${err.message.slice(0, 300)}`);
      const left = await readdir(out).catch(() => []);
      if (left.length) problems.push(`refused, yet the out folder holds ${left.join(", ")}`);
      return problems;
    }
  });
}

/**
 * QG33 (§ 17 item 4), no Chrome: a `[bracket]` in either words file keeps its piece a proof and is named; none does not.
 * With every photo present: the tout's fixture approved and bracket-free has no placeholder (`tout`), with a bracket in
 * its fine print it is `tout-PROOF`, the bracket named; unapproved, a proof (§ 13 item 3). The entry card's fixture marked
 * approved has none (`entry-card`); with a bracket in a rule, the bracket named. Each bracket once, `$[value]` read as
 * `[value]`. The problems.
 */
export async function proofRuleProblems(root) {
  const { giveawayPlaceholders, pagesToPrint } = await load(root, "print/pages.mjs");
  const { stemOf } = await load(root, "print/build-print.mjs");
  const { loadInputs } = await load(root, "mockups/build-mockups.mjs");
  const { parseEntry } = await load(root, "print/entry.mjs");
  const { readTout } = await load(root, "print/tout.mjs");
  const problems = [];
  return withTmp(async (dir) => {
    const photos = join(dir, "photos");
    await mkdir(photos);
    await writeFile(join(photos, "tout.jpg"), "");
    const inputs = await loadInputs({ photosDir: photos, today: ON });
    const pages = pagesToPrint({ fourFlyers: false, tout: true, entry: true });
    const [tout, entry] = ["tout", "entry-card"].map((base) => pages.find((p) => p.base === base));
    if (!tout || !entry) return ["pagesToPrint makes no tout or no entry card when asked"];
    // the tout's words as print/tout.mjs reads them, from a file named as the real one is
    const toutWords = async (raw) => {
      const path = join(dir, "tout-words.json");
      await writeFile(path, JSON.stringify(raw));
      return readTout(path);
    };
    const say = (page, words) => {
      const placeholders = giveawayPlaceholders(page.piece, inputs, words);
      return { placeholders, stem: stemOf(page, placeholders) };
    };
    const clean = say(tout, await toutWords({ ...TOUT_FIXTURE, approved: true }));
    if (clean.placeholders.length || clean.stem !== "tout") problems.push(`the approved tout without a bracket: ${clean.stem}, ${JSON.stringify(clean.placeholders)}`);
    const bracketed = say(tout, await toutWords({ ...TOUT_FIXTURE, fine: `${TOUT_FIXTURE.fine} Worth $[value], from [the sponsor].`, approved: true }));
    if (bracketed.stem !== "tout-PROOF") problems.push(`the tout with brackets is ${bracketed.stem}, not tout-PROOF`);
    if (JSON.stringify(bracketed.placeholders) !== JSON.stringify(["[value] in tout-words.json", "[the sponsor] in tout-words.json"])) problems.push(`the tout's brackets named as ${JSON.stringify(bracketed.placeholders)}`);
    const unapproved = say(tout, await toutWords(TOUT_FIXTURE));
    if (unapproved.stem !== "tout-PROOF" || !unapproved.placeholders.some((p) => /not approved/.test(p))) problems.push(`the unapproved tout: ${unapproved.stem}, ${JSON.stringify(unapproved.placeholders)}`);
    const marked = (text) => `${text.replace(/\n+$/, "")}\n\n<!-- approved -->\n`;
    const card = say(entry, parseEntry(marked(ENTRY_FIXTURE), "entry-words.md"));
    if (card.placeholders.length || card.stem !== "entry-card") problems.push(`the approved card without a bracket: ${card.stem}, ${JSON.stringify(card.placeholders)}`);
    const withBracket = ENTRY_FIXTURE.replace("A second paragraph of fine print, its words plain.", "A second paragraph, worth $[value], [value] again and [the prize].");
    const card2 = say(entry, parseEntry(marked(withBracket), "entry-words.md"));
    if (card2.stem !== "entry-card-PROOF" || JSON.stringify(card2.placeholders) !== JSON.stringify(["[value] in entry-words.md", "[the prize] in entry-words.md"])) problems.push(`the card with brackets: ${card2.stem}, ${JSON.stringify(card2.placeholders)}`);
    const card3 = say(entry, parseEntry(ENTRY_FIXTURE, "entry-words.md"));
    if (card3.stem !== "entry-card-PROOF" || !card3.placeholders.some((p) => /not approved/.test(p))) problems.push(`the unmarked card: ${card3.stem}, ${JSON.stringify(card3.placeholders)}`);
    return problems;
  });
}

/** A PDF's bytes with the two dates Chrome writes into every one (when it was made) set aside. */
export const undated = (bytes) => bytes.toString("latin1").replace(/\/(CreationDate|ModDate) \(D:[^)]*\)/g, "/$1 (D:)");

/** Every file a build wrote, by name: its bytes (a PDF's undated). */
async function filesOf(dir) {
  const files = {};
  for (const name of (await readdir(dir)).sort()) {
    const bytes = await readFile(join(dir, name));
    files[name] = name.endsWith(".pdf") ? undated(bytes) : bytes.toString("latin1");
  }
  return files;
}

/** § 17: the commit before § 17's code, the tree whose print build "today" names (QG34). */
export const BEFORE_GIVEAWAY = "7974573";
export const NO_GIT_BASE = spawnSync("git", ["-C", join(import.meta.dirname, ".."), "cat-file", "-e", `${BEFORE_GIVEAWAY}^{commit}`]).status === 0 ? false : `commit ${BEFORE_GIVEAWAY} not found by git`;

/**
 * A copy of this package as it was at `commit` (git archive: the committed files, never a working tree), this package's
 * node_modules linked; removed by the caller.
 */
export async function packageAt(root, commit) {
  const dir = await mkdtemp(join(tmpdir(), "boston-qg-before-"));
  const git = (...args) => execFileSync("git", args, { maxBuffer: 1 << 30 });
  const [top, prefix] = ["--show-toplevel", "--show-prefix"].map((what) => git("-C", root, "rev-parse", what).toString().trim().replace(/\/$/, ""));
  // from the top of the work tree: git archive refuses a tree-ish:path run from inside it
  const tar = git("-C", top, "archive", "--format=tar", `${commit}:${prefix}`);
  const untar = spawnSync("tar", ["-x", "-C", dir], { input: tar });
  if (untar.status !== 0) throw new Error(`tar: ${untar.stderr}`);
  await symlink(join(root, "node_modules"), join(dir, "node_modules"));
  return dir;
}

/**
 * QG34 (§ 17 item 1): the build without the flags writes what it wrote before § 17. Built without photos, every piece a
 * proof, from `root` and from the package at BEFORE_GIVEAWAY (`before`): the same files, by name, each byte-identical
 * (a PDF's two dates aside); and built from `root` with both words files (`toutPath`, `entryPath`), the same files again,
 * byte-identical, but assignment.json, which differs by the two new pages' entries alone, and the new pieces' files,
 * which are exactly tout-PROOF.pdf and .png, entry-card-PROOF.pdf and .png, and entry-card-back-PROOF.png. The problems.
 */
export async function unchangedProblems(root, before, { toutPath, entryPath }) {
  return withTmp(async (dir) => {
    const plain = (tree, out, extra = {}) =>
      load(tree, "print/build-print.mjs").then(({ buildPrint }) => oneAtATime(() => buildPrint({ chrome: CHROME, today: ON, outDir: join(dir, out), ...extra })));
    await plain(before, "before");
    await plain(root, "now");
    await plain(root, "flags", { toutPath, entryPath });
    const [was, now, flags] = await Promise.all(["before", "now", "flags"].map((d) => filesOf(join(dir, d))));
    const problems = [];
    const names = (files) => Object.keys(files).join(", ");
    if (names(was) !== names(now)) problems.push(`without the flags the build writes ${names(now)}, where it wrote ${names(was)}`);
    for (const name of Object.keys(was)) if (now[name] !== undefined && now[name] !== was[name]) problems.push(`${name} differs from the one built before § 17`);
    const added = Object.keys(flags).filter((name) => now[name] === undefined);
    // § 17.2 item 1 and § 17.3 item 1: and their letter sheets, each PDF with its PNG preview
    const expected = ["entry-card-PROOF.pdf", "entry-card-PROOF.png", "letter-entry-cards-PROOF.pdf", "letter-entry-cards-PROOF.png", "letter-touts-PROOF.pdf", "letter-touts-PROOF.png", "tout-PROOF.pdf", "tout-PROOF.png"];
    if (added.join(", ") !== expected.join(", ")) problems.push(`with the flags the build adds ${added.join(", ")}, not ${expected.join(", ")}`);
    for (const name of Object.keys(now)) {
      if (name === "assignment.json") continue;
      if (flags[name] !== now[name]) problems.push(`${name} differs when the giveaway is built beside it`);
    }
    const [a, b] = [JSON.parse(now["assignment.json"]), JSON.parse(flags["assignment.json"])];
    const giveawayPages = ["tout", "letter-touts", "entry-card", "letter-entry-cards"];
    const pagesOnly = { ...b, pages: Object.fromEntries(Object.entries(b.pages).filter(([page]) => !giveawayPages.includes(page))) };
    delete pagesOnly.tout;
    if (JSON.stringify(pagesOnly) !== JSON.stringify(a)) problems.push("assignment.json differs, with the giveaway, by more than its two pages and the tout's photo");
    return problems;
  });
}

