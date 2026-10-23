// MS-20 (SPEC-meal-selection.md § 13 item 3): the committed weeks in data/picks/ build byte for byte as before (their
// snack lists are one a day, which § 13's check still accepts). `npm run content` (scripts/week-content.mjs, run in the
// package as npm runs it) at THIS tree writes, for every week of data/picks/, production's and `--env dev`, exactly what
// it writes at BASE's own tree (the tree before § 13's code: section 11 built, this section's contract merged), its
// files, its report and its message; BASE's package extracted by `git archive` into a temporary directory (read only),
// this package's node_modules linked in, W4's way. (No build embeds a week, SPEC-week-content § 7: the content is where
// a week's snack lists are read.)
// ⚠ AMENDED for SPEC-week-content § 9 item 1 (2026-10-23): "every week" is every week the two trees were GIVEN ALIKE,
// those whose data/picks/ file here is byte-identical to the same path at BASE. A week committed since (no file there)
// or changed since has no *before*: it is outside the claim, and the control names each one so, with why. The weeks and
// the comparison are test/ms-checks.mjs's, which MS-10's mirror mutant runs too.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { baseTree, contentProblems, MS20_BASE as BASE, MS20_TARGETS as TARGETS, weeksAlike, weeksAlikeLine } from "./ms-checks.mjs";

const scratch = await realpath(await mkdtemp(join(tmpdir(), "boston-ms-20-")));
const basePackage = await baseTree(BASE, scratch);
test.after(() => rm(scratch, { recursive: true, force: true }));
const alike = await weeksAlike(ROOT, basePackage);
const WEEKS = alike.compared;

test("MS-20 (control): data/picks/ holds the committed weeks, and a week of them carries snack lists", async (t) => {
  t.diagnostic(weeksAlikeLine(alike));
  assert.ok(WEEKS.length >= 3, `the committed weeks: ${weeksAlikeLine(alike)}`);
  const withSnacks = [];
  for (const week of WEEKS) {
    const json = JSON.parse(await readFile(join(ROOT, "data", "picks", `${week}.json`), "utf8"));
    if (Object.keys(json.lists?.["chefs-choice"]?.snacks ?? {}).length) withSnacks.push(week);
  }
  assert.ok(withSnacks.length > 0, `a committed week with snack lists, of those compared: ${WEEKS}`);
});

for (const week of WEEKS) {
  for (const args of TARGETS) {
    const target = args.length ? "dev" : "prod";
    test(`MS-20 (${week}, ${target}): npm run content byte-identical to ${BASE}'s`, async () => {
      assert.deepEqual(await contentProblems(ROOT, basePackage, week, args, scratch), []);
    });
  }
}
