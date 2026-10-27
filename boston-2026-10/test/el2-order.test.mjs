// EL2 (SPEC-ui-and-copy-pass.md § 8, "the order of rows"): E1's HTML part, top to bottom, is the band (the flyer front's
// headline, a line each, and its lede), the slideshow when the manifest has one, the offer button, the save's line under
// it, Already ordered?, and the footer's two lines; and its text part says the same lines in the same order, the links as
// "label: href" (§ 8: "from the same list").
import test from "node:test";
import assert from "node:assert/strict";
import { layoutRows, lineTexts, linksOfText, visibleText, wordingOf } from "./email-html.mjs";
import { SAMPLE, sampleE1s } from "./email-fixture.mjs";
import { bandExpected, expectedLines } from "./el-fixtures.mjs";

const band = await bandExpected();
const OFFER_URL = `${SAMPLE.siteUrl}/o/${SAMPLE.code}`;
const SITE = `${SAMPLE.siteUrl}/`;

test("EL2: each E1's HTML part shows § 8's lines in § 8's order", () => {
  assert.ok(band.lines.length >= 2, "control: the flyer front's headline and lede were read");
  for (const [name, m] of Object.entries(sampleE1s())) {
    assert.deepEqual(lineTexts(m.html), expectedLines(name, band), `${name}: the HTML's lines`);
  }
});

test("EL2: each E1's rows: the band, the slideshow (with the manifest's), the button, the line under it, Already ordered?, the footer", () => {
  for (const [name, m] of Object.entries(sampleE1s())) {
    const rows = layoutRows(m.html).map((row) => ({ row, lines: visibleText(row).split("\n").filter(Boolean) }));
    const lines = expectedLines(name, band);
    const n = band.lines.length;
    const expected = [lines.slice(0, n), ...(name === "e1_held_slideshow" ? [[]] : []), [lines[n]], [lines[n + 1]], [lines[n + 2]], lines.slice(n + 3)];
    assert.deepEqual(rows.map((r) => r.lines), expected, `${name}: the rows' lines`);
    assert.match(rows[0].row, /<h1\b/, `${name}: the band is the first row`);
    if (name === "e1_held_slideshow") assert.match(rows[1].row, /<img\b[^>]*email-slideshow\.gif/, `${name}: the slideshow is the second row`);
  }
});

test("EL2: each E1's text part is the same lines in the same order, its links the button's and the footer's", () => {
  for (const [name, m] of Object.entries(sampleE1s())) {
    assert.deepEqual(wordingOf(m.text).split("\n").filter(Boolean), expectedLines(name, band), `${name}: the text part's lines`);
    assert.deepEqual(linksOfText(m.text), [OFFER_URL, SITE], `${name}: the button's link, then the footer's`);
    assert.ok(m.text.endsWith("\n") && !m.text.endsWith("\n\n"), `${name}: one line each, the last ended`);
  }
});
