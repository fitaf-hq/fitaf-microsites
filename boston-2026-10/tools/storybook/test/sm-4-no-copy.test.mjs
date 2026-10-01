// SM-4 (SPEC-storybook-microsite.md § 5, § 2 item 3): no copy. No file under tools/storybook/ (outside node_modules/ and
// storybook-static/) carries a rule of the page's stylesheets or a phrase of data/messages.json of ten characters or
// more (test/copies.mjs says how each is read). This file is under tools/storybook/ too, so it names no rule and no
// phrase: each is read from the site when the case runs.
//
// Mutants (in the suite, in a mirror of the package's own files): a story file with a phrase copied into it (escaped as
// a JavaScript string would carry it), and one with a rule copied into it (laid out differently), each fail the check.
import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copiesUnder, messagePhrases, pageRules, squeeze } from "./copies.mjs";
import { NOT_THE_TOOLS_OWN, readJson, SITE, TOOL } from "./paths.mjs";

/** The first rule of src/chefs-choice/style.css as its file writes it, and the :root's first token. */
async function sourceExamples() {
  const sheet = await readFile(join(SITE, "src", "chefs-choice", "style.css"), "utf8");
  const rule = /^\.[^{\n]+\{[^}]+\}/m.exec(sheet.replace(/\/\*[\s\S]*?\*\//g, ""))[0];
  const template = await readFile(join(SITE, "src", "template.html"), "utf8");
  const token = /^\s*(--[a-z-]+:\s*[^;]+);/m.exec(template)[1];
  return { rule, token };
}

/** A mirror of the tool's own files (not its install, not its static build), with one file added: `file`, holding `text`. */
async function mirrorWith(t, file, text) {
  const mirror = await mkdtemp(join(tmpdir(), "fitaf-storybook-sm-4-"));
  t.after(() => rm(mirror, { recursive: true, force: true }));
  await cp(TOOL, mirror, { recursive: true, filter: (src) => !NOT_THE_TOOLS_OWN.some((d) => src.startsWith(join(TOOL, d))) });
  await writeFile(join(mirror, file), text);
  return mirror;
}

test("SM-4: the page's rules and phrases were read (fixture control)", async () => {
  const rules = await pageRules(SITE);
  const phrases = await messagePhrases(SITE);
  const { rule, token } = await sourceExamples();
  assert.ok(rules.includes(squeeze(rule)), `a rule of src/chefs-choice/style.css (${rules.length} rules)`);
  assert.ok(rules.includes(squeeze(token)), "a :root token of src/template.html");
  const words = (await readJson(join(SITE, "data", "messages.json"))).chefs_choice;
  assert.ok(phrases.includes(words.checkout), `a phrase of data/messages.json (${phrases.length} phrases)`);
  assert.ok(phrases.includes(words.heading.split("{")[0].trim()), "a phrase's piece before a {placeholder}");
});

test("SM-4: no rule or phrase of the page under tools/storybook", async () => {
  assert.deepEqual(await copiesUnder(TOOL, SITE), []);
});

test("SM-4 (mutant): a phrase of data/messages.json copied into a story fails", async (t) => {
  const [phrase] = (await messagePhrases(SITE)).filter((p) => p.includes("'"));
  assert.ok(phrase, "fixture control: a phrase with an apostrophe");
  const mirror = await mirrorWith(t, "copied.stories.js", `export const COPIED = '${phrase.replace(/'/g, "\\'")}';\n`);
  assert.deepEqual(await copiesUnder(mirror, SITE), [`copied.stories.js: phrase "${phrase}"`]);
});

test("SM-4 (mutant): a rule of the page's stylesheet copied into a story fails", async (t) => {
  const { rule } = await sourceExamples();
  const relaid = rule.replace(/\{\s*/, " {\n  ").replace(/;\s*/g, ";\n  ").replace(/\s*\}$/, "\n}");
  assert.notEqual(relaid, rule, "fixture control: the copy is laid out differently");
  const mirror = await mirrorWith(t, "copied.stories.js", `export const STYLE = \`${relaid}\`;\n`);
  const found = await copiesUnder(mirror, SITE);
  assert.equal(found.length, 1, found.join("\n"));
  assert.ok(found[0].startsWith(`copied.stories.js: rule ${squeeze(rule).slice(0, 20)}`), found[0]);
});
