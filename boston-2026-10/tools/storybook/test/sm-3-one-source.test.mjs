// SM-3 (SPEC-storybook-microsite.md § 5, ⭐ one source): the page a story's frame loads is byte-identical to the site's
// build output for that build and date, apart from the one clock script of § 2 item 4. Both are read: the page as the
// static build serves it, at the URL the stories use (microsite/layout.js's pageUrl), and a fresh build made here by the
// site's own npm scripts as the deploy runs them (`npm run build` / `npm run build:dev`), and, for a date with a week
// (no build embeds one: SPEC-week-content § 7's ruling), that week's content made by `npm run content` and put into the
// page's #picks-data by the site's own pageWithWeek, as the Workers put the bucket's.
//
// ⭐ Mutant (in the suite, in a mirror): a copy of the served pages with one CSS rule changed fails the check.
// STORYBOOK_STATIC=<dir> runs the case against another static build (a copy), to watch it fail there.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { CLOCK_ATTRIBUTE } from "../microsite/clock.mjs";
import { BUILDS, PAGES_ROUTE, pageUrl } from "../microsite/layout.js";
import { SITE } from "./paths.mjs";
import { CONTENT_SCRIPT } from "../microsite/paths.mjs";
import { serveStatic } from "./serve-static.mjs";
import { readManifest, removeStorybookStatic, storybookStatic } from "./storybook-static.mjs";

const run = promisify(execFile);
const BUILD_TIMEOUT_MS = 900_000;
/** The deploy's own scripts, per build (the site's package.json). */
const SITE_SCRIPT = { production: "build", development: "build:dev" };
const CLOCK = new RegExp(`<script ${CLOCK_ATTRIBUTE}="([^"]+)">[^<]*</script>\\n`, "g");
/** SM-3's mutant: one rule of the page's stylesheet, changed. */
const RULE = "body { margin: 0;";
const RULE_CHANGED = "body { margin: 1px;";

after(removeStorybookStatic);

/** The site's own build of `build`, into a fresh directory: its index.html, with the week `week` (a delivery Sunday)
 *  put in when there is one: `npm run content -- --week <week> --out <dir> [--env dev] [--picks <picks>]` (`picks`, the
 *  fixture week's directory, SPEC-meal-selection § 9), its week/picks-data.json by the site's pageWithWeek. */
async function freshPage(build, work, dateId, week = null, picks = null) {
  const out = join(work, `${build}-${dateId}`);
  await run("npm", ["--prefix", SITE, "run", SITE_SCRIPT[build], "--", "--out", out], { maxBuffer: 16 * 1024 * 1024 });
  const html = await readFile(join(out, "index.html"), "utf8");
  if (!week) return html;
  const content = join(out, "content");
  const env = build === "development" ? ["--env", "dev"] : [];
  await run("npm", ["--prefix", SITE, "run", "content", "--", "--week", week, "--out", content, ...env, ...(picks ? ["--picks", picks] : [])], { maxBuffer: 16 * 1024 * 1024 });
  const { pageWithWeek } = await import(pathToFileURL(CONTENT_SCRIPT).href);
  return pageWithWeek(html, JSON.parse(await readFile(join(content, "week", "picks-data.json"), "utf8")));
}

/** SM-3's check over a static build: one line per page that is not the build's own; [] when every page is. */
async function oneSource(staticDir) {
  const manifest = await readManifest(staticDir);
  const server = await serveStatic(staticDir);
  const work = await mkdtemp(join(tmpdir(), "fitaf-storybook-sm-3-"));
  const problems = [];
  let checked = 0;
  try {
    for (const build of BUILDS.map((b) => b.id)) {
      for (const date of manifest.dates.filter((d) => d.on)) {
        const served = await (await fetch(`${server.base}/${pageUrl(build, date.id)}`)).text();
        const clocks = [...served.matchAll(CLOCK)];
        const own = served.replace(CLOCK, "");
        const fresh = await freshPage(build, work, date.id, date.delivery ?? null, date.picks);
        checked++;
        const where = `${build}/${date.id} (${date.delivery ? `the week delivered ${date.delivery}` : "no week"})`;
        if (clocks.length !== (date.instant ? 1 : 0)) problems.push(`${where}: ${clocks.length} clock scripts`);
        if (date.instant && clocks[0]?.[1] !== date.instant) problems.push(`${where}: the clock is ${clocks[0]?.[1]}, not ${date.instant}`);
        if (date.instant && served.indexOf("<script") !== served.indexOf(`<script ${CLOCK_ATTRIBUTE}=`)) {
          problems.push(`${where}: the clock script is not before the page's own`);
        }
        if (own !== fresh) problems.push(`${where}: not byte-identical to the site's build (${own.length} and ${fresh.length} characters)`);
      }
    }
  } finally {
    await server.close();
    await rm(work, { recursive: true, force: true });
  }
  assert.ok(checked >= BUILDS.length * 2, `fixture control: the pages were read (${checked})`);
  return problems;
}

test("SM-3: each page a story loads is the site's own build for its build and date, but the one clock script", { timeout: BUILD_TIMEOUT_MS }, async () => {
  const { dir } = await storybookStatic();
  assert.deepEqual(await oneSource(dir), []);
});

test("SM-3 (mutant): a page served from a copy with one CSS rule changed fails", { timeout: BUILD_TIMEOUT_MS }, async (t) => {
  const { dir } = await storybookStatic();
  await readManifest(dir);
  const mirror = await mkdtemp(join(tmpdir(), "fitaf-storybook-sm-3-mutant-"));
  t.after(() => rm(mirror, { recursive: true, force: true }));
  await cp(join(dir, PAGES_ROUTE), join(mirror, PAGES_ROUTE), { recursive: true });
  const page = join(mirror, pageUrl("production", "today"));
  const html = await readFile(page, "utf8");
  assert.ok(html.includes(RULE), `fixture control: the page carries "${RULE}"`);
  await writeFile(page, html.replace(RULE, RULE_CHANGED));
  const problems = await oneSource(mirror);
  assert.equal(problems.length, 1, problems.join("\n"));
  assert.match(problems[0], /^production\/today .*not byte-identical/);
});
