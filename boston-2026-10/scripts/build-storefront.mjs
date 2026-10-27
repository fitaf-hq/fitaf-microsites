// Build the storefront hand-off (SPEC-rung2 § 6): the script the store's Custom Scripts page injects in its
// Footer slot. `npm run build:storefront` writes dist-storefront/ (git-ignored), TWO FILES of one text, fill C's
// (SPEC-rung2-fill-c: fill B's press loop replaced; § 12: fill A is retired, and no file of it is built):
//   fitaf-handoff.html               <script>, version line, text, </script>: ready to paste in the Footer
//   fitaf-handoff.fill-B.console.js  version line and text, for a browser console (the one-browser run; the name is
//                                    kept, so a runbook that names it still works)
// The size (SPEC-rung2 § 11 item 5, the Advisor's ruling), over each whole file: the build WARNS above 5,120 bytes (the
// target) and REFUSES above the ceiling (50,000, the store's cap, since SPEC-rung2-progress-and-checkout § 32), writing nothing. And it REFUSES, writing nothing, any `<` in a file
// but the Footer block's own opening <script> and closing </script> (SPEC-rung2-progress-and-checkout § 11, amended:
// the store's admin reads the text inside the block as HTML, and `<` before a letter, even across a space, as a tag).
// Its own directory and its own npm script, NOT `npm run build`: the production build stays byte-identical (S20).
// The version line is `/* fitaf-handoff <commit> sha256:<hex of the text after it> */`, so what is live can be
// compared with what is kept. The text is the source without its full-line `//` comments, with each plan's allowed
// totals inlined from data/plans.json (SPEC-rung2-fill-c § 8: its own count and the `meals` of every `selection` row that
// goes through it; the per-meal prices, which only fill A wrote, are inlined nowhere) and the meal-key function
// from src/storefront/meal-key.js (§ 11 item 2: the link tool imports the same one); and, for rung 2's two faces
// (SPEC-rung2-progress-and-checkout § 1), the progress screen's words from data/messages.json (`handoff`) at the UI
// slot and its colours, the page's own tokens from src/template.html, at the TOKENS slot. R2-32 pins the text's SHA-256.
// Since SPEC-rung2-progress-and-checkout § 36 (item 9), the text is the hand-off's followed by the struck prices' own
// source, src/storefront/fitaf-struck.js, built the same way (its full-line comments dropped), data/offers.json's general
// offers with percent_off inlined at its OFFERS slot and the page's --muted token at its MUTED slot: one block, one paste.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadJson, MESSAGES_PATH, OFFERS_PATH, PLANS_PATH, ROOT } from "../build.mjs";
import { mealKey } from "../src/storefront/meal-key.js";
import { PHOTO_HOSTS } from "../src/storefront/photo-hosts.js";
import { pageTokens, TEMPLATE_PATH } from "./flow-theme.mjs";

export const STOREFRONT_SOURCE = join(ROOT, "src", "storefront", "fitaf-handoff.js");
export const DIST_STOREFRONT = join(ROOT, "dist-storefront");
/** § 36 item 9: the struck prices' own source, shipped after the hand-off's text in the same block. */
export const STRUCK_SOURCE = join(ROOT, "src", "storefront", "fitaf-struck.js");
/** § 36 item 2: the slot for the offers, [share, valid_from, valid_to] each; item 5: the slot for the --muted token. */
const OFFERS_SLOT = "/*OFFERS*/ []";
const MUTED_SLOT = "/*MUTED*/";
const OFFER_DATE = /^\d{4}-\d{2}-\d{2}$/;
/**
 * SPEC-rung2 § 11 item 5: the TARGET; a file above it is built with a warning. Measured over each whole file, tags and
 * version line included, as the ceiling is.
 */
