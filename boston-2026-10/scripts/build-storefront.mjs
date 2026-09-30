// Build the storefront hand-off (SPEC-rung2 § 6): the script the store's Custom Scripts page injects in its
// Footer slot. `npm run build:storefront` writes dist-storefront/ (git-ignored), TWO FILES of one text, fill B's (§ 12:
// fill A is retired, and no file of it is built):
//   fitaf-handoff.html               <script>, version line, text, </script>: ready to paste in the Footer
//   fitaf-handoff.fill-B.console.js  version line and text, for a browser console (the one-browser run; the name is
//                                    kept, so a runbook that names it still works)
// The size (SPEC-rung2 § 11 item 5, the Advisor's ruling), over each whole file: the build WARNS above 5,120 bytes (the
// target) and REFUSES above 10,240 (the ceiling), writing nothing. And it REFUSES, writing nothing, any `<` in a file
// but the Footer block's own opening <script> and closing </script> (SPEC-rung2-progress-and-checkout § 11, amended:
// the store's admin reads the text inside the block as HTML, and `<` before a letter, even across a space, as a tag).
// Its own directory and its own npm script, NOT `npm run build`: the production build stays byte-identical (S20).
// The version line is `/* fitaf-handoff <commit> sha256:<hex of the text after it> */`, so what is live can be
// compared with what is kept. The text is the source without its full-line `//` comments, with the plan counts inlined
// from data/plans.json (the per-meal prices, which only fill A wrote, are inlined nowhere) and the meal-key function
// from src/storefront/meal-key.js (§ 11 item 2: the link tool imports the same one); and, for rung 2's two faces
// (SPEC-rung2-progress-and-checkout § 1), the progress screen's words from data/messages.json (`handoff`) at the UI
// slot and its colours, the page's own tokens from src/template.html, at the TOKENS slot. R2-32 pins the text's SHA-256.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadJson, MESSAGES_PATH, PLANS_PATH, ROOT } from "../build.mjs";
import { mealKey } from "../src/storefront/meal-key.js";
import { pageTokens, TEMPLATE_PATH } from "./flow-theme.mjs";

export const STOREFRONT_SOURCE = join(ROOT, "src", "storefront", "fitaf-handoff.js");
export const DIST_STOREFRONT = join(ROOT, "dist-storefront");
/**
 * SPEC-rung2 § 11 item 5: the TARGET; a file above it is built with a warning. Measured over each whole file, tags and
 * version line included, as the ceiling is.
 */
export const TARGET_SHIPPED_BYTES = 5120;
/** SPEC-rung2 § 11 item 5: the CEILING; a file above it refuses the build, and nothing is written. */
export const MAX_SHIPPED_BYTES = 10240;
/** The Footer block, and the same text for a browser console. */
const FOOTER_FILE = "fitaf-handoff.html";
const CONSOLE_FILE = "fitaf-handoff.fill-B.console.js";
const COUNTS_SLOT = "/*COUNTS*/ {}";
/** The slot for the meal-key function: its text, exactly as src/storefront/meal-key.js has it. */
const KEY_SLOT = "/*KEY*/ null";
/** SPEC-rung2-progress-and-checkout § 1: the progress screen's words, data/messages.json's `handoff`, as a JSON object. */
const UI_SLOT = "/*UI*/ {}";
/** § 1: the screen's colours, the page's own tokens, as CSS custom properties inside the screen's own rule. */
const TOKENS_SLOT = "/*TOKENS*/";
/** The words the screen uses, each required; `step`'s placeholders, each required in it. */
const UI_WORDS = ["title", "step", "checkout"];
const STEP_PLACEHOLDERS = ["{meal}", "{n}", "{total}"];
/** The page's tokens the screen uses (src/template.html :root), each required to be a hex colour. */
export const SCREEN_TOKENS = ["--navy", "--cta", "--ice", "--white"];
/** A whole line that is only a `//` comment. The script has no template literal, so such a line is always one. */
const SOURCE_ONLY_COMMENT = /^[ \t]*\/\/.*\n/gm;
/** A change to any of these changes a text, so any of them uncommitted marks the version line "-dirty". */
const INPUTS = ["src/storefront", "data/plans.json", "data/messages.json", "src/template.html", "scripts/build-storefront.mjs", "scripts/flow-theme.mjs"];
const bytesText = (n) => n.toLocaleString("en-US");

export const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
export const versionLine = (text, commit) => `/* fitaf-handoff ${commit} sha256:${sha256(text)} */\n`;

/** mpid -> meals a week, every plan (Family too): the full-plan rule (SPEC-rung2 § 7). */
export function countTable(plans) {
  return Object.fromEntries(
    [...plans.individual, plans.family].flatMap((plan) => plan.counts.map((c) => [c.mpid, c.meals_per_week])),
  );
}

