// Records EL1's and EL8's goldens (SPEC-ui-and-copy-pass.md § 8): the sample messages of test/email-fixture.mjs (its
// SAMPLE inputs, as they stand in THIS tree), each part (text and HTML), rendered by a commit's OWN src/worker/messages.js.
// Not a test file:
//   node test/el-record.mjs --commit 6e0d86f --section before   # the tree before § 8's code: E-X and E1 as they were
//   node test/el-record.mjs --commit <code> --section after     # § 8's code: E1 as built
// It rewrites that one section of test/el-golden.json and nothing else; the commit's package is extracted by
// `git archive` into a temporary directory (this package's node_modules linked in), so nothing in the repository is run
// from another tree. An older tree's e1 ignores the inputs it does not know (`photos`). Never edit the golden by hand.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { SAMPLE, sampleMessages } from "./email-fixture.mjs";

export const GOLDEN = join(ROOT, "test", "el-golden.json");
const ABOUT =
  "EL1's and EL8's goldens (SPEC-ui-and-copy-pass.md § 8): every sample message of test/email-fixture.mjs, its text and " +
  "HTML parts, rendered by recorded_at's own src/worker/messages.js from `inputs` (test/el-record.mjs, which wrote each " +
  "section). `before` is the tree before § 8's code and is never re-recorded: E-X must stay byte-identical to it, and every " +
  "line of its E1 is either still in E1 or one § 8 removes or replaces (EL8). `after` is E1 as § 8 built it, re-recorded " +
  "only when E1 is MEANT to change, by running the recorder; never by hand.";

function run(cmd, args) {
  const r = spawnSync(cmd, args, { maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status}: ${r.stderr}`);
  return r.stdout;
}

const flag = (name) => {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
};

const COMMIT = flag("--commit");
const SECTION = flag("--section");
if (!COMMIT || !["before", "after"].includes(SECTION)) {
  console.error("usage: node test/el-record.mjs --commit <sha> --section before|after");
  process.exit(1);
}

const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
const prefix = relative(top, ROOT);
const tmp = await mkdtemp(join(tmpdir(), "boston-el-record-"));
try {
  const tar = run("git", ["-C", top, "archive", "--format=tar", COMMIT, prefix]);
  const untar = spawnSync("tar", ["-x", "-C", tmp], { input: tar, maxBuffer: 256 * 1024 * 1024 });
  if (untar.status !== 0) throw new Error(`tar: exit ${untar.status}: ${untar.stderr}`);
  const pkg = join(tmp, prefix);
  await symlink(join(ROOT, "node_modules"), join(pkg, "node_modules"));
  const { e1, ex } = await import(pathToFileURL(join(pkg, "src", "worker", "messages.js")).href);
  const messages = Object.fromEntries(Object.entries(sampleMessages(SAMPLE, { e1, ex })).map(([name, m]) => [name, { text: m.text, html: m.html }]));
  const golden = existsSync(GOLDEN) ? JSON.parse(await readFile(GOLDEN, "utf8")) : {};
  const recorded = run("git", ["-C", top, "rev-parse", "--short", COMMIT]).toString("utf8").trim();
  const next = { about: ABOUT, before: golden.before ?? null, after: golden.after ?? null };
  next[SECTION] = { recorded_at: recorded, inputs: SAMPLE, messages };
  await writeFile(GOLDEN, JSON.stringify(next, null, 2) + "\n");
  console.log(`wrote ${GOLDEN}: ${SECTION} from ${recorded} (${Object.keys(messages).length} messages)`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
