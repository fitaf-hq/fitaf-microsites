// Q30 (SPEC-print-pieces.md § 15): pass 5. Front B's `logo` key (each treatment builds; the reversed logo is the band's
// image, on no plate; an unknown one refused) and its `banner` (read from the PDF in the foot above the offer; a
// 33-character one refused); a back with plans and a statement builds, its lead-ins, names and lines in the PDF in the
// file's order; each malformed plans item refused naming its line. Every word is a fixture's, never a candidate's: the
// candidates are not approved and this repository is public.
import test from "node:test";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { parseBack } from "../print/back.mjs";
import { BANNER_MAX_CHARS, LOGO_TREATMENTS, readFront } from "../print/front.mjs";
import { lockedBuild, NO_CHROME } from "./print-fixtures.mjs";
import { backFile, backGraphicsProblems, FRONT_FIXTURE, frontFile, NO_POPPLER, PLANS_FIXTURE, PLANS_RUNS } from "./qb-checks.mjs";

/** § 15 item 1: the reversed logos' files and their pixel size (print/assets/). */
const REVERSED_FILES = { reversed: "fitaf-logo-reversed.png", "reversed-white": "fitaf-logo-reversed-white.png" };
const REVERSED_SIZE = "1600   690";
const BANNER_WORD = "Ribbon";
/**
 * Where a plate would show, in layout px on page 1 drawn at PROBE_DPI (one pixel a layout px, the bleed included),
 * measured on the built PDFs (2026-10-21): the reversed logo is drawn over x 394–503, y 34–78; pass 2's white plate over
 * x 413–505, y 33–93 (92 wide, its 6/8 px padding inside: border-box). A strip just outside the reversed logo's left and
 * top edges is the band's ink when there is no plate; the plate's top padding is white.
 */
const PROBE_DPI = 120;
const LEFT_OF_REVERSED = { x: 388, y: 40, w: 3, h: 34 };
const ABOVE_REVERSED = { x: 400, y: 29, w: 100, h: 2 };
const PLATE_PADDING = { x: 430, y: 34, w: 40, h: 3 };
const WHITE_MIN = 235;

