// The mutants of SPEC-analytics.md § 13 item 5, each red on its own case. Each is a change to a MIRROR of the package's
// inputs (cc-harness mirror(): build.mjs, package.json, wrangler.jsonc, data/, scripts/, src/ and consent/ copied to a
// temporary directory, this package's node_modules linked; never the tree: protocols/mutate-in-a-mirror.md), checked by
// THE SAME function its case runs on this package (test/af-checks.mjs). The unchanged mirror runs first as the control
// and passes F1 and F2.
//
//   the page's selector without [data-who]   (analytics.js: a press of a data-who button reaches no reading)   fails F2
//   RESULT_MPIDS without Family's             (beacon.js: a result's mpids the individual plans' alone)         fails F2
//   A3's reading without data-family          (a-harness.mjs: CHOICE_READINGS loses data-family, so Family's
//                                              buttons go unread)                                                fails F1,
//                                                                                                                naming them
//
// The third mutates the CASE's reading, not the package's code, so its mirror also holds a copy of test/, and the check
// run is the mirror's own af-checks.mjs (over the mirror, its ROOT), which imports the mirror's mutated a-harness.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { cp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { everyQuestionProblems, familyVisitProblems, TARGETS } from "./af-checks.mjs";
import { mirror } from "./cc-harness.mjs";

/** Replace `from` (present exactly once) with `to` in the mirror's file `rel`. */
async function edit(dir, rel, from, to) {
  const path = join(dir, rel);
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${rel} once: ${from.slice(0, 80)}`);
  await writeFile(path, text.replace(from, () => to));
}

/** A mirror changed by `change(dir)`, with a copy of this package's test/ when `tests`, and `fn(dir)` run over it;
 *  removed after. */
async function withMirror(change, fn, { tests = false } = {}) {
  const dir = await mirror(async (d) => {
    if (tests) await cp(join(ROOT, "test"), join(d, "test"), { recursive: true });
    await change(d);
  });
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** The mirror's own af-checks.mjs (its a-harness.mjs and its build), for the mutant of the case's reading. */
const mirroredChecks = (dir) => import(pathToFileURL(join(dir, "test", "af-checks.mjs")).href);

const PAGE_JS = join("src", "analytics.js");
const BEACON_JS = join("src", "worker", "beacon.js");
const HARNESS = join("test", "a-harness.mjs");

test("F mutants (control): the unchanged mirror passes F1 and F2, and so does its own copy of the case's reading", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await everyQuestionProblems(dir), [], "F1");
    assert.deepEqual(await familyVisitProblems(dir), [], "F2");
    assert.deepEqual(await (await mirroredChecks(dir)).everyQuestionProblems(), [], "F1, the mirror's own reading");
  }, { tests: true });
});

test("F mutant: the page's selector without [data-who] fails F2", async () => {
  await withMirror(
    (dir) => edit(dir, PAGE_JS, '"[data-goal],[data-q],[data-who],[data-family],[href],#all-link"', '"[data-goal],[data-q],[data-family],[href],#all-link"'),
    async (dir) => {
      const problems = await familyVisitProblems(dir);
      assert.ok(problems.some((p) => /: sent open · answer family or · /.test(p)), `F2 fails it, the who answer unsent:\n${problems.join("\n")}`);
    },
  );
});

test("F mutant: RESULT_MPIDS without Family's fails F2", async () => {
  await withMirror(
    (dir) => edit(dir, BEACON_JS, "export const RESULT_MPIDS = [...INDIVIDUAL_MPIDS, ...FAMILY_MPIDS];", "export const RESULT_MPIDS = INDIVIDUAL_MPIDS;"),
    async (dir) => {
      const problems = await familyVisitProblems(dir);
      assert.ok(problems.includes("a Family visit, or: refused by the Worker's own check: result or-5d 35"), `F2 fails it:\n${problems.join("\n")}`);
    },
  );
});

test("F mutant: A3's reading without data-family fails F1, naming the Family buttons", async () => {
  await withMirror(
    (dir) => edit(dir, HARNESS, '  { attributes: ["data-family"], question: () => "family", answer: (b) => b.getAttribute("data-family") },\n', ""),
    async (dir) => {
      const problems = await (await mirroredChecks(dir)).everyQuestionProblems();
      for (const target of TARGETS) {
        for (const ld of ["or", "and"]) {
          assert.ok(
            problems.some((p) => p.startsWith(`${target}: a button.choice the page's script does not read`) && p.includes(`data-family="${ld}"`)),
            `F1 names the Family button ${ld} on ${target}:\n${problems.join("\n")}`,
          );
        }
      }
    },
    { tests: true },
  );
});
