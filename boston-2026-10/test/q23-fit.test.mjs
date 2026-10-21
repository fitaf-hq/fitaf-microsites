// Q23 (SPEC-print-pieces.md § 12 items 3 and 5): the back must fit, not shrink. Too many words (a fixture file: the
// committed words with their blocks said twice more, before the approval mark the committed file ends with since § 15
// item 8, so the file stays of the subset and the refusal is the overflow's, not a second comment's) are refused, nothing
// printed, the refusal naming how many layout px over it is; words that fit are not (print-fixtures.mjs: the committed
// file without its mark, less its last paragraph), and no type on their back is below 14 layout px (8.4 pt): qb-checks.mjs
// fitProblems, which the mutant "the overflow check off" runs on a mirror. The check itself (checks.mjs backFindings),
// over made-up measurements, no Chrome: the overflow is the words' bottom against the bottom row's top less the gap
// between them, to the layout px; type below the floor and text outside the safe margin are refused too. And the words
// as committed (data/flyer-back.md, the Advisor's to edit) fit: until they do, every print build refuses, and this case,
// the one whose subject is their length, names the overflow (qb-checks.mjs committedFitProblems).
import test from "node:test";
import assert from "node:assert/strict";
import { ROOT } from "../build.mjs";
import { backFindings } from "../print/checks.mjs";
import { BACK_GAP_PX, BACK_MIN_TEXT_PX, LAYOUT_PX_PER_INCH, PRINT_PIECES } from "../print/sizes.mjs";
import { NO_CHROME } from "./print-fixtures.mjs";
import { committedFitProblems, fitProblems, MIN_TEXT_PX, overflowOf } from "./qb-checks.mjs";

const flyer = PRINT_PIECES.find((p) => p.id === "flyer");
const px = (n) => n / LAYOUT_PX_PER_INCH;

test("Q23: the floor is 14 layout px, one named value; the gap above the bottom row the mock-up's own", () => {
  assert.equal(BACK_MIN_TEXT_PX, MIN_TEXT_PX);
  assert.equal(BACK_GAP_PX, 10, "mockups.css .flyer-body's gap");
});

/** A made-up back: the words' block from y0 for `h` layout px, the bottom row's at 600 layout px from the trim's top. */
function back({ h, size = 16, x = 24 }) {
  const trim = { x: px(15), y: px(15), w: px(510), h: px(660) };
  const words = { what: "flyer-back-words", x: trim.x + px(24), y: trim.y + px(184), w: px(462), h: px(h) };
  const foot = { what: "flyer-back-foot", x: trim.x + px(24), y: trim.y + px(586.5), w: px(462), h: px(53.5) };
  return {
    page: { x: 0, y: 0, w: px(540), h: px(690) },
    faces: [
      {
        trim,
        photos: [],
        qrs: [],
        logos: [],
        fields: [],
        blocks: [words, foot],
        texts: [
          { text: "Why Fit AF?", x: trim.x + px(x), y: words.y, w: px(200), h: px(36), size: 34 },
          { text: "the last words", x: trim.x + px(24), y: words.y + px(h) - px(20), w: px(200), h: px(20), size },
          { text: "eatfitaf.com", x: foot.x, y: foot.y + px(17), w: px(100), h: px(19.5), size: 15 },
        ],
      },
    ],
  };
}

test("Q23 control: words that end at the gap above the bottom row fit, with nothing to spare", () => {
  const limit = 586.5 - 184 - BACK_GAP_PX;
  const fits = backFindings(flyer, back({ h: limit }));
  assert.deepEqual(fits.refusals, []);
  assert.ok(Math.abs(fits.spacePx) < 1e-6, `${fits.spacePx}`);
  assert.equal(fits.smallestPx, 15);
  assert.ok(Math.abs(backFindings(flyer, back({ h: limit - 20 })).spacePx - 20) < 1e-6, "20 layout px to spare");
});

test("Q23 control: words 37.5 layout px too long are refused, naming 37.5 layout px over", () => {
  const { refusals } = backFindings(flyer, back({ h: 586.5 - 184 - BACK_GAP_PX + 37.5 }));
  assert.equal(refusals.length, 1, refusals.join("\n"));
  assert.equal(overflowOf(refusals[0]), 37.5, refusals[0]);
});

test("Q23 control: type below the floor, and text less than 0.125 in inside a cut edge, are refused on the back", () => {
  const small = backFindings(flyer, back({ h: 300, size: 13 })).refusals;
  assert.ok(small.some((r) => /"the last words" is 13 layout px, below the floor of 14/.test(r)), small.join("\n"));
  const edge = backFindings(flyer, back({ h: 300, x: 6 })).refusals;
  assert.ok(edge.some((r) => /the text "Why Fit AF\?" is less than 0\.125 in inside the trim \(left\)/.test(r)), edge.join("\n"));
});

test("Q23: built, too many words are refused naming the overflow, nothing printed; words that fit are not, no type below 14 px", { skip: NO_CHROME }, async () => {
  assert.deepEqual(await fitProblems(ROOT), []);
});

test("Q23: built, data/flyer-back.md as committed fits (until it does, the print build refuses)", { skip: NO_CHROME }, async () => {
  assert.deepEqual(await committedFitProblems(ROOT), []);
});
