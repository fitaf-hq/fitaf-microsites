// Shared by the cases of SPEC-print-pieces.md § 12 (the two-sided flyer: Q18–Q26) and its four mirror mutants
// (qb-mutants.test.mjs). Not a test file itself. "B" for the back.
//
// Each check runs over a package tree `root` (this package, or a mirror of it: qe-checks.mjs printMirror) and returns its
// problems, [] when the tree holds § 12; the case runs it on this package and the mutant on a mirror, so the red is the
// case's own. ⛔ No photograph: the photos are print-fixtures.mjs's synthetic JPEGs, their IDs made at random.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { CHROME, FITTING_BACK_PATH, fittingBackText, oneAtATime, pdfPages, randomId, rungsDoc } from "./print-fixtures.mjs";

/** The date the builds pick the offer on: fixed, so a run does not depend on today. */
export const ON = "2026-10-20";
/** § 12 item 4: the one HTML comment the words file may hold, as its last line. */
export const MARK = "<!-- approved -->";
/** § 12 item 1: every flyer PDF has two pages, the front then the back, each the flyer's page (324 × 414 pt, Q1's). */
export const FLYER_PAGES = 2;
export const FLYER_BOX = [0, 0, 324, 414];
/** § 12 item 3: no type on the back smaller than this, in layout px (8.4 pt). */
export const MIN_TEXT_PX = 14;
/** § 12 item 2: the front's offer at the headline's size, and its QR code 1.25 in (§ 12.1), in layout px (120 a real inch). */
export const FRONT_OFFER_PX = 34;
export const FRONT_QR_PX = 150;

const load = (root, rel) => import(pathToFileURL(join(root, rel)).href);

export const committedBackPath = (root = ROOT) => join(root, "data", "flyer-back.md");
export const committedBack = (root = ROOT) => readFile(committedBackPath(root), "utf8");

/** The words file with the approval mark as its last line (after one blank line). */
export const approved = (text) => `${text.replace(/\n+$/, "")}\n\n${MARK}\n`;

/** Too many words (Q23): the committed file with its paragraphs, all but the heading and the lede, said twice more. */
export function tooLong(text) {
  const blocks = text.replace(/\n+$/, "").split("\n\n");
  const body = blocks.slice(2);
  return `${[...blocks, ...body, ...body].join("\n\n")}\n`;
}

/**
 * The words a reader sees, from the file itself (an oracle independent of the build's parser, § 12 item 4's subset
 * read the plain way): the heading's mark, the lead-ins' asterisks and the approval mark gone; whitespace normalised.
 */
