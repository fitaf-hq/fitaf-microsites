// The mutant of SPEC-ui-and-copy-pass.md § 7 item 6, red on its own case. A change to a MIRROR of the package's inputs
// (cc-harness mirror(): build.mjs, package.json, wrangler.jsonc, data/, scripts/, src/ and consent/ copied to a temporary
// directory, this package's node_modules linked; never the tree: protocols/mutate-in-a-mirror.md), checked by THE SAME
// function RP1 runs on this package (test/rp-checks.mjs). The unchanged mirror runs first as the control and passes RP1.
//
//   the struck figure from the price a meal × the plan's count, not the meals the result lists   (build.mjs)   fails RP1
//
// It is wrong for an answer set above its plan's count alone (5 meals on the 4 plan, 15 on the 14), so RP1 must name
// those, on both pages, and nothing else.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mirror } from "./cc-harness.mjs";
import { RESULTS, rp1Problems } from "./rp-checks.mjs";

/** The build's one line giving a result's total for its struck figure (a size's: the meals the answer set comes to at its
 *  plan's price a meal), and that line with the plan's count instead (the mutant's). */
const STRUCK_TOTAL = "total_cents: cellFor(plan, r.plan).price_per_meal_cents * r.meals";
const ON_PLAN_COUNT = "total_cents: cellFor(plan, r.plan).price_per_meal_cents * r.plan";

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

test("RP mutant (control): the unchanged mirror passes RP1", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await rp1Problems(dir), [], "RP1");
  });
});

test("RP mutant: the struck figure from the price a meal × the plan's count fails RP1, above the plan's count alone", async () => {
  await withMirror(
    (dir) => edit(dir, "build.mjs", STRUCK_TOTAL, ON_PLAN_COUNT),
    async (dir) => {
      const problems = await rp1Problems(dir);
      const above = RESULTS.filter((r) => r.meals !== r.count);
      assert.ok(above.length > 0, "control: answer sets above their plan's count");
      for (const build of ["development", "production"]) {
        for (const r of above) {
          const at = `${build}, ${r.hash}: line 1 reads`;
          assert.ok(problems.some((p) => p.startsWith(at)), `RP1 names ${at}:\n${problems.join("\n")}`);
        }
      }
      const named = new Set(above.map((r) => r.hash));
      assert.deepEqual(problems.filter((p) => !named.has(p.split(": ")[0].split(", ")[1])), [], "and nothing at a plan's own count or on Family");
    },
  );
});
