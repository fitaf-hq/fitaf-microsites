// SPEC-week-content.md § 8 item 5's mutants, each red on its own case. Each is a change to a MIRROR of the package
// (cc-harness mirror(): build.mjs, package.json, data/, scripts/, src/ copied to a temporary directory, this package's
// node_modules linked; never the tree: protocols/mutate-in-a-mirror), checked by THE SAME function its case runs on
// this package (test/u-checks.mjs). The unchanged mirror runs first as the control and passes both.
//
//   `updating` ignored by the page   (chefs-choice.js: the updating branch never taken)          fails U1
//   lists allowed beside `updating`  (chefs-choice.mjs: the refusal of a list removed)           fails U3
//
// Each mutant's problems are written to the run's output (t.diagnostic): the red, as the check reports it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mirror } from "./cc-harness.mjs";
import { updatingPageProblems, updatingRefusalProblems } from "./u-checks.mjs";

/** Replace `from` (present exactly once) with `to` in the mirror's file `rel`. */
async function edit(dir, rel, from, to) {
  const path = join(dir, rel);
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${rel} once: ${from.slice(0, 80)}`);
  await writeFile(path, text.replace(from, () => to));
}

/** A mirror changed by `change(dir)`, and `fn(dir)` run over it; removed after. */
async function withMirror(change, fn) {
  const dir = await mirror(change);
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const SCRIPT = join("src", "chefs-choice", "chefs-choice.js");
const CHECK = join("scripts", "chefs-choice.mjs");

test("§ 8 mutants (control): the unchanged mirror passes U1 and U3", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await updatingPageProblems(dir), [], "U1");
    assert.deepEqual(await updatingRefusalProblems(dir), [], "U3");
  });
});

test("§ 8 mutant: `updating` ignored by the page fails U1 (the card not shown)", async (t) => {
  await withMirror(
    (dir) => edit(dir, SCRIPT, "if (week && week.updating === true) {", "if (false) {"),
    async (dir) => {
      const problems = await updatingPageProblems(dir);
      t.diagnostic(`U1 on the mutant: ${problems.length} problems; the first: ${JSON.stringify(problems.slice(0, 3))}`);
      assert.ok(problems.some((p) => /: the updating card is not shown$/.test(p)), `U1 fails it:\n${problems.join("\n")}`);
    },
  );
});

test("§ 8 mutant: lists allowed beside `updating` fails U3 (an updating file with a list accepted)", async (t) => {
  await withMirror(
    (dir) =>
      edit(
        dir,
        CHECK,
        "  if (names.length) throw new Error(`an updating week carries no list; lists has ${names.map((n) => JSON.stringify(n)).join(\", \")}`);\n",
        "",
      ),
    async (dir) => {
      const problems = await updatingRefusalProblems(dir);
      t.diagnostic(`U3 on the mutant: ${JSON.stringify(problems)}`);
      for (const label of ["an updating file with a list (the v2 fixture's, valid on its own)", "an updating file with an empty list"]) {
        assert.ok(problems.includes(`${label}: accepted`), `U3 fails it on "${label}":\n${problems.join("\n")}`);
      }
    },
  );
});
