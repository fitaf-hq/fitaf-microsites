// QG31 (SPEC-print-pieces.md § 17 item 5's Q31; § 16.1 holds Q31, so "G" for the giveaway, test/qg-checks.mjs): the tout.
// Its words file is refused outside print/tout.mjs's keys, naming the key; its page is 6.25 × 4.25 in with the bleed (450 ×
// 306 pt), landscape, one page; built with a fixture's invented words and the fixture photos, the PDF's own text carries
// the headline's lines, the lede, the banner, the scan line, `eatfitaf.com`, the fine print whole and the flyer's caption
// of its photo (the tout's one photo is the flyer's); its QR code, drawn from the PDF, decodes to the `boston` URL; nothing
// less than the safe margin inside the trim; nothing under the type floor. And it must fit, not shrink: a headline line
// that runs into the logo, and fine print that overflows the foot, are each refused, naming the layout px over.
import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { readTout } from "../print/tout.mjs";
import { GIVEAWAY_PIECES, pagePoints } from "../print/sizes.mjs";
import { ROOT } from "../build.mjs";
import { NO_CHROME } from "./print-fixtures.mjs";
import { NO_POPPLER, TOUT_FIXTURE, toutFitProblems, toutProblems, wordsFile } from "./qg-checks.mjs";

const tout = GIVEAWAY_PIECES.find((p) => p.id === "tout");

test("QG31: the tout is one 6 × 4 in landscape face, its page 450 × 306 pt (the trim and the bleed), one side", () => {
  assert.deepEqual([tout.face, tout.faces, tout.sides ?? 1], [{ w: 6, h: 4 }, 1, 1]);
  assert.deepEqual(pagePoints(tout), { w: 450, h: 306 });
  assert.deepEqual(tout.positions, ["flyer"], "its one photo is the flyer's");
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
    assert.deepEqual([read.headline, read.banner, read.scan, read.fine, read.approved, read.source], [TOUT_FIXTURE.headline, TOUT_FIXTURE.banner, TOUT_FIXTURE.scan, TOUT_FIXTURE.fine, false, "tout-words.json"]);
  } finally {
    await rm(file.dir, { recursive: true, force: true });
  }
});

test("QG31: built, the tout's PDF carries its words and its QR code decodes to the boston URL, inside the safe margin and at the floor", { skip: NO_CHROME || NO_POPPLER }, async () => {
  const file = await wordsFile(TOUT_FIXTURE, "tout-words.json");
  try {
    assert.deepEqual(await toutProblems(ROOT, file.path, TOUT_FIXTURE), []);
  } finally {
    await rm(file.dir, { recursive: true, force: true });
  }
});

test("QG31: what does not fit is refused, naming the layout px over, never shrunk", { skip: NO_CHROME }, async () => {
  assert.deepEqual(await toutFitProblems(ROOT), []);
});
