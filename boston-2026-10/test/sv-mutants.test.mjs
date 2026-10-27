// The mutants of SPEC-analytics.md § 14 item 4, each red on its own case. Each is a change to a MIRROR of the package's
// inputs (cc-harness mirror(): build.mjs, package.json, wrangler.jsonc, data/, scripts/, src/ and consent/ copied to a
// temporary directory, this package's node_modules linked; never the tree: protocols/mutate-in-a-mirror.md), checked by
// THE SAME function its case runs on this package (test/sv-checks.mjs). The unchanged mirror runs first as the control
// and passes SV1 and SV2.
//
//   flow1.js dispatching on an error too   (src/save/flow1.js: an answer that is not a stored save tells the analytics
//                                           as a stored one does)                                              fails SV2
//   the Worker's FIELDS without save       (src/worker/beacon.js: `save` an event outside the closed list)     fails SV1
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mirror } from "./cc-harness.mjs";
import { storedSaveProblems, TARGETS, unsavedProblems } from "./sv-checks.mjs";

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
const BEACON_JS = join("src", "worker", "beacon.js");

test("SV mutants (control): the unchanged mirror passes SV1 and SV2", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await storedSaveProblems(dir), [], "SV1");
    assert.deepEqual(await unsavedProblems(dir), [], "SV2");
  });
});

test("SV mutant: flow1.js dispatching on an error too fails SV2", async () => {
  await withMirror(
    (dir) =>
      edit(dir, FLOW1_JS, '} else go(withName("ERROR", { error: r.j.error }));', '} else {\n          go(withName("ERROR", { error: r.j.error }));\n          tellSaved();\n        }'),
    async (dir) => {
      const problems = await unsavedProblems(dir);
      for (const target of TARGETS) {
        assert.ok(problems.includes(`${target}, an error (500, store_failed): sent 1 save(s), not none`), `SV2 fails it on ${target}:\n${problems.join("\n")}`);
      }
    },
  );
});

test("SV mutant: the Worker's FIELDS without save fails SV1", async () => {
  await withMirror(
    (dir) => edit(dir, BEACON_JS, "  save: () => ({}),\n", ""),
    async (dir) => {
      const problems = await storedSaveProblems(dir);
      for (const target of TARGETS) {
        assert.ok(problems.includes(`${target}, an offer save stored: refused by the Worker's own check: save`), `SV1 fails it on ${target}:\n${problems.join("\n")}`);
      }
    },
  );
});
