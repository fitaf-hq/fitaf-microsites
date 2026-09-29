import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { DEFAULTS } from "../scripts/contrast.mjs";
import { EMAIL_TOKENS, serialise, tokensFile } from "../scripts/email-tokens.mjs";
import { declarations, tagsOf } from "./email-html.mjs";
import { pageTokens, sampleMessages } from "./email-fixture.mjs";

/** The email's renderer: the only files that decide how the email looks. */
const RENDERER = ["messages.js", "email-style.js"].map((f) => join(ROOT, "src", "worker", f));
const COLOUR_PROPERTY = /^(color|background|background-color|border(-(top|right|bottom|left))?(-color)?|outline(-color)?)$/;
const NOT_A_COLOUR = /^(\d+(\.\d+)?(px|em|%)?|solid|dashed|dotted|double|none)$/i;
const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;

/** Every colour the HTML draws: colour attributes, and each word of a colour-bearing declaration. */
function coloursOf(html) {
  const found = [];
  for (const t of tagsOf(html)) {
    for (const attr of ["bgcolor", "color"]) {
      if (t.attrs[attr] !== undefined) found.push({ where: `<${t.name} ${attr}>`, value: t.attrs[attr] });
    }
    for (const [prop, value] of Object.entries(declarations(t.attrs.style))) {
      if (!COLOUR_PROPERTY.test(prop)) continue;
      for (const word of value.split(/\s+/)) if (!NOT_A_COLOUR.test(word)) found.push({ where: `<${t.name}> ${prop}`, value: word });
    }
  }
  return found;
}

/** Each colour in the HTML that is not a token's value (a hex elsewhere, a name, an rgb() or hsl()). */
function colourProblems(html, tokenValues) {
  const problems = coloursOf(html)
    .filter((c) => !HEX.test(c.value) || !tokenValues.has(c.value.toLowerCase()))
    .map((c) => `${c.where}: ${c.value}`);
  for (const m of html.matchAll(/(?<!&)#[0-9a-f]{3,8}\b/gi)) {
    if (!tokenValues.has(m[0].toLowerCase())) problems.push(`a raw ${m[0]}`);
  }
  if (/\b(rgba?|hsla?)\(/i.test(html)) problems.push("an rgb() or hsl() colour");
  return problems;
}

const { colours, all } = await pageTokens();
const tokenValues = new Set(Object.values(colours));

test("M17: every colour in the HTML is the value of one of the page's :root tokens", () => {
  assert.ok(tokenValues.size >= 10, "control: the page's colour tokens were read");
  for (const [name, message] of Object.entries(sampleMessages())) {
    assert.deepEqual(colourProblems(message.html, tokenValues), [], `${name}: colours that are not tokens`);
    const drawn = new Set(coloursOf(message.html).map((c) => c.value.toLowerCase()));
    for (const t of ["--navy", "--white", "--ink", "--muted", "--line", "--cta", "--on-cta"]) {
      assert.ok(drawn.has(colours[t]), `control: ${name} draws ${t} (${colours[t]})`);
    }
  }
});

test("M17 mutant: the check refuses a colour that is not a token (on a copy of the HTML)", () => {
  const html = sampleMessages().e1_ticked.html;
  assert.ok(html.includes(colours["--cta"]) && html.includes(`color:${colours["--ink"]}`), "control: mutation anchors present");
  const mutants = {
    "a hex that is no token": html.replace(colours["--cta"], "#123456"),
    "a named colour": html.replace(`color:${colours["--ink"]}`, "color:black"),
    "an rgb() colour": html.replace(`color:${colours["--ink"]}`, "color:rgb(33,37,41)"),
  };
  for (const [what, mutant] of Object.entries(mutants)) {
    assert.notDeepEqual(colourProblems(mutant, tokenValues), [], `${what} is refused`);
  }
});

test("M17: email-tokens.json is src/template.html's :root, as `npm run email:tokens` writes it (derived, never edited)", async () => {
  const committed = await readFile(EMAIL_TOKENS, "utf8");
  const template = await readFile(DEFAULTS.template, "utf8");
  assert.equal(committed, serialise(tokensFile(template)), "regenerate with `npm run email:tokens`");
  const { tokens } = JSON.parse(committed);
  assert.deepEqual(tokens, all, "every :root token, as written in the template");
  for (const [name, hex] of Object.entries(colours)) assert.equal(tokens[name].toLowerCase(), hex, `${name}, read by contrast.mjs's parser`);
});

test("M17: the renderer's source writes no colour and no font name (they come from the tokens)", async () => {
  const fontNames = [...new Set(["--head", "--body"].flatMap((t) => all[t].split(",").map((f) => f.trim().replaceAll('"', ""))))];
  assert.ok(fontNames.includes("Poppins") && fontNames.includes("Open Sans"), "control: the page's font stacks were read");
  for (const path of RENDERER) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(source, /(?<!&)#[0-9a-f]{3,8}\b/i, `${path}: a colour literal`);
    assert.doesNotMatch(source, /\b(rgba?|hsla?)\(/i, `${path}: an rgb() or hsl() literal`);
    for (const font of fontNames) assert.ok(!source.includes(font), `${path}: the font name ${font}`);
  }
});
