// Records WC-9's "before" (SPEC-week-content.md § 5): what the production build of a commit embeds, built from THAT
// commit's own tree, as the contract names it ("the production build of 409b805, built --on 2026-10-11"). Not a test
// file: `node test/wc-09-record.mjs [--commit 409b805] [--on 2026-10-11] [--visible-at <commit>] > test/wc-09-golden.json`. It writes nothing in
// the repository: the commit's package is extracted by `git archive` into a temporary directory (this package's
// node_modules linked in), built there, and the golden printed on stdout:
//
// - picks_data: the page's #picks-data, parsed; page_sha256: index.html's SHA-256;
// - sheet: the week's photo sheet in that tree, its file and SHA-256;
// - visible: per fragment of REGRESSION_HASHES, the SHA-256 of the visible page (wc-harness visible()) opened at
//   opened_at, the week's sheet URL first rewritten to /week/<file> (§ 1: the one difference the contract allows).
//
// `--visible-at <commit>` (SPEC-meal-selection § 12 item 4, 2026-10-20: the page is MEANT to change visibly, the questions'
// order and the default and the card's layout, while the week's content does not): `visible` is instead the page
// production's Worker serves from <commit>'s OWN tree, as WC-9c makes it (its build, holding no week; its content for the
// week in the bucket; its src/worker/site.js in Miniflare), opened at the same instant, and `visible_at` names the
// commit. Everything else is still recorded from --commit's tree, so WC-9a's content stays 409b805's.
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { asWeekUrls, REGRESSION_HASHES, REGRESSION_NOW } from "./wc-regression.mjs";
import { contentOf, noWeekPage, pageAsset, picksText, sha256, SHEET_1018, sheetKeyOf, startSite, visible, WEEK_1018, WEEK_DATA_KEY } from "./wc-harness.mjs";

const flag = (name, fallback) => {
  const at = process.argv.indexOf(name);
  return at === -1 ? fallback : process.argv[at + 1];
};
const COMMIT = flag("--commit", "409b805");
const ON = flag("--on", "2026-10-11");
const VISIBLE_AT = flag("--visible-at", null);

function run(cmd, args, input) {
  const r = spawnSync(cmd, args, { input, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status}: ${r.stderr}`);
  return r.stdout;
}

const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
const prefix = relative(top, ROOT);
const short = (commit) => run("git", ["-C", top, "rev-parse", "--short", commit]).toString("utf8").trim();

/** --visible-at: per fragment, the visible page production's Worker serves from `commit`'s own tree, made as WC-9c makes
 *  it (that tree's build holding no week; that tree's content for the week in the bucket; its site.js in Miniflare). */
async function servedVisible(commit) {
  const dir = await mkdtemp(join(tmpdir(), "boston-wc9-visible-"));
  try {
    run("tar", ["-x", "-C", dir], run("git", ["-C", top, "archive", "--format=tar", commit, prefix]));
    const pkg = join(dir, prefix);
    await symlink(join(ROOT, "node_modules"), join(pkg, "node_modules"));
    const asset = await noWeekPage({ root: pkg });
    const { text, files } = await contentOf({ root: pkg, week: WEEK_1018 });
    const sheet = sheetKeyOf(SHEET_1018);
    const site = await startSite({ root: pkg, assets: { "/": pageAsset(asset) }, objects: { [WEEK_DATA_KEY]: text, [sheet]: files[sheet] } });
    try {
      const served = (await site.get("/")).text;
      return Object.fromEntries(REGRESSION_HASHES.map((hash) => [hash, sha256(visible(served, { hash, now: REGRESSION_NOW }))]));
    } finally {
      await site.dispose();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const tmp = await mkdtemp(join(tmpdir(), "boston-wc9-record-"));
try {
  run("tar", ["-x", "-C", tmp], run("git", ["-C", top, "archive", "--format=tar", COMMIT, prefix]));
  const pkg = join(tmp, prefix);
  await symlink(join(ROOT, "node_modules"), join(pkg, "node_modules"));
  const { build } = await import(pathToFileURL(join(pkg, "build.mjs")).href);
  const outDir = join(tmp, "dist");
  await build({ target: "prod", outDir, on: ON });
  const html = await readFile(join(outDir, "index.html"), "utf8");
  const rewritten = asWeekUrls(html);
  const golden = {
    about:
      "WC-9's before (SPEC-week-content § 5): the production build of recorded_at, built --on `on` from that commit's own tree " +
      "(test/wc-09-record.mjs, which wrote this file). picks_data is its #picks-data; visible is, per fragment, the SHA-256 of " +
      "the visible page opened at opened_at, with the week's sheet URL rewritten to /week/<file>. Re-record only by running " +
      "the recorder; never by hand." +
      (VISIBLE_AT
        ? " Since SPEC-meal-selection § 12 (--visible-at): visible is instead the page production's Worker serves from " +
          "visible_at's own tree with that week's content in its bucket, opened at opened_at; everything else is recorded_at's."
        : ""),
    recorded_at: short(COMMIT),
    ...(VISIBLE_AT ? { visible_at: short(VISIBLE_AT) } : {}),
    on: ON,
    week: WEEK_1018,
    opened_at: new Date(REGRESSION_NOW).toISOString(),
    page_sha256: sha256(html),
    sheet: { file: SHEET_1018, sha256: sha256(await readFile(join(pkg, "src", "assets", "photo-sheets", SHEET_1018))) },
    visible: VISIBLE_AT
      ? await servedVisible(VISIBLE_AT)
      : Object.fromEntries(REGRESSION_HASHES.map((hash) => [hash, sha256(visible(rewritten, { hash, now: REGRESSION_NOW }))])),
    picks_data: JSON.parse(picksText(html)),
  };
  process.stdout.write(JSON.stringify(golden, null, 2) + "\n");
} finally {
  await rm(tmp, { recursive: true, force: true });
}