export const TARGET_SHIPPED_BYTES = 5120;
/**
 * SPEC-rung2 § 11 item 5: the CEILING; a file above it refuses the build, and nothing is written. 50,000 since
 * SPEC-rung2-progress-and-checkout § 32: the store's own cap on the Footer's text (the Advisor, 2026-10-25: "the cap is
 * 50000 characters"; every character is ASCII, R2-77, so bytes are characters). 20,480 by its § 25.7 (2026-10-02, for
 * the three-step checkout: "Raise the ceiling"; the block stays inline in the Footer); 15,360 by its § 17.3
 * (2026-10-01: "bumping the script limit to 15 kb just to get through this meeting"); 10,240 before.
 */
export const MAX_SHIPPED_BYTES = 50000;
/** The Footer block, and the same text for a browser console. */
const FOOTER_FILE = "fitaf-handoff.html";
const CONSOLE_FILE = "fitaf-handoff.fill-B.console.js";
/**
 * SPEC-rung2-fill-c § 8 item 1: the slot for the plan table, mpid -> its allowed totals (countTable). A source from
 * before § 8 carries COUNTS_SLOT instead, and gets mpid -> the plan's own count (planCounts), as it was built: R2-71
 * rebuilds the live block from its own commit, byte for byte. A source carries exactly one of the two.
 */
const TOTALS_SLOT = "/*TOTALS*/ {}";
const COUNTS_SLOT = "/*COUNTS*/ {}";
/** The slot for the meal-key function: its text, exactly as src/storefront/meal-key.js has it. */
const KEY_SLOT = "/*KEY*/ null";
/** SPEC-rung2-progress-and-checkout § 1: the progress screen's words, data/messages.json's `handoff`, as a JSON object. */
const UI_SLOT = "/*UI*/ {}";
/** § 1: the screen's colours, the page's own tokens, as CSS custom properties inside the screen's own rule. */
const TOKENS_SLOT = "/*TOKENS*/";
/**
 * SPEC-rung2-progress-and-checkout § 17.1: the sheet's hosts (src/storefront/photo-hosts.js), as a JSON list. Not among
 * the required slots: a source from before § 17 (R2-71 rebuilds the live block from its own commit) has none.
 */
const HOSTS_SLOT = "/*HOSTS*/ []";
/**
 * The words the screen can use; `step`'s placeholders, each required in it. `stopped` since fill C (SPEC-rung2-fill-c
 * § 1.6: the line at a stop of its own). A build requires and inlines, in this order, those the source reads (`UI.<word>`),
 * so a source from before `stopped` (R2-71 rebuilds the live block from its own commit) builds its own text unchanged.
 * Since SPEC-rung2-progress-and-checkout § 25, the three-step checkout's: the bar's names (`steps`), Continue at steps 1
 * and 2 (`to_delivery`, `to_payment`), `back`, and the recap before the Total (`recap`, with {n}). Since
 * SPEC-snacks-in-the-cart § 3.6, the recap with snacks (`recap_snacks`, with {n} and {s}), read only by a source that carts them.
 * `save` (SPEC-rung2-progress-and-checkout § 35) is read by no source since § 36 item 8 removed the save link (and
 * data/messages.json no longer has it); it stays listed so the blocks built before § 36 rebuild from their own commits.
 */
const UI_WORDS = ["title", "step", "checkout", "stopped", "steps", "to_delivery", "to_payment", "back", "recap", "recap_snacks", "contact", "save"];
/** § 25: the step bar's names are `steps` split at this separator (the block splits it the same way), exactly three. */
const STEPS_SEPARATOR = " \u00b7 ";
const STEPS_COUNT = 3;
const STEP_PLACEHOLDERS = ["{meal}", "{n}", "{total}"];
/**
 * The page's tokens the screen uses (src/template.html :root), each required to be a hex colour; since
 * SPEC-rung2-progress-and-checkout § 25 also the checkout's step bar and buttons (`--muted`: the bar's other steps).
 */
