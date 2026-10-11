// Shared by the pr-*.test.mjs files (SPEC-plan-page-refinement.md: the plan page refined from the Advisor's review).
// Not a test file itself. Pages are built through build.mjs's own build(), or `node build.mjs` in a mirror (cc-harness's
// mirror(): a copy of the package's inputs), into temporary directories; no committed file is written. The photo sheets
// are the FIXTURE's (test/fixtures/photo-sheets/: generated flat colours): no real manifest or sheet is committed.
// ⛔ No build embeds a week (SPEC-week-content § 7's ruling): a page with a week is the build's page with the week's
// CONTENT put in its #picks-data (cc-harness pageWithPicks; in a mirror, `node scripts/week-content.mjs`), as the Workers
// put the bucket's; so a tile's photo is the content's, at /week/<file>.
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { loadJson, PICKS_DIR, ROOT } from "../build.mjs";
import { FIXTURE_DIR, pageWithPicks, S } from "./cc-harness.mjs";

const run = promisify(execFile);

/** The fixture manifest and the directory of its sheets (in data/photo-sheets.json's and src/assets/photo-sheets/'s place). */
export const FIXTURE_SHEETS_DIR = join(ROOT, "test", "fixtures", "photo-sheets");
export const FIXTURE_PHOTOS_PATH = join(FIXTURE_SHEETS_DIR, "photo-sheets.json");
export const FIXTURE_PHOTOS = await loadJson(FIXTURE_PHOTOS_PATH);

/** A page built with the fixture's photo sheets, the fixture's week (its invented names) in it as content. */
export async function photoPage(target = "prod") {
  return (await pageWithPicks({ target, picks: FIXTURE_DIR, photosPath: FIXTURE_PHOTOS_PATH, sheetsDir: FIXTURE_SHEETS_DIR })).html;
}

/** Every photo sheet a page names, wherever it is (an <img src>, a url(), the picks' JSON): the URL up to the file. */
export const PHOTO_URL = /[^\s"'()<>\\]*(?:carousel|chefs-choice-\d{4}-\d{2}-\d{2})\.jpg/g;
export const photoUrls = (html) => html.match(PHOTO_URL) ?? [];

/** The latest committed week (data/picks/), never a literal. */
export async function latestCommittedWeek() {
  return (await readdir(PICKS_DIR))
    .map((f) => /^(\d{4}-\d{2}-\d{2})\.json$/.exec(f)?.[1])
    .filter(Boolean)
    .sort()
    .at(-1);
}

/** Both builds' pages with the latest committed week (data/picks/) in them as content. */
export async function bothPages() {
  const week = await latestCommittedWeek();
  return {
    prod: (await pageWithPicks({ target: "prod", picks: PICKS_DIR, week })).html,
    dev: (await pageWithPicks({ target: "dev", picks: PICKS_DIR, week })).html,
  };
}

/** Every file under `dir`, by path from it. */
async function filesUnder(dir) {
  const { stdout } = await run("find", [dir, "-type", "f"]);
  return stdout.split("\n").filter(Boolean).map((f) => f.slice(dir.length + 1));
}

/**
 * In `dir` (a mirror), as the programs run: `node build.mjs [--env dev] --out <tmp>` (the page, holding no week, and the
 * files beside it), then `node scripts/week-content.mjs --week <week> --out <tmp> [--env dev]` (the fixture week's
 * content by default, S), its week/picks-data.json put into the page's #picks-data by the mirror's own pageWithWeek.
 * Returns the page with the week, the build's files, and the content's.
 */
export async function programBuild(dir, target, week = S) {
  const out = await mkdtemp(join(tmpdir(), `boston-pr-${target}-`));
  const content = await mkdtemp(join(tmpdir(), `boston-pr-content-${target}-`));
  try {
    const env = target === "dev" ? ["--env", "dev"] : [];
    await run(process.execPath, ["build.mjs", ...env, "--out", out], { cwd: dir });
    await rm(content, { recursive: true });
    await run(process.execPath, [join("scripts", "week-content.mjs"), "--week", week, "--out", content, ...env], { cwd: dir });
    const { pageWithWeek } = await import(pathToFileURL(join(dir, "scripts", "week-content.mjs")).href);
    const data = JSON.parse(await readFile(join(content, "week", "picks-data.json"), "utf8"));
    return { html: pageWithWeek(await readFile(join(out, "index.html"), "utf8"), data), files: await filesUnder(out), contentFiles: await filesUnder(content) };
  } finally {
    await rm(out, { recursive: true, force: true });
    await rm(content, { recursive: true, force: true });
  }
}
