// The mutant of SPEC-ui-and-copy-pass.md § 6 item 4, red on its own case. A change to a MIRROR of the package's inputs
// (cc-harness mirror(): build.mjs, package.json, wrangler.jsonc, data/, scripts/, src/ and consent/ copied to a temporary
// directory, this package's node_modules linked; never the tree: protocols/mutate-in-a-mirror.md), checked by THE SAME
// function SL3 runs on this package (test/sl-checks.mjs). The unchanged mirror runs first as the control and passes SL1
// and SL3.
//
//   the opening on any fragment   (src/save/flow1.js: the dialog opened whatever the fragment)   fails SL3
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mirror } from "./cc-harness.mjs";
import { linkOpensProblems, OTHER_FRAGMENTS, otherFragmentsProblems } from "./sl-checks.mjs";

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

const FLOW1_JS = join("src", "save", "flow1.js");

test("SL mutant (control): the unchanged mirror passes SL1 and SL3", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await linkOpensProblems(dir), [], "SL1");
    assert.deepEqual(await otherFragmentsProblems(dir), [], "SL3");
  });
});

test("SL mutant: the opening on any fragment fails SL3", async () => {
  await withMirror(
    (dir) => edit(dir, FLOW1_JS, '  var OPENED_BY_LINK = location.hash === "#save";\n', "  var OPENED_BY_LINK = true;\n"),
    async (dir) => {
      const problems = await otherFragmentsProblems(dir);
      for (const build of ["development", "production"]) {
        for (const hash of OTHER_FRAGMENTS) {
          const at = `${build}, ${hash || "(no fragment)"}: a dialog opened`;
          assert.ok(problems.some((p) => p.startsWith(at)), `SL3 names ${at}:\n${problems.join("\n")}`);
        }
      }
    },
  );
});
