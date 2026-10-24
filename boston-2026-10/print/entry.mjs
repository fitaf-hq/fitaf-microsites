// SPEC-print-pieces.md § 17 item 3, as §§ 17.2–17.3 have it: the giveaway entry card's words, read from the Markdown file
// `--entry-words` names. The words are not approved and stay outside this repository (a public one: § 13 item 3). A small
// file a person can edit, read in ONLY this subset (§ 17.3 item 1: one side, its rules on it as fine print):
//   # Front                      then, each after one blank line:
//   ## <heading>
//   <subhead>                    (optional, § 17.6 item 1) one line of words, set under the heading
//   - <label>                    the fields, one to ENTRY_FIELDS_MAX lines, each printed as a label over a writing line;
//                                a field holding runs of underscores (§ 17.2 item 2: "Email: ________ @ __________ . ___")
//                                is printed as its own line, each run a writing line as long as the run, the words
//                                between them printed
//   <paragraph>                  one or more, the fine print (the rules), separated by one blank line; words between
//                                double asterisks (**like this**, in pairs) are set bold
// A paragraph may run over several lines, joined by a space. A `[bracket]` is a value not given yet (§ 17 item 4: the card
// is a proof while one remains). The one HTML comment allowed is the approval mark, `<!-- approved -->`, as the last line:
// until it is there the card is a proof. Anything else Markdown means (another heading, a list elsewhere, a link, other
// emphasis, code, a quote, HTML) is refused, naming the line. Blank lines at the very end are an editor's, and ignored.
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { APPROVED_MARK, COPY_CHAR } from "./back.mjs";

const SECTION = "§ 17.3 item 1";
export const ENTRY_FIELDS_MAX = 6;
const FRONT = "# Front";
/** § 17.2 item 2: a run of underscores in a field is a writing line. */
const BLANK = /(_{2,})/;
const HEADING = /^## (\S.*)$/;
const FIELD = /^- (\S.*)$/;
const BOLD = "**";
/** A bracket is a placeholder; anything else of the page's own copy's characters (print/back.mjs) is a word. */
const ENTRY_CHAR = (ch) => ch === "[" || ch === "]" || ch === "@" || COPY_CHAR.test(ch);
/** What each refused construct is called, by the first sign of it in a line of words, in this order. */
const REFUSED = [
  [/^\s+\S/, "an indented line (Markdown reads it as code or a continuation)"],
  [/^#/, `a heading out of its place (only "${FRONT}", then its "## <heading>")`],
  [/^([-*+]|\d+[.)])(\s|$)/, "a list (the fields are the only one)"],
  [/^>/, "a quote"],
  [/<!--/, `an HTML comment (the only one allowed is "${APPROVED_MARK}", as the last line)`],
  [/[<>]/, "HTML"],
  [/\]\(|\]\[/, "a link"],
  [/`/, "code"],
  [/[*_]/, "emphasis (only **bold**, in the fine print)"],
];

/** The entry card's words, from a file's text: { front, approved, texts }; refused outside the subset, naming the line. */
export function parseEntry(text, source) {
  const refuse = (n, what) => {
    throw new Error(`${source}, line ${n}: ${what} (SPEC-print-pieces.md ${SECTION})`);
  };
  const lines = text.replace(/\n+$/, "").split("\n");
  const approved = lines.at(-1) === APPROVED_MARK;
  if (approved) lines.pop();
  // the blocks, each its first line's number and its lines, split on one blank line (two in a row are refused)
  const blocks = [];
  lines.forEach((line, i) => {
    if (line.trim() === "") {
      if (i > 0 && lines[i - 1].trim() === "") refuse(i + 1, "a second blank line (one parts two blocks)");
      return;
    }
    if (i === 0 || lines[i - 1].trim() === "") blocks.push({ n: i + 1, lines: [] });
    blocks.at(-1).lines.push(line);
  });
  // a line of words, every character the page's own; in the fine print (`bold`) its ** marks are set aside first
  const words = (n, line, { bold = false } = {}) => {
    const plain = bold ? line.replaceAll(BOLD, "") : line;
    for (const [sign, what] of REFUSED) if (sign.test(plain)) refuse(n, what);
    for (const ch of plain) if (!ENTRY_CHAR(ch)) refuse(n, `a character outside the subset, ${JSON.stringify(ch)} (U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")})`);
    return line;
  };
  const [side, head, ...after] = blocks;
  // § 17.6 item 1: a line of words between the heading and the fields is the subhead
  const subBlock = after[0] && !FIELD.test(after[0].lines[0]) && after[1] && FIELD.test(after[1].lines[0]) ? after.shift() : null;
  const [list, ...rest] = after;
  if (!side || side.lines[0] !== FRONT) refuse(side?.n ?? 1, `the first line must be "${FRONT}"`);
  if (side.lines.length > 1) refuse(side.n + 1, `"${FRONT}" stands alone, a blank line after it`);
  const h = head && HEADING.exec(head.lines[0]);
  if (!h || head.lines.length > 1) refuse(head?.n ?? side.n, `"${FRONT}" is followed by its "## <heading>", alone`);
  if (subBlock && subBlock.lines.length > 1) refuse(subBlock.n + 1, "the subhead is one line");
  const subhead = subBlock ? { text: words(subBlock.n, subBlock.lines[0]).trim(), line: subBlock.n } : null;
  const front = { heading: { text: words(head.n, h[1]).trim(), line: head.n }, subhead, fields: [], paragraphs: [] };
  if (!list || !FIELD.test(list.lines[0])) refuse(list?.n ?? head.n, "the heading is followed by its fields, - <label> each");
  list.lines.forEach((line, j) => {
    const f = FIELD.exec(line);
    if (!f) refuse(list.n + j, "a field is one line, - <label>");
    // § 17.2 item 2: the runs of underscores are writing lines (their lengths kept), the words between them words
    const parts = f[1].split(BLANK).map((part) => (BLANK.test(part) ? { blank: part.length } : { text: words(list.n + j, part.trim()) })).filter((part) => part.blank || part.text);
    const label = parts.map((part) => part.text ?? "").filter(Boolean).join(" ");
    front.fields.push({ label, parts: parts.some((part) => part.blank) ? parts : null, line: list.n + j });
  });
  if (front.fields.length > ENTRY_FIELDS_MAX) refuse(list.n, `${front.fields.length} fields, more than ${ENTRY_FIELDS_MAX}`);
  for (const p of rest) {
    const joined = p.lines.map((line, j) => words(p.n + j, line, { bold: true })).join(" ").trim();
    // § 17.3 item 1: the fine print's bold, between pairs of double asterisks (a pair may run over a line's end)
    const pieces = joined.split(BOLD);
    if (pieces.length % 2 === 0) refuse(p.n, "a **bold** run is not closed (its asterisks come in pairs)");
    const runs = pieces.map((t, k) => ({ text: t, bold: k % 2 === 1 })).filter((r) => r.text !== "");
    if (runs.some((r) => r.bold && r.text.trim() !== r.text)) refuse(p.n, "a **bold** run begins or ends with a space");
    front.paragraphs.push({ runs, text: pieces.join(""), line: p.n });
  }
  if (!front.paragraphs.length) refuse(list.n, "the card has no fine print (a paragraph after its fields)");
  const texts = [front.heading.text, front.subhead?.text ?? "", ...front.fields.map((f) => f.label), ...front.paragraphs.map((p) => p.text)];
  return { source, front, approved, texts };
}

/** The entry card's words from `path`, checked; `source` is the file's name, which each word on the card cites. */
export async function readEntry(path) {
  return parseEntry(await readFile(path, "utf8"), basename(path));
}
