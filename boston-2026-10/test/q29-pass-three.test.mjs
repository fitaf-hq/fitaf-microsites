// Q29 (SPEC-print-pieces.md § 14): the lede's accent colour, the back's two graphics, longer meal names. The lede's
// words between asterisks are drawn in the colour its `ledeAccent` names, and an unknown one is refused; a back with a
// bar and steps builds and its lead-ins, labels, titles and details are in the PDF in the file's order; each refusal of
// § 14 item 3 names its line; a 60-character meal name prints and a 61-character one is refused. Every word is a
// fixture's, never a candidate's: the candidates are not approved and this repository is public.
import test from "node:test";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { parseBack } from "../print/back.mjs";
import { readFront } from "../print/front.mjs";
import { ICON_NAMES, icon } from "../print/icons.mjs";
import { lockedBuild, NO_CHROME, photoSet } from "./print-fixtures.mjs";
import { BACK_GRAPHICS_FIXTURE, backFile, backGraphicsProblems, FRONT_FIXTURE, frontFile, NO_POPPLER } from "./qb-checks.mjs";

/** The template's tokens each `ledeAccent` names (src/template.html), as RGB. */
const ACCENT_RGB = { orange: [0xff, 0x93, 0x1e], blue: [0x48, 0xae, 0xee], green: [0x8c, 0xc6, 0x3f] };
const ACCENT_WORD = "Accented";
const COLOUR_DPI = 150;
/** How near (the largest channel difference) a pixel must be to the token to count, and how many such pixels a word needs. */
const COLOUR_TOLERANCE = 40;
const COLOUR_PIXELS_MIN = 20;
/** A page drawn at COLOUR_DPI is a few megabytes of PPM, over execFileSync's default buffer. */
const RASTER_BUFFER_BYTES = 64 * 1024 * 1024;

