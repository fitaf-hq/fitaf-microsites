// The mutants of SPEC-analytics.md § 15 item 5, each red on its own case. Each is a change to a MIRROR of the package's
// inputs (cc-harness mirror(): build.mjs, package.json, wrangler.jsonc, data/, scripts/, src/ and consent/ copied to a
// temporary directory, this package's node_modules linked; never the tree: protocols/mutate-in-a-mirror.md), checked by
// THE SAME function its case runs on this package (test/ix-checks.mjs). The unchanged mirror runs first as the control
// and passes IX1 and IX4.
//
//   the index written as v               (src/worker/beacon.js: indexes [v], every point of a visitor one index)   fails IX1
//   blob12 left empty                    (src/worker/beacon.js: the data point's fields without v)                fails IX1
//   the DOMContentLoaded read dropped    (src/analytics.js: result() on its timer and hashchange alone)           fails IX4
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mirror } from "./cc-harness.mjs";
import { ENTRIES, indexProblems, loadResultProblems, WHOLE_SET } from "./ix-checks.mjs";

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

const BEACON_JS = join("src", "worker", "beacon.js");
const PAGE_JS = join("src", "analytics.js");

test("IX mutants (control): the unchanged mirror passes IX1 and IX4", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await indexProblems(dir), [], "IX1");
    assert.deepEqual(await loadResultProblems(dir), [], "IX4");
  });
});

test("IX mutant: the index written as v fails IX1", async () => {
  await withMirror(
    (dir) => edit(dir, BEACON_JS, "    indexes: [pointIndex()],\n", "    indexes: [v],\n"),
    async (dir) => {
      const problems = await indexProblems(dir);
      for (const entry of ENTRIES) {
        assert.ok(problems.some((p) => p.startsWith(`${entry}: 7 data points share 1 index(es)`)), `IX1 fails it on ${entry}:\n${problems.join("\n")}`);
      }
    },
  );
});

test("IX mutant: blob12 left empty fails IX1", async () => {
  await withMirror(
    (dir) => edit(dir, BEACON_JS, "  const all = { ...event, country, device, v };\n", "  const all = { ...event, country, device };\n"),
    async (dir) => {
      const problems = await indexProblems(dir);
      for (const entry of ENTRIES) {
        assert.ok(problems.some((p) => p.startsWith(`${entry}: data point 1 (open): blob12 "", not the visit's v`)), `IX1 fails it on ${entry}:\n${problems.join("\n")}`);
      }
    },
  );
});

test("IX mutant: the DOMContentLoaded read dropped fails IX4", async () => {
  await withMirror(
    (dir) => edit(dir, PAGE_JS, '  d.addEventListener("DOMContentLoaded", result);\n', ""),
    async (dir) => {
      const problems = await loadResultProblems(dir);
      for (const target of ["prod", "dev"]) {
        assert.ok(
          problems.some((p) => p.startsWith(`${target}, ${WHOLE_SET}, the timer run between the scripts: sent no result with no tap`)),
          `IX4 fails it on ${target}:\n${problems.join("\n")}`,
        );
      }
    },
  );
});
