// QG32 (SPEC-print-pieces.md § 17 item 5's Q32, as § 17.2 item 4 amends it; test/qg-checks.mjs): the entry card. Its words
// file is read in its subset only, anything else refused naming the line (print/entry.mjs), and since § 17.2 a field may
// be email-shaped and a "# Front, one-sided" section gives the one-sided page its rules line. Built with a fixture's
// invented words: its own PDF two pages of 324 × 414 pt (4.25 × 5.5 in and the bleed); the letter sheets, four cards a
// page, the fronts' fields and the backs' rules read from the PDF, the four backs the same pixels, the one-sided page's
// rules line its own, the sign's rules whole; the writing lines at least 0.3 in apart and drawn; nothing within 36 pt of
// the paper's edge, no card word within 0.5 in of its cut, and no type under the floor.
import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { ROOT } from "../build.mjs";
import { parseEntry } from "../print/entry.mjs";
import { ENTRY_LINE_PITCH_IN, GIVEAWAY_PIECES, pagePoints } from "../print/sizes.mjs";
import { NO_CHROME } from "./print-fixtures.mjs";
import { ENTRY_FIXTURE, entryProblems, NO_POPPLER, PITCH_MIN_IN, wordsFile } from "./qg-checks.mjs";

const card = GIVEAWAY_PIECES.find((p) => p.id === "entry-card");

test("QG32: the entry card is a quarter of US Letter, 4.25 × 5.5 in portrait, two sides, its own page 324 × 414 pt; its lines' pitch at least 0.3 in", () => {
  assert.deepEqual([card.face, card.faces, card.sides], [{ w: 4.25, h: 5.5 }, 1, 2]);
  assert.deepEqual(pagePoints(card), { w: 324, h: 414 });
  assert.ok(ENTRY_LINE_PITCH_IN >= PITCH_MIN_IN, `the pitch ${ENTRY_LINE_PITCH_IN} in`);
});

test("QG32: the entry words file read in its subset: the fixture's two sides", () => {
  const words = parseEntry(ENTRY_FIXTURE, "entry-words.md");
  assert.equal(words.front.heading.text, "Fixture heading words");
  assert.deepEqual(words.front.fields.map((f) => f.label), ["Field one", "Mail: @ .", "Field three (optional)"]);
  // § 17.2 item 2: the email-shaped field, its blanks writing lines as long as their runs, its words between them
  assert.deepEqual(words.front.fields[1].parts, [{ text: "Mail:" }, { blank: 6 }, { text: "@" }, { blank: 8 }, { text: "." }, { blank: 3 }]);
  assert.deepEqual([words.front.fields[0].parts, words.front.fields[2].parts], [null, null]);
  assert.deepEqual(words.front.paragraphs.map((p) => p.text), ["The fixture draw line, a sentence of words.", "The fixture consent line, its words.", "The fixture rules line, two-sided."]);
  assert.deepEqual(words.oneSided.paragraphs.map((p) => p.text), ["The fixture rules line, one-sided."]);
  assert.deepEqual(words.back.paragraphs.map((p) => [p.lead, p.space, p.text.slice(0, 16)]), [["Rule one.", true, "Its words after "], ["Rule two", false, ": words after a "], [null, false, "A rule with no l"]]);
  assert.equal(words.approved, false);
  assert.equal(parseEntry(`${ENTRY_FIXTURE}\n<!-- approved -->\n`, "x.md").approved, true);
});

test("QG32: outside the subset, refused, naming the line", () => {
  const swap = (from, to) => ENTRY_FIXTURE.replace(from, to);
  const cases = [
    [ENTRY_FIXTURE.replace("# Front\n\n", ""), /line 1: the first line must be "# Front"/],
    [swap("Rule one.** Its words", "Rule one.** Its [words](https://x) "), /line 23: a link/],
    [swap("A rule with no lead-in, its words.", "A rule with *emphasis*."), /line 27: emphasis/],
    [swap("A rule with no lead-in, its words.", "- a list on the back"), /line 27: a list/],
    [swap("The fixture consent line, its words.", "The consent <b>line</b>."), /line 11: HTML/],
    [swap("The fixture draw line, a sentence of words.\n", "The fixture draw line, a sentence of words.\n\n"), /line 11: a second blank line/],
    [swap("## Fixture rules heading", "### A third level"), /line 21: "# Back" is followed by its "## <heading>"/],
    [swap("- Field three (optional)", "- Field three\n- Four\n- Five\n- Six\n- Seven"), /line 5: 7 fields, more than 6/],
    [swap("- Field one", "- Field one_x_"), /line 5: emphasis/],
    [swap("# Front, one-sided\n\nThe fixture rules line, one-sided.\n\n", "") + "\n# Front, one-sided\n\nLate.\n", /line \d+: "# Front, one-sided" comes after "# Front" and before "# Back"/],
    [`${ENTRY_FIXTURE}\n<!-- approved -->\nmore\n`, /an HTML comment/],
  ];
  for (const [text, why] of cases) {
    assert.throws(() => parseEntry(text, "entry-words.md"), (err) => why.test(err.message) && /^entry-words\.md, line \d+: /.test(err.message), String(why));
  }
});

test("QG32: built, the card's own PDF and its letter sheets: four a page, the words read from the PDF, the backs identical, the paper's margin clear", { skip: NO_CHROME || NO_POPPLER }, async () => {
  const file = await wordsFile(ENTRY_FIXTURE, "entry-words.md");
  try {
    assert.deepEqual(await entryProblems(ROOT, file.path), []);
  } finally {
    await rm(file.dir, { recursive: true, force: true });
  }
});
