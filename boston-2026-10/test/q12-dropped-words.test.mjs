// Q12 (SPEC-print-pieces.md § 8 items 1–2): the dropped words are absent from both pieces, and present nowhere else they
// were not before. The tent drops its subhead and its scan prompt; the flyer its headline block (headline, tagline, the
// four plan names, the lowest price) and its scan prompt. On every printed page (each logo variant, the four flyers too)
// none of them is in the page's markup at all (text, alt text or any attribute); no printed page carries a word its
// mock-up lacks; and the mock-ups, which § 8 leaves as they are, still carry them, as do the banner and the slideshow.
// The words are read from the pieces' own data (print-fixtures.mjs droppedWords), never typed here.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadInputs, MOCKUPS_DIR, renderMockups } from "../mockups/build-mockups.mjs";
import { PRINT_DIR } from "../print/build-print.mjs";
import { pagesToPrint, printPage } from "../print/pages.mjs";
import { attrsOf, decode, pieceRuns } from "./mockup-html.mjs";
import { droppedWords } from "./print-fixtures.mjs";

const printCss = await readFile(join(PRINT_DIR, "print.css"), "utf8");
const inputs = await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder"), today: "2026-10-20" });
const mockups = renderMockups(inputs);
const texts = (html) => pieceRuns(html).map((r) => r.text.trim());
/** Everything a page's body says: its text and every attribute value, decoded (styles and scripts set aside). */
function bodySays(html) {
  const body = /<body\b[^>]*>([\s\S]*)<\/body>/.exec(html)[1].replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");
  const attrs = [...body.matchAll(/<[a-z][a-z0-9]*\b([^>]*)>/gi)].flatMap((m) => Object.values(attrsOf(m[1])));
  return [decode(body.replace(/<[^>]*>/g, " ")), ...attrs].join("\n");
}

test("Q12: the dropped words are in the pieces' data, and on their mock-ups (control)", () => {
  for (const id of ["tent-card", "flyer"]) {
    const words = droppedWords(inputs, id);
    assert.ok(words.length >= 2 && words.every((w) => typeof w === "string" && w.length >= 4), `${id}: ${words.join(" | ")}`);
    for (const w of words) assert.ok(texts(mockups[id]).includes(w), `the mock-up's ${id} still carries "${w}"`);
  }
  const headline = droppedWords(inputs, "flyer")[0];
  for (const id of ["banner", "slideshow"]) assert.ok(texts(mockups[id]).includes(headline), `the ${id} still carries the headline`);
});

test("Q12: no printed page, in any variant, the four flyers too, carries a dropped word anywhere in its markup", () => {
  const pages = pagesToPrint();
  assert.equal(pages.length, 18, "three variants of the tent, the flyer and the four flyers (control)");
  for (const page of pages) {
    const says = bodySays(printPage(page.piece, inputs, printCss, page.variant));
    assert.ok(says.includes(inputs.data.events[0].url.replace(/^https?:\/\//, "").replace(/\/$/, "")), `${page.base}: the reader sees the page (control)`);
    for (const w of droppedWords(inputs, page.piece.id)) assert.ok(!says.includes(w), `${page.base} carries "${w}"`);
  }
});

test("Q12: no printed page carries a word its mock-up lacks (the dropped words went nowhere else)", () => {
  for (const page of pagesToPrint()) {
    const mine = new Set(texts(mockups[page.piece.id]));
    const extra = texts(printPage(page.piece, inputs, printCss, page.variant)).filter((t) => !mine.has(t));
    assert.deepEqual(extra, [], page.base);
  }
});