test("Q29: the lede's accent key, and its asterisks, are checked", async () => {
  for (const [words, why] of [
    [{ ...FRONT_FIXTURE, lede: "One *two* three", ledeAccent: "purple" }, /"ledeAccent" must be one of orange, blue, green/],
    [{ ...FRONT_FIXTURE, lede: "One *two three" }, /"lede": an accent's asterisks come in pairs/],
  ]) {
    const { dir, path } = await frontFile(words);
    try {
      await assert.rejects(readFront(path), why);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  const { dir, path } = await frontFile({ ...FRONT_FIXTURE, lede: "One *two* three" });
  try {
    assert.equal((await readFront(path)).ledeAccent, "orange", "orange when the key is absent");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

/** The pixels of page 1 inside the PDF word box of `word` (points), drawn at COLOUR_DPI, near `rgb`. */
function pixelsNear(pdf, word, rgb) {
  const xml = execFileSync("pdftotext", ["-bbox", "-f", "1", "-l", "1", pdf, "-"]).toString("utf8");
  const m = new RegExp(`<word xMin="([\\d.]+)" yMin="([\\d.]+)" xMax="([\\d.]+)" yMax="([\\d.]+)">${word}</word>`).exec(xml);
  assert.ok(m, `the word ${word} is on page 1`);
  const ppm = execFileSync("pdftoppm", ["-r", String(COLOUR_DPI), "-f", "1", "-l", "1", pdf], { maxBuffer: RASTER_BUFFER_BYTES });
  const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/.exec(ppm.subarray(0, 64).toString("latin1"));
  const [width] = [Number(header[1])];
  const data = ppm.subarray(header[0].length);
  const [x0, y0, x1, y1] = m.slice(1).map((v) => Math.round((Number(v) * COLOUR_DPI) / 72));
  let near = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * width + x) * 3;
      if (rgb.every((c, k) => Math.abs(data[i + k] - c) <= COLOUR_TOLERANCE)) near += 1;
    }
  }
  return near;
}

test("Q29: built, the lede's accented word is drawn in each ledeAccent's colour, and the rest of it is not", { skip: NO_CHROME || NO_POPPLER }, async () => {
  const dir = await mkdtemp(join(tmpdir(), "boston-q29-accent-"));
  try {
    for (const accent of Object.keys(ACCENT_RGB)) {
      const { dir: wordsDir, path } = await frontFile({ ...FRONT_FIXTURE, lede: `Plain words, *${ACCENT_WORD}* words.`, ledeAccent: accent });
      try {
        const out = join(dir, accent);
        const built = await lockedBuild({ outDir: out, fourFlyers: false, frontPath: path });
        const pdf = join(out, `${built.planned.find((p) => p.piece.id === "flyer").stem}.pdf`);
        assert.ok(pixelsNear(pdf, ACCENT_WORD, ACCENT_RGB[accent]) >= COLOUR_PIXELS_MIN, `${ACCENT_WORD} is drawn in ${accent}`);
        assert.ok(pixelsNear(pdf, "Plain", ACCENT_RGB[accent]) < COLOUR_PIXELS_MIN, `"Plain" is not drawn in ${accent}`);
      } finally {
        await rm(wordsDir, { recursive: true, force: true });
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("Q29: the back's bar and steps refused outside § 14 item 3, naming the line", () => {
  const head = "# Heading words\n\nThe lede words.\n\n";
  const cases = [
    ["**Bar lead**\n- {rocket} One\n- {vegan} Two\n", /line 6: an icon must be one of/],
    ["Some words.\n- {vegan} One\n", /line 6: a list/],
    ["**Bar lead**\n- {vegan} One\n1. {order} Title: detail\n", /line 7: a block mixes a bar's items and steps/],
    ["**Steps lead**\n2. {order} Title: detail\n", /line 6: steps are numbered from 1 in order/],
    ["**Steps lead**\n1. {order} Title without its detail\n", /line 6: an item must be/],
    ["**Bar lead**\n\nWords.\n", /line 5: a lead-in on a line of its own must be followed/],
    ["**Bar lead**\n- {vegan} One\n", /a bar must have 2 to 6 items, not 1/],
  ];
  for (const [rest, why] of cases) assert.throws(() => parseBack(head + rest, "fixture.md"), why);
  assert.throws(() => parseBack("# Heading words\n\n**Bar lead**\n- {vegan} One\n- {diabetic} Two\n", "fixture.md"), /the first paragraph is the lede/);
  const read = parseBack(BACK_GRAPHICS_FIXTURE, "fixture.md");
  assert.deepEqual(read.paragraphs.map((p) => p.kind), ["text", "bar", "steps"]);
  assert.deepEqual(read.paragraphs[2].items.map((it) => [it.icon, it.title, it.detail]), [["order", "Title one", "detail one"], ["cook", "Title two", "detail two"], ["eat", "Title three", "detail three"]]);
  for (const name of ICON_NAMES) assert.match(icon(name, "x"), /^<svg class="x" viewBox="0 0 24 24"[^>]*>.+<\/svg>$/, `the icon ${name} is drawn`);
});

test("Q29: built, the back's graphics are in the PDF in the file's order", { skip: NO_CHROME || NO_POPPLER }, async () => {
  const { dir, path } = await backFile(BACK_GRAPHICS_FIXTURE);
  try {
    assert.deepEqual(await backGraphicsProblems(ROOT, path), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("Q29 (§ 14 item 4): a 60-character meal name prints on front B; a 61-character one is refused", { skip: NO_CHROME || NO_POPPLER }, async () => {
  const set = await photoSet();
  const dir = await mkdtemp(join(tmpdir(), "boston-q29-names-"));
  const { dir: wordsDir, path } = await frontFile(FRONT_FIXTURE);
  try {
    // a name of words, as a meal's is (a run with no space cannot wrap, and no meal's name is one)
    const named = (length) => Object.fromEntries(Object.entries(set.ids).map(([role, id]) => [id, `Meal ${role}${" with words".repeat(8)}`.slice(0, length).replace(/ $/, "w")]));
    const namesPath = join(dir, "names.json");
    const sixty = named(60);
    await writeFile(namesPath, JSON.stringify(sixty));
    const out = join(dir, "out");
    const built = await lockedBuild({ outDir: out, fourFlyers: false, frontPath: path, photoNamesPath: namesPath, ...set.photos });
    const flyer = built.planned.find((p) => p.piece.id === "flyer");
    const page1 = execFileSync("pdftotext", ["-raw", "-f", "1", "-l", "1", join(out, `${flyer.stem}.pdf`), "-"]).toString("utf8");
    const flat = (s) => s.replace(/\s+/g, "");
    assert.ok(flat(page1).includes(flat(sixty[built.chosen.assignment.positions.flyer])), "the 60-character name is on front B");
    assert.deepEqual(built.lines.filter((l) => l.startsWith("safe margin")), []);
    await writeFile(namesPath, JSON.stringify(named(61)));
    await assert.rejects(lockedBuild({ outDir: join(dir, "out2"), fourFlyers: false, frontPath: path, photoNamesPath: namesPath, ...set.photos }), /at most 60 characters/);
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(wordsDir, { recursive: true, force: true });
    await rm(set.dir, { recursive: true, force: true });
  }
});
