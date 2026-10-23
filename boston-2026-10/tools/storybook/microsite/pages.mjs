// The site's own build, run for the stories (SPEC-storybook-microsite.md § 2 item 1). For each build (production,
// development) and each date of the Date control, `node build.mjs` runs as the deploy runs it (`npm run build` is
// `node build.mjs`, `build:dev` adds `--env dev`), with an --out of its own, outside the site's dist/ and dist-dev/.
// No build embeds a week (SPEC-week-content § 7's ruling), so for a date with a week the site's content command runs
// as the job runs it (`node scripts/week-content.mjs --week <S> --out <dir> [--env dev] [--picks <fixture>]`) and its
// week/picks-data.json is put into the page's #picks-data by the site's own pageWithWeek, as the Workers put the
// bucket's; its sheets go to the pages' week/, which Storybook serves at /week/ (where the Workers serve the bucket's).
// Then, for a fixed date, the one clock script goes before the page's own (§ 2 item 4). Beside the pages, pages.json:
// what the stories offer (the builds, the dates, the goals and counts of data/plans.json).
//
//   node microsite/pages.mjs      (npm run pages: rebuild them while Storybook runs; a story's reload shows them)
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { withClock } from "./clock.mjs";
import { clockDates } from "./dates.mjs";
import { BUILDS, DATES, MANIFEST, pagePath } from "./layout.js";
import { BUILD_SCRIPT, CONTENT_SCRIPT, MESSAGES_PATH, PAGES_DIR, PLANS_PATH, SAVE_PATH, SITE, siteFile } from "./paths.mjs";

const run = promisify(execFile);
const OUTPUT_LIMIT_BYTES = 16 * 1024 * 1024;

/** The pages' directory of the weeks' sheets, served at /week/ (the content's own URLs). */
export const WEEK_SHEETS = "week";

/** A date's words (SPEC-every-menu-and-nutrition § 4: a week of an invented second list is made with its own fixture
 *  words): the site's module at `words` lays them over data/messages.json; written to `dir` for the content's
 *  --messages. Returns the file's path. */
export async function wordsFile(words, dir) {
  const { menusMessages } = await import(pathToFileURL(siteFile(...words.split("/"))).href);
  const path = join(dir, "messages.json");
  await writeFile(path, JSON.stringify(menusMessages(JSON.parse(await readFile(MESSAGES_PATH, "utf8"))), null, 2));
  return path;
}

/** One build of the site into `out`: `node build.mjs [--env dev] --out <out>`, run in the site. Then, with a `week` (a
 *  delivery Sunday), that week's content (siteContent) put into the page's #picks-data. Returns the content's sheets. */
export async function siteBuild({ build, out, week = null, picks = null, words = null }) {
  const { env } = BUILDS.find((b) => b.id === build);
  try {
    await run(process.execPath, [BUILD_SCRIPT, ...(env ? ["--env", env] : []), "--out", out], { cwd: SITE, maxBuffer: OUTPUT_LIMIT_BYTES });
  } catch (err) {
    throw new Error(`the site's build failed (${build}):\n${err.stderr || err.message}`);
  }
  if (!week) return [];
  const { data, sheets } = await siteContent({ build, week, picks, words });
  const { pageWithWeek } = await import(pathToFileURL(CONTENT_SCRIPT).href);
  const page = join(out, "index.html");
  await writeFile(page, pageWithWeek(await readFile(page, "utf8"), data));
  return sheets;
}

/** The site's content for `week`, as the job makes it: `node scripts/week-content.mjs --week <week> --out <tmp> [--env
 *  dev] [--picks <picks>] [--messages <the date's words>]`, run in the site: its data, and its sheets ({ file, bytes }). */
export async function siteContent({ build, week, picks = null, words = null }) {
  const { env } = BUILDS.find((b) => b.id === build);
  const out = join(await mkdtemp(join(tmpdir(), "fitaf-storybook-content-")), "out");
  try {
    const messages = words ? ["--messages", await wordsFile(words, join(out, ".."))] : [];
    const args = [CONTENT_SCRIPT, "--week", week, "--out", out, ...(env ? ["--env", env] : []), ...(picks ? ["--picks", picks] : []), ...messages];
    try {
      await run(process.execPath, args, { cwd: SITE, maxBuffer: OUTPUT_LIMIT_BYTES });
    } catch (err) {
      throw new Error(`the site's content failed (${build}, --week ${week}):\n${err.stderr || err.message}`);
    }
    const dir = join(out, WEEK_SHEETS);
    const names = (await readdir(dir)).sort();
    return {
      data: JSON.parse(await readFile(join(dir, "picks-data.json"), "utf8")),
      sheets: await Promise.all(names.filter((n) => n.endsWith(".jpg")).map(async (file) => ({ file, bytes: await readFile(join(dir, file)) }))),
    };
  } finally {
    await rm(join(out, ".."), { recursive: true, force: true });
  }
}

/** One page: the build's, with the date's week if it has one (its sheets into the pages' week/), then (for a fixed
 *  date) the clock script before the page's own. */
async function onePage(outDir, build, date) {
  const out = join(outDir, build, date.id);
  const sheets = await siteBuild({ build, out, week: date.delivery ?? null, picks: date.picks, words: date.words ?? null });
  for (const { file, bytes } of sheets) await writeFile(join(outDir, WEEK_SHEETS, file), bytes);
  if (!date.instant) return;
  const page = join(outDir, pagePath(build, date.id));
  await writeFile(page, withClock(await readFile(page, "utf8"), date.instant));
}

/** What the stories read (pages.json): the zone, the builds, the dates with their labels, the goals and counts, and
 *  whether snacks are carted (`snacks.carted`: a story that moves with it, SPEC-snacks-in-the-cart § 3a item 11). */
async function manifestOf(dates) {
  const plans = JSON.parse(await readFile(PLANS_PATH, "utf8"));
  return {
    zone: JSON.parse(await readFile(SAVE_PATH, "utf8")).send_time_zone,
    builds: BUILDS.map(({ id, label }) => ({ id, label })),
    dates: dates.map((d) => ({ ...d, label: DATES.find((x) => x.id === d.id).label })),
    goals: plans.individual.map(({ id, name }) => ({ id, name })),
    counts: plans.shown_counts.map((c) => String(c.meals_per_week)),
    carted: plans.snacks.carted === true,
  };
}

/** Build every page into `outDir` (emptied first) and write its manifest; returns the manifest. */
export async function buildPages({ outDir = PAGES_DIR, now = Date.now() } = {}) {
  if (!existsSync(join(SITE, "node_modules"))) {
    throw new Error(`the site's build needs the site's install first: npm --prefix ${SITE} ci`);
  }
  const dates = await clockDates({ now });
  await rm(outDir, { recursive: true, force: true });
  await mkdir(join(outDir, WEEK_SHEETS), { recursive: true });
  await Promise.all(BUILDS.flatMap((b) => dates.filter((d) => d.on).map((d) => onePage(outDir, b.id, d))));
  const manifest = await manifestOf(dates);
  await writeFile(join(outDir, MANIFEST), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

/** What `npm run pages` prints: each page and its date. */
export function report(manifest, outDir = PAGES_DIR) {
  for (const build of manifest.builds) {
    for (const d of manifest.dates.filter((x) => x.on)) {
      console.log(`${join(outDir, pagePath(build.id, d.id))}  ${d.delivery ? `the week delivered ${d.delivery}` : "no week"}${d.instant ? `, clock ${d.instant}` : ""}`);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  buildPages().then(report, (err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
