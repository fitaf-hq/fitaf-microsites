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
import { withoutSnackCells } from "./snack-cells.mjs";

const at = process.argv.indexOf("--commit");
const COMMIT = at === -1 ? "d1dac5b" : process.argv[at + 1];
// `--release-a` (SPEC-ui-and-copy-pass § 2.1, 2026-10-25): build as the case has since SPEC-save-offer-production § 12
// (release (b) committed `production` true; the case compares the builds as release (a) made them, the rollback):
// cc-harness productionFalseSavePath() as the build's data/save.json and withReleaseAWording over each page. Without it
// the commit's own data/save.json, as before.
const RELEASE_A = process.argv.includes("--release-a");
// `--without-snack-cells` (SPEC-analytics.md § 13, the first record of a tree after the hand-off's merge into the release
// line, c31603d): read the week's content and the page as U4 has read them since that merge (SPEC-rung2-progress-and-
// checkout § 31.2 item 1), each link's snack cells removed (test/snack-cells.mjs withoutSnackCells, a week's .json files and
// the page, which its visible pages are read from), so the record holds what U4 compares. Without it, as before.
const WITHOUT_SNACK_CELLS = process.argv.includes("--without-snack-cells");

function run(cmd, args, input) {
  const r = spawnSync(cmd, args, { input, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status}: ${r.stderr}`);
  return r.stdout;
}

const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
const prefix = relative(top, ROOT);
/** The golden's `built_as`: how the record was read, by the flags given. */
function builtAs() {
  const ways = [];
  if (RELEASE_A) ways.push("release (a): production false, its wording (--release-a)");
  if (WITHOUT_SNACK_CELLS) ways.push("each link's snack cells removed, as U4 reads them (--without-snack-cells)");
  return ways.join("; ");
}

/** normalWeekRecord's options for the flags given: none, the case's before § 12; with both, exactly U4's own. */
async function recordOptions() {
  const cut = (text) => (WITHOUT_SNACK_CELLS ? withoutSnackCells(text).text : text);
  const options = RELEASE_A ? { savePath: await productionFalseSavePath(), transform: (html) => cut(withReleaseAWording(html)) } : { transform: cut };
  if (WITHOUT_SNACK_CELLS) options.content = (bytes, key) => (key.endsWith(".json") ? Buffer.from(cut(bytes.toString("utf8")), "utf8") : bytes);
  return options;
}

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
    ...(RELEASE_A || WITHOUT_SNACK_CELLS ? { built_as: builtAs() } : {}),
    record: await normalWeekRecord(pkg, await recordOptions()),
  };
  process.stdout.write(JSON.stringify(golden, null, 2) + "\n");
} finally {
  await rm(tmp, { recursive: true, force: true });
}
