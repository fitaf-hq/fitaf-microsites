// The site's own build, run for the stories (SPEC-storybook-microsite.md § 2 item 1). For each build (production,
// development) and each date of the Date control, `node build.mjs` runs as the deploy runs it (`npm run build` is
// `node build.mjs`, `build:dev` adds `--env dev`), with the date's --on and an --out of its own, outside the site's
// dist/ and dist-dev/; then, for a fixed date, the one clock script goes before the page's own (§ 2 item 4). Beside the
// pages, pages.json: what the stories offer (the builds, the dates, the goals and counts of data/plans.json).
//
//   node microsite/pages.mjs      (npm run pages: rebuild them while Storybook runs; a story's reload shows them)
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { withClock } from "./clock.mjs";
import { clockDates } from "./dates.mjs";
import { BUILDS, DATES, MANIFEST, pagePath } from "./layout.js";
import { BUILD_SCRIPT, PAGES_DIR, PLANS_PATH, SAVE_PATH, SITE } from "./paths.mjs";

const run = promisify(execFile);
const OUTPUT_LIMIT_BYTES = 16 * 1024 * 1024;

/** One build of the site on `on`, into `out`: `node build.mjs [--env dev] --on <on> --out <out> [--picks <picks>]`, run in
 *  the site (`picks`, a picks directory from the site: the fixture week's, SPEC-meal-selection § 9). */
export async function siteBuild({ build, on, out, picks = null }) {
  const { env } = BUILDS.find((b) => b.id === build);
  const args = [BUILD_SCRIPT, ...(env ? ["--env", env] : []), "--on", on, "--out", out, ...(picks ? ["--picks", picks] : [])];
  try {
    await run(process.execPath, args, { cwd: SITE, maxBuffer: OUTPUT_LIMIT_BYTES });
  } catch (err) {
    throw new Error(`the site's build failed (${build}, --on ${on}):\n${err.stderr || err.message}`);
  }
}

/** One page: the build's, then (for a fixed date) the clock script before the page's own. */
async function onePage(outDir, build, date) {
  const out = join(outDir, build, date.id);
  await siteBuild({ build, on: date.on, out, picks: date.picks });
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
  await mkdir(outDir, { recursive: true });
  await Promise.all(BUILDS.flatMap((b) => dates.filter((d) => d.on).map((d) => onePage(outDir, b.id, d))));
  const manifest = await manifestOf(dates);
  await writeFile(join(outDir, MANIFEST), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

/** What `npm run pages` prints: each page and its date. */
export function report(manifest, outDir = PAGES_DIR) {
  for (const build of manifest.builds) {
    for (const d of manifest.dates.filter((x) => x.on)) {
      console.log(`${join(outDir, pagePath(build.id, d.id))}  --on ${d.on}${d.instant ? `, clock ${d.instant}` : ""}`);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  buildPages().then(report, (err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
