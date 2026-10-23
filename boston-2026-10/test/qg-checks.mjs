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

/** QG32: the entry card's words, a fixture's: four fields, two of them optional, two notes; the rules, with lead-ins. */
export const ENTRY_FIXTURE = `# Front

## Fixture heading words

- Field one
- Field two
- Field three (optional)
- Field four (optional)

The fixture draw line, a sentence of words.

The fixture consent line, its words.

# Back

## Fixture rules heading

**Rule one.** Its words after the lead-in.

**Rule two**: words after a colon, and enough of them to run over the line at the card's type size, set as any is.

A rule with no lead-in, its words.
`;

/** The runs of the entry fixture each side carries, in its order: the front's (the consent line last), the back's (whole). */
export const ENTRY_FRONT_RUNS = ["Fixture heading words", "Field one", "Field two", "Field three (optional)", "Field four (optional)", "The fixture draw line, a sentence of words.", "The fixture consent line, its words."];
export const ENTRY_BACK_RUNS = [
  "Fixture rules heading",
  "Rule one. Its words after the lead-in.",
  "Rule two: words after a colon, and enough of them to run over the line at the card's type size, set as any is.",
  "A rule with no lead-in, its words.",
];

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

/** A PDF's every page box: one of `pages` pages, each GIVEAWAY_BOX (landscape: wider than tall). */
function pageProblems(name, bytes, pages) {
  const got = pdfPages(bytes);
  const problems = [];
  if (got.pages !== pages) problems.push(`${name} has ${got.pages} page(s), not ${pages}`);
  for (const box of got.boxes) {
    if (box.join(" ") !== GIVEAWAY_BOX.join(" ")) problems.push(`${name}: a page of ${box.join(" ")}, not ${GIVEAWAY_BOX.join(" ")}`);
    if (!(box[2] - box[0] > box[3] - box[1])) problems.push(`${name}: a page not landscape`);
  }
  return problems;
}

/**
 * QG31 (§ 17 items 1–2, 5): the tout, built with the fixture's words (the file at `toutPath`, holding `words`), the
 * fixture photos and their meals' names: tout(-PROOF).pdf is one page of 450 × 306 pt, landscape; the PDF's own text
 * carries the headline's lines, the lede, the banner, the scan line, `eatfitaf.com`, the fine print whole and the photo's
 * caption (the flyer's name for its photo, the tout's one photo the flyer's); its QR code, drawn from the PDF at 300 dpi,
 * decodes to the `boston` URL (jsQR), and is at least 0.75 in square; no run of text or the code less than the safe
 * margin inside the trim; no type under the floor. The problems.
 */