export const SCREEN_TOKENS = ["--navy", "--cta", "--ice", "--white", "--muted"];
/** A whole line that is only a `//` comment. The script has no template literal, so such a line is always one. */
const SOURCE_ONLY_COMMENT = /^[ \t]*\/\/.*\n/gm;
/** A change to any of these changes a text, so any of them uncommitted marks the version line "-dirty". */
const INPUTS = ["src/storefront", "data/plans.json", "data/messages.json", "data/offers.json", "src/template.html", "scripts/build-storefront.mjs", "scripts/flow-theme.mjs"];
const bytesText = (n) => n.toLocaleString("en-US");

export const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
export const versionLine = (text, commit) => `/* fitaf-handoff ${commit} sha256:${sha256(text)} */\n`;

/** Every plan's counts, individual and Family. */
const cellsOf = (plans) => [...plans.individual, plans.family].flatMap((plan) => plan.counts);
/** mpid -> its counts, ascending: since SPEC-ui-and-copy-pass § 2.2 Family's one product carries two (5 and 10). */
function countsByMpid(cells) {
  const out = new Map();
  for (const c of cells) out.set(c.mpid, [...new Set([...(out.get(c.mpid) ?? []), c.meals_per_week])].sort((a, b) => a - b));
  return out;
}

/**
 * mpid -> the plan's own count, meals a week (SPEC-rung2 § 7's full-plan rule as it stood before SPEC-rung2-fill-c § 8).
 * What a source from before § 8 inlines (COUNTS_SLOT), and the store's own minimum ("Please add at least N meals"),
 * which the synthetic stores of the cases model. Never a link's check since § 8: that is countTable's. Since
 * SPEC-ui-and-copy-pass § 2.2 an mpid of two counts (Family's) gives the smaller: the least the store takes for it.
 */
export function planCounts(plans) {
  return Object.fromEntries([...countsByMpid(cellsOf(plans))].map(([mpid, counts]) => [mpid, counts[0]]));
}

const isCount = (n) => Number.isInteger(n) && n > 0;

/**
 * SPEC-rung2-fill-c § 8 item 1: mpid -> the plan's ALLOWED TOTALS, ascending: its own count P, and the `meals` of every
 * row of data/plans.json's `selection` whose `plan` is P (today 4 -> 4 or 5, 14 -> 14 or 15; 7, 10, 21 and Family's
 * own count alone). Every check of a link's count takes these (the block's decode, the link tool, the Chef's Choice cart
 * check). Data, never a literal. Only the rows' `plan` and `meals` are read here, each a whole number or the build
 * refuses; the selection's own rules are scripts/selection.mjs's.
 */
export function countTable(plans) {
  const rows = plans.selection ?? [];
  rows.forEach((row, i) => {
    if (!isCount(row?.plan) || !isCount(row?.meals)) {
      throw new Error(`data/plans.json: selection[${i}]: plan and meals must be whole numbers, got ${JSON.stringify(row?.plan)} and ${JSON.stringify(row?.meals)}`);
    }
  });
  const totalsOf = (P) => [...new Set([P, ...rows.filter((row) => row.plan === P).map((row) => row.meals)])].sort((a, b) => a - b);
  // SPEC-ui-and-copy-pass § 2.2 item 4: Family's one product takes its own counts (5 or 10), from the data; the
  // individual selection's extra meal is the individual plans' alone.
  const family = countsByMpid(plans.family.counts);
  const individual = plans.individual.flatMap((plan) => plan.counts).map((c) => [c.mpid, totalsOf(c.meals_per_week)]);
  return Object.fromEntries([...individual, ...family]);
}

