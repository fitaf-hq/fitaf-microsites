// Q31 (SPEC-print-pieces.md § 16): the back's diets, the Owner's five. The committed back's bar, read from the file the
// plain way (Q21's reading, not back.mjs's: a lead-in alone on its line after a blank one, then its `- {<icon>} <label>`
// items), is the Owner's five in his order, each with the icon § 16 item 2 names, and the file stays approved; built with
// the committed back, the PDF's page 2 carries the bar's lead-in and the five labels in that order (Q29's reader,
// qb-checks.mjs backGraphicsProblems); and each of the three new icons draws, a case per name (Q29 holds the others),
// with its one-line comment saying what it depicts.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { ICON_NAMES, icon } from "../print/icons.mjs";
import { MARK, NO_CHROME } from "./print-fixtures.mjs";
import { backGraphicsProblems, committedBack, committedBackPath, NO_POPPLER } from "./qb-checks.mjs";

/** § 16 item 1: the Owner's five, in his order; § 16 item 2: each one's icon. The spec's words, not the words file's. */
const OWNERS_FIVE = [
  ["gluten-free", "Gluten-free"],
  ["high-protein", "High protein"],
  ["low-carb", "Low carb"],
  ["keto", "Keto"],
  ["dairy-free", "Dairy-free"],
];
/** § 16 item 2: the three icons drawn for it. */
const NEW_ICONS = ["high-protein", "keto", "dairy-free"];

const lines = (await committedBack()).replace(/\n+$/, "").split("\n");
const LEAD_ALONE = /^\*\*([^*]+)\*\*$/;
const ICON_ITEM = /^- \{([^}]+)\} (.+)$/;
const PLAN = /^(lean|signature|performance|family)$/;

/** The file's bars: a lead-in alone on its line after a blank one, then its items, none naming a plan (§ 15's plans). */
function barsOf(fileLines) {
  const bars = [];
  fileLines.forEach((line, i) => {
    const lead = LEAD_ALONE.exec(line);
    if (!lead || fileLines[i - 1]?.trim()) return;
    const items = [];
    for (let j = i + 1; j < fileLines.length && ICON_ITEM.test(fileLines[j]); j += 1) items.push(ICON_ITEM.exec(fileLines[j]).slice(1, 3));
    if (items.length && !items.some(([name]) => PLAN.test(name))) bars.push({ lead: lead[1], line: i + 1, items });
  });
  return bars;
}

const bars = barsOf(lines);

test("Q31: the committed back's bar is the Owner's five, in his order, each with its icon; the file stays approved", () => {
  assert.equal(bars.length, 1, `the committed file has one bar: ${JSON.stringify(bars.map((b) => b.lead))}`);
  assert.deepEqual(bars[0].items, OWNERS_FIVE, `the bar at line ${bars[0].line}, "${bars[0].lead}"`);
  assert.equal(lines.at(-1), MARK, "the approval mark is still the file's last line (§ 16 item 1)");
});

test("Q31: built with the committed back, its PDF's page 2 carries the bar's lead-in and the five labels in that order", { skip: NO_CHROME || NO_POPPLER }, async () => {
  assert.equal(bars.length, 1, "the committed file has one bar (control)");
  const runs = [bars[0].lead, ...OWNERS_FIVE.map(([, label]) => label)];
  assert.deepEqual(await backGraphicsProblems(ROOT, committedBackPath(), runs), []);
});

const source = await readFile(join(ROOT, "print", "icons.mjs"), "utf8");
const DRAWN = /<(path|circle|ellipse|rect|line|polyline|polygon)\b/;
const RAW_COLOUR = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i;

for (const name of NEW_ICONS) {
  test(`Q31: the icon ${name} draws, on the 24-unit square in the colour around it, with its one-line comment`, () => {
    assert.ok(ICON_NAMES.includes(name), `${name} is one of print/icons.mjs's names: ${ICON_NAMES.join(", ")}`);
    const svg = icon(name, "x");
    assert.match(svg, /^<svg class="x" viewBox="0 0 24 24"[^>]*>.+<\/svg>$/, "an inline SVG on the 24-unit square");
    const shape = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
    assert.ok(!shape.includes("undefined"), "its shape is drawn, not undefined");
    assert.match(shape, DRAWN, "it draws a path, a circle or another shape");
    assert.doesNotMatch(shape, RAW_COLOUR, "it names no colour of its own (currentColor, the template's)");
    const key = new RegExp(`^\\s*("${name}"|${name}):`);
    const at = source.split("\n").findIndex((line) => key.test(line));
    assert.ok(at > 0, `${name} is a key in print/icons.mjs`);
    assert.match(source.split("\n")[at - 1], /^\s*\/\/ \S/, `the line before ${name} is its one-line comment`);
  });
}
