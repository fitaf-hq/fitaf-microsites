// EL6 (SPEC-ui-and-copy-pass.md § 8 item 1, the band, approved; "a word changed in a mirror of data/flyer-front.json
// changes E1's band"): --ink with the flyer's halftone (a committed tile as the cell's background image, the solid --ink
// for a client that draws none); in it the flyer front's headline and lede READ from data/flyer-front.json, never copied,
// each asterisked word in its accent (the headline's --signature, the lede's by its ledeAccent, as print/print.css draws
// them); the headline uppercase in the heading stack at 700, the lede in the body stack at 600; the reversed logo at the
// top right, served as a site asset at twice its displayed width.
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { bodyOf, declarations, layoutRows, lineTexts, tagsOf, visibleText, wordingOf } from "./email-html.mjs";
import { inlineStack, pageTokens, SAMPLE, sampleE1s } from "./email-fixture.mjs";
import { BAND_LOGO_PX, bandExpected, editJson, EMAIL_IMAGE_PATHS, workerMirror } from "./el-fixtures.mjs";

const { colours, all } = await pageTokens();
const band = await bandExpected();

/** The band's row and its tags. */
function bandOf(html) {
  const row = layoutRows(html)[0];
  return { row, tags: tagsOf(row), lines: visibleText(row).split("\n").filter(Boolean) };
}

/** The accented words of a fragment: each <span> with a colour, its text and its colour. */
const accentsOf = (fragment) =>
  [...fragment.matchAll(/<span\b[^>]*style="([^"]*)"[^>]*>([^<]*)<\/span>/g)].map((m) => ({ text: m[2], colour: declarations(m[1]).color }));

test("EL6: the band's words are data/flyer-front.json's, a line each, every accent in the flyer's colour", () => {
  assert.ok(band.accents.length >= 2, "control: the file's asterisked words were read");
  for (const [name, m] of Object.entries(sampleE1s())) {
    const { row, lines } = bandOf(m.html);
    assert.deepEqual(lines, band.lines, `${name}: the headline's lines, then the lede's`);
    assert.deepEqual(
      accentsOf(row),
      band.accents.map((a) => ({ text: a.text, colour: colours[a.token] })),
      `${name}: each asterisked word in its accent`,
    );
    assert.deepEqual(wordingOf(m.text).split("\n").slice(0, band.lines.length), band.lines, `${name}: the text part opens with them`);
    assert.ok(!m.text.includes("*") && !m.html.includes("*"), `${name}: no asterisk shown`);
  }
});

test("EL6: the band's cell is --ink with the halftone tile; the headline uppercase, --head at 700; the lede --body at 600; white", () => {
  for (const [name, m] of Object.entries(sampleE1s())) {
    const { tags } = bandOf(m.html);
    const cell = tags.find((t) => t.name === "td");
    assert.equal(cell.attrs.bgcolor, colours["--ink"], `${name}: solid --ink where no image is drawn`);
    assert.equal(declarations(cell.attrs.style)["background-color"], colours["--ink"]);
    assert.equal(cell.attrs.background, `${SAMPLE.siteUrl}/${EMAIL_IMAGE_PATHS.halftoneInk}`, `${name}: the halftone tile`);
    const h1 = tags.filter((t) => t.name === "h1");
    assert.equal(h1.length, 1, `${name}: one headline`);
    const head = declarations(h1[0].attrs.style);
    assert.equal(head["font-family"], inlineStack(all["--head"]));
    assert.equal(head["font-weight"], "700");
    assert.equal(head["text-transform"], "uppercase");
    assert.equal(head.color, colours["--white"]);
    assert.ok(Number.parseFloat(head["font-size"]) >= 30, `${name}: a large heading (${head["font-size"]}), as its accent's pair is measured`);
    const lede = tags.filter((t) => t.name === "p");
    assert.equal(lede.length, 1, `${name}: one lede paragraph`);
    const l = declarations(lede[0].attrs.style);
    assert.equal(l["font-family"], inlineStack(all["--body"]));
    assert.equal(l["font-weight"], "600");
    assert.equal(l.color, colours["--white"]);
  }
});

test("EL6: the reversed logo at the band's top right, twice its displayed width in its file, before the headline", () => {
  for (const [name, m] of Object.entries(sampleE1s())) {
    const { tags } = bandOf(m.html);
    const imgs = tags.filter((t) => t.name === "img");
    assert.equal(imgs.length, 1, `${name}: one image in the band, the logo`);
    const [logo] = imgs;
    assert.equal(logo.attrs.src, `${SAMPLE.siteUrl}/${EMAIL_IMAGE_PATHS.logo}`);
    assert.equal(logo.attrs.alt, "Fit AF");
    assert.equal(logo.attrs.width, String(BAND_LOGO_PX.width));
    assert.equal(logo.attrs.height, String(BAND_LOGO_PX.height));
    assert.ok(logo.index < tags.find((t) => t.name === "h1").index, `${name}: first in the band: at the right of the headline at 600 px, above it when narrower`);
    const wrapper = tags.find((t) => t.name === "div");
    assert.equal(wrapper?.attrs.dir, "rtl", `${name}: the logo and the headline in a right-to-left wrapper (the logo first, at the right)`);
  }
});

test("EL6: a word changed in a mirror of data/flyer-front.json changes E1's band, in both parts", async () => {
  const control = await workerMirror();
  const mirror = await workerMirror(async (dir) => {
    await editJson(join(dir, "data", "flyer-front.json"), (front) => ({
      ...front,
      headline: front.headline.map((line) => line.replace("FOOD", "MEALS")),
      lede: (typeof front.lede === "string" ? front.lede : front.lede.join(" ")).replace("Delivered", "Brought"),
    }));
  });
  try {
    const inputs = { to: SAMPLE.to, code: SAMPLE.code, offer: SAMPLE.heldOffer, event: SAMPLE.event, siteUrl: SAMPLE.siteUrl, token: null, photos: SAMPLE.noPhotos };
    const same = (await control.module("messages.js")).e1(inputs);
    assert.deepEqual(lineTexts(same.html).slice(0, band.lines.length), band.lines, "control: the unchanged mirror's band is the committed words");
    const changed = (await mirror.module("messages.js")).e1(inputs);
    const lines = lineTexts(changed.html).slice(0, band.lines.length);
    assert.ok(lines.some((l) => l.includes("MEALS")) && !lines.some((l) => l.includes("FOOD")), `the headline's changed word: ${lines.join(" / ")}`);
    assert.ok(lines.some((l) => l.includes("Brought")) && !lines.some((l) => l.includes("Delivered")), "the lede's changed word");
    assert.deepEqual(wordingOf(changed.text).split("\n").slice(0, band.lines.length), lines, "the text part says the same");
    assert.ok(accentsOf(bodyOf(changed.html)).some((a) => a.text.includes("MEALS")), "the accent follows its asterisks");
  } finally {
    await control.dispose();
    await mirror.dispose();
  }
});
