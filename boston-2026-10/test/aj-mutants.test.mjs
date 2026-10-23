// The mutant of SPEC-analytics.md § 11 item 4, red on AJ1. A change to a MIRROR of the package's inputs (cc-harness
// mirror(): build.mjs, package.json, data/, scripts/, src/ copied to a temporary directory, this package's node_modules
// linked; never the tree: protocols/mutate-in-a-mirror.md), checked by THE SAME function AJ1 runs on this package
// (aj-checks.mjs figureProblems). The unchanged mirror runs first as the control and passes.
//
//   the JSON computed by a second path that drops the funnel's last step   (analytics.mjs: --json prints a copy of the
//                                                                            document whose every funnel lacks `click`)
//                                                                            fails AJ1
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { figureProblems } from "./aj-checks.mjs";
import { mirror } from "./cc-harness.mjs";

const ANALYTICS_MJS = join("scripts", "analytics.mjs");
/** The one line that writes either output (scripts/analytics.mjs `report`). */
const WRITE = "out.write(parsed.json ? `${JSON.stringify(doc, null, 2)}\\n` : reportText(doc));";
const SECOND_PATH =
  "const second = { ...doc, days: doc.days.map((d) => (d.data ? { ...d, funnel: d.funnel.slice(0, -1) } : d)) };\n" +
  "  out.write(parsed.json ? `${JSON.stringify(second, null, 2)}\\n` : reportText(doc));";

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

test("AJ mutant (control): the unchanged mirror passes AJ1", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await figureProblems(dir), [], "AJ1");
  });
});

test("AJ mutant: the JSON computed by a second path that drops the funnel's last step fails AJ1", async () => {
  await withMirror(
    (dir) => edit(dir, ANALYTICS_MJS, WRITE, SECOND_PATH),
    async (dir) => {
      const problems = await figureProblems(dir);
      assert.ok(
        problems.some((p) => /the funnel's step 8: the text's click \d+, the document's none/.test(p)),
        `AJ1 fails it on the funnel's last step:\n${problems.join("\n")}`,
      );
    },
  );
});