export async function toutProblems(root, toutPath, words) {
  const set = await photoSet();
  try {
    return await withTmp(async (dir) => {
      const names = join(dir, "names.json");
      await writeFile(names, JSON.stringify(mealNames(set.ids)));
      const out = join(dir, "dist-print");
      const built = await build(root, { outDir: out, fourFlyers: false, toutPath, photoNamesPath: names, ...set.photos });
      const tout = built.planned.find((p) => p.piece.id === "tout");
      if (!tout) return ["no tout was built"];
      const pdf = join(out, `${tout.stem}.pdf`);
      const problems = pageProblems(`${tout.stem}.pdf`, await readFile(pdf), 1);
      const caption = mealNames(set.ids)[built.chosen.assignment.positions.flyer];
      const runs = [...words.headline, words.lede, words.banner, words.scan, "eatfitaf.com", words.fine, caption].map((r) => r.replaceAll("*", ""));
      for (const run of runs) if (!carries(pdf, 1, run)) problems.push(`${tout.stem}.pdf lacks "${run}"`);
      const qrs = tout.measured.faces.flatMap((f) => f.qrs);
      if (qrs.length !== 1) problems.push(`the tout has ${qrs.length} QR codes, not 1`);
      for (const qr of qrs) {
        if (Math.min(qr.w, qr.h) < QR_MIN_IN - TOLERANCE_IN) problems.push(`the QR code is ${qr.w.toFixed(2)} in, under ${QR_MIN_IN}`);
        const dpi = 300;
        const page = drawn(pdf, 1, dpi);
        const pad = 0.15;
        const [x0, y0] = [Math.max(0, Math.round((qr.x - pad) * dpi)), Math.max(0, Math.round((qr.y - pad) * dpi))];
        const [w, h] = [Math.round((qr.w + 2 * pad) * dpi), Math.round((qr.h + 2 * pad) * dpi)];
        const crop = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y += 1) crop.set(page.data.subarray(((y0 + y) * page.width + x0) * 4, ((y0 + y) * page.width + x0 + w) * 4), y * w * 4);
        const read = jsQR(crop, w, h)?.data ?? null;
        if (read !== BOSTON_URL) problems.push(`the tout's QR code, drawn from its PDF at ${dpi} dpi, decodes to ${JSON.stringify(read)}`);
      }
      const record = JSON.parse(await readFile(join(out, "assignment.json"), "utf8"));
      if (record.tout?.id !== built.chosen.assignment.positions.flyer) problems.push(`the tout's photo is ${record.tout?.id}, not the flyer's`);
      problems.push(...marginAndFloorProblems("the tout", tout.measured));
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
 * QG32 (§ 17 items 1, 3, 5): the entry card, built with the fixture's words (the file at `entryPath`): entry-card(-PROOF).pdf
 * is two pages, each 450 × 306 pt; page 1 carries the front's heading, its four field labels, the draw line and the
 * consent line, in order; page 2 the back's heading and every rule whole, in order; the front measures a writing line
 * per field, each at least 0.3 in below the one before, each drawn in the PDF (at 300 dpi, most of its box dark); the PNG
 * proofs of both sides are written; nothing less than the safe margin inside the trim and no type under the floor. The
 * problems.
 */
export async function entryProblems(root, entryPath) {
  return withTmp(async (dir) => {
    const out = join(dir, "dist-print");
    const built = await build(root, { outDir: out, fourFlyers: false, entryPath });
    const card = built.planned.find((p) => p.piece.id === "entry-card");
    if (!card) return ["no entry card was built"];
    const pdf = join(out, `${card.stem}.pdf`);
    const problems = pageProblems(`${card.stem}.pdf`, await readFile(pdf), 2);
    const inOrder = (n, runs) => {
      for (const raw of [false, true]) {
        const text = flat(pdfText(pdf, n, raw));
        let at = 0;
        const missing = runs.find((run) => {
          const i = text.indexOf(flat(run), at);
          if (i < 0) return true;
          at = i + flat(run).length;
          return false;
        });
        if (missing === undefined) return null;
        if (raw) return missing;
      }
      return null;
    };
    const front = inOrder(1, ENTRY_FRONT_RUNS);
    if (front !== null) problems.push(`${card.stem}.pdf page 1 lacks "${front}" in order`);
    const back = inOrder(2, ENTRY_BACK_RUNS);
    if (back !== null) problems.push(`${card.stem}.pdf page 2 lacks "${back}" in order`);
    const lines = card.measured.sheets[0].faces[0].lines;
    if (lines.length !== 4) problems.push(`the front measures ${lines.length} writing lines, not 4`);
    lines.slice(1).forEach((line, i) => {
      const pitch = line.y - lines[i].y;
      if (pitch < PITCH_MIN_IN - TOLERANCE_IN) problems.push(`writing lines ${i + 1} and ${i + 2} are ${pitch.toFixed(3)} in apart, under ${PITCH_MIN_IN}`);
    });
    const dpi = 300;
    const page = drawn(pdf, 1, dpi);
    lines.forEach((line, i) => {
      if (darkShare(page, line, dpi) < 0.5) problems.push(`writing line ${i + 1} is not drawn in the PDF`);
      if (!(line.w > 3)) problems.push(`writing line ${i + 1} is ${line.w.toFixed(2)} in long`);
    });
    for (const png of [`${card.stem}.png`, `entry-card-back${card.stem.endsWith("-PROOF") ? "-PROOF" : ""}.png`]) {
      const ok = await readFile(join(out, png)).then(() => true, () => false);
      if (!ok) problems.push(`no ${png}`);
    }
    for (const [i, sheet] of card.measured.sheets.entries()) problems.push(...marginAndFloorProblems(`the card's ${i ? "back" : "front"}`, sheet));
    return problems;
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
    await writeFile(join(photos, "flyer.jpg"), "");
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
    const withBracket = ENTRY_FIXTURE.replace("A rule with no lead-in, its words.", "A rule with no lead-in, worth $[value], [value] again and [the prize].");
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
    const expected = ["entry-card-PROOF.pdf", "entry-card-PROOF.png", "entry-card-back-PROOF.png", "tout-PROOF.pdf", "tout-PROOF.png"];
    if (added.join(", ") !== expected.join(", ")) problems.push(`with the flags the build adds ${added.join(", ")}, not ${expected.join(", ")}`);
    for (const name of Object.keys(now)) {
      if (name === "assignment.json") continue;
      if (flags[name] !== now[name]) problems.push(`${name} differs when the giveaway is built beside it`);
    }
    const [a, b] = [JSON.parse(now["assignment.json"]), JSON.parse(flags["assignment.json"])];
    const pagesOnly = { ...b, pages: Object.fromEntries(Object.entries(b.pages).filter(([page]) => page !== "tout" && page !== "entry-card")) };
    delete pagesOnly.tout;
    if (JSON.stringify(pagesOnly) !== JSON.stringify(a)) problems.push("assignment.json differs, with the giveaway, by more than its two pages and the tout's photo");
    return problems;
  });
}
