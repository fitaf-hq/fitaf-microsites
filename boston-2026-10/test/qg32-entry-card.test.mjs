// QG32 (SPEC-print-pieces.md § 17 item 5's Q32, as §§ 17.2–17.3 amend it; test/qg-checks.mjs): the entry card, one side,
// landscape. Its words file is read in its subset only, anything else refused naming the line (print/entry.mjs): `# Front`,
// its heading, its field (email-shaped: its blanks writing lines, its @ and . printed), its fine print with **bold** runs.
// Built with a fixture's invented words: letter-entry-cards, one US Letter page of eight cards (2 × 4, 3.75 × 2.5 in) when
// they fit at the floor 0.25 in inside each cut, else six (2 × 3), the report saying which and by how much eight was over;
// too long for six, refused; the field's @ and . and the fine print whole read from the PDF on every card; no card word
// within 0.25 in of its cut; nothing within 36 pt of the paper's edge or outside the cards; the card's own PDF its trim
// and the bleed.
import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { ROOT } from "../build.mjs";
import { parseEntry } from "../print/entry.mjs";
import { GIVEAWAY_PIECES, pagePoints } from "../print/sizes.mjs";
import { NO_CHROME } from "./print-fixtures.mjs";
import { ENTRY_FINE, ENTRY_FIXTURE, ENTRY_RUNS, entryProblems, entryTooLongProblems, longEntry, NO_POPPLER, wordsFile } from "./qg-checks.mjs";

const card = GIVEAWAY_PIECES.find((p) => p.id === "entry-card");

test("QG32: the entry card is one side, landscape, at eight a page's size (3.75 × 2.5 in), its own page 288 × 198 pt", () => {
  assert.deepEqual([card.face, card.faces, card.sides ?? 1], [{ w: 3.75, h: 2.5 }, 1, 1]);
  assert.deepEqual(pagePoints(card), { w: 288, h: 198 });
});

test("QG32: the entry words file read in its subset: one side, its heading (a subhead optional), its email-shaped field, its fine print's bold runs", () => {
  const words = parseEntry(ENTRY_FIXTURE, "entry-words.md");
  assert.equal(words.front.heading.text, "Fixture heading words");
  // § 17.8 item 3: no subhead; one stays allowed (§ 17.6 item 1), a line between the heading and the fields
  assert.equal(words.front.subhead, null);
  assert.deepEqual(parseEntry(ENTRY_FIXTURE.replace("## Fixture heading words\n", "## Fixture heading words\n\nA subhead\n"), "x.md").front.subhead, { text: "A subhead", line: 5 });
  assert.deepEqual(words.front.fields.map((f) => f.label), ["@ ."]);
  // §§ 17.2 item 2, 17.6 item 2: the email-shaped field with no label, its blanks writing lines, its @ and . between them
  assert.deepEqual(words.front.fields[0].parts, [{ blank: 6 }, { text: "@" }, { blank: 8 }, { text: "." }, { blank: 3 }]);
  assert.deepEqual(words.front.paragraphs.map((p) => p.text), ENTRY_FINE);
  assert.deepEqual(words.front.paragraphs[0].runs.map((r) => [r.bold, r.text]), [
    [true, "Fixture rule one."],
    [false, " Its words after the bold. "],
    [true, "A second bold run"],
    [false, ": then plain words to the end of the paragraph."],
  ]);
  assert.equal(words.approved, false);
  assert.equal(parseEntry(`${ENTRY_FIXTURE}\n<!-- approved -->\n`, "x.md").approved, true);
  assert.deepEqual(ENTRY_RUNS.slice(1, 3), ["@", "."]);
});

test("QG32: outside the subset, refused, naming the line", () => {
  const swap = (from, to) => ENTRY_FIXTURE.replace(from, to);
  const cases = [
    [ENTRY_FIXTURE.replace("# Front\n\n", ""), /line 1: the first line must be "# Front"/],
    [swap("its words plain.", "its [words](https://x)."), /line 9: a link/],
    [swap("its words plain.", "its *words* plain."), /line 9: emphasis/],
    [swap("**A second bold run**", "**A second bold run"), /line 7: a \*\*bold\*\* run is not closed/],
    [swap("its words plain.", "its <b>words</b>."), /line 9: HTML/],
    [swap("- ______ @ ________ . ___\n", "- ______ @ ________ . ___\n\n"), /line 7: a second blank line/],
    [swap("## Fixture heading words", "### A third level"), /line 3: "# Front" is followed by its "## <heading>"/],
    [swap("- ______ @ ________ . ___", "- One\n- Two\n- Three\n- Four\n- Five\n- Six\n- Seven"), /line 5: 7 fields, more than 6/],
    [swap("- ______ @ ________ . ___", "- Mail_x_"), /line 5: emphasis/],
    [swap("## Fixture heading words\n", "## Fixture heading words\n\nA subhead\nand a second line\n"), /line 6: the subhead is one line/],
    [`${ENTRY_FIXTURE}\n# Back\n\n## Rules\n\nWords.\n`, /line 11: a heading out of its place/],
    [`${ENTRY_FIXTURE}\n<!-- approved -->\nmore\n`, /an HTML comment/],
  ];
  for (const [text, why] of cases) {
    assert.throws(() => parseEntry(text, "entry-words.md"), (err) => why.test(err.message) && /^entry-words\.md, line \d+: /.test(err.message), String(why));
  }
});

async function withWords(text, fn) {
  const file = await wordsFile(text, "entry-words.md");
  try {
    return await fn(file.path);
  } finally {
    await rm(file.dir, { recursive: true, force: true });
  }
}

test("QG32: built, eight cards a page when they fit; the heading, the @ and . and the fine print from the PDF on each; no label; the email line across the measure right under the heading; the fine print on the inset in ten lines; the margins clear", { skip: NO_CHROME || NO_POPPLER }, async () => {
  assert.deepEqual(await withWords(ENTRY_FIXTURE, (path) => entryProblems(ROOT, path, { count: 8 })), []);
});

test("QG32: built, six a page when eight do not fit, the report saying by how much; too long for six, refused", { skip: NO_CHROME || NO_POPPLER }, async () => {
  assert.deepEqual(await withWords(longEntry(5), (path) => entryProblems(ROOT, path, { count: 6, tenLines: false })), []);
  assert.deepEqual(await withWords(longEntry(12), (path) => entryTooLongProblems(ROOT, path)), []);
});
