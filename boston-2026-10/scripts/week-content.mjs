// The week as content (SPEC-week-content.md § 3): one week's objects for the Workers' WEEK bucket, made from the commit
// it runs in.
//
//   npm run content -- --week YYYY-MM-DD --out DIR [--env dev] [--picks DIR] [--messages FILE]
//
// writes DIR/week/picks-data.json (the page's #picks-data for that ONE week: pageData(), the data the card's script reads,
// every photo-sheet URL at /week/<file>.jpg, the tiles' and the checkout links' photo part alike: § 1) and DIR/week/<file>.jpg
// (each sheet the data names, byte for byte from src/assets/photo-sheets/), and prints each file's path, size and
// SHA-256. The object keys are the paths under DIR: week/picks-data.json, week/<file>.jpg.
//
// - `--week` is a delivery Sunday, never inferred; `--env dev` makes the development Worker's content (its checkout
//   links name the test address's photo host, as `build:dev`'s did; the default is production's). `--picks DIR` reads
//   that picks directory instead of data/picks/ (relative to the working directory): Storybook's fixture week and the
//   cases, NEVER the bucket's job (the build's own --picks, moved here with the ruling that the build reads no week).
//   `--messages FILE` reads that words file instead of data/messages.json, for the same two and never the bucket's job
//   (SPEC-every-menu-and-nutrition § 4: a week of an invented second list is made only with its own fixture words).
// - SPEC-every-menu-and-nutrition: the lists a week may carry are those data/messages.json's `menus` names (another is
//   refused, naming it), and the menus' names and the nutrition phrases are filled here, as every word of the week is.
// - Deterministic: no clock, no network; two runs over one commit are byte-identical (WC-10). The file is the element's
//   text as the build writes it (scriptJson: compact JSON, every "<" as the six characters \u003c), with no trailing newline.
// - ⛔ The build embeds no week (SPEC-week-content § 7's ruling), so data/picks/ is read HERE alone, and its refusals
//   are this command's (WC-10): every picks file is checked as the build once checked it (§ 1 of
//   SPEC-chefs-choice: checkPicks, the link tool's payloadFromArgs), a broken one beside the week included; the
//   selection, the card's words, and every sheet the manifest names must be present. A refusal, a week with no picks
//   file, an unknown argument or a DIR that already holds week/ exits 1 and WRITES NOTHING: everything is made in
//   memory first.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEV_PHOTO_HOST,
  loadJson,
  loadPhotos,
  MESSAGES_PATH,
  PHOTO_SHEETS_DIR,
  PHOTOS_PATH,
  PICKS_DIR,
  PLANS_PATH,
  PROD_PHOTO_HOST,
  SAVE_PATH,
  scriptJson,
  sheetsToCopy,
} from "../build.mjs";
import { chefsChoiceWords, isSunday, menuWords, pageData, readPicks } from "./chefs-choice.mjs";
import { checkSelection } from "./selection.mjs";

/** § 1: the objects' keys (the interface with fitaf-infra). */
export const WEEK_DIR = "week";
export const DATA_KEY = `${WEEK_DIR}/picks-data.json`;
/** The sheets as the content addresses them: from the root, /week/<file> (the page and the Worker's own path). */
const CONTENT_BASE = `${WEEK_DIR}/`;
const CONTENT_PREFIX = "/";
const ABSOLUTE_URL = /^([a-z][a-z0-9+.-]*:|\/\/)/i;
const TARGETS = { prod: PROD_PHOTO_HOST, dev: DEV_PHOTO_HOST };

/** The manifest the content's data is made with: a relative `base` (sheets copied beside the page) becomes week/,
 *  addressed from the root; a null base (no photograph) or an absolute one (a CDN, nothing copied) is kept. */
function contentPhotos(photos) {
  if (typeof photos?.base !== "string" || ABSOLUTE_URL.test(photos.base)) return { photos, prefix: "" };
  return { photos: { ...photos, base: CONTENT_BASE }, prefix: CONTENT_PREFIX };
}

/**
 * The data the page's script reads, as content: pageData() over the week `week` of `picksDir` (its file required), or,
 * with `week` undefined, over EVERY week there in date order (a page holding several or none: for the cases and
 * Storybook, never a bucket's object). Every picks file is read and checked as § 1 of SPEC-chefs-choice says (a broken
 * one refuses, naming it), and so are the selection, the card's words and every sheet the manifest names. Returns
 * { data, text, sheets }: `text` the element's text (scriptJson), `sheets` each sheet the data names, as { file, path }.
 * Reads only. The paths are the inputs', replaceable for a case.
 */
