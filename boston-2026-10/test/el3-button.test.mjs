// EL3 (SPEC-ui-and-copy-pass.md § 8 item 3, "the button's one link and its words"): the whole orange panel is one link,
// Claim my offer, to SITE_URL/o/<code>: --cta with the halftone, white heading-stack type at 700, uppercase, large and
// centred; the colour on the cell (bgcolor, for Outlook) and the padding on the link, so the panel's whole area is the
// link. It is E1's one button; its only other link is the footer's (item 6).
import test from "node:test";
import assert from "node:assert/strict";
import { bodyOf, declarations, linksOf, tagsOf } from "./email-html.mjs";
import { inlineStack, pageTokens, SAMPLE, sampleE1s } from "./email-fixture.mjs";
import { CLAIM, EMAIL_IMAGE_PATHS, expectedLinks, SEE } from "./el-fixtures.mjs";

const { colours, all } = await pageTokens();
const OFFER_URL = `${SAMPLE.siteUrl}/o/${SAMPLE.code}`;
/** § 8 item 3's "large": a large heading's size (src/contrast-pairs.json's roles: 30px+ at 700). */
const LARGE_PX = 30;

/** The inner HTML of the <td> whose opening tag is `cell` (nesting-aware). */
function cellInner(html, cell) {
  const start = html.indexOf(cell.raw) + cell.raw.length;
  let depth = 1;
  for (const m of html.slice(start).matchAll(/<(\/?)td\b[^>]*>/gi)) {
    depth += m[1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, start + m.index);
  }
  throw new Error("an unclosed cell");
}

test("EL3: each E1 has one button, the whole panel one link to /o/<code>, its label Claim my offer (See my offer once ended)", () => {
  for (const [name, m] of Object.entries(sampleE1s())) {
    const buttons = linksOf(m.html).filter((l) => l.buttonStyled);
    assert.equal(buttons.length, 1, `${name}: one button`);
    const [{ a, before: cell, style }] = buttons;
    assert.equal(a.attrs.href, OFFER_URL, `${name}: to SITE_URL/o/<code>`);
    const body = bodyOf(m.html);
    const inner = cellInner(body, cell);
    const label = name === "e1_held_ended" ? SEE : CLAIM;
    assert.match(inner, new RegExp(`^<a\\b[^>]*>${label}</a>$`), `${name}: the cell holds the link alone, ${label}`);
    assert.equal(cell.name, "td");
    assert.equal(cell.attrs.bgcolor, colours["--cta"], `${name}: the panel's colour on its cell (Outlook draws it)`);
    assert.equal(declarations(cell.attrs.style)["background-color"], colours["--cta"]);
    assert.equal(cell.attrs.background, `${SAMPLE.siteUrl}/${EMAIL_IMAGE_PATHS.halftoneCta}`, `${name}: the panel's halftone, the cell's background image`);
    assert.equal(cell.attrs.align, "center");
    assert.equal(style.display, "block", `${name}: the link fills the panel`);
    assert.match(style.padding ?? "", /^\d+px( \d+px)*$/, `${name}: the padding on the link`);
    assert.equal(style["background-color"], undefined, `${name}: no colour of the link's own: the cell's halftone shows through`);
    assert.equal(style.background, undefined);
    assert.equal(style.color, colours["--on-cta"], `${name}: white (--on-cta) type`);
    assert.equal(style["font-family"], inlineStack(all["--head"]), `${name}: the heading stack`);
    assert.equal(style["font-weight"], "700");
    assert.equal(style["text-transform"], "uppercase");
    assert.equal(style["text-align"], "center");
    assert.equal(style["text-decoration"], "none");
    assert.ok(Number.parseFloat(style["font-size"]) >= LARGE_PX, `${name}: large (${style["font-size"]})`);
  }
});

test("EL3: each E1's links are the button, the consent's when ticked (§ 8.2), and the footer's eatfitaf.com, in that order", () => {
  for (const [name, m] of Object.entries(sampleE1s())) {
    const links = tagsOf(bodyOf(m.html)).filter((t) => t.name === "a");
    assert.deepEqual(links.map((t) => t.attrs.href), expectedLinks(name, SAMPLE), `${name}: its links`);
    assert.ok(m.text.split("\n").includes(`${name === "e1_held_ended" ? SEE : CLAIM}: ${OFFER_URL}`), `${name}: the text part's button line`);
  }
});