/** JSON with every character outside printable ASCII, and `<`, written as \u escapes: the text stays ASCII. */
const asciiJson = (value) =>
  JSON.stringify(value).replace(/[<\u007f-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);

/** § 1: data/messages.json's `handoff` words, checked: a missing word or placeholder refuses the build. */
export function screenWords(messages) {
  const words = messages.handoff ?? {};
  for (const key of UI_WORDS) {
    if (typeof words[key] !== "string" || !words[key].trim()) throw new Error(`data/messages.json: handoff.${key} is missing`);
  }
  for (const p of STEP_PLACEHOLDERS) {
    if (!words.step.includes(p)) throw new Error(`data/messages.json: handoff.step has no ${p}`);
  }
  return Object.fromEntries(UI_WORDS.map((key) => [key, words[key]]));
}

/** § 1: the page's tokens the screen uses, as declarations (`--navy:#1b2360;…`), each a hex colour or the build refuses. */
export function screenTokens(templateHtml) {
  const tokens = pageTokens(templateHtml);
  return SCREEN_TOKENS.map((name) => {
    if (!/^#[0-9a-f]{3,8}$/i.test(tokens[name] ?? "")) throw new Error(`src/template.html: ${name} is not a hex colour (${tokens[name]})`);
    return `${name}:${tokens[name]}`;
  }).join(";");
}

/**
 * The shipped text: the source without its full-line `//` comments, the plan counts inlined at COUNTS, the screen's
 * words at UI and its colours at TOKENS, and the meal-key function's own text at KEY (inlined last, so it is exactly
 * the module's). The source's `//` lines explain it to a maintainer; they stay in the repository.
 */
export async function storefrontText({
  sourcePath = STOREFRONT_SOURCE,
  plansPath = PLANS_PATH,
  messagesPath = MESSAGES_PATH,
  templatePath = TEMPLATE_PATH,
} = {}) {
  const source = await readFile(sourcePath, "utf8");
  for (const slot of [COUNTS_SLOT, KEY_SLOT, UI_SLOT, TOKENS_SLOT]) {
    if (source.split(slot).length !== 2) throw new Error(`${sourcePath}: expected one ${slot}`);
  }
  const plans = await loadJson(plansPath);
  const words = screenWords(await loadJson(messagesPath));
  const tokens = screenTokens(await readFile(templatePath, "utf8"));
  const table = (rows) => `/* data/plans.json, read_on ${plans.read_on} */ ${JSON.stringify(rows)}`;
  return source
    .replace(SOURCE_ONLY_COMMENT, "")
    .replace(COUNTS_SLOT, () => table(countTable(plans)))
    .replace(UI_SLOT, () => asciiJson(words))
    .replace(TOKENS_SLOT, () => tokens)
    .replace(KEY_SLOT, () => mealKey.toString());
}

/** The commit the texts are built from, "-dirty" if any input differs from it: the line never overstates. */
export function gitCommit() {
  const git = (...args) => execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" }).trim();
  const head = git("rev-parse", "--short", "HEAD");
  return git("status", "--porcelain", "--", ...INPUTS) ? `${head}-dirty` : head;
}

/** The two files of one text, as the build writes them, not yet checked or written (R2-58 scans them). */
export async function storefrontFiles({ sourcePath = STOREFRONT_SOURCE, commit = gitCommit() } = {}) {
  const text = await storefrontText({ sourcePath });
  const consoleFile = versionLine(text, commit) + text;
  return [
    [FOOTER_FILE, `<script>\n${consoleFile}</script>\n`],
    [CONSOLE_FILE, consoleFile],
  ].map(([name, content]) => ({ name, content, bytes: Buffer.byteLength(content) }));
}

/** A file's text without the Footer block's own wrapper: what must hold no `<` at all. */
const unwrapped = (f) => (f.name === FOOTER_FILE ? f.content.slice("<script>\n".length, -"</script>\n".length) : f.content);

export async function buildStorefront({ outDir = DIST_STOREFRONT, sourcePath = STOREFRONT_SOURCE, commit = gitCommit() } = {}) {
  const files = await storefrontFiles({ sourcePath, commit });
  // Refuse before writing anything: a `<` in the text (the store's admin would read a tag in it; nor can the text then
  // close its own <script> early), or a file over the limit.
  for (const f of files) {
    const at = unwrapped(f).indexOf("<");
    if (at >= 0) {
      const near = unwrapped(f).slice(Math.max(0, at - 20), at + 20).replace(/\s+/g, " ");
      throw new Error(`${f.name}: a '<' in the text, near "${near}" (SPEC-rung2-progress-and-checkout § 11: none but the block's own <script> and </script>)`);
    }
  }
  for (const f of files) {
    if (f.bytes > MAX_SHIPPED_BYTES) {
      throw new Error(`${f.name}: ${bytesText(f.bytes)} bytes; the ceiling is ${bytesText(MAX_SHIPPED_BYTES)} (SPEC-rung2 § 11 item 5)`);
    }
  }
  const warnings = files
    .filter((f) => f.bytes > TARGET_SHIPPED_BYTES)
    .map((f) => `${f.name}: ${bytesText(f.bytes)} bytes, over the ${bytesText(TARGET_SHIPPED_BYTES)}-byte target (the ceiling is ${bytesText(MAX_SHIPPED_BYTES)})`);
  // The directory is wholly this build's output, so it starts empty: nothing stale can be pasted.
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  for (const f of files) await writeFile(join(outDir, f.name), f.content);
  return {
    outDir,
    files: files.map(({ name, content, bytes }) => ({ name, bytes, versionLine: content.match(/fitaf-handoff \S+ sha256:\w+/)[0] })),
    warnings,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = await buildStorefront();
  console.log("the Footer block and the console file carry fill B, the one fill (SPEC-rung2 § 12)");
  for (const f of out.files) console.log(`wrote ${join(out.outDir, f.name)} (${f.bytes} bytes)  /* ${f.versionLine} */`);
  for (const w of out.warnings) console.warn(`warning: ${w}`);
}
