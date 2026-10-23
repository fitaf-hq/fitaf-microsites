// SPEC-print-pieces.md § 17 item 3: the giveaway entry card's words, read from the Markdown file `--entry-words` names.
// The words are not approved and stay outside this repository (a public one: § 13 item 3). A small file a person can edit,
// read in ONLY this subset, its two sides in order:
//   # Front                      then, each after one blank line:
//   ## <heading>
//   - <label>                    the fields, one to ENTRY_FIELDS_MAX lines, each printed as a label over a writing line
//                                (an optional one says so in its label: "ZIP code (optional)"); a field holding runs of
//                                underscores (§ 17.2 item 2: "Email: ________ @ __________ . ___") is printed as its own
//                                line, each run a writing line as long as the run, the words between them printed
//   <paragraph>                  one or more (the draw line, the consent line, the rules line), separated by one blank line
//   # Front, one-sided           (optional, § 17.2 item 1) then:
//   <paragraph>                  one or more: on the one-sided page they take the place of the front's last paragraph
//   # Back
//   ## <heading>
//   <paragraph>                  the rules, each of which may open with **<lead-in>**, followed by anything
// A paragraph may run over several lines, joined by a space. A `[bracket]` is a value not given yet (§ 17 item 4: the card
// is a proof while one remains). The one HTML comment allowed is the approval mark, `<!-- approved -->`, as the last line:
// until it is there the card is a proof. Anything else Markdown means (another heading, a list elsewhere, a link, emphasis
// elsewhere, code, a quote, HTML) is refused, naming the line. Blank lines at the very end are an editor's, and ignored.
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { APPROVED_MARK, COPY_CHAR } from "./back.mjs";

