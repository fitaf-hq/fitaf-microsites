// SPEC-print-pieces.md § 12 item 4: the flyer's back's words, data/flyer-back.md, the only source. A small Markdown file a
// person can edit, read in ONLY this subset: line 1 `# <heading>`; then paragraphs separated by one blank line (a
// paragraph may run over several lines, joined by a space); a paragraph may open with `**<lead-in>**` and a space; `’` and
// the other characters of the page's own copy are allowed. Nothing else Markdown means is (a list, a link, a second
// heading, emphasis elsewhere, code, a quote, HTML): it is refused, naming the line. The first paragraph is the lede. The
// one HTML comment allowed is the approval mark, `<!-- approved -->`, as the file's last line: until it is there the
// back is a proof (§ 4's rule; print/pages.mjs backPlaceholders). Blank lines at the very end are an editor's, and ignored.
// § 14 item 3: two graphic blocks, each a line holding only a lead-in followed, with no blank line, by its items: a bar
// (`- {<icon>} <label>`, two to six) or steps (`1. {<icon>} <title>: <detail>`, numbered from 1, two to four). § 15
// adds plans (`- {<plan>} <name>: <line>`, two to four, a plan's own colour), and a statement: a lead-in on a line of
// its own with no items after it. A list anywhere else is still refused.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { ICON_NAMES } from "./icons.mjs";

export const BACK_SOURCE = "data/flyer-back.md";
export const BACK_PATH = join(ROOT, BACK_SOURCE);
export const APPROVED_MARK = "<!-- approved -->";

