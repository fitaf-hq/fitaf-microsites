// Records PV5's "before" (SPEC-preview-sites.md § 3, § 4: "the production and development builds byte-identical"): the
// SHA-256 of every file `npm run build` and `npm run build:dev` write, over a commit's OWN tree. Not a test file:
// `node test/pv-05-record.mjs [--commit 8081b46] > test/pv-05-golden.json`. It writes nothing in the repository: the
// commit's package is extracted by `git archive` into a temporary directory (this package's node_modules linked in),
// and its own build() is the one run.
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { ROOT } from "../build.mjs";
import { buildHashes } from "./pv-checks.mjs";

const at = process.argv.indexOf("--commit");
const COMMIT = at === -1 ? "8081b46" : process.argv[at + 1];

function run(cmd, args, input) {
  const r = spawnSync(cmd, args, { input, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status}: ${r.stderr}`);
  return r.stdout;
}

const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
const prefix = relative(top, ROOT);
const tmp = await mkdtemp(join(tmpdir(), "boston-pv5-record-"));
try {
  run("tar", ["-x", "-C", tmp], run("git", ["-C", top, "archive", "--format=tar", COMMIT, prefix]));
  const pkg = join(tmp, prefix);
  await symlink(join(ROOT, "node_modules"), join(pkg, "node_modules"));
  const golden = {
    about:
      "PV5's before (SPEC-preview-sites § 4): the SHA-256 of every file the production and the development build write " +
      "(build() with target prod, then dev, each into an empty directory), over recorded_at's own tree, the contract's " +
      "commit before any of the preview build's code (test/pv-05-record.mjs, which wrote this file). Re-record only by " +
      "running the recorder; never by hand.",
    recorded_at: run("git", ["-C", top, "rev-parse", "--short", COMMIT]).toString("utf8").trim(),
    files: { prod: await buildHashes(pkg, "prod"), dev: await buildHashes(pkg, "dev") },
  };
  process.stdout.write(JSON.stringify(golden, null, 2) + "\n");
} finally {
  await rm(tmp, { recursive: true, force: true });
}
