// W4 (SPEC-why-fit-af.md § 2 item 5, § 3): the week's content is not moved by the button. `npm run content` (its
// script, scripts/week-content.mjs, run in the package as npm runs it) at THIS tree writes, byte for byte, what it writes
// at 6e0f6bd's own tree (the first push, the contract's base), for the weeks delivered 2026-10-25 and 2026-11-01,
// production's and `--env dev`. 6e0f6bd's package is extracted by `git archive` into a temporary directory (read only;
// suite-in-mirror.mjs's mirror reaches the objects through GIT_ALTERNATE_OBJECT_DIRECTORIES), this package's
// node_modules linked in, and its own command run there. A week that tree refuses (no picks file) must be refused here
// the same way: the same exit code, the same message once each tree's own paths are named alike, nothing written.
// ⚠ Pinned to 6e0f6bd's inputs: a week's picks file committed later (2026-11-01's, at the store's switch) changes what
// this tree makes for that week by design and turns its half of W4 red; it is then retired, as the contract's
// comparison was a release check of this change.
// ⚠ AMENDED for SPEC-every-menu-and-nutrition § 11 item 1 (2026-10-22): the heading, a phrase the content fills, is the
// menu's name alone, so the base's week/picks-data.json is compared as § 11 makes it, each cart's heading's " (<range>)"
// removed (cc-harness rangeless: every other byte the base's), and the report's line for it names those bytes.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { ROOT } from "../build.mjs";
import { rangeless, reportWith } from "./cc-harness.mjs";

const BASE = "6e0f6bd";
const DATA_FILE = "week/picks-data.json";
const WEEKS = ["2026-10-25", "2026-11-01"];
const TARGETS = [[], ["--env", "dev"]];

function run(cmd, args, { cwd, input } = {}) {
  const r = spawnSync(cmd, args, { cwd, input, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status}: ${r.stderr}`);
  return r.stdout;
}

/** Every file under `dir`, by its path relative to `dir`, as bytes; {} when `dir` does not exist. */
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

/** The content command of the package at `pkg`, run in it for `week` (and `args`): its exit, its files, and its
 *  stdout and stderr with the package's and the output's own paths named alike. */
async function contentAt(pkg, week, args, scratch) {
  const out = join(await mkdtemp(join(scratch, "out-")), "out");
  const r = spawnSync(process.execPath, [join(pkg, "scripts", "week-content.mjs"), "--week", week, "--out", out, ...args], { cwd: pkg, maxBuffer: 256 * 1024 * 1024 });
  const named = (text) => text.toString("utf8").replaceAll(out, "<out>").replaceAll(pkg, "<package>");
  return { status: r.status, files: await filesUnder(out), stdout: named(r.stdout), stderr: named(r.stderr) };
}

// The real path: a script runs as a program only when its own URL is its argv[1] (the content command's last lines), and
// the system's temporary directory may be reached through a link (macOS: /var -> /private/var).
const scratch = await realpath(await mkdtemp(join(tmpdir(), "boston-w4-")));
const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
const prefix = relative(top, ROOT);
const basePackage = join(scratch, "base", prefix);
await mkdir(join(scratch, "base"), { recursive: true });
run("tar", ["-x", "-C", join(scratch, "base")], { input: run("git", ["-C", top, "archive", "--format=tar", BASE, prefix]) });
await symlink(join(ROOT, "node_modules"), join(basePackage, "node_modules"));
test.after(() => rm(scratch, { recursive: true, force: true }));

test(`W4 (control): ${BASE}'s package was extracted, its content command present`, () => {
  assert.ok(existsSync(join(basePackage, "scripts", "week-content.mjs")), "the base tree's content command");
  assert.ok(existsSync(join(basePackage, "data", "picks", `${WEEKS[0]}.json`)), `the base tree holds ${WEEKS[0]}'s picks file`);
});

for (const week of WEEKS) {
  for (const args of TARGETS) {
    const target = args.length ? "dev" : "prod";
    test(`W4 (${week}, ${target}): npm run content byte-identical to ${BASE}'s`, async () => {
      const before = await contentAt(basePackage, week, args, scratch);
      const after = await contentAt(ROOT, week, args, scratch);
      if (before.files[DATA_FILE]) {
        const read = rangeless(before.files[DATA_FILE], week);
        assert.ok(read.headings > 0, `control: ${BASE}'s headings name the week's range`);
        before.files[DATA_FILE] = read.bytes;
        before.stdout = reportWith(before.stdout, DATA_FILE, read.bytes);
      }
      assert.equal(after.status, before.status, `the exit code (${BASE}: ${before.status}; ${before.stderr.trim()})`);
      assert.deepEqual(Object.keys(after.files), Object.keys(before.files), "the same files");
      for (const [path, bytes] of Object.entries(before.files)) assert.ok(after.files[path].equals(bytes), `${path} byte for byte`);
      assert.equal(after.stdout, before.stdout, "the same report (each file's path, size and SHA-256)");
      assert.equal(after.stderr, before.stderr, "the same message");
      if (before.status === 0) assert.ok(Object.keys(before.files).length >= 2, `control: ${BASE} wrote the week's data and its sheet`);
      else assert.deepEqual(Object.keys(before.files), [], `control: ${BASE} refused the week and wrote nothing`);
    });
  }
}