const HEADING = /^# (\S.*)$/;
const LEAD_IN = /^\*\*([^*\s][^*]*?)\*\* (\S.*)$/;
const LEAD_ALONE = /^\*\*([^*\s][^*]*?)\*\*$/;
const BAR_ITEM = /^- \{([^}]*)\} (\S.*)$/;
const STEP_ITEM = /^(\d+)\. \{([^}]*)\} ([^:]+): (\S.*)$/;
const PLAN_ITEM = /^- \{(lean|signature|performance|family)\} ([^:]+): (\S.*)$/;
const ITEMS = { bar: [2, 6], steps: [2, 4], plans: [2, 4] };
/** What each block is called: in a count's refusal, and (the bar's by its items, as § 14 worded it) in a mix's. */
const KIND_NAMES = { bar: "a bar", steps: "steps", plans: "plans" };
const MIX_NAMES = { ...KIND_NAMES, bar: "a bar's items" };
/** The page's own copy's characters: letters and their marks, digits, the space, and its punctuation. */
const COPY_CHAR = /[\p{L}\p{M}\p{N} .,:;!?'’‘“”"()&$%/+·×…–—-]/u;
/** What each refused construct is called, by the first sign of it in a line, in this order. */
const REFUSED = [
  [/^\s+\S/, "an indented line (Markdown reads it as code or a continuation)"],
  [/^#/, "a second heading"],
  [/^([-*+]|\d+[.)])(\s|$)/, "a list"],
  [/^>/, "a quote"],
  [/^(=+|-+|_+|\*+)\s*$/, "a rule or a heading underline"],
  [/<!--/, `an HTML comment (the only one allowed is "${APPROVED_MARK}", as the last line)`],
  [/[<>]/, "HTML"],
  [/\[|\]/, "a link"],
  [/`/, "code"],
  [/[*_]/, "emphasis (only a paragraph's opening **lead-in** is allowed)"],
];

const refuse = (source, n, what) => {
  throw new Error(`${source}, line ${n}: ${what}`);
};

/** A line of words (a paragraph's, without its lead-in; or the heading's text): every character the page's own. */
function checkWords(source, n, words) {
  for (const [sign, what] of REFUSED.slice(5)) if (sign.test(words)) refuse(source, n, what);
  for (const ch of words) if (!COPY_CHAR.test(ch)) refuse(source, n, `a character outside the subset, ${JSON.stringify(ch)} (U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")})`);
}

/** A paragraph's first line: its lead-in, if it opens with one, and the rest. */
function openingOf(source, n, line) {
  if (!line.startsWith("**")) return { lead: null, rest: line };
  const m = LEAD_IN.exec(line);
  if (!m) refuse(source, n, "a lead-in must be **<lead-in>** followed by a space and the paragraph's words");
  checkWords(source, n, m[1]);
  return { lead: m[1], rest: m[2] };
}

/** §§ 14–15: `line` as an item of the block `open` (a bar, steps or plans; its first item decides which), or false. */
function blockItem(source, n, line, open) {
  const plan = PLAN_ITEM.exec(line);
  const bar = plan ? null : BAR_ITEM.exec(line);
  const step = STEP_ITEM.exec(line);
  if (!plan && !bar && !step) {
    if (/^(-|\d+\.)\s/.test(line)) refuse(source, n, "an item must be `- {<icon>} <label>`, `<n>. {<icon>} <title>: <detail>` or `- {<plan>} <name>: <line>` (§§ 14–15)");
    return false;
  }
  const kind = plan ? "plans" : bar ? "bar" : "steps";
  if (open.kind === "lead") open.kind = kind;
  if (open.kind !== kind) refuse(source, n, `a block mixes ${MIX_NAMES[open.kind]} and ${MIX_NAMES[kind]} (§§ 14–15)`);
  if (plan) {
    checkWords(source, n, plan[2]);
    checkWords(source, n, plan[3]);
    open.items.push({ plan: plan[1], name: plan[2].trim(), text: plan[3], line: n });
    return true;
  }
  const name = bar ? bar[1] : step[2];
  if (!ICON_NAMES.includes(name)) refuse(source, n, `an icon must be one of ${ICON_NAMES.join(", ")}, not {${name}}`);
  if (bar) {
    checkWords(source, n, bar[2]);
    open.items.push({ icon: name, label: bar[2], line: n });
  } else {
    if (Number(step[1]) !== open.items.length + 1) refuse(source, n, `steps are numbered from 1 in order: this one should be ${open.items.length + 1}`);
    checkWords(source, n, step[3]);
    checkWords(source, n, step[4]);
    open.items.push({ icon: name, title: step[3].trim(), detail: step[4], line: n });
  }
  return true;
}

/**
 * The words file read: { heading: { text, line }, paragraphs: [{ kind: "text", lead, text, line }, { kind: "bar",
 * "steps" or "plans", lead, items, line } or { kind: "statement", lead, line }], approved, source }, each with the
 * file's line it starts on (1-based); paragraphs[0], when it is words, is the lede (§ 15 item 8: it may be a block
 * instead). Refuses anything outside the subset, naming the line.
 */
export function parseBack(text, source = BACK_SOURCE) {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  while (lines.length && lines.at(-1).trim() === "") lines.pop();
  const marked = lines.at(-1) === APPROVED_MARK;
  if (marked) {
    lines.pop();
    if (lines.at(-1) === "") lines.pop();
  }
  const heading = HEADING.exec(lines[0] ?? "");
  if (!heading) refuse(source, 1, 'the first line must be the heading, "# <heading>"');
  checkWords(source, 1, heading[1]);
  if (lines.length > 1 && lines[1] !== "") refuse(source, 2, "a blank line must follow the heading");
  const paragraphs = [];
  let open = null;
  const closeBlock = (n) => {
    // § 15 item 4: a lead-in on a line of its own with no items after it is a statement
    if (open?.kind === "lead") open.kind = "statement";
    if (open && open.kind !== "text" && open.kind !== "statement") {
      const [min, max] = ITEMS[open.kind];
      if (open.items.length < min || open.items.length > max) refuse(source, n, `${KIND_NAMES[open.kind]} must have ${min} to ${max} items, not ${open.items.length}`);
    }
  };
  for (let i = 2; i < lines.length; i += 1) {
    const n = i + 1;
    const line = lines[i];
    if (line.trim() === "") {
      if (open === null) refuse(source, n, "a second blank line (paragraphs are separated by one)");
      closeBlock(n);
      open = null;
      continue;
    }
    if (open !== null && open.kind !== "text" && blockItem(source, n, line, open)) continue;
    for (const [sign, what] of REFUSED.slice(0, 5)) if (sign.test(line)) refuse(source, n, what);
    if (open === null && LEAD_ALONE.test(line)) {
      const lead = LEAD_ALONE.exec(line)[1];
      checkWords(source, n, lead);
      open = { kind: "lead", lead, items: [], line: n };
      paragraphs.push(open);
    } else if (open === null) {
      const { lead, rest } = openingOf(source, n, line);
      checkWords(source, n, rest);
      open = { kind: "text", lead, text: rest, line: n };
      paragraphs.push(open);
    } else if (open.kind !== "text") {
      refuse(source, n, "a block's lines must all be its items (§ 14 item 3)");
    } else {
      checkWords(source, n, line);
      open.text = `${open.text} ${line}`;
    }
  }
  closeBlock(lines.length + 1);
  if (paragraphs.length === 0) refuse(source, lines.length + 1, "no paragraph: the lede, at least, is needed");
  // § 15 item 8: a first paragraph of words is the lede; a back whose first block is a graphic has none
  return { heading: { text: heading[1], line: 1 }, paragraphs, approved: marked, source };
}

/** data/flyer-back.md (or a mirror of it), read and checked. */
export async function readBack(path = BACK_PATH, source = BACK_SOURCE) {
  return parseBack(await readFile(path, "utf8"), source);
}
