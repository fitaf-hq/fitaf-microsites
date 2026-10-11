// The week as content (SPEC-week-content.md § 3): one week's objects for the Workers' WEEK bucket, made from the commit
// it runs in.
//
//   npm run content -- --week YYYY-MM-DD --out DIR [--env dev]
//
// writes DIR/week/picks-data.json (the page's #picks-data for that ONE week: pageData(), exactly as the build makes it,
// every photo-sheet URL at /week/<file>.jpg, the tiles' and the checkout links' photo part alike: § 1) and DIR/week/<file>.jpg
// (each sheet the data names, byte for byte from src/assets/photo-sheets/), and prints each file's path, size and
// SHA-256. The object keys are the paths under DIR: week/picks-data.json, week/<file>.jpg.
//
// - `--week` is a delivery Sunday, never inferred; `--env dev` makes the development Worker's content (its checkout
//   links name the test address's photo host, as `build:dev`'s do; the default is production's, as `build`'s).
// - Deterministic: no clock, no network; two runs over one commit are byte-identical (WC-10). The file is the element's
//   text as the build writes it (scriptJson: compact JSON, every "<" as <), with no trailing newline.
// - The build's refusals are this command's (WC-10): every picks file is checked as the build checks it (§ 1 of
//   SPEC-chefs-choice: checkPicks, the link tool's payloadFromArgs), a broken one beside the week included; the
//   selection, the card's words, and every sheet the manifest names must be present. A refusal, a week with no picks
//   file, an unknown argument or a DIR that already holds week/ exits 1 and WRITES NOTHING: everything is made in
//   memory first.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
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
import { chefsChoiceWords, isSunday, pageData, readPicks } from "./chefs-choice.mjs";
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
 * The content for delivery Sunday `week`: { week, target, files: [{ key, bytes }] }, the data first. Throws on any
 * refusal (the build's own, a week with no picks file); reads only, writes nothing. The paths are the build's inputs,
 * replaceable for a case (`picksDir` as the build's --picks).
 */
export async function weekContent({
  week,
  target = "prod",
  picksDir = PICKS_DIR,
  plansPath = PLANS_PATH,
  messagesPath = MESSAGES_PATH,
  photosPath = PHOTOS_PATH,
  sheetsDir = PHOTO_SHEETS_DIR,
  savePath = SAVE_PATH,
} = {}) {
  if (typeof week !== "string" || !isSunday(week)) throw new Error(`--week must be a delivery Sunday, YYYY-MM-DD; got ${week}`);
  if (!(target in TARGETS)) throw new Error(`--env must be dev, or absent for production; got ${target}`);
  const plans = await loadJson(plansPath);
  checkSelection(plans);
  const messages = await loadJson(messagesPath);
  const words = chefsChoiceWords(messages);
  const zone = (await loadJson(savePath)).send_time_zone;
  const built = await loadPhotos(photosPath);
  // The build's refusal (copyStatic): a sheet the manifest names and the directory lacks.
  for (const sheet of sheetsToCopy(built)) {
    if (!existsSync(join(sheetsDir, sheet.file))) {
      throw new Error(`data/photo-sheets.json names ${sheet.file}, which is not in src/assets/photo-sheets/ (to remove the photos, set base to null)`);
    }
  }
  const { photos, prefix } = contentPhotos(built);
  if (!existsSync(join(picksDir, `${week}.json`))) throw new Error(`no picks file for ${week}: data/picks/${week}.json`);
  // Every picks file, as the build reads them (a broken one refuses, naming it); then the one week.
  const weeks = (await readPicks(picksDir, plans, { photos, host: TARGETS[target] })).filter((w) => w.delivery === week);
  const { shown: snacks, carted } = checkSelection(plans).snacks;
  const text = scriptJson(pageData(weeks, { words, zone, photos, assetPrefix: prefix, snacks, carted }));
  const files = [{ key: DATA_KEY, bytes: Buffer.from(text, "utf8") }];
  const sheet = photos?.chefs_choice?.[week];
  // The week's sheet, if the data names it (a tile or a link's photo part): copied, never re-encoded.
  if (sheet && prefix && text.includes(`${prefix}${CONTENT_BASE}${sheet.file}`)) {
    files.push({ key: `${WEEK_DIR}/${sheet.file}`, bytes: await readFile(join(sheetsDir, sheet.file)) });
  }
  return { week, target, files };
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

/** The command line: exactly --week and --out, and --env dev. Anything else is refused. */
export function parseArgs(argv) {
  const known = { "--week": "week", "--out": "out", "--env": "env" };
  const args = {};
  for (let i = 0; argv.length > i; i += 2) {
    const name = known[argv[i]];
    if (!name) throw new Error(`unknown argument ${JSON.stringify(argv[i])} (npm run content -- --week YYYY-MM-DD --out DIR [--env dev])`);
    if (name in args) throw new Error(`${argv[i]} given twice`);
    if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) throw new Error(`${argv[i]} needs a value`);
    args[name] = argv[i + 1];
  }
  if (!args.week) throw new Error("--week YYYY-MM-DD is required: the delivery Sunday (never inferred)");
  if (!args.out) throw new Error("--out DIR is required");
  if (args.env !== undefined && args.env !== "dev") throw new Error(`--env must be dev; got ${args.env}`);
  return { week: args.week, out: args.out, target: args.env ?? "prod" };
}

// Run as a program (not a top-level await: chefs-choice.mjs imports build.mjs, which must finish evaluating first).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  (async () => {
    const { week, out, target } = parseArgs(process.argv.slice(2));
    const { files } = await weekContent({ week, target });
    for (const f of await writeContent(files, out)) console.log(`wrote ${f.path} (${f.bytes} bytes) sha256:${f.sha256}`);
  })().catch((err) => {
    console.error(`week-content: ${err.message}`);
    process.exitCode = 1;
  });
}
