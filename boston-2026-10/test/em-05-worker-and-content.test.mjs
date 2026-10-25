// EM5 (SPEC-every-menu-and-nutrition.md § 5, § 6): the Worker and the content. A week carrying § 1's additions (the
// fixture: two lists and `meals`, with the fixture's words) is made by the content command and injected by the Workers as
// any week is (WC-1's rule: the asset with #picks-data's text replaced by the object's JSON, escaped as at build, every
// other byte the asset's): production's (src/worker/site.js) and the development Worker (src/worker/index.js), under a
// fake ASSETS and a fake WEEK; their shape check passes it, and the page so served offers both menus. And `npm run
// content` for a week without the additions (2026-10-25), production and `--env dev`, is byte for byte the base's
// (76ee36e, this contract's own commit, extracted by `git archive`; W4's way), its report and its message too.
// ⚠ AMENDED for § 11 item 1 (2026-10-22): the heading, a phrase the content fills, is the menu's name alone, so the
// base's week/picks-data.json is compared as § 11 makes it, each heading's " (<range>)" removed (cc-harness rangeless:
// every other byte the base's), and the report's line for it names those bytes.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { ROOT } from "../build.mjs";
import { isWeek } from "../src/worker/site.js";
import { weekContent } from "../scripts/week-content.mjs";
import { scriptJsonRef } from "./wc-checks.mjs";
import { noWeekPage, pageAsset, startSite, WEEK_DATA_KEY, withPicksText } from "./wc-harness.mjs";
import { chooserOf, FIXTURE_LIST, fixtureWords, messagesFile, MENUS_DIR, MENUS_WEEK, openMenus } from "./em-harness.mjs";
import { rangeless, reportWith } from "./cc-harness.mjs";
import { runWithoutFamilyLinks } from "./uf-harness.mjs";

const BASE = "76ee36e";
const WEEK = "2026-10-25";

/** The fixture week's content (production's or the development Worker's), made with the fixture's words. */
async function fixtureContent(target = "prod") {
  const words = await messagesFile(fixtureWords());
  try {
    const { files } = await weekContent({ week: MENUS_WEEK, picksDir: MENUS_DIR, messagesPath: words.path, target });
    return Buffer.from(files.find((f) => f.key === WEEK_DATA_KEY).bytes).toString("utf8");
  } finally {
    await words.done();
  }
}

test("EM5a: the shape check passes a week carrying the additions", async () => {
  const data = JSON.parse(await fixtureContent());
  assert.equal(data.weeks.length, 1, "one week");
  assert.ok(isWeek(data), "src/worker/site.js isWeek");
});

for (const [entry, target, path] of [["site", "prod", "/"], ["index", "dev", "/"]]) {
  test(`EM5b: ${entry === "site" ? "production's" : "the development"} Worker injects a week carrying the additions as any week (WC-1's rule)`, async () => {
    const text = await fixtureContent(target);
    const asset = await noWeekPage({ target }); // the build: the menus' names are content, never in the page
    const site = await startSite({ entry, assets: { [path]: pageAsset(asset) }, objects: { [WEEK_DATA_KEY]: text } });
    try {
      const res = await site.get(path);
      assert.equal(res.status, 200);
      assert.notEqual(res.text, asset, "the week was put in");
      assert.equal(res.text, withPicksText(asset, scriptJsonRef(JSON.parse(text))), "the asset with #picks-data replaced, escaped as at build");
      const chooser = chooserOf(openMenus(res.text, "#lean-or-7d"));
      assert.ok(chooser.shown, "the served page shows the chooser");
      assert.deepEqual(chooser.values, ["chefs-choice", FIXTURE_LIST], "both menus, in the words' order");
    } finally {
      await site.dispose();
    }
  });
}

// W4's way: the base's package extracted read only, this package's node_modules linked in, each command run in its own.
function run(cmd, args, { cwd, input } = {}) {
  const r = spawnSync(cmd, args, { cwd, input, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status}: ${r.stderr}`);
  return r.stdout;
}
async function filesUnder(dir, top = dir) {
  if (!existsSync(dir)) return {};
  const files = {};
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(files, await filesUnder(path, top));
    else files[relative(top, path)] = await readFile(path);
  }
  return files;
}
async function contentAt(pkg, args, scratch) {
  const out = join(await mkdtemp(join(scratch, "out-")), "out");
  const r = spawnSync(process.execPath, [join(pkg, "scripts", "week-content.mjs"), "--week", WEEK, "--out", out, ...args], { cwd: pkg, maxBuffer: 256 * 1024 * 1024 });
  const named = (text) => text.toString("utf8").replaceAll(out, "<out>").replaceAll(pkg, "<package>");
  return { status: r.status, files: await filesUnder(out), stdout: named(r.stdout), stderr: named(r.stderr) };
}

const scratch = await realpath(await mkdtemp(join(tmpdir(), "boston-em-05-")));
const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
const prefix = relative(top, ROOT);
const basePackage = join(scratch, "base", prefix);
await mkdir(join(scratch, "base"), { recursive: true });
run("tar", ["-x", "-C", join(scratch, "base")], { input: run("git", ["-C", top, "archive", "--format=tar", BASE, prefix]) });
await symlink(join(ROOT, "node_modules"), join(basePackage, "node_modules"));
test.after(() => rm(scratch, { recursive: true, force: true }));

for (const args of [[], ["--env", "dev"]]) {
  test(`EM5c (${WEEK}, ${args.length ? "dev" : "prod"}): npm run content byte-identical to ${BASE}'s, a week without the additions`, async () => {
    const before = await contentAt(basePackage, args, scratch);
    // ⚠ AMENDED by SPEC-ui-and-copy-pass § 2.2 (2026-10-25): Family's links taken out (uf-harness), every other byte as before.
    const after = runWithoutFamilyLinks(await contentAt(ROOT, args, scratch), WEEK_DATA_KEY);
    assert.equal(before.status, 0, `control: ${BASE} makes the week (${before.stderr.trim()})`);
    const read = rangeless(before.files[WEEK_DATA_KEY], WEEK);
    assert.ok(read.headings > 0, `control: ${BASE}'s headings name the week's range`);
    before.files[WEEK_DATA_KEY] = read.bytes;
    before.stdout = reportWith(before.stdout, WEEK_DATA_KEY, read.bytes);
    assert.ok(Object.keys(before.files).length >= 2, `control: ${BASE} wrote the week's data and its sheet`);
    assert.equal(after.status, before.status, `the exit code (${after.stderr.trim()})`);
    assert.deepEqual(Object.keys(after.files), Object.keys(before.files), "the same files");
    for (const [path, bytes] of Object.entries(before.files)) assert.ok(after.files[path].equals(bytes), `${path} byte for byte`);
    assert.equal(after.stdout, before.stdout, "the same report (each file's path, size and SHA-256)");
    assert.equal(after.stderr, before.stderr, "the same message");
  });
}
