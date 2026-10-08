// The site's whole suite (`node --test "test/*.test.mjs"`, as `npm test` runs it) in a MIRROR of this repository whose
// data/plans.json is changed: never the tree (mutate in a mirror). Not a test file itself.
//
//   node test/suite-in-mirror.mjs [--set <path>=<JSON value>]...        e.g. --set snacks.shown=false
//
// The mirror: every file of the working tree that git tracks or would track (not the ignored ones), copied to a
// temporary directory, with the package's node_modules directories linked back; each --set applied to the mirror's
// data/plans.json (a dotted path that must already exist, its value parsed as JSON; only the line holding its top-level
// value is rewritten, every other byte kept, since MS-10's mutants find their anchors by text). The mirror is then made a
// repository of ONE commit holding the files the tree tracks (no history, no remote: not a clone), so the cases that ask
// git (P1, P3-7, the Footer block's version line) read a clean checkout; the cases that read an OLDER commit's file
// (R2-71, R2-74, R2-77: `git show <commit>:…`) reach it through GIT_ALTERNATE_OBJECT_DIRECTORIES, this repository's own
// object store, read only. The mirror is removed after; the exit code is the suite's.
//
// With no --set it is the CONTROL (the data as committed): it must give what `npm test` gives. `--set snacks.shown=true`
// (the committed value: 0 lines changed) is the control for the edit itself.
// SPEC-meal-selection § 11: with `--set snacks.shown=false` the cases that assert about snacks hold (each builds from its
// own data: ms-harness SNACKS_SHOWN / withSnacks), and S20 and CC-4 (prod) fail: they pin the production page's bytes,
// which a real flip changes and re-records in its own commit (test/s20-production-golden.json).
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = "usage: node test/suite-in-mirror.mjs [--set <path>=<JSON value>]...";

const parsed = (text) => {
  try {
    return JSON.stringify(JSON.parse(text));
  } catch {
    return null;
  }
};
const git = (cwd, args, input) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", input });
const nulList = (text) => text.split("\0").filter(Boolean);

/** The --set pairs: [["snacks", "shown"], false]. */
function parseSets(argv) {
  const sets = [];
  for (let i = 0; i < argv.length; i++) {
    const [flag, arg] = [argv[i], argv[i + 1]];
    const eq = arg?.indexOf("=") ?? -1;
    if (flag !== "--set" || eq < 1) throw new Error(USAGE);
    sets.push([arg.slice(0, eq).split("."), JSON.parse(arg.slice(eq + 1))]);
    i++;
  }
  return sets;
}

/** A value in data/plans.json's one-line style: `{ "shown": true, "carted": false }`. */
const inline = (v) =>
  Array.isArray(v)
    ? `[${v.map(inline).join(", ")}]`
    : v && typeof v === "object"
      ? `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(", ")} }`
      : JSON.stringify(v);

/**
 * Each --set applied to the mirror's data/plans.json; a path not already in the file is refused. Only the line holding
 * the top-level value is rewritten (in the file's own style), so every other byte stays: MS-10's mutants find their
 * anchors by text. A top-level value that spans lines is refused. Returns the lines changed.
 */
async function applySets(path, sets) {
  let text = await readFile(path, "utf8");
  const plans = JSON.parse(text);
  for (const [keys, value] of sets) {
    const parent = keys.slice(0, -1).reduce((node, k) => node?.[k], plans);
    const last = keys.at(-1);
    if (parent === null || typeof parent !== "object" || !(last in parent)) throw new Error(`data/plans.json has no ${keys.join(".")}`);
    parent[last] = value;
    const top = keys[0];
    const line = new RegExp(`^(\\s*${JSON.stringify(top)}: )(.*?)(,?)$`, "gm");
    const found = [...text.matchAll(line)].filter((m) => parsed(m[2]) === JSON.stringify(JSON.parse(text)[top]));
    if (found.length !== 1) throw new Error(`data/plans.json's ${top} is not one line of the file: this runner edits one-line values`);
    text = text.replace(found[0][0], `${found[0][1]}${inline(plans[top])}${found[0][3]}`);
  }
  if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(plans)) throw new Error("data/plans.json: the edit did not give the data asked for");
  const before = (await readFile(path, "utf8")).split("\n");
  await writeFile(path, text);
  return text.split("\n").filter((l, i) => l !== before[i]).length;
}

/** The package's node_modules directories (its own and each tool's), linked into the mirror at the same places. */
async function linkModules(mirrorPackage) {
  const tools = (await readdir(join(PACKAGE, "tools"), { withFileTypes: true })).filter((d) => d.isDirectory());
  for (const dir of ["", ...tools.map((d) => join("tools", d.name))]) {
    const from = join(PACKAGE, dir, "node_modules");
    if (existsSync(from)) await symlink(from, join(mirrorPackage, dir, "node_modules"));
  }
}

/** The mirror, in `mirror`: the working tree's files, then one commit of the ones the tree tracks. The package's path in
 *  it, and the lines of data/plans.json the --set changed. */
async function makeMirror(mirror, top, sets) {
  const tracked = nulList(git(top, ["ls-files", "-z"]));
  const untracked = nulList(git(top, ["ls-files", "-z", "--others", "--exclude-standard"]));
  for (const file of [...tracked, ...untracked].filter((f) => existsSync(join(top, f)))) {
    await mkdir(dirname(join(mirror, file)), { recursive: true });
    await copyFile(join(top, file), join(mirror, file));
  }
  const mirrorPackage = join(mirror, relative(top, PACKAGE));
  await linkModules(mirrorPackage);
  const changed = sets.length ? await applySets(join(mirrorPackage, "data", "plans.json"), sets) : 0;
  git(mirror, ["init", "-q"]);
  const present = tracked.filter((f) => existsSync(join(top, f)));
  git(mirror, ["add", "--pathspec-from-file=-", "--pathspec-file-nul"], present.join("\0"));
  git(mirror, ["-c", "user.name=mirror", "-c", "user.email=mirror@invalid", "-c", "commit.gpgsign=false", "commit", "-q", "--no-verify", "-m", "mirror"]);
  return { mirrorPackage, changed };
}

const sets = parseSets(process.argv.slice(2));
const top = git(PACKAGE, ["rev-parse", "--show-toplevel"]).trim();
const objects = join(git(PACKAGE, ["rev-parse", "--path-format=absolute", "--git-common-dir"]).trim(), "objects");
const mirror = await realpath(await mkdtemp(join(tmpdir(), "boston-suite-mirror-")));
try {
  const { mirrorPackage, changed } = await makeMirror(mirror, top, sets);
  const said = sets.length ? sets.map(([k, v]) => `${k.join(".")}=${JSON.stringify(v)}`).join(", ") : "as committed (the control)";
  console.log(`# suite-in-mirror: ${mirrorPackage}; data/plans.json ${said} (${changed} line(s) changed)`);
  const run = spawnSync(process.execPath, ["--test", "test/*.test.mjs"], {
    cwd: mirrorPackage,
    stdio: "inherit",
    env: { ...process.env, GIT_ALTERNATE_OBJECT_DIRECTORIES: objects },
  });
  process.exitCode = run.status ?? 1;
} finally {
  await rm(mirror, { recursive: true, force: true });
}
