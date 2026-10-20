// Shared by the cases of SPEC-print-pieces.md § 12 (the two-sided flyer: Q18–Q26) and its four mirror mutants
// (qb-mutants.test.mjs). Not a test file itself. "B" for the back.
//
// Each check runs over a package tree `root` (this package, or a mirror of it: qe-checks.mjs printMirror) and returns its
// problems, [] when the tree holds § 12; the case runs it on this package and the mutant on a mirror, so the red is the
// case's own. ⛔ No photograph: the photos are print-fixtures.mjs's synthetic JPEGs, their IDs made at random.
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
/** § 12 item 2: the front's offer at the headline's size, and its QR code 1.4 in, in layout px (120 a real inch). */
export const FRONT_OFFER_PX = 34;
export const FRONT_QR_PX = 168;

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
