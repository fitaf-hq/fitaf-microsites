// QG32 (SPEC-print-pieces.md § 17 item 5's Q32; test/qg-checks.mjs): the entry card. Its words file is read in its subset
// only, anything else refused naming the line (print/entry.mjs); built with a fixture's invented words it is two pages,
// each 450 × 306 pt; the front's heading, four field labels, draw line and consent line, and the back's rules whole, are
// read from the PDF in order; the front has a writing line per field, each at least 0.3 in below the one before and drawn
// in the PDF; nothing less than the safe margin inside the trim and no type under the floor.
import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { ROOT } from "../build.mjs";
import { parseEntry } from "../print/entry.mjs";
import { ENTRY_LINE_PITCH_IN, GIVEAWAY_PIECES, pagePoints } from "../print/sizes.mjs";
import { NO_CHROME } from "./print-fixtures.mjs";
import { ENTRY_FIXTURE, entryProblems, NO_POPPLER, PITCH_MIN_IN, wordsFile } from "./qg-checks.mjs";

const card = GIVEAWAY_PIECES.find((p) => p.id === "entry-card");

test("QG32: the entry card is one 6 × 4 in landscape face, two sides, each page 450 × 306 pt; its lines' pitch at least 0.3 in", () => {
  assert.deepEqual([card.face, card.faces, card.sides], [{ w: 6, h: 4 }, 1, 2]);
  assert.deepEqual(pagePoints(card), { w: 450, h: 306 });
  assert.ok(ENTRY_LINE_PITCH_IN >= PITCH_MIN_IN, `the pitch ${ENTRY_LINE_PITCH_IN} in`);
});

test("QG32: the entry words file read in its subset: the fixture's two sides", () => {
  const words = parseEntry(ENTRY_FIXTURE, "entry-words.md");
  assert.equal(words.front.heading.text, "Fixture heading words");
  assert.deepEqual(words.front.fields.map((f) => f.label), ["Field one", "Field two", "Field three (optional)", "Field four (optional)"]);
  assert.deepEqual(words.front.paragraphs.map((p) => p.text), ["The fixture draw line, a sentence of words.", "The fixture consent line, its words."]);
  assert.deepEqual(words.back.paragraphs.map((p) => [p.lead, p.space, p.text.slice(0, 16)]), [["Rule one.", true, "Its words after "], ["Rule two", false, ": words after a "], [null, false, "A rule with no l"]]);
  assert.equal(words.approved, false);
  assert.equal(parseEntry(`${ENTRY_FIXTURE}\n<!-- approved -->\n`, "x.md").approved, true);
});

test("QG32: outside the subset, refused, naming the line", () => {
  const swap = (from, to) => ENTRY_FIXTURE.replace(from, to);
  const cases = [
    [ENTRY_FIXTURE.replace("# Front\n\n", ""), /line 1: the first line must be "# Front"/],
    [swap("Rule one.** Its words", "Rule one.** Its [words](https://x) "), /line 18: a link/],
    [swap("A rule with no lead-in, its words.", "A rule with *emphasis*."), /line 22: emphasis/],
    [swap("A rule with no lead-in, its words.", "- a list on the back"), /line 22: a list/],
    [swap("The fixture consent line, its words.", "The consent <b>line</b>."), /line 12: HTML/],
    [swap("The fixture draw line, a sentence of words.\n", "The fixture draw line, a sentence of words.\n\n"), /line 12: a second blank line/],
    [swap("## Fixture rules heading", "### A third level"), /line 16: "# Back" is followed by its "## <heading>"/],
    [swap("- Field four (optional)", "- Field four\n- Five\n- Six\n- Seven"), /line 5: 7 fields, more than 6/],
    [`${ENTRY_FIXTURE}\n<!-- approved -->\nmore\n`, /an HTML comment/],
  ];
  for (const [text, why] of cases) {
    assert.throws(() => parseEntry(text, "entry-words.md"), (err) => why.test(err.message) && /^entry-words\.md, line \d+: /.test(err.message), String(why));
  }
});

test("QG32: built, two pages; each side's words read from the PDF in order; four writing lines, 0.3 in apart or more, drawn", { skip: NO_CHROME || NO_POPPLER }, async () => {
  const file = await wordsFile(ENTRY_FIXTURE, "entry-words.md");
  try {
    assert.deepEqual(await entryProblems(ROOT, file.path), []);
  } finally {
    await rm(file.dir, { recursive: true, force: true });
  }
});
