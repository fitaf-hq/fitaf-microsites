// MS-20 (SPEC-meal-selection.md § 13 item 3): the committed weeks in data/picks/ build byte for byte as before (their
// snack lists are one a day, which § 13's check still accepts). `npm run content` (scripts/week-content.mjs, run in the
// package as npm runs it) at THIS tree writes, for every week of data/picks/, production's and `--env dev`, exactly what
// it writes at BASE's own tree (the tree before § 13's code: section 11 built, this section's contract merged), its
// files, its report and its message; BASE's package extracted by `git archive` into a temporary directory (read only),
// this package's node_modules linked in, W4's way. (No build embeds a week, SPEC-week-content § 7: the content is where
// a week's snack lists are read.)
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { ROOT } from "../build.mjs";

const BASE = "1c10839";
const WEEKS = (await readdir(join(ROOT, "data", "picks"))).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => f.slice(0, -".json".length)).sort();
const TARGETS = [[], ["--env", "dev"]];

function run(cmd, args, { input } = {}) {
  const r = spawnSync(cmd, args, { input, maxBuffer: 256 * 1024 * 1024 });
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

async function contentAt(pkg, week, args, scratch) {
  const out = join(await mkdtemp(join(scratch, "out-")), "out");
  const r = spawnSync(process.execPath, [join(pkg, "scripts", "week-content.mjs"), "--week", week, "--out", out, ...args], { cwd: pkg, maxBuffer: 256 * 1024 * 1024 });
  const named = (text) => text.toString("utf8").replaceAll(out, "<out>").replaceAll(pkg, "<package>");
  return { status: r.status, files: await filesUnder(out), stdout: named(r.stdout), stderr: named(r.stderr) };
}

const scratch = await realpath(await mkdtemp(join(tmpdir(), "boston-ms-20-")));
const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
const prefix = relative(top, ROOT);
const basePackage = join(scratch, "base", prefix);
await mkdir(join(scratch, "base"), { recursive: true });
run("tar", ["-x", "-C", join(scratch, "base")], { input: run("git", ["-C", top, "archive", "--format=tar", BASE, prefix]) });
await symlink(join(ROOT, "node_modules"), join(basePackage, "node_modules"));
test.after(() => rm(scratch, { recursive: true, force: true }));

test("MS-20 (control): data/picks/ holds the committed weeks, and a week of them carries snack lists", async () => {
  assert.ok(WEEKS.length >= 3, `the committed weeks: ${WEEKS}`);
  const withSnacks = [];
  for (const week of WEEKS) {
    const json = JSON.parse(await readFile(join(ROOT, "data", "picks", `${week}.json`), "utf8"));
    if (Object.keys(json.lists?.["chefs-choice"]?.snacks ?? {}).length) withSnacks.push(week);
  }
  assert.ok(withSnacks.length > 0, "a committed week with snack lists");
});

for (const week of WEEKS) {
  for (const args of TARGETS) {
    const target = args.length ? "dev" : "prod";
    test(`MS-20 (${week}, ${target}): npm run content byte-identical to ${BASE}'s`, async () => {
      const before = await contentAt(basePackage, week, args, scratch);
      const after = await contentAt(ROOT, week, args, scratch);
      assert.equal(after.status, before.status, `the exit code (${BASE}: ${before.status}; ${before.stderr.trim()})`);
      assert.deepEqual(Object.keys(after.files), Object.keys(before.files), "the same files");
      for (const [path, bytes] of Object.entries(before.files)) assert.ok(after.files[path].equals(bytes), `${path} byte for byte`);
      assert.equal(after.stdout, before.stdout, "the same report (each file's path, size and SHA-256)");
      assert.equal(after.stderr, before.stderr, "the same message");
      assert.equal(before.status, 0, `control: ${BASE} makes the week (${before.stderr.trim()})`);
    });
  }
}
