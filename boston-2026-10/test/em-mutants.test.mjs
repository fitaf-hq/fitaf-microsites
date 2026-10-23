// SPEC-every-menu-and-nutrition.md § 6's mutant of the file, red on its own case. A change to a MIRROR of the package
// (cc-harness mirror(): build.mjs, package.json, data/, scripts/, src/ copied to a temporary directory, this package's
// node_modules linked; never the tree: protocols/mutate-in-a-mirror), checked by THE SAME function EM1 runs on this
// package (test/em-checks.mjs). The unchanged mirror runs first as the control and passes.
//
//   a list without words accepted   (chefs-choice.mjs: the refusal of a list `menus` does not name, removed)   fails EM1
//
// The chooser's and the line's mutants are Chrome's, beside EM2 and EM3 (tools/storybook/test/em-chrome.test.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mirror } from "./cc-harness.mjs";
import { acceptanceProblems, REFUSALS, refusalProblems } from "./em-checks.mjs";

const CHECK = join("scripts", "chefs-choice.mjs");
const LIST_CASE = REFUSALS[0][0];
const ANCHOR = "if (!ctx.names.includes(name)) throw";

/** Replace `from` (present exactly once) with `to` in the mirror's file `rel`. */
async function edit(dir, rel, from, to) {
  const path = join(dir, rel);
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${rel} once: ${from}`);
  await writeFile(path, text.replace(from, () => to));
}

async function withMirror(change, fn) {
  const dir = await mirror(change);
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("EM1's mutant (control): the unchanged mirror refuses a list without words, and makes the fixture's content", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await refusalProblems(dir, [LIST_CASE]), [], "EM1's list case");
    assert.deepEqual(await acceptanceProblems(dir), [], "EM1's acceptance");
  });
});

test("EM1's mutant: a list without words accepted fails EM1", async (t) => {
  await withMirror(
    (dir) => edit(dir, CHECK, ANCHOR, "if (false) throw"),
    async (dir) => {
      const problems = await refusalProblems(dir, [LIST_CASE]);
      t.diagnostic(`EM1 on the mutant: ${JSON.stringify(problems)}`);
      assert.ok(problems.includes(`${LIST_CASE}: accepted`), `EM1 fails it:\n${problems.join("\n")}`);
    },
  );
});