const SECTION = "§ 17 item 3";
export const ENTRY_FIELDS_MAX = 6;
const SIDE = /^# (Front|Front, one-sided|Back)$/;
/** Each side's key in the words read, by its heading, in the order the file must give them. */
const SIDE_KEYS = { Front: "front", "Front, one-sided": "oneSided", Back: "back" };
/** § 17.2 item 2: a run of underscores in a field is a writing line. */
const BLANK = /(_{2,})/;
const HEADING = /^## (\S.*)$/;
const FIELD = /^- (\S.*)$/;
const LEAD_IN = /^\*\*([^*\s][^*]*?)\*\*(.*)$/;
/** A bracket is a placeholder; anything else of the page's own copy's characters (print/back.mjs) is a word. */
const ENTRY_CHAR = (ch) => ch === "[" || ch === "]" || ch === "@" || COPY_CHAR.test(ch);
/** What each refused construct is called, by the first sign of it in a line of words, in this order. */
const REFUSED = [
  [/^\s+\S/, "an indented line (Markdown reads it as code or a continuation)"],
  [/^#/, "a heading out of its place (# Front, ## its heading, # Back, ## its heading)"],
  [/^([-*+]|\d+[.)])(\s|$)/, "a list (the front's fields are the only one)"],
  [/^>/, "a quote"],
  [/<!--/, `an HTML comment (the only one allowed is "${APPROVED_MARK}", as the last line)`],
  [/[<>]/, "HTML"],
  [/\]\(|\]\[/, "a link"],
  [/`/, "code"],
  [/[*_]/, "emphasis (only a rule's opening **lead-in** is allowed)"],
];

/** The entry card's words, from a file's text: { front, back, approved, texts }; refused outside the subset, naming the line. */
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
  const words = (n, line) => {
    for (const [sign, what] of REFUSED) if (sign.test(line)) refuse(n, what);
    for (const ch of line) if (!ENTRY_CHAR(ch)) refuse(n, `a character outside the subset, ${JSON.stringify(ch)} (U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")})`);
    return line;
  };
  const sides = {};
  let side = null;
  let at = 0;
  const next = () => blocks[at++];
  while (at < blocks.length) {
    const block = next();
    const m = SIDE.exec(block.lines[0]);
    if (!m) refuse(block.n, side ? `"${block.lines[0]}": a block out of its place` : `the first line must be "# Front"`);
    side = SIDE_KEYS[m[1]];
    if (block.lines.length > 1) refuse(block.n + 1, `"# ${m[1]}" stands alone, a blank line after it`);
    if (sides[side]) refuse(block.n, `a second "# ${m[1]}"`);
    if (side === "front" && Object.keys(sides).length) refuse(block.n, `"# Front" comes first`);
    if (side === "oneSided" && (!sides.front || sides.back)) refuse(block.n, `"# Front, one-sided" comes after "# Front" and before "# Back"`);
    if (side === "back" && !sides.front) refuse(block.n, `"# Back" comes after "# Front"`);
    if (side === "oneSided") {
      // § 17.2 item 1: paragraphs alone, for the one-sided page's last
      const own = { paragraphs: [] };
      while (at < blocks.length && !SIDE.test(blocks[at].lines[0])) {
        const p = next();
        own.paragraphs.push({ lead: null, space: false, text: p.lines.map((line, j) => words(p.n + j, line)).join(" ").trim(), line: p.n });
      }
      if (!own.paragraphs.length) refuse(block.n, `"# Front, one-sided" has no paragraph`);
      sides.oneSided = own;
      continue;
    }
    const head = next();
    const h = head && HEADING.exec(head.lines[0]);
    if (!h || head.lines.length > 1) refuse(head?.n ?? block.n, `"# ${m[1]}" is followed by its "## <heading>", alone`);
    const own = { heading: { text: words(head.n, h[1]).trim(), line: head.n }, fields: [], paragraphs: [] };
    if (side === "front") {
      const list = next();
      if (!list || !FIELD.test(list.lines[0])) refuse(list?.n ?? head.n, "the front's heading is followed by its fields, - <label> each");
      list.lines.forEach((line, j) => {
        const f = FIELD.exec(line);
        if (!f) refuse(list.n + j, "a field is one line, - <label>");
        // § 17.2 item 2: the runs of underscores are writing lines (their lengths kept), the words between them words
        const parts = f[1].split(BLANK).map((part) => (BLANK.test(part) ? { blank: part.length } : { text: words(list.n + j, part.trim()) })).filter((part) => part.blank || part.text);
        const label = parts.map((part) => part.text ?? "").filter(Boolean).join(" ");
        own.fields.push({ label, parts: parts.some((part) => part.blank) ? parts : null, line: list.n + j });
      });
      if (own.fields.length > ENTRY_FIELDS_MAX) refuse(list.n, `${own.fields.length} fields, more than ${ENTRY_FIELDS_MAX}`);
    }
    while (at < blocks.length && !SIDE.test(blocks[at].lines[0])) {
      const p = next();
      const lead = side === "back" ? LEAD_IN.exec(p.lines[0]) : null;
      const first = lead ? lead[2] : p.lines[0];
      const rest = [first, ...p.lines.slice(1)].map((line, j) => words(p.n + j, j === 0 && lead ? line.replace(/^ /, "") : line));
      own.paragraphs.push({ lead: lead ? words(p.n, lead[1]) : null, space: lead ? lead[2].startsWith(" ") : false, text: rest.join(" ").trim(), line: p.n });
    }
    if (!own.paragraphs.length) refuse(head.n, `the ${side} has no paragraph`);
    sides[side] = own;
  }
  if (!sides.back) refuse(lines.length, `there is no "# Back"`);
  const texts = Object.values(sides).flatMap((s) => [s.heading?.text ?? "", ...(s.fields ?? []).map((f) => f.label), ...s.paragraphs.flatMap((p) => [p.lead ?? "", p.text])]);
  return { source, front: sides.front, oneSided: sides.oneSided ?? null, back: sides.back, approved, texts };
}

/** The entry card's words from `path`, checked; `source` is the file's name, which each word on the card cites. */
export async function readEntry(path) {
  return parseEntry(await readFile(path, "utf8"), basename(path));
}