test("Q30: front B's logo and banner keys are checked", async () => {
  for (const [words, why] of [
    [{ ...FRONT_FIXTURE, logo: "sticker" }, /"logo" must be one of reversed, reversed-white, plate/],
    [{ ...FRONT_FIXTURE, banner: "x".repeat(BANNER_MAX_CHARS + 1) }, /"banner" must be one line of at most 32 characters/],
    [{ ...FRONT_FIXTURE, banner: "  " }, /"banner" must be one line/],
  ]) {
    const { dir, path } = await frontFile(words);
    try {
      await assert.rejects(readFront(path), why);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  const { dir, path } = await frontFile({ ...FRONT_FIXTURE, banner: "x".repeat(BANNER_MAX_CHARS) });
  try {
    const read = await readFront(path);
    assert.equal(read.logo, LOGO_TREATMENTS[0], "reversed when the key is absent");
    assert.equal(read.banner.length, BANNER_MAX_CHARS, "a 32-character banner is read");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

/** The pixels of page 1 inside `box` (layout px at PROBE_DPI) whose every channel is at least WHITE_MIN. */
function whitePixels(pdf, box) {
  const ppm = execFileSync("pdftoppm", ["-r", String(PROBE_DPI), "-f", "1", "-l", "1", "-x", String(box.x), "-y", String(box.y), "-W", String(box.w), "-H", String(box.h), pdf]);
  const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/.exec(ppm.subarray(0, 64).toString("latin1"));
  const data = ppm.subarray(header[0].length);
  let white = 0;
  for (let i = 0; i + 2 < data.length; i += 3) if (data[i] >= WHITE_MIN && data[i + 1] >= WHITE_MIN && data[i + 2] >= WHITE_MIN) white += 1;
  return white;
}

/** Page 1's word boxes (points), by word. */
function wordBoxes(pdf) {
  const xml = execFileSync("pdftotext", ["-bbox", "-f", "1", "-l", "1", pdf, "-"]).toString("utf8");
  return [...xml.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)].map((m) => ({
    yMin: Number(m[2]),
    yMax: Number(m[4]),
    text: m[5],
  }));
}

test("Q30: built, each logo treatment is the band's image, the reversed ones on no plate; the banner sits above the offer", { skip: NO_CHROME || NO_POPPLER }, async () => {
  const dir = await mkdtemp(join(tmpdir(), "boston-q30-front-"));
  try {
    for (const logo of LOGO_TREATMENTS) {
      const { dir: wordsDir, path } = await frontFile({ ...FRONT_FIXTURE, logo, banner: `${BANNER_WORD} words` });
      try {
        const out = join(dir, logo);
        const built = await lockedBuild({ outDir: out, fourFlyers: false, frontPath: path });
        const flyer = built.planned.find((p) => p.piece.id === "flyer");
        const pdf = join(out, `${flyer.stem}.pdf`);
        const images = execFileSync("pdfimages", ["-list", "-f", "1", "-l", "1", pdf]).toString("utf8");
        if (logo === "plate") {
          assert.ok(!images.includes(REVERSED_SIZE), "the plate treatment draws pass 2's logo, not a reversed one");
          assert.ok(whitePixels(pdf, PLATE_PADDING) > 0, "pass 2's plate is white around its logo");
        } else {
          assert.ok(images.includes(REVERSED_SIZE), `${logo}: the reversed logo is in the PDF at its own size`);
          assert.equal(whitePixels(pdf, LEFT_OF_REVERSED), 0, `${logo}: no plate left of the logo`);
          assert.equal(whitePixels(pdf, ABOVE_REVERSED), 0, `${logo}: no plate above the logo`);
        }
        const boxes = wordBoxes(pdf);
        const ribbon = boxes.find((b) => b.text.toLowerCase() === BANNER_WORD.toLowerCase());
        const sign = boxes.find((b) => b.text === "Sign");
        assert.ok(ribbon, "the banner's words are text in the PDF");
        assert.ok(sign, "the offer's first word is text in the PDF");
        assert.ok(ribbon.yMax <= sign.yMin, "the banner sits above the offer");
      } finally {
        await rm(wordsDir, { recursive: true, force: true });
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("Q30: the back's plans refused outside § 15 item 3, naming the line; a lead-in alone is a statement", () => {
  const head = "# Heading words\n\nThe lede words.\n\n";
  const cases = [
    ["**Plans lead**\n- {keto} Keto: a line\n- {lean} Lean: a line\n", /line 6: an icon must be one of/],
    ["**Plans lead**\n- {lean} Lean without its line\n- {family} Family: a line\n", /line 6: an icon must be one of/],
    ["**Plans lead**\n- {lean} Lean: a line\n- {vegan} Vegan\n", /line 7: a block mixes plans and a bar/],
    ["**Plans lead**\n- {lean} Lean: a line\n", /plans must have 2 to 4 items, not 1/],
  ];
  for (const [rest, why] of cases) assert.throws(() => parseBack(head + rest, "fixture.md"), why);
  const read = parseBack(PLANS_FIXTURE, "fixture.md");
  assert.deepEqual(read.paragraphs.map((p) => p.kind), ["text", "plans", "statement"]);
  assert.deepEqual(read.paragraphs[1].items.map((it) => [it.plan, it.name, it.text]), [
    ["lean", "Plan one", "line one"],
    ["signature", "Plan two", "line two"],
    ["performance", "Plan three", "line three"],
    ["family", "Plan four", "line four"],
  ]);
  assert.equal(read.paragraphs[2].lead, "Statement words");
});

test("Q30: built, the back's plans and statement are in the PDF in the file's order", { skip: NO_CHROME || NO_POPPLER }, async () => {
  const { dir, path } = await backFile(PLANS_FIXTURE);
  try {
    assert.deepEqual(await backGraphicsProblems(ROOT, path, PLANS_RUNS), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
