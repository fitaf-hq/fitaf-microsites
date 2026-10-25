// Records U4's "before" (SPEC-week-content.md § 8 item 5: "a normal week byte-identical to before"): u-checks.mjs's
// normalWeekRecord() over a commit's OWN tree. Not a test file: `node test/u-04-record.mjs [--commit d1dac5b] >
// test/u-04-golden.json`. It writes nothing in the repository: the commit's package is extracted by `git archive` into a
// temporary directory (this package's node_modules linked in), and its build and content command are the ones run.
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { ROOT } from "../build.mjs";
import { normalWeekRecord } from "./u-checks.mjs";
import { productionFalseSavePath, withReleaseAWording } from "./cc-harness.mjs";

const at = process.argv.indexOf("--commit");
const COMMIT = at === -1 ? "d1dac5b" : process.argv[at + 1];
// `--release-a` (SPEC-ui-and-copy-pass § 2.1, 2026-10-25): build as the case has since SPEC-save-offer-production § 12
// (release (b) committed `production` true; the case compares the builds as release (a) made them, the rollback):
// cc-harness productionFalseSavePath() as the build's data/save.json and withReleaseAWording over each page. Without it
// the commit's own data/save.json, as before.
const RELEASE_A = process.argv.includes("--release-a");

function run(cmd, args, input) {
  const r = spawnSync(cmd, args, { input, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status}: ${r.stderr}`);
  return r.stdout;
}

const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
const prefix = relative(top, ROOT);
const tmp = await mkdtemp(join(tmpdir(), "boston-u4-record-"));
try {
  run("tar", ["-x", "-C", tmp], run("git", ["-C", top, "archive", "--format=tar", COMMIT, prefix]));
  const pkg = join(tmp, prefix);
  await symlink(join(ROOT, "node_modules"), join(pkg, "node_modules"));
  const golden = {
    about:
      "U4's before (SPEC-week-content § 8 item 5): test/u-checks.mjs normalWeekRecord() over recorded_at's own tree " +
      "(test/u-04-record.mjs, which wrote this file): per normal week and target, the content command's files, the page as " +
      "served with that week once its lines naming `updating` are removed (recorded_at's page has none), and the visible " +
      "page per fragment. Re-record only by running the recorder; never by hand.",
    recorded_at: run("git", ["-C", top, "rev-parse", "--short", COMMIT]).toString("utf8").trim(),
    ...(RELEASE_A ? { built_as: "release (a): production false, its wording (--release-a)" } : {}),
    record: await normalWeekRecord(pkg, RELEASE_A ? { savePath: await productionFalseSavePath(), transform: withReleaseAWording } : {}),
  };
  process.stdout.write(JSON.stringify(golden, null, 2) + "\n");
} finally {
  await rm(tmp, { recursive: true, force: true });
}