export function fileWords(text) {
  return text
    .split("\n")
    .filter((line) => line.trim() !== MARK)
    .join("\n")
    .replace(/^# /, "")
    .replaceAll("**", "")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/** A list of text runs (strings), as one normalised string. */
export const joined = (texts) => texts.join(" ").split(/\s+/).filter(Boolean).join(" ");

/** Write `text` to a new temporary folder as flyer-back.md; returns { dir, path }. */
export async function backFile(text, name = "flyer-back.md") {
  const dir = await mkdtemp(join(tmpdir(), "boston-qb-back-"));
  const path = join(dir, name);
  await writeFile(path, text);
  return { dir, path };
}

async function withTmp(fn) {
  const dir = await mkdtemp(join(tmpdir(), "boston-qb-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * A build of `root`'s print pieces with the cases' Chrome, one at a time across the suite; with the back's words that fit
 * (print-fixtures.mjs FITTING_BACK_PATH) unless `options` names its own.
 */
const build = (root, options) =>
  load(root, "print/build-print.mjs").then(({ buildPrint }) => oneAtATime(() => buildPrint({ chrome: CHROME, today: ON, backPath: FITTING_BACK_PATH, ...options })));

const sameBox = (a, b) => a.length === b.length && a.every((n, i) => n === b[i]);

/**
 * Q18 (§ 12 item 1): `build:print` with no photos; every flyer PDF has two pages, each media box the flyer's page,
 * 324 × 414 pt; the tent card's is still one page (the control: the count is read per file). The problems.
 */
export async function twoSidesProblems(root, { fourFlyers = true } = {}) {
  return withTmp(async (dir) => {
    const out = join(dir, "dist-print");
    const built = await build(root, { outDir: out, fourFlyers });
    const problems = [];
    const flyers = built.planned.filter((p) => p.piece.id === "flyer");
    const want = fourFlyers ? 5 : 1;
    if (flyers.length !== want) problems.push(`${flyers.length} flyer PDFs, not ${want}`);
    for (const p of built.planned) {
      const { pages, boxes } = pdfPages(await readFile(join(out, `${p.stem}.pdf`)));
      const expected = p.piece.id === "flyer" ? FLYER_PAGES : 1;
      if (pages !== expected) problems.push(`${p.stem}.pdf has ${pages} page(s), not ${expected}`);
      if (p.piece.id !== "flyer") continue;
      if (boxes.length < FLYER_PAGES) problems.push(`${p.stem}.pdf has ${boxes.length} media box(es)`);
      for (const box of boxes) if (!sameBox(box, FLYER_BOX)) problems.push(`${p.stem}.pdf: a page of ${box.join(" ")}, not ${FLYER_BOX.join(" ")}`);
    }
    return problems;
  });
}

/**
 * Q22's rule (§ 12 item 6), over fixture rungs, no Chrome: the back takes the first array of rung 3 holding none of the
 * photos the build places elsewhere (the flyer's, the four flyers', the tent's three), in its order, left to right; an
 * array holding any one of them is skipped, wherever it is in the array; none left is refused, naming the rung.
 */
export async function backRuleProblems(root) {
  const { backPhotoIds } = await load(root, "print/assign.mjs");
  const [f, t1, t2, t3, k1, k2, k3, k4, a, b, c, d] = Array.from({ length: 12 }, randomId);
  const placed = [f, t1, t2, t3, k1, k2, k3, k4];
  const problems = [];
  const doc = (arrays) => rungsDoc({ alsoGood: [f], arrays: { 3: arrays } });
  const dirty = [[a, f, b], [t1, t2, t3], [k3, a, b], [a, b, t2], [a, b, k4]];
  try {
    const got = backPhotoIds(doc([...dirty, [a, b, c], [d, a, b]]), placed);
    if (JSON.stringify(got.ids) !== JSON.stringify([a, b, c])) problems.push(`the back took ${JSON.stringify(got.ids)}, not array 6 [a, b, c] in its order`);
    if (!/^rung 3, array 6\b/.test(got.from)) problems.push(`its source is "${got.from}", not rung 3, array 6`);
    if (got.ids.some((id) => placed.includes(id))) problems.push("the back holds a photo placed elsewhere");
  } catch (err) {
    problems.push(`a clean array was refused: ${err.message}`);
  }
  try {
    const got = backPhotoIds(doc(dirty), placed);
    problems.push(`every array holds a photo placed elsewhere, and the back took ${JSON.stringify(got.ids)} (${got.from})`);
  } catch (err) {
    if (!/pool "glam", rung 3: every array holds a photo placed elsewhere/.test(err.message)) problems.push(`none left, refused as: ${err.message}`);
  }
  const refusals = [
    [rungsDoc({ alsoGood: [f], arrays: { 2: [[a, b]] } }), /pool "glam" has no rung 3/],
    [doc([]), /pool "glam", rung 3 has no array/],
    [doc([[a, b, c], [d, a]]), /pool "glam", rung 3, array 2: not 3 photo IDs/],
    [doc([[a, "b/c", d]]), /rung 3, array 1, photo 2: "b\/c" is not a photo ID/],
  ];
  for (const [bad, expected] of refusals) {
    try {
      backPhotoIds(bad, placed);
      problems.push(`not refused: ${expected}`);
    } catch (err) {
      if (!expected.test(err.message)) problems.push(`refused as "${err.message}", not ${expected}`);
    }
  }
  return problems;
}

/** The overflow a refusal names, in layout px, or null. */
export const overflowOf = (message) => {
  const m = /the back's words do not fit between the photos and the bottom row: (\d+(?:\.\d+)?) layout px over/.exec(message);
  return m ? Number(m[1]) : null;
};

/**
 * Q23 (§ 12 items 3 and 5): too many words are refused, not shrunk: a fixture file of the committed words with its
 * paragraphs said twice more is refused, nothing printed, the refusal naming how many layout px over it is (a number
 * above zero); words that fit (print-fixtures.mjs FITTING_BACK_PATH) are not (the control), and no type on that back is
 * below the floor. Whether the committed file fits is committedFitProblems'.
 */
export async function fitProblems(root) {
  const problems = [];
  const long = await backFile(tooLong(await committedBack(root)));
  try {
    await withTmp(async (dir) => {
      const out = join(dir, "dist-print");
      try {
        const built = await build(root, { outDir: out, backPath: long.path, fourFlyers: false });
        problems.push(`too many words were not refused: the back had ${built.back?.spacePx} layout px to spare`);
      } catch (err) {
        const over = overflowOf(err.message);
        if (!/^refused, nothing printed:/.test(err.message) || !(over > 0)) problems.push(`too many words, refused as: ${err.message}`);
        if (!/^flyer: the back's words do not fit/m.test(err.message)) problems.push(`the refusal does not name the flyer: ${err.message}`);
        const left = await readdir(out).catch(() => []);
        if (left.length) problems.push(`refused, yet dist-print/ holds ${left.join(", ")}`);
      }
    });
  } finally {
    await rm(long.dir, { recursive: true, force: true });
  }
  await withTmp(async (dir) => {
    let built;
    try {
      built = await build(root, { outDir: join(dir, "dist-print"), fourFlyers: false });
    } catch (err) {
      problems.push(`words that fit were refused: ${err.message}`);
      return;
    }
    if (!(built.back.spacePx >= 0)) problems.push(`the back of words that fit has ${built.back.spacePx} layout px to spare`);
    const [flyer] = built.planned.filter((p) => p.piece.id === "flyer");
    const sizes = flyer.back.measured.faces.flatMap((f) => f.texts.map((t) => [t.size, t.text]));
    if (sizes.length < 4) problems.push(`the back measured ${sizes.length} text runs`);
    for (const [size, text] of sizes) if (!(size >= MIN_TEXT_PX)) problems.push(`"${text.slice(0, 30)}" on the back is ${size} layout px, below ${MIN_TEXT_PX}`);
  });
  return problems;
}

/**
 * Q26's rule (§ 12 item 4, § 4), no Chrome: without the approval mark the back is a proof, and with it, not. The committed
 * file is unapproved; a mirror with `<!-- approved -->` as its last line is approved and says the same words; with every
 * photo present and a named offer, the flyer's page is `flyer-PROOF` with the committed words, its one placeholder the
 * back's words, and `flyer` with the approved mirror.
 */
export async function approvalProblems(root) {
  const { parseBack } = await load(root, "print/back.mjs");
  const { backPlaceholders, pagesToPrint, placeholdersOf } = await load(root, "print/pages.mjs");
  const { stemOf } = await load(root, "print/build-print.mjs");
  const { loadInputs, OFFERS_PATH } = await load(root, "mockups/build-mockups.mjs");
  const { PRINT_PIECES } = await load(root, "print/sizes.mjs");
  const problems = [];
  const text = await committedBack(root);
  const committed = parseBack(text);
  const marked = parseBack(approved(text));
  if (committed.approved !== false) problems.push("the committed words read as approved");
  if (marked.approved !== true) problems.push("the words with the approval mark read as unapproved");
  if (JSON.stringify(marked.paragraphs) !== JSON.stringify(committed.paragraphs) || marked.heading.text !== committed.heading.text) {
    problems.push("the approval mark changed the words");
  }
  return withTmp(async (dir) => {
    const offers = JSON.parse(await readFile(OFFERS_PATH, "utf8"));
    const named = join(dir, "offers.json");
    await writeFile(named, JSON.stringify({ ...offers, status: "approved", offers: offers.offers.map((o) => ({ ...o, label: "Q26 NAMED OFFER" })) }));
    const photos = join(dir, "photos");
    await mkdir(photos);
    const flyer = PRINT_PIECES.find((p) => p.id === "flyer");
    const positions = [...PRINT_PIECES.flatMap((p) => p.positions), ...flyer.back.positions];
    for (const position of positions) await writeFile(join(photos, `${position}.jpg`), "");
    const inputs = await loadInputs({ photosDir: photos, today: ON, offersPath: named });
    const page = pagesToPrint().find((p) => p.base === "flyer");
    const front = placeholdersOf(flyer, inputs);
    if (front.length) problems.push(`the front still has placeholders (the fixture): ${front.join(", ")}`);
    const unapproved = backPlaceholders(inputs, committed);
    if (unapproved.length !== 1 || !/data\/flyer-back\.md/.test(unapproved[0])) problems.push(`the unapproved back's placeholders: ${JSON.stringify(unapproved)}`);
    if (stemOf(page, [...front, ...unapproved]) !== "flyer-PROOF") problems.push("the unapproved back did not make the flyer a proof");
    const ok = backPlaceholders(inputs, marked);
    if (ok.length) problems.push(`the approved back's placeholders: ${JSON.stringify(ok)}`);
    if (stemOf(page, [...front, ...ok]) !== "flyer") problems.push("the approved back still made the flyer a proof");
    return problems;
  });
}

/**
 * § 12 item 5, over the words as committed (data/flyer-back.md, the Advisor's to edit): the build of the flyer does not
 * refuse them. The one case whose subject is the committed words' length; the problem names the overflow.
 */
export async function committedFitProblems(root) {
  return withTmp(async (dir) => {
    try {
      const built = await build(root, { outDir: join(dir, "dist-print"), backPath: committedBackPath(root), fourFlyers: false });
      return built.back.spacePx >= 0 ? [] : [`the committed back has ${built.back.spacePx} layout px to spare`];
    } catch (err) {
      const over = overflowOf(err.message);
      return [over === null ? `the committed words were refused: ${err.message}` : `data/flyer-back.md as committed is ${over} layout px over: ${err.message}`];
    }
  });
}

/** The words that fit, as the cases build with them (print-fixtures.mjs), from `root`'s committed file. */
export const fittingBack = async (root = ROOT) => fittingBackText(await committedBack(root));

/**
 * Q27's tools: poppler's pdftotext and pdftoppm, which read the PDF as a printer's software would. The case is skipped,
 * said, when they are absent (as the Chrome cases are without Chrome).
 */
const PDFTOTEXT = process.env.PDFTOTEXT || "pdftotext";
const PDFTOPPM = process.env.PDFTOPPM || "pdftoppm";
export const NO_POPPLER = [PDFTOTEXT, PDFTOPPM].every((tool) => spawnSync(tool, ["-v"]).error === undefined)
  ? false
  : "poppler's pdftotext and pdftoppm not found (brew install poppler, or set PDFTOTEXT and PDFTOPPM)";
/** The resolution the QR check draws a page at, and how dark a QR code's box must be to count as drawn. */
const RASTER_DPI = 72;
const QR_DARK_MIN = 0.25;
const DARK_LEVEL = 128;
const norm = (s) => s.split(/\s+/).filter(Boolean).join(" ");
/**
 * § 13: a text run's characters, in order, with case and whitespace set aside: CSS's text-transform sets front B's
 * headline and callout in capitals the DOM's text does not carry, and poppler breaks a rotated run (the callout) apart.
 */
const flat = (s) => s.replace(/\s+/g, "").toLowerCase();

/** A page of a PDF drawn by pdftoppm in gray: { width, height, data } (one byte a pixel), from its PGM. */
function grayPage(pdf, n) {
  const bytes = execFileSync(PDFTOPPM, ["-gray", "-r", String(RASTER_DPI), "-f", String(n), "-l", String(n), pdf]);
  const header = /^P5\s+(\d+)\s+(\d+)\s+255\s/.exec(bytes.subarray(0, 64).toString("latin1"));
  if (!header) throw new Error(`pdftoppm did not write a PGM for ${pdf} page ${n}`);
  const [, width, height] = header.map(Number);
  return { width, height, data: bytes.subarray(header[0].length) };
}

/** The share of a box's pixels (inches, from the sheet's page's corner) that are dark in a drawn page. */
function darkShare(raster, box, origin) {
  const at = (inches) => Math.round(inches * RASTER_DPI);
  const [x0, y0] = [at(box.x - origin.x), at(box.y - origin.y)];
  const [x1, y1] = [Math.min(raster.width, at(box.x - origin.x + box.w)), Math.min(raster.height, at(box.y - origin.y + box.h))];
  let dark = 0;
  let all = 0;
  for (let y = Math.max(0, y0); y < y1; y += 1) {
    for (let x = Math.max(0, x0); x < x1; x += 1) {
      all += 1;
      if (raster.data[y * raster.width + x] < DARK_LEVEL) dark += 1;
    }
  }
  return all ? dark / all : 0;
}

/**
 * Q27 (§ 12.1 item 5): the PDF is what is printed, and the PNG proofs and every other case read the page as Chrome lays
 * it out on a screen. Each page of each PDF must carry its sheet as the build measured it: every text run on the sheet is
 * in the page's text (pdftotext), and every QR code's box is drawn, at least QR_DARK_MIN of it dark (pdftoppm). The
 * problems.
 */
export async function pdfCarriesProblems(root, { fourFlyers = false, ...options } = {}) {
  return withTmp(async (dir) => {
    const out = join(dir, "dist-print");
    const built = await build(root, { outDir: out, fourFlyers, ...options });
    const problems = [];
    for (const p of built.planned) {
      const pdf = join(out, `${p.stem}.pdf`);
      for (const [i, sheet] of (p.measured.sheets ?? [p.measured]).entries()) {
        const n = i + 1;
        const text = norm(execFileSync(PDFTOTEXT, ["-f", String(n), "-l", String(n), pdf, "-"]).toString("utf8"));
        // § 13: the content stream's order too (-raw), the order the page draws its text in: poppler's reading order
        // puts a rotated run's letters out of order (front B's callout), the drawing order keeps them
        const raw = norm(execFileSync(PDFTOTEXT, ["-raw", "-f", String(n), "-l", String(n), pdf, "-"]).toString("utf8"));
        const carries = (run) => flat(text).includes(flat(run)) || flat(raw).includes(flat(run));
        for (const t of sheet.faces.flatMap((f) => f.texts)) if (!carries(t.text)) problems.push(`${p.stem}.pdf page ${n} lacks the text "${t.text}"`);
        const qrs = sheet.faces.flatMap((f) => f.qrs);
        const raster = qrs.length ? grayPage(pdf, n) : null;
        for (const qr of qrs) {
          const share = darkShare(raster, qr, sheet.page);
          if (share < QR_DARK_MIN) problems.push(`${p.stem}.pdf page ${n}: the QR code's box is ${Math.round(share * 100)}% dark, under ${QR_DARK_MIN * 100}%: not drawn`);
        }
      }
    }
    return problems;
  });
}

/** Q28 (§ 13): front B's words for the cases: neutral and bracketed, never a candidate's (they are not approved). */
export const FRONT_FIXTURE = {
  headline: ["[A HEADLINE]", "[ITS ACCENT]"],
  accent: 1,
  lede: "[The line that says what the headline leaves out.]",
  callout: ["[3]", "[call]", "[out]"],
};

/** Write front B's `words` (an object, or a file's text) to a new temporary folder as front-words.json: { dir, path }. */
export async function frontFile(words) {
  const dir = await mkdtemp(join(tmpdir(), "boston-qb-front-"));
  const path = join(dir, "front-words.json");
  await writeFile(path, typeof words === "string" ? words : JSON.stringify(words));
  return { dir, path };
}

/**
 * Q28 (§ 13): built with front B's words (the file at `frontPath`, holding `words`), every flyer's page 1 carries each of
 * its headline's lines, its lede and its callout's lines as text in the PDF, in poppler's reading order or the page's
 * drawing order (the callout is rotated). The problems.
 */
export async function frontWordsProblems(root, frontPath, words) {
  return withTmp(async (dir) => {
    const out = join(dir, "dist-print");
    const built = await build(root, { outDir: out, fourFlyers: false, frontPath });
    // a headline's accent asterisks are markup, not words
    const runs = [...words.headline.map((line) => line.replaceAll("*", "")), ...[words.lede].flat().map((line) => line.replaceAll("*", "")), ...(words.callout ?? [])];
    const problems = [];
    for (const p of built.planned.filter((q) => q.piece.id === "flyer")) {
      const pdf = join(out, `${p.stem}.pdf`);
      const read = (args) => flat(execFileSync(PDFTOTEXT, [...args, "-f", "1", "-l", "1", pdf, "-"]).toString("utf8"));
      const [text, raw] = [read([]), read(["-raw"])];
      for (const run of runs) if (!text.includes(flat(run)) && !raw.includes(flat(run))) problems.push(`${p.stem}.pdf page 1 lacks front B's "${run}"`);
    }
    return problems;
  });
}

/** Q29 (§ 14 item 3): a back with a bar and steps, in neutral words (never a candidate's: this repository is public). */
export const BACK_GRAPHICS_FIXTURE = `# Heading words

The lede words.

**Bar lead**
- {gluten-free} Label one
- {diabetic} Label two
- {vegan} Label three

**Steps lead**
1. {order} Title one: detail one
2. {cook} Title two: detail two
3. {eat} Title three: detail three
`;

/** Q29: the runs the fixture's graphics print, in the file's order. */
export const BACK_GRAPHICS_RUNS = ["Bar lead", "Label one", "Label two", "Label three", "Steps lead", "Title one", "detail one", "Title two", "detail two", "Title three", "detail three"];

/**
 * Q29 (§ 14 item 3): built with the back at `backPath`, every flyer's page 2 carries each of `runs` as text in the PDF,
 * in that order, in poppler's reading order or the page's drawing order. The problems.
 */
export async function backGraphicsProblems(root, backPath, runs = BACK_GRAPHICS_RUNS) {
  return withTmp(async (dir) => {
    const out = join(dir, "dist-print");
    const built = await build(root, { outDir: out, fourFlyers: false, backPath });
    const problems = [];
    for (const p of built.planned.filter((q) => q.piece.id === "flyer")) {
      const pdf = join(out, `${p.stem}.pdf`);
      const read = (args) => flat(execFileSync(PDFTOTEXT, [...args, "-f", "2", "-l", "2", pdf, "-"]).toString("utf8"));
      const inOrder = (text) => {
        let at = 0;
        for (const run of runs) {
          const i = text.indexOf(flat(run), at);
          if (i < 0) return run;
          at = i + flat(run).length;
        }
        return null;
      };
      const [missText, missRaw] = [inOrder(read([])), inOrder(read(["-raw"]))];
      if (missText !== null && missRaw !== null) problems.push(`${p.stem}.pdf page 2 lacks the back's "${missRaw}" in order`);
    }
    return problems;
  });
}
