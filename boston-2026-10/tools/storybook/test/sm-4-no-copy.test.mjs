// SM-4 (SPEC-storybook-microsite.md § 5, § 2 item 3): no copy. No file under tools/storybook/ (outside node_modules/ and
// storybook-static/) carries a rule of the page's stylesheets or a phrase of data/messages.json of ten characters or
// more (test/copies.mjs says how each is read). This file is under tools/storybook/ too, so it names no rule and no
// phrase: each is read from the site when the case runs.
//
// Mutants (in the suite, in a mirror of the package's own files): a story file with a phrase copied into it (escaped as
// a JavaScript string would carry it), and one with a rule copied into it (laid out differently), each fail the check.
//
// SPEC-storybook-microsite § 8.4, SM-4 extended to the Hand-off stories: no copied rule of the BLOCK either (its two
// style sheets as it ships them, test/copies.mjs's blockRules; its words are data/messages.json's `handoff`, phrases
// already). Mutant: a story file with the screen's title rule copied into it (laid out differently) fails.
import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { blockRules, copiesUnder, messagePhrases, pageRules, squeeze } from "./copies.mjs";
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

/** The block's rule the SM-4 extension's control and mutant use: the screen's title, as the block's source writes it. */
async function blockExample() {
  const source = await readFile(join(SITE, "src", "storefront", "fitaf-handoff.js"), "utf8");
  return /#fitaf-screen h2\{[^}]+\}/.exec(source)[0];
}

test("SM-4 (§ 8.4): the block's rules were read (fixture control)", async () => {
  const rules = await blockRules(SITE);
  const example = await blockExample();
  assert.ok(rules.includes(squeeze(example)), `the screen's title rule, among the block's ${rules.length} rules`);
  assert.ok(rules.some((r) => r.startsWith("html.fitaf-deep:has(app-checkout)")), "a rule of the stripped checkout's sheet");
  assert.ok(rules.length >= 20, `the block's two sheets, rule by rule (${rules.length})`);
});

test("SM-4 (§ 8.4, mutant): a rule of the block copied into a story fails", async (t) => {
  const example = await blockExample();
  const relaid = example.replace("{", " {\n  ").replace(/;/g, ";\n  ").replace(/\}$/, "\n}");
  assert.notEqual(relaid, example, "fixture control: the copy is laid out differently");
  const mirror = await mirrorWith(t, "copied.stories.js", `export const STYLE = \`${relaid}\`;\n`);
  const found = await copiesUnder(mirror, SITE);
  for (const line of found) t.diagnostic(line);
  assert.deepEqual(found, [`copied.stories.js: rule of the block ${squeeze(example).slice(0, 60)}`]);
});
