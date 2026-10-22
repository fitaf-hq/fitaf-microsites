// AJ2 (SPEC-analytics.md § 11 items 1 and 4): the text report is byte-identical to the base's for the same answers, and
// it is a formatting of the --json document. The base is 2ceb05a, § 11's contract commit, whose report is § 5's as built
// (§ 10, § 10.1): its scripts/, src/worker/, data/ and package.json extracted by `git archive` into a temporary directory
// (read only) and its own report run there, in this process, over the same answers (aj-checks.mjs runs(): A11's fixture
// and two answer sets derived from it, production's and --env dev). For each: (1) this tree's text report is the
// base's, byte for byte; (2) this tree's reportText over the document --json printed (read back from its JSON) is the
// base's text too, so the two outputs cannot disagree. Nothing is requested.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { fixtureAnswers, runAt, runs } from "./aj-checks.mjs";

const BASE = "2ceb05a";

function run(cmd, args, { input } = {}) {
  const r = spawnSync(cmd, args, { input, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status}: ${r.stderr}`);
  return r.stdout;
}

const scratch = await realpath(await mkdtemp(join(tmpdir(), "boston-aj2-")));
test.after(() => rm(scratch, { recursive: true, force: true }));
const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
const prefix = relative(top, ROOT);
const paths = ["scripts", join("src", "worker"), "data", "package.json"].map((p) => join(prefix, p));
run("tar", ["-x", "-C", scratch], { input: run("git", ["-C", top, "archive", "--format=tar", BASE, ...paths]) });
const basePackage = join(scratch, prefix);

test(`AJ2: the text report is ${BASE}'s byte for byte, and a formatting of the --json document`, async () => {
  const { reportText } = await import(pathToFileURL(join(ROOT, "scripts", "analytics.mjs")).href);
  for (const [label, answers, args] of runs(await fixtureAnswers())) {
    const base = await runAt(basePackage, args, answers);
    assert.equal(base.code, 0, `${label}: the base's report (control): ${base.err}`);
    const text = await runAt(ROOT, args, answers);
    assert.equal(text.code, 0, `${label}: ${text.err}`);
    assert.equal(text.out, base.out, `${label}: the text report is the base's`);
    const json = await runAt(ROOT, [...args, "--json"], answers);
    assert.equal(json.code, 0, `${label}: --json: ${json.err}`);
    assert.equal(reportText(JSON.parse(json.out)), base.out, `${label}: the text is a formatting of the document`);
  }
});