/** JSON with every character outside printable ASCII, and `<`, written as \u escapes: the text stays ASCII. */
const asciiJson = (value) =>
  JSON.stringify(value).replace(/[<\u007f-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);

/**
 * § 1: data/messages.json's `handoff` words, checked: a missing word or placeholder refuses the build. `used`: the words
 * the source reads (by default all of UI_WORDS).
 */
export function screenWords(messages, used = UI_WORDS) {
  const words = messages.handoff ?? {};
  for (const key of used) {
    if (typeof words[key] !== "string" || !words[key].trim()) throw new Error(`data/messages.json: handoff.${key} is missing`);
  }
  for (const p of STEP_PLACEHOLDERS) {
    if (!words.step.includes(p)) throw new Error(`data/messages.json: handoff.step has no ${p}`);
  }
  if (used.includes("steps") && words.steps.split(STEPS_SEPARATOR).filter((s) => s.trim()).length !== STEPS_COUNT) {
    throw new Error(`data/messages.json: handoff.steps is not three names joined by "${STEPS_SEPARATOR}"`);
  }
  if (used.includes("recap") && !words.recap.includes("{n}")) throw new Error("data/messages.json: handoff.recap has no {n}");
  for (const p of used.includes("recap_snacks") ? ["{n}", "{s}"] : []) {
    if (!words.recap_snacks.includes(p)) throw new Error(`data/messages.json: handoff.recap_snacks has no ${p}`);
  }
  return Object.fromEntries(used.map((key) => [key, words[key]]));
}

/**
 * § 1: the page's tokens the screen uses, as declarations (`--navy:#1b2360;…`), each a hex colour or the build refuses.
 * `used`: those the source reads (`var(--…)`), in SCREEN_TOKENS's order, as the words are (UI_WORDS): so a source from
 * before § 25's `--muted` (R2-71 rebuilds the live block from its own commit) builds its own text unchanged.
 */
export function screenTokens(templateHtml, used = SCREEN_TOKENS) {
  const tokens = pageTokens(templateHtml);
  return used.map((name) => {
    if (!/^#[0-9a-f]{3,8}$/i.test(tokens[name] ?? "")) throw new Error(`src/template.html: ${name} is not a hex colour (${tokens[name]})`);
    return `${name}:${tokens[name]}`;
  }).join(";");
}

/**
 * § 36 item 2: data/offers.json's general offers that carry percent_off, as [share, valid_from, valid_to], checked: a share
 * not a whole number from 1 to 99, or a date not YYYY-MM-DD, or valid_to before valid_from, refuses the build.
 */
export function struckOffers(offers) {
  return (offers.offers ?? [])
    .filter((o) => o.applies_to === "general" && o.percent_off !== undefined)
    .map((o) => {
      if (!Number.isInteger(o.percent_off) || o.percent_off < 1 || o.percent_off > 99) throw new Error(`data/offers.json: offer ${o.id}'s percent_off must be a whole number from 1 to 99`);
      if (!OFFER_DATE.test(o.valid_from ?? "") || !OFFER_DATE.test(o.valid_to ?? "") || o.valid_to < o.valid_from) throw new Error(`data/offers.json: offer ${o.id}'s valid_from and valid_to must be dates, in order`);
      return [o.percent_off, o.valid_from, o.valid_to];
    });
}

/** § 36: the struck prices' text: its source without its full-line comments, the offers and the --muted token inlined. */
export async function struckText({ struckPath = STRUCK_SOURCE, offersPath = OFFERS_PATH, templatePath = TEMPLATE_PATH } = {}) {
  const source = await readFile(struckPath, "utf8");
  for (const slot of [OFFERS_SLOT, MUTED_SLOT]) {
    if (source.split(slot).length !== 2) throw new Error(`${struckPath}: expected one ${slot}`);
  }
  const muted = screenTokens(await readFile(templatePath, "utf8"), ["--muted"]).split(":")[1];
  const offers = struckOffers(await loadJson(offersPath));
  return source
    .replace(SOURCE_ONLY_COMMENT, "")
    .replace(OFFERS_SLOT, () => `/* data/offers.json */ ${JSON.stringify(offers)}`)
    .replace(MUTED_SLOT, () => muted);
}

/**
 * The shipped text: the source without its full-line `//` comments, the plans' allowed totals inlined at TOTALS (a
 * source from before SPEC-rung2-fill-c § 8: the plans' own counts at COUNTS), the screen's words at UI and its colours
 * at TOKENS, and the meal-key function's own text at KEY (inlined last, so it is exactly the module's). The source's
 * `//` lines explain it to a maintainer; they stay in the repository.
 */
export async function storefrontText({
  sourcePath = STOREFRONT_SOURCE,
  plansPath = PLANS_PATH,
  messagesPath = MESSAGES_PATH,
  templatePath = TEMPLATE_PATH,
  offersPath = OFFERS_PATH,
  // § 36 item 9: the struck prices follow the hand-off's own source; a source from another commit (R2-71 rebuilds the
  // live block from its own commit) gets none unless asked for.
  struckPath = sourcePath === STOREFRONT_SOURCE ? STRUCK_SOURCE : null,
} = {}) {
  const source = await readFile(sourcePath, "utf8");
  const tables = [TOTALS_SLOT, COUNTS_SLOT].filter((slot) => source.includes(slot));
  if (tables.length !== 1) throw new Error(`${sourcePath}: expected one ${TOTALS_SLOT} (or, before SPEC-rung2-fill-c § 8, one ${COUNTS_SLOT})`);
  for (const slot of [tables[0], KEY_SLOT, UI_SLOT, TOKENS_SLOT]) {
    if (source.split(slot).length !== 2) throw new Error(`${sourcePath}: expected one ${slot}`);
  }
  const plans = await loadJson(plansPath);
  const words = screenWords(await loadJson(messagesPath), UI_WORDS.filter((word) => source.includes(`UI.${word}`)));
  const tokens = screenTokens(await readFile(templatePath, "utf8"), SCREEN_TOKENS.filter((name) => source.includes(`var(${name})`)));
  const table = (rows) => `/* data/plans.json, read_on ${plans.read_on} */ ${JSON.stringify(rows)}`;
  const handoff = source
    .replace(SOURCE_ONLY_COMMENT, "")
    .replace(tables[0], () => table(tables[0] === TOTALS_SLOT ? countTable(plans) : planCounts(plans)))
    .replace(UI_SLOT, () => asciiJson(words))
    .replace(TOKENS_SLOT, () => tokens)
    .replace(HOSTS_SLOT, () => JSON.stringify(PHOTO_HOSTS))
    .replace(KEY_SLOT, () => mealKey.toString());
  return struckPath ? handoff + (await struckText({ struckPath, offersPath, templatePath })) : handoff;
}

/** The commit the texts are built from, "-dirty" if any input differs from it: the line never overstates. */
export function gitCommit() {
  const git = (...args) => execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" }).trim();
  const head = git("rev-parse", "--short", "HEAD");
  return git("status", "--porcelain", "--", ...INPUTS) ? `${head}-dirty` : head;
}

/** The two files of one text, as the build writes them, not yet checked or written (R2-58 scans them). */
export async function storefrontFiles({ sourcePath = STOREFRONT_SOURCE, struckPath = undefined, commit = gitCommit() } = {}) {
  const text = await storefrontText({ sourcePath, struckPath });
  const consoleFile = versionLine(text, commit) + text;
  return [
    [FOOTER_FILE, `<script>\n${consoleFile}</script>\n`],
    [CONSOLE_FILE, consoleFile],
  ].map(([name, content]) => ({ name, content, bytes: Buffer.byteLength(content) }));
}

/** A file's text without the Footer block's own wrapper: what must hold no `<` at all. */
const unwrapped = (f) => (f.name === FOOTER_FILE ? f.content.slice("<script>\n".length, -"</script>\n".length) : f.content);

export async function buildStorefront({ outDir = DIST_STOREFRONT, sourcePath = STOREFRONT_SOURCE, struckPath = undefined, commit = gitCommit() } = {}) {
  const files = await storefrontFiles({ sourcePath, struckPath, commit });
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
  console.log("the Footer block and the console file carry fill C, the one fill (SPEC-rung2-fill-c; the file names are fill B's, kept)");
  for (const f of out.files) console.log(`wrote ${join(out.outDir, f.name)} (${f.bytes} bytes)  /* ${f.versionLine} */`);
  for (const w of out.warnings) console.warn(`warning: ${w}`);
}
