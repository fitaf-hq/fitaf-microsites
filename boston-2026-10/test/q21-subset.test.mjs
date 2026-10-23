// Q21 (SPEC-print-pieces.md § 12 item 4): the words file is a strict Markdown subset. Line 1 `# <heading>`; then
// paragraphs separated by one blank line; a paragraph may open with `**<lead-in>**` and a space; `’` and the page's own
// copy's characters are allowed; nothing else Markdown means is. A list, a link, a second heading and stray HTML are
// each refused, naming the line, as are emphasis elsewhere, an HTML comment other than the approval mark, a first line
// that is not the heading and a doubled blank line. The committed file, and the file with the mark as its last line,
// are read (the controls). No Chrome.
import test from "node:test";
import assert from "node:assert/strict";
import { BACK_SOURCE, parseBack } from "../print/back.mjs";
import { approved, committedBack, MARK, unmarked } from "./qb-checks.mjs";

const text = await committedBack();
// The refusal cases edit a FIXED text of the subset's shape, not the committed words, which the Advisor edits: a case
// that named a word of the live file broke when the words were cut (2026-10-20). Its seven lines are numbered as the
// cases below read them: 1 the heading, 3 the lede, 5 7 9 11 13 the paragraphs.
const FIXTURE = [
  "# Why Fit AF?",
  "",
  "Fresh, chef-prepared meals, made for your goals, delivered every week.",
  "",
  "**Fresh, never frozen.** Every meal is cooked in our own kitchen. We've been doing it since 2017.",
  "",
  "**Built around your goals.** Lean, Signature, Performance or Family.",
  "",
  "**A new menu every week.** The favourites stay, and there is always something new.",
  "",
  "**Allergen sensitive.** Celiac, diabetic and other diets are fully accommodated.",
  "",
  "**Delivered where you are.** Your meals arrive on Sunday. You don't need to be in.",
].join("\n") + "\n";
const lines = FIXTURE.replace(/\n+$/, "").split("\n");
const committedLines = text.replace(/\n+$/, "").split("\n");
/** The committed file with line `n` (1-based) replaced by `line`, or with `line` inserted before it. */
const withLine = (n, line, { insert = false } = {}) => [...lines.slice(0, n - 1), line, ...lines.slice(insert ? n - 1 : n)].join("\n") + "\n";
// assert.throws tests a RegExp against the error as a string, "Error: <message>", so the pattern opens with the name.
const refused = (source, line, what) => new RegExp(`^Error: ${source.replace(/[.]/g, "\\.")}, line ${line}: ${what}`);

/**
 * The committed file's blocks, read the plain way (not by back.mjs): each a run of lines after a blank one, the approval
 * mark not one; its first line, its line number, and how many of its lines are §§ 14–15's items. A block is a lead-in on
 * its own line followed by items (a bar, steps or plans), a lead-in alone (a statement), or a paragraph of words, which
 * may open with a lead-in; the first block is the lede only when it is words (§ 15 item 8).
 */
