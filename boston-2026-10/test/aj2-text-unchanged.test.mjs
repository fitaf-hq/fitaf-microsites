// AJ2 (SPEC-analytics.md § 11 items 1 and 4): the text report is byte-identical to the base's for the same answers, and
// it is a formatting of the --json document. The base is 2ceb05a, § 11's contract commit, whose report is § 5's as built
// (§ 10, § 10.1): its scripts/, src/worker/, data/ and package.json extracted by `git archive` into a temporary directory
// (read only) and its own report run there, in this process, over the same answers (aj-checks.mjs runs(): A11's fixture
// and two answer sets derived from it, production's and --env dev). For each: (1) this tree's text report is the
// base's, byte for byte; (2) this tree's reportText over the document --json printed (read back from its JSON) is the
// base's text too, so the two outputs cannot disagree. Nothing is requested.
// ⚠ THE BASE MOVED with SPEC-analytics.md § 13 item 3 ("AJ2's base text moves with this section. Record it once from the
// new code"), from 2ceb05a to f9273c0, § 13's code commit: the funnel's answer steps in the page's order since round 2,
// and `answer: family`, a branch, printed with no change figure. 2ceb05a's text over the same fixture (which gained who and
// family rows with § 13's cases, 133994b) is this tree's at 133994b, byte for byte, and lists neither question.
// ⚠ AND AGAIN with SPEC-analytics.md § 14 item 3 ("AJ2's base moves with this section, recorded once from the new code"),
// from f9273c0 to 1fb4831, § 14's code commit: each day's "saved an offer N" after the funnel. f9273c0's text over the same
// fixture (which gained a save row a day with § 14's cases, 9cdf963) is this tree's at 9cdf963, byte for byte (AJ2 passed
// there), and prints no saved line.
// ⚠ AND AGAIN with SPEC-analytics.md § 15 item 3 ("AJ2's base moves with this section"), from 1fb4831 to 3f40698, § 15's
// code commit: the visitors query reads either layout (count(DISTINCT if(blob12 = '', index1, blob12))). The text does
// not move for the same answers: 1fb4831's text over the fixture is 3f40698's, byte for byte (AJ2 passed at 3f40698
// against 1fb4831 before this move).
// ⚠ AND AGAIN with SPEC-analytics.md § 16 item 3 ("AJ2's base moves once"), from 3f40698 to 0ef1455, § 16's code commit:
// each day's "visits from the offer email N" and "offer pages opened (a repeat opening counted again): …" after the saved
// line, and the visitors and visits without the offer pages' rows. 3f40698's text over the same fixture (which gained the
// offers and email answers with § 16's cases, 1c8cf8a) is this tree's at 1c8cf8a, byte for byte (AJ2 passed there), and
// prints neither line. That every earlier line is still 3f40698's is EM-A5's, against bc4ea03's report (§ 15's).
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { fixtureAnswers, runAt, runs } from "./aj-checks.mjs";

const BASE = "0ef1455";

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