export async function weekData({
  week,
  target = "prod",
  picksDir = PICKS_DIR,
  plansPath = PLANS_PATH,
  messagesPath = MESSAGES_PATH,
  photosPath = PHOTOS_PATH,
  sheetsDir = PHOTO_SHEETS_DIR,
  savePath = SAVE_PATH,
} = {}) {
  if (week !== undefined && (typeof week !== "string" || !isSunday(week))) throw new Error(`--week must be a delivery Sunday, YYYY-MM-DD; got ${week}`);
  if (!(target in TARGETS)) throw new Error(`--env must be dev, or absent for production; got ${target}`);
  const plans = await loadJson(plansPath);
  checkSelection(plans);
  const messages = await loadJson(messagesPath);
  const words = { ...chefsChoiceWords(messages), ...menuWords(messages) };
  const zone = (await loadJson(savePath)).send_time_zone;
  const built = await loadPhotos(photosPath);
  // The build's refusal (copyStatic): a sheet the manifest names and the directory lacks.
  for (const sheet of sheetsToCopy(built)) {
    if (!existsSync(join(sheetsDir, sheet.file))) {
      throw new Error(`data/photo-sheets.json names ${sheet.file}, which is not in src/assets/photo-sheets/ (to remove the photos, set base to null)`);
    }
  }
  const { photos, prefix } = contentPhotos(built);
  // Every picks file, read and checked (a broken one refuses, naming it); then the one week, or all of them.
  const all = existsSync(picksDir) ? await readPicks(picksDir, plans, { photos, host: TARGETS[target] }, { menus: words.menus, heading: words.heading }) : [];
  const weeks = week === undefined ? all : all.filter((w) => w.delivery === week);
  if (week !== undefined && !weeks.length) throw new Error(`no picks file for ${week}: data/picks/${week}.json`);
  const { shown: snacks, carted } = checkSelection(plans).snacks;
  const data = pageData(weeks, { words, zone, photos, assetPrefix: prefix, snacks, carted });
  const text = scriptJson(data);
  // Each week's sheet, if the data names it (a tile or a link's photo part): copied, never re-encoded.
  const sheets = weeks
    .map((w) => photos?.chefs_choice?.[w.delivery])
    .filter((sheet) => sheet && prefix && text.includes(`${prefix}${CONTENT_BASE}${sheet.file}`))
    .map((sheet) => ({ file: sheet.file, path: join(sheetsDir, sheet.file) }));
  return { data, text, sheets };
}

/**
 * The content for delivery Sunday `week` (§ 3): { week, target, files: [{ key, bytes }] }, the data first, then its
 * sheet. Throws on any refusal (the build's own, a week with no picks file); reads only, writes nothing.
 */
export async function weekContent({ week, ...inputs } = {}) {
  if (week === undefined) throw new Error("--week YYYY-MM-DD is required: the delivery Sunday (never inferred)");
  const { text, sheets } = await weekData({ week, ...inputs });
  const files = [{ key: DATA_KEY, bytes: Buffer.from(text, "utf8") }];
  for (const sheet of sheets) files.push({ key: `${WEEK_DIR}/${sheet.file}`, bytes: await readFile(sheet.path) });
  return { week, target: inputs.target ?? "prod", files };
}

const PICKS_ELEMENT_OPEN = '<script type="application/json" id="picks-data">';

/**
 * `html` (a page the build wrote) with `data` in its `#picks-data`: the element's text replaced by scriptJson(data),
 * every other byte as it was. What the Workers do with the bucket's object (src/worker/site.js, by HTMLRewriter), done
 * on a file, for the cases and Storybook: a page with a week is made this way, since no build embeds one.
 */
export function pageWithWeek(html, data) {
  const parts = html.split(PICKS_ELEMENT_OPEN);
  if (parts.length !== 2) throw new Error(`the page has ${parts.length - 1} #picks-data elements, not one`);
  const end = parts[1].indexOf("</script>");
  if (end === -1) throw new Error("the page's #picks-data element is not closed");
  return parts[0] + PICKS_ELEMENT_OPEN + scriptJson(data) + parts[1].slice(end);
}

/** Write `files` under `outDir` (refusing a directory that already holds week/, before writing anything): each file's
 *  path, size and SHA-256. */
export async function writeContent(files, outDir) {
  if (existsSync(join(outDir, WEEK_DIR))) throw new Error(`${join(outDir, WEEK_DIR)}/ already exists: give an empty --out, so two weeks' objects never meet`);
  const written = [];
  for (const { key, bytes } of files) {
    const path = join(outDir, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
    written.push({ path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  return written;
}

/** The command line: exactly --week and --out, and --env dev, --picks DIR and --messages FILE. Anything else is refused. */
export function parseArgs(argv) {
  const known = { "--week": "week", "--out": "out", "--env": "env", "--picks": "picks", "--messages": "messages" };
  const args = {};
  for (let i = 0; argv.length > i; i += 2) {
    const name = known[argv[i]];
    if (!name) throw new Error(`unknown argument ${JSON.stringify(argv[i])} (npm run content -- --week YYYY-MM-DD --out DIR [--env dev] [--picks DIR] [--messages FILE])`);
    if (name in args) throw new Error(`${argv[i]} given twice`);
    if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) throw new Error(`${argv[i]} needs a value`);
    args[name] = argv[i + 1];
  }
  if (!args.week) throw new Error("--week YYYY-MM-DD is required: the delivery Sunday (never inferred)");
  if (!args.out) throw new Error("--out DIR is required");
  if (args.env !== undefined && args.env !== "dev") throw new Error(`--env must be dev; got ${args.env}`);
  return {
    week: args.week,
    out: args.out,
    target: args.env ?? "prod",
    ...(args.picks ? { picksDir: resolve(args.picks) } : {}),
    ...(args.messages ? { messagesPath: resolve(args.messages) } : {}),
  };
}

// Run as a program (not a top-level await: chefs-choice.mjs imports build.mjs, which must finish evaluating first).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  (async () => {
    const { week, out, ...inputs } = parseArgs(process.argv.slice(2));
    const { files } = await weekContent({ week, ...inputs });
    for (const f of await writeContent(files, out)) console.log(`wrote ${f.path} (${f.bytes} bytes) sha256:${f.sha256}`);
  })().catch((err) => {
    console.error(`week-content: ${err.message}`);
    process.exitCode = 1;
  });
}