const LEAD_ALONE = /^\*\*([^*]+)\*\*$/;
const LEAD_OPENING = /^\*\*([^*]+)\*\* /;
const PLAN_ITEM = /^- \{(lean|signature|performance|family)\} /;
const blocks = [];
committedLines.forEach((line, i) => {
  if (i === 0 || !line.trim() || line === MARK) return;
  if (!committedLines[i - 1].trim()) blocks.push({ first: line, line: i + 1, items: [] });
  else if (/^(-|\d+\.) \{/.test(line)) blocks.at(-1).items.push(line);
});
const kindOf = (b) => {
  if (!LEAD_ALONE.test(b.first)) return "text";
  if (b.items.length === 0) return "statement";
  if (/^\d+\./.test(b.items[0])) return "steps";
  return PLAN_ITEM.test(b.items[0]) ? "plans" : "bar";
};
const leadOf = (b) => (LEAD_ALONE.exec(b.first) ?? LEAD_OPENING.exec(b.first))?.[1] ?? null;

// § 15 item 8 (2026-10-21) amends this control on purpose: the committed back is now graphics and a statement with no
// lede, and approved, so the control reads its blocks in order (each kind, line, lead-in and count of items) and its mark
// from the file, where it had pinned a lede followed by paragraphs, and the file unapproved
test("Q21 control: the committed file is read: its heading, its blocks in order (a lede only when the first is words), each lead-in apart, its mark", () => {
  const back = parseBack(text);
  assert.equal(back.heading.text, committedLines[0].replace(/^# /, ""));
  assert.equal(back.heading.line, 1);
  assert.ok(blocks.length >= 2, `the file has its blocks (control): ${blocks.length}`);
  assert.equal(back.paragraphs.length, blocks.length, "one paragraph a block");
  assert.deepEqual(back.paragraphs.map((p) => p.line), blocks.map((b) => b.line), "each block's line");
  assert.deepEqual(back.paragraphs.map((p) => p.kind), blocks.map(kindOf), "each block's kind, in order");
  assert.deepEqual(back.paragraphs.map((p) => p.items?.length ?? 0), blocks.map((b) => b.items.length), "each block's items");
  assert.deepEqual(back.paragraphs.map((p) => p.lead), blocks.map(leadOf), "each lead-in, its asterisks gone, or none");
  assert.ok(back.paragraphs.every((p) => !(p.lead ?? "").includes("*") && !(p.text ?? "").includes("*")), "no asterisk left in the words");
  assert.equal(back.paragraphs[0].kind === "text", kindOf(blocks[0]) === "text", "a lede only when the first block is words");
  assert.equal(back.approved, committedLines.at(-1) === MARK, "approved when, and only when, its last line is the mark");
  assert.equal(parseBack(FIXTURE).paragraphs.length, 6, "the fixture the refusal cases edit is read whole (so each refusal is its own edit's)");
  assert.equal(parseBack(unmarked(text)).approved, false, "the file without the approval mark");
  assert.equal(parseBack(approved(unmarked(text))).approved, true, "the approval mark as the last line");
  assert.equal(parseBack(FIXTURE.replace("We've", "We’ve")).paragraphs[1].text.includes("We’ve"), true, "’ is allowed");
});

test("Q21: a list, a link, a second heading and stray HTML are each refused, naming the line", () => {
  const cases = [
    [withLine(5, "- Fresh, never frozen."), 5, "a list"],
    [withLine(5, "* Fresh, never frozen."), 5, "a list"],
    [withLine(5, "1. Fresh, never frozen."), 5, "a list"],
    [withLine(7, `${lines[6]} See [our menu](https://eatfitaf.com/).`), 7, "a link"],
    [withLine(9, "## A new menu every week."), 9, "a second heading"],
    [withLine(9, "# A new menu every week."), 9, "a second heading"],
    [withLine(11, `${lines[10]} <b>Always.</b>`), 11, "HTML"],
    [withLine(11, "<p>Allergen sensitive.</p>"), 11, "HTML"],
  ];
  for (const [file, line, what] of cases) assert.throws(() => parseBack(file), refused(BACK_SOURCE, line, what), `line ${line}: ${what}`);
});

test("Q21: emphasis elsewhere, another comment, a first line not the heading, a doubled blank line: refused, naming the line", () => {
  const cases = [
    [withLine(5, lines[4].replace("Every meal", "Every *single* meal")), 5, "emphasis"],
    [withLine(5, lines[4].replace("Every meal", "Every __single__ meal")), 5, "emphasis"],
    // § 15 items 4 and 8 (2026-10-21) retire the bolded-lede case on purpose: a bold line alone is a statement and the
    // lede is optional, so it parses (Q30 holds it)
    [withLine(13, "<!-- a note -->"), 13, "an HTML comment"],
    [withLine(1, "Why Fit AF?"), 1, "the first line"],
    [withLine(2, "", { insert: true }), 3, "a second blank line"],
    [withLine(5, `${lines[4]} \`code\``), 5, "code"],
    [withLine(5, `> ${lines[4]}`), 5, "a quote"],
    [`${FIXTURE.replace(/\n+$/, "")}\n\n${MARK}\n\n${MARK}\n`, 15, "an HTML comment"],
  ];
  for (const [file, line, what] of cases) assert.throws(() => parseBack(file), refused(BACK_SOURCE, line, what), `line ${line}: ${what}`);
});
