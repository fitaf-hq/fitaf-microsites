// EL7 (SPEC-ui-and-copy-pass.md § 8 items 6 and 7): removed, "You saved this offer at [event] yesterday — here it is.";
// item 7's second removal, the consent line, is withdrawn by § 8.2 item 1 (it is in the footer again, EL11); and the footer:
// --ink with the halftone, "You're getting this email because you saved an offer at eatfitaf.com", eatfitaf.com a link
// to SITE_URL/ labelled with the literal eatfitaf.com, then on a line of its own the postal address; the reversed logo at
// the right; no standalone eatfitaf.com line.
import test from "node:test";
import assert from "node:assert/strict";
import { POSTAL_ADDRESS } from "../src/worker/messages.js";
import { declarations, layoutRows, linksOf, tagsOf, visibleText } from "./email-html.mjs";
import { pageTokens, SAMPLE, sampleE1s } from "./email-fixture.mjs";
import { CONSENT_LINE, EMAIL_IMAGE_PATHS, FOOT_LOGO_PX, FOOTER_LINE, POSTAL, TICKED } from "./el-fixtures.mjs";

const { colours } = await pageTokens();

test("EL7: no E1 says You saved this offer… (item 7); an unticked E1 has no consent line, /confirm link or token; ticked, the consent line is its one difference", () => {
  for (const [name, m] of Object.entries(sampleE1s())) {
    for (const [part, text] of [["text", m.text], ["HTML", m.html]]) {
      assert.doesNotMatch(text, /You saved this offer|yesterday — here it is/, `${name} (${part}): item 7's line`);
      assert.ok(!text.includes(SAMPLE.event.name), `${name} (${part}): the event is named nowhere (it was only in item 7's line)`);
      if (TICKED.has(name)) continue;
      assert.doesNotMatch(text, /You asked to hear|keep me posted/, `${name} (${part}): no consent line without a token`);
      assert.doesNotMatch(text, /\/confirm\//, `${name} (${part}): no /confirm link`);
      assert.ok(!text.includes(SAMPLE.token), `${name} (${part}): the token nowhere`);
    }
  }
  const { e1_ticked, e1_unticked } = sampleE1s();
  const withoutConsent = (text) => text.split("\n").filter((l) => !l.startsWith(CONSENT_LINE)).join("\n");
  assert.notEqual(e1_ticked.text, e1_unticked.text, "control: the ticked E1 differs");
  assert.equal(withoutConsent(e1_ticked.text), e1_unticked.text, "ticked, the consent line is the text part's one difference");
});

test("EL7: the footer: its two lines, eatfitaf.com a quiet link to SITE_URL/ in its sentence, on --ink with the halftone, the logo at the right", () => {
  assert.equal(POSTAL_ADDRESS, POSTAL, "control: the address is POSTAL_ADDRESS");
  for (const [name, m] of Object.entries(sampleE1s())) {
    const row = layoutRows(m.html).at(-1);
    const lines = [...(TICKED.has(name) ? [CONSENT_LINE] : []), FOOTER_LINE, POSTAL];
    assert.deepEqual(visibleText(row).split("\n").filter(Boolean), lines, `${name}: the footer's lines`);
    const tags = tagsOf(row);
    const cell = tags.find((t) => t.name === "td");
    assert.equal(cell.attrs.bgcolor, colours["--ink"]);
    assert.equal(declarations(cell.attrs.style)["background-color"], colours["--ink"]);
    assert.equal(cell.attrs.background, `${SAMPLE.siteUrl}/${EMAIL_IMAGE_PATHS.halftoneInk}`, `${name}: the halftone`);
    const link = linksOf(m.html).find((l) => l.a.attrs.href === `${SAMPLE.siteUrl}/`);
    assert.ok(link, `${name}: the footer's link to SITE_URL/`);
    assert.match(row, /<a\b[^>]*>eatfitaf\.com<\/a>/, `${name}: labelled with the literal eatfitaf.com`);
    assert.equal(link.buttonStyled, false, `${name}: a text link, not a button`);
    assert.equal(link.before.name, "p", `${name}: in its sentence`);
    assert.equal(link.style["text-decoration"], "underline");
    const imgs = tags.filter((t) => t.name === "img");
    assert.equal(imgs.length, 1, `${name}: one image in the footer`);
    assert.equal(imgs[0].attrs.src, `${SAMPLE.siteUrl}/${EMAIL_IMAGE_PATHS.logo}`, `${name}: the reversed logo`);
    assert.equal(imgs[0].attrs.width, String(FOOT_LOGO_PX.width));
    assert.equal(imgs[0].attrs.height, String(FOOT_LOGO_PX.height));
    assert.ok(tags.indexOf(imgs[0]) > tags.findLastIndex((t) => t.name === "a"), `${name}: after the words: at the right`);
    for (const line of [...m.text.split("\n"), ...visibleText(m.html).split("\n")]) {
      assert.notEqual(line.trim().replace(/: https?:\/\/\S+$/, ""), "eatfitaf.com", `${name}: no standalone eatfitaf.com line`);
    }
  }
});
