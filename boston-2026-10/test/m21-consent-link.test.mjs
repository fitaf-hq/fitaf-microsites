// SPEC-rung5 § 9, ruled by the Advisor 2026-09-29: the marketing consent is as easy to withhold as to give, so
// E1's consent is a quiet text link and E1 has ONE button; E-X's confirmation is that email's only purpose and
// stays a button.
// ⚠ Since SPEC-ui-and-copy-pass § 8 (2026-10-26): E1's one button is Claim my offer (See my offer once its offer has
// ended, item 4); its footer's eatfitaf.com is the quiet kind of link. ⚠ § 8.2 item 1 (ruled ts=2026-10-27T15:04:57.804Z)
// withdrew item 7's removal: a ticked E1's consent link is back, a quiet text link in the footer, on its --ink, drawn as
// the footer's link is, held here to what it was held to before § 8.
import test from "node:test";
import assert from "node:assert/strict";
import { measure } from "../scripts/contrast.mjs";
import { linksOf } from "./email-html.mjs";
import { pageTokens, SAMPLE, sampleMessages } from "./email-fixture.mjs";

const { colours } = await pageTokens();
const { rows } = await measure();
const OFFER_URL = `${SAMPLE.siteUrl}/o/${SAMPLE.code}`;
const CONFIRM_URL = `${SAMPLE.siteUrl}/confirm/${SAMPLE.token}`;
const BODY_WEIGHT = 400;

test("M21: E1 has exactly one button-styled link, Claim my offer (See my offer once ended), ticked or not", () => {
  const { e1_ticked, e1_unticked, e1_held_ticked, e1_held_unticked, e1_held_ended } = sampleMessages();
  for (const [name, message] of Object.entries({ e1_ticked, e1_unticked, e1_held_ticked, e1_held_unticked, e1_held_ended })) {
    const buttons = linksOf(message.html).filter((l) => l.buttonStyled);
    assert.equal(buttons.length, 1, `${name}: one button`);
    assert.equal(buttons[0].a.attrs.href, OFFER_URL, `${name}: the button goes to the saved offer`);
    assert.match(message.html, new RegExp(`>${name === "e1_held_ended" ? "See my offer" : "Claim my offer"}</a>`), `${name}: its words`);
  }
});

test("M21: E1's consent link is a quiet text link in its footer: inline in its sentence, underlined, body weight, a token colour that passes body on --ink; only when ticked", () => {
  const ticked = ["e1_ticked", "e1_held_ticked"];
  for (const [name, message] of Object.entries(sampleMessages()).filter(([n]) => n.startsWith("e1_"))) {
    const consent = linksOf(message.html).find((l) => l.a.attrs.href === CONFIRM_URL);
    if (!ticked.includes(name)) {
      assert.equal(consent, undefined, `${name}: no consent link without the box`);
      continue;
    }
    assert.ok(consent, `${name}: the ticked E1 carries the consent link`);
    assert.equal(consent.buttonStyled, false, "not button-styled: no coloured cell, background, padding or inline-block");
    assert.equal(consent.before.name, "p", "inline, in the paragraph of its sentence");
    assert.equal(consent.style["text-decoration"], "underline");
    assert.ok(!("font-size" in consent.style), "the sentence's size, not larger");
    assert.ok(Number(consent.style["font-weight"] ?? BODY_WEIGHT) <= BODY_WEIGHT, "body weight, not bold");
    const pair = rows.find((r) => r.build === "email" && r.fgHex === consent.style.color && r.bgHex === colours["--ink"] && r.role === "body" && /consent/.test(r.where));
    assert.ok(pair, `${name}: its pair is declared, on the footer's --ink, naming the consent line`);
    assert.ok(pair.pass && !pair.exception, `Lc ${pair.lc.toFixed(1)} passes body ${pair.min} on its own`);
  }
});

test("M21: E1's footer link is a quiet text link: inline in its sentence, underlined, body weight, a token colour that passes body contrast", () => {
  const consent = linksOf(sampleMessages().e1_ticked.html).find((l) => l.a.attrs.href === `${SAMPLE.siteUrl}/`);
  assert.ok(consent, "control: E1 carries the footer's link");
  assert.equal(consent.buttonStyled, false, "not button-styled: no coloured cell, background, padding or inline-block");
  assert.equal(consent.before.name, "p", "inline, in the paragraph of its sentence");
  assert.equal(consent.style["text-decoration"], "underline");
  assert.ok(!("font-size" in consent.style), "the sentence's size, not larger");
  assert.ok(Number(consent.style["font-weight"] ?? BODY_WEIGHT) <= BODY_WEIGHT, "body weight, not bold");
  const colour = consent.style.color;
  assert.ok(Object.values(colours).includes(colour), `its colour ${colour} is a token's value`);
  const pair = rows.find((r) => r.build === "email" && /footer's link/.test(r.where));
  assert.ok(pair, "its pair is declared in contrast-pairs.json");
  assert.equal(pair.fgHex, colour, "the declared pair is the colour drawn");
  assert.equal(pair.bgHex, colours["--ink"], "on the footer's --ink");
  assert.equal(pair.role, "body", "measured as body text");
  assert.ok(pair.pass, `Lc ${pair.lc.toFixed(1)} passes body ${pair.min}`);
});

test("M21: E-X's one link — the email's only purpose — stays a button", () => {
  const links = linksOf(sampleMessages().ex.html);
  assert.equal(links.length, 1);
  assert.equal(links[0].a.attrs.href, CONFIRM_URL);
  assert.equal(links[0].buttonStyled, true);
});
