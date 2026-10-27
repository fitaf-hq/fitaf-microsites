// EL11 (SPEC-ui-and-copy-pass.md § 8.2 item 1, ruled ts=2026-10-27T15:04:57.804Z): the marketing consent line returns,
// its words and link exactly as before § 8 ("You asked to hear about Fit AF menus and offers. Yes, keep me posted", the
// link to SITE_URL/confirm/<token>), only when the box was ticked (a token), as one small line in the dark footer, above
// "You're getting this email because you saved an offer at eatfitaf.com", its link drawn as the footer's link is; the
// text part carries it in the same place. And DRAFT § 3 says so.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { declarations, layoutRows, lineTexts, linksOf, tagsOf, visibleText } from "./email-html.mjs";
import { SAMPLE, sampleE1s } from "./email-fixture.mjs";
import { ALREADY, CONSENT_LABEL, CONSENT_LINE, FOOTER_LINE, TICKED } from "./el-fixtures.mjs";

const golden = JSON.parse(await readFile(new URL("./el-golden.json", import.meta.url), "utf8"));
const CONFIRM_URL = `${SAMPLE.siteUrl}/confirm/${SAMPLE.token}`;
const SITE = `${SAMPLE.siteUrl}/`;

test("EL11: with a token, the consent line in the footer, above its words, in both parts; its words as before § 8", () => {
  const before = golden.before.messages.e1_held_ticked;
  assert.ok(before.text.includes(`${CONSENT_LINE}: ${CONFIRM_URL}\n`), "control: 6e0d86f's ticked E1 said it, its link so");
  for (const name of TICKED) {
    const m = sampleE1s()[name];
    const lines = lineTexts(m.html);
    const at = lines.indexOf(CONSENT_LINE);
    assert.ok(at > 0, `${name}: the HTML says it`);
    assert.deepEqual(lines.slice(at - 1, at + 2), [ALREADY, CONSENT_LINE, FOOTER_LINE], `${name}: after Already ordered?, above the footer's words`);
    const footer = layoutRows(m.html).at(-1);
    assert.equal(visibleText(footer).split("\n").filter(Boolean)[0], CONSENT_LINE, `${name}: the footer's first line, on its --ink`);
    const text = m.text.split("\n");
    const t = text.indexOf(`${CONSENT_LINE}: ${CONFIRM_URL}`);
    assert.ok(t > 0, `${name}: the text part says it, its link as "label: href"`);
    assert.deepEqual([text[t - 1], text[t + 1]], [ALREADY, `${FOOTER_LINE}: ${SITE}`], `${name}: in the same place`);
  }
});

test("EL11: its link is SITE_URL/confirm/<token>, a quiet link in its sentence, drawn as the footer's link; its line the footer's size", () => {
  for (const name of TICKED) {
    const m = sampleE1s()[name];
    const links = linksOf(m.html);
    const consent = links.find((l) => l.a.attrs.href === CONFIRM_URL);
    const footerLink = links.find((l) => l.a.attrs.href === SITE);
    assert.ok(consent && footerLink, `control: ${name} has both links`);
    assert.match(m.html, new RegExp(`<a\\b[^>]*>${CONSENT_LABEL}</a>`), `${name}: labelled ${CONSENT_LABEL}`);
    assert.equal(consent.buttonStyled, false, `${name}: not a button`);
    assert.equal(consent.before.name, "p", `${name}: in its sentence`);
    assert.equal(consent.a.attrs.style, footerLink.a.attrs.style, `${name}: drawn as the footer's link is`);
    const footer = layoutRows(m.html).at(-1);
    const sizes = tagsOf(footer)
      .filter((t) => t.name === "p")
      .map((t) => declarations(t.attrs.style)["font-size"]);
    assert.ok(sizes.length >= 1 && sizes.every((s) => s === sizes[0]), `${name}: the consent line at the footer's own small size (${sizes.join(", ")})`);
  }
});

test("EL11: without a token, no consent line, no /confirm link, in either part", () => {
  for (const [name, m] of Object.entries(sampleE1s()).filter(([n]) => !TICKED.has(n))) {
    for (const part of [m.text, m.html]) {
      assert.ok(!part.includes(CONSENT_LINE) && !part.includes(CONSENT_LABEL), `${name}: no consent line`);
      assert.doesNotMatch(part, /\/confirm\//, `${name}: no /confirm link`);
    }
  }
});

test("EL11: DRAFT § 3 carries the line in E1's footer, above its words, marked for a ticked box, and names § 8.2", async () => {
  const md = await readFile(join(ROOT, "consent", "DRAFT.md"), "utf8");
  const e1 = md.split("## 3. The emails")[1].split("**E-X")[0];
  const lines = e1.split("\n").filter((l) => l.startsWith("> "));
  const consent = lines.findIndex((l) => l === "> *(only if the box was ticked)* You asked to hear about Fit AF menus and offers. **[ Yes, keep me posted ]**");
  assert.ok(consent > 0, "the consent line, as before § 8, marked");
  assert.ok(lines[consent - 1].includes("Already ordered?") && lines[consent + 1].startsWith("> You're getting this email"), "between Already ordered? and the footer's words");
  assert.match(e1, /§ 8\.2/, "citing the ruling");
});
