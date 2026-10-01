// Shared by the pr-*.test.mjs files (SPEC-plan-page-refinement.md: the plan page refined from the Advisor's review).
// Not a test file itself. Pages are built through build.mjs's own build(), or `node build.mjs` in a mirror (cc-harness's
// mirror(): a copy of the package's inputs), into temporary directories; no committed file is written. The photo sheets
// are the FIXTURE's (test/fixtures/photo-sheets/: generated flat colours): no real manifest or sheet is committed.
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { build, loadJson, PICKS_DIR, ROOT } from "../build.mjs";
import { builtPage, FIXTURE_DIR, ON } from "./cc-harness.mjs";

const run = promisify(execFile);

/** The fixture manifest and the directory of its sheets (in data/photo-sheets.json's and src/assets/photo-sheets/'s place). */
export const FIXTURE_SHEETS_DIR = join(ROOT, "test", "fixtures", "photo-sheets");
export const FIXTURE_PHOTOS_PATH = join(FIXTURE_SHEETS_DIR, "photo-sheets.json");
export const FIXTURE_PHOTOS = await loadJson(FIXTURE_PHOTOS_PATH);

/** A page built with the fixture's photo sheets and the fixture's week (its invented names) open on ON. */
export async function photoPage(target = "prod") {
  const outDir = await mkdtemp(join(tmpdir(), `boston-pr-photos-${target}-`));
  try {
    await build({ target, outDir, picksDir: FIXTURE_DIR, on: ON, photosPath: FIXTURE_PHOTOS_PATH, sheetsDir: FIXTURE_SHEETS_DIR });
    return await readFile(join(outDir, "index.html"), "utf8");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

/** Every photo sheet a page names, wherever it is (an <img src>, a url(), the picks' JSON): the URL up to the file. */
export const PHOTO_URL = /[^\s"'()<>\\]*(?:carousel|chefs-choice-\d{4}-\d{2}-\d{2})\.jpg/g;
export const photoUrls = (html) => html.match(PHOTO_URL) ?? [];

/** Both builds' pages with the committed week open (data/picks/, built and seen on ON). */
export async function bothPages() {
  return {
    prod: (await builtPage({ target: "prod", picks: PICKS_DIR, on: ON })).html,
    dev: (await builtPage({ target: "dev", picks: PICKS_DIR, on: ON })).html,
  };
}

/** `node build.mjs [--env dev] --on ON --out <tmp>` run in `dir` (a mirror): the page it wrote, and the files beside it. */
export async function programBuild(dir, target) {
  const out = await mkdtemp(join(tmpdir(), `boston-pr-${target}-`));
  try {
    await run(process.execPath, ["build.mjs", ...(target === "dev" ? ["--env", "dev"] : []), "--on", ON, "--out", out], { cwd: dir });
    const { stdout } = await run("find", [out, "-type", "f"]);
    const files = stdout.split("\n").filter(Boolean).map((f) => f.slice(out.length + 1));
    return { html: await readFile(join(out, "index.html"), "utf8"), files };
  } finally {
    await rm(out, { recursive: true, force: true });
  }
}
