// QG31 (SPEC-print-pieces.md § 17 item 5's Q31, as § 17.2 item 4 amends it; § 16.1 holds Q31, so "G" for the giveaway,
// test/qg-checks.mjs): the tout. Its words file is refused outside print/tout.mjs's keys, naming the key; its own page is
// 6.25 × 4.25 in with the bleed (450 × 306 pt), landscape, one page; built with a fixture's invented words and the fixture
// photos, the PDF's own text carries the headline's lines, the lede, the banner, the scan line, `eatfitaf.com`, the fine
// print whole and its photo's caption; its QR code, drawn from the PDF, decodes to the `boston` URL; nothing less than the
// safe margin inside the trim; nothing under the type floor. § 17.2: letter-touts, one US Letter page of two, each code
// decoding, nothing within 36 pt of the paper's edge or outside the two. And it must fit, not shrink: a headline line
// that runs into the logo is refused, naming the layout px over. § 17.4: the headline the largest that sets each line, at
// least 46 layout px, its accent in the words file's colour; the band's edge straight; the fine print regular, on two
// lines from 7 pt to its 6.5 pt floor, else three, said, else refused; the ribbon and it one column; the scan line
// stacked above the code.
import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { readTout } from "../print/tout.mjs";
import { GIVEAWAY_PIECES, pagePoints } from "../print/sizes.mjs";
import { ROOT } from "../build.mjs";
import { NO_CHROME } from "./print-fixtures.mjs";
import { NO_POPPLER, ribbonBlueProblems, TOUT_FIXTURE, toutFitProblems, toutLookProblems, toutProblems, wordsFile } from "./qg-checks.mjs";

const tout = GIVEAWAY_PIECES.find((p) => p.id === "tout");

test("QG31: the tout is one 6 × 4 in landscape face, its page 450 × 306 pt (the trim and the bleed), one side", () => {
  assert.deepEqual([tout.face, tout.faces, tout.sides ?? 1], [{ w: 6, h: 4 }, 1, 1]);
  assert.deepEqual(pagePoints(tout), { w: 450, h: 306 });
  assert.deepEqual(tout.positions, ["tout"], "its one photo its own position (§ 17.2 item 3)");
});

test("QG31: a tout words file outside its keys is refused, naming the key", async () => {
  const cases = [
    [{ ...TOUT_FIXTURE, callout: ["a"] }, /"callout" is not one of/],
    [{ ...TOUT_FIXTURE, colour: "red" }, /"colour" is not one of/],
    [{ ...TOUT_FIXTURE, banner: undefined }, /"banner" is required/],
    [{ ...TOUT_FIXTURE, scan: undefined }, /"scan" must be one line/],
    [{ ...TOUT_FIXTURE, scan: "x".repeat(41) }, /"scan" must be one line of at most 40/],
    [{ ...TOUT_FIXTURE, fine: "" }, /"fine" must be the fine print/],
    [{ ...TOUT_FIXTURE, headline: ["a", "b", "c", "d"] }, /"headline" must be one to 3 lines/],
    [{ ...TOUT_FIXTURE, banner: "x".repeat(33) }, /"banner" must be one line of at most 32/],
    [{ ...TOUT_FIXTURE, headlineAccent: "red" }, /"headlineAccent" must be one of green, blue, orange/],
    // § 17.9 item 2: the ribbon's fill, ink or blue
    [{ ...TOUT_FIXTURE, bannerColor: "red" }, /"bannerColor" must be one of ink, blue/],
    // § 17.7 item 1: the colour spans' markup, each refused naming its line
    [{ ...TOUT_FIXTURE, headline: ["FIXTURE", "LINE {red:TWO}"] }, /"headline" line 2: \{red:…\} is not one of blue, green, orange/],
    [{ ...TOUT_FIXTURE, headline: ["FIXTURE", "LINE {blue:TWO"] }, /"headline" line 2: a brace unclosed, or a span inside another/],
    [{ ...TOUT_FIXTURE, headline: ["{blue:A {green:B}}"] }, /"headline" line 1: a brace unclosed, or a span inside another/],
    [{ ...TOUT_FIXTURE, lede: "A lede with {pink:words}." }, /"lede": \{pink:…\} is not one of blue, green, orange/],
  ];
  for (const [words, why] of cases) {
    const file = await wordsFile(words, "tout-words.json");
    try {
      await assert.rejects(readTout(file.path), (err) => why.test(err.message) && /§ 17\)$/.test(err.message));
    } finally {
      await rm(file.dir, { recursive: true, force: true });
    }
  }
  const file = await wordsFile(TOUT_FIXTURE, "tout-words.json");
  try {
    const read = await readTout(file.path);
    assert.deepEqual([read.headline, read.banner, read.scan, read.fine, read.approved, read.source, read.headlineAccent], [TOUT_FIXTURE.headline, TOUT_FIXTURE.banner, TOUT_FIXTURE.scan, TOUT_FIXTURE.fine, false, "tout-words.json", "green"]);
  } finally {
    await rm(file.dir, { recursive: true, force: true });
  }
});

test("QG31: built, the tout's PDF and its letter sheet carry its words, their QR codes decode to the boston URL, inside the margins and at the floor", { skip: NO_CHROME || NO_POPPLER }, async () => {
  const file = await wordsFile(TOUT_FIXTURE, "tout-words.json");
  try {
    assert.deepEqual(await toutProblems(ROOT, file.path, TOUT_FIXTURE), []);
  } finally {
    await rm(file.dir, { recursive: true, force: true });
  }
});

test("QG31: what does not fit is refused, naming the layout px over, never shrunk; the fine print on two lines, else three, said", { skip: NO_CHROME }, async () => {
  assert.deepEqual(await toutFitProblems(ROOT), []);
});

test("QG31 (§§ 17.4–17.8): the headline the largest on its three lines, its spans' colours from the PDF; the logo in the band; the edge straight; the foot 1.2 in; the fine print regular on at most three lines under its centred ribbon, both short of the photo's line; the scan unit; the address dark, its contrast named", { skip: NO_CHROME || NO_POPPLER }, async () => {
  const file = await wordsFile(TOUT_FIXTURE, "tout-words.json");
  try {
    assert.deepEqual(await toutLookProblems(ROOT, file.path), []);
  } finally {
    await rm(file.dir, { recursive: true, force: true });
  }
});

test("QG31 (§ 17.9 item 2): bannerColor blue sets the ribbon in the lede blue, its words white, the report naming their contrast", { skip: NO_CHROME }, async () => {
  assert.deepEqual(await ribbonBlueProblems(ROOT), []);
});
