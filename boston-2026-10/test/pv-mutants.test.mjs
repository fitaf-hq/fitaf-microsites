// SPEC-preview-sites.md § 4's mutants, each red on its own case. Each is a change to a MIRROR of the package
// (pv-harness pvMirror(): build.mjs, package.json, data/, scripts/, src/ copied to a temporary directory, nested as the
// package sits in the repository, this package's node_modules linked; never the tree: protocols/mutate-in-a-mirror),
// checked by THE SAME function its case runs on this package (test/pv-checks.mjs). The unchanged mirror runs first as
// the control and passes both.
//
//   a store link left in the preview page               (build.mjs: the preview page built with the order links)   fails PV1
//   the refusal of preview: true removed from the live   (scripts/chefs-choice.mjs: the refusal outside a preview
//     content command                                      read removed)                                           fails PV3
//
// Each mutant's problems are written to the run's output (t.diagnostic): the red, as the check reports it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { linkProblems, liveRefusalProblems } from "./pv-checks.mjs";
import { pvMirror } from "./pv-harness.mjs";

/** Replace `from` (present exactly once) with `to` in the mirror's file `rel`. */
async function edit(dir, rel, from, to) {
  const path = join(dir, rel);
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${rel} once: ${from.slice(0, 80)}`);
  await writeFile(path, text.replace(from, () => to));
}

/** A mirror changed by `change(pkg)`, and `fn(pkg)` run over it; removed after. */
async function withMirror(change, fn) {
  const m = await pvMirror(change);
  try {
    return await fn(m.pkg);
  } finally {
    await m.done();
  }
}

test("§ 4 mutants (control): the unchanged mirror passes PV1 and PV3", async () => {
  await withMirror(async () => {}, async (pkg) => {
    assert.deepEqual(await linkProblems(pkg), [], "PV1");
    assert.deepEqual(await liveRefusalProblems(pkg), [], "PV3");
  });
});

test("§ 4 mutant: a store link left in the preview page fails PV1", async (t) => {
  await withMirror(
    (pkg) => edit(pkg, "build.mjs", "{ orderLinks: false }", "{ orderLinks: true }"),
    async (pkg) => {
      const problems = await linkProblems(pkg);
      t.diagnostic(`PV1 on the mutant: ${problems.length} problems; the first: ${JSON.stringify(problems.slice(0, 3))}`);
      assert.ok(problems.some((p) => p.startsWith("the built page holds")), `PV1 fails it on the store URL:\n${problems.join("\n")}`);
      assert.ok(problems.some((p) => / leads somewhere \(https:\/\/fitafnutrition\.com\//.test(p)), `PV1 fails it on a link:\n${problems.join("\n")}`);
    },
  );
});

test("§ 4 mutant: the refusal of preview: true removed from the live content command fails PV3", async (t) => {
  await withMirror(
    (pkg) => edit(pkg, join("scripts", "chefs-choice.mjs"), "if (isPreview && !preview) throw", "if (false) throw"),
    async (pkg) => {
      const problems = await liveRefusalProblems(pkg);
      t.diagnostic(`PV3 on the mutant: ${JSON.stringify(problems)}`);
      for (const label of ["checkPicks, no preview read", "the live content (prod) of the preview file", "the live content (dev) of the preview file"]) {
        assert.ok(problems.includes(`${label}: accepted`), `PV3 fails it on "${label}":\n${problems.join("\n")}`);
      }
      assert.ok(problems.some((p) => p.startsWith("the live content program (prod) of the preview file: exit 0")), `PV3 fails it on the program:\n${problems.join("\n")}`);
    },
  );
});
