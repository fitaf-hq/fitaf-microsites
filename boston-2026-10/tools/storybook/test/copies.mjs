// SM-4's reader (SPEC-storybook-microsite.md § 2 item 3, § 5): what of the page a file under tools/storybook/ must not
// carry, and where. Not a test file itself.
//
// - A RULE of the page's stylesheets: each rule of src/template.html's <style> elements and of every src/**/*.css, as
//   `selector{declarations}` (an @media's rules each on their own, an @font-face whole), and each custom property
//   (a colour token) of their :root, compared with whitespace, comments and quote style set aside.
//   ⚠ This file is under tools/storybook/ too, and so are the cases: neither may quote a rule or a phrase.
// - A PHRASE of data/messages.json of ten characters or more: each string of the file but its two notes about itself
//   (`about`, `status`), cut at its {placeholders}, each piece of ten characters or more; compared after the escapes a
//   copy would carry (&#39;, \') are undone. (The block's words are its `handoff` strings, so they are phrases too.)
// - A RULE of the BLOCK (SPEC-storybook-microsite § 8.4, SM-4 extended): each rule of the hand-off block's two style
//   sheets as it ships them, the progress screen's (CSS) and the stripped checkout's (DEEP), read as rules are above.
//   They are string expressions in the block's text (scripts/build-storefront.mjs's storefrontText(), the text the Footer
//   carries), so their three declarations are evaluated as written, in an empty context: no rule is restated here.
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";
import { filesUnder } from "./paths.mjs";

export const MIN_PHRASE_CHARS = 10;
const NOT_PHRASES = new Set(["about", "status"]);
const PLACEHOLDER = /\{[a-z_]+\}/g;
const ENTITIES = { "&#39;": "'", "&apos;": "'", "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">" };

/** CSS text, comparable: no comments, single quotes as double, no whitespace around punctuation, one space elsewhere. */
export function squeeze(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'/g, '"')
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~()])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

/** The rules of a squeezed stylesheet: `sel{decls}` each, an at-rule's block opened (but @font-face, kept whole). */
function rulesOf(css) {
  const rules = [];
  let at = 0;
  while (at < css.length) {
    const open = css.indexOf("{", at);
    if (open === -1) break;
    const head = css.slice(at, open).trim();
    let depth = 1;
    let end = open + 1;
    for (; end < css.length && depth > 0; end++) depth += css[end] === "{" ? 1 : css[end] === "}" ? -1 : 0;
    const body = css.slice(open + 1, end - 1);
    if (head.startsWith("@") && !head.startsWith("@font-face")) rules.push(...rulesOf(body));
    else if (head) rules.push(`${head}{${body}}`);
    at = end;
  }
  return rules;
}

/** Every rule and :root custom property of the page's stylesheets, read from the site's sources. */
export async function pageRules(site) {
  const template = await readFile(join(site, "src", "template.html"), "utf8");
  const sheets = [...template.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1].replace(/\{\{[A-Z_]+\}\}/g, ""));
  for (const path of await cssFiles(join(site, "src"))) sheets.push(await readFile(path, "utf8"));
  const rules = sheets.flatMap((sheet) => rulesOf(squeeze(sheet)));
  const tokens = rules
    .filter((r) => r.startsWith(":root{"))
    .flatMap((r) => r.slice(":root{".length, -1).split(";"))
    .filter((d) => d.startsWith("--"));
  return [...new Set([...rules, ...tokens])];
}

async function cssFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await cssFiles(path)));
    else if (entry.name.endsWith(".css")) out.push(path);
  }
  return out;
}

/** The declarations, in the block's text, that make its two style sheets: each runs to its own `;` at a line's end. */
const BLOCK_STYLE_DECLARATIONS = ["var TOK = ", "var Q2 = ", "var DEEP = "];
const BLOCK_SHEETS = ["CSS", "DEEP"];

/** Every rule of the hand-off block's two style sheets, as the block ships them (the site's own build of its text). */
export async function blockRules(site) {
  const { storefrontText } = await import(pathToFileURL(join(site, "scripts", "build-storefront.mjs")).href);
  const text = await storefrontText();
  const context = {};
  for (const start of BLOCK_STYLE_DECLARATIONS) {
    const at = text.indexOf(start);
    if (at === -1 || text.indexOf(start, at + 1) !== -1) throw new Error(`the block's text has not exactly one ${start.trim()}`);
    runInNewContext(text.slice(at, text.indexOf(";\n", at) + 1), context);
  }
  for (const sheet of BLOCK_SHEETS) if (typeof context[sheet] !== "string") throw new Error(`the block's ${sheet} was not read`);
  return [...new Set(BLOCK_SHEETS.flatMap((sheet) => rulesOf(squeeze(context[sheet]))))];
}

/** Every phrase piece of data/messages.json of MIN_PHRASE_CHARS or more. */
export async function messagePhrases(site) {
  const messages = JSON.parse(await readFile(join(site, "data", "messages.json"), "utf8"));
  const strings = [];
  const walk = (value, key) => {
    if (NOT_PHRASES.has(key)) return;
    if (typeof value === "string") strings.push(value);
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k);
  };
  walk(messages, null);
  const pieces = strings.flatMap((s) => s.split(PLACEHOLDER)).map((p) => p.trim());
  return [...new Set(pieces.filter((p) => p.length >= MIN_PHRASE_CHARS))];
}

/** A file's text with the escapes a copied phrase would carry undone. */
const unescaped = (text) => text.replace(/&#39;|&apos;|&quot;|&amp;|&lt;|&gt;/g, (e) => ENTITIES[e]).replace(/\\(['"])/g, "$1");

/**
 * SM-4 over `dir`: "<file>: <what>" for every rule or phrase of the page, or rule of the block, a file carries; [] when
 * none does.
 */
export async function copiesUnder(dir, site) {
  const rules = await pageRules(site);
  const phrases = await messagePhrases(site);
  const block = await blockRules(site);
  if (rules.length === 0 || phrases.length === 0 || block.length === 0) {
    throw new Error(`nothing read from the site (${rules.length} rules, ${phrases.length} phrases, ${block.length} rules of the block)`);
  }
  const found = [];
  for (const file of await filesUnder(dir)) {
    const text = await readFile(file, "utf8");
    const css = squeeze(text);
    const words = unescaped(text);
    for (const rule of rules) if (css.includes(rule)) found.push(`${relative(dir, file)}: rule ${rule.slice(0, 60)}`);
    for (const rule of block) if (css.includes(rule)) found.push(`${relative(dir, file)}: rule of the block ${rule.slice(0, 60)}`);
    for (const phrase of phrases) if (words.includes(phrase)) found.push(`${relative(dir, file)}: phrase "${phrase}"`);
  }
  return found;
}
