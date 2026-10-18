// SPEC-print-pieces.md § 11 item 5's mutant: the print build's default back to the first event, which fails QE13 (§ 11's
// Q13). The change is made to a MIRROR of the package (qe-checks.mjs printMirror: never the tree,
// protocols/mutate-in-a-mirror) and checked by THE SAME function QE13 runs on this package (printDefaultProblems). The
// unchanged mirror runs first as the control and passes. The mutant's problems are written to the run's output
// (t.diagnostic): the red, as the check reports it. Both build with the tent card and the flyer alone (no four flyers),
// to keep Chrome's runs down; QE13 on the package builds all six pages.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NO_CHROME } from "./print-fixtures.mjs";
import { printDefaultProblems, printMirror } from "./qe-checks.mjs";

const BUILD_PRINT = join("print", "build-print.mjs");
/** The mutation: buildPrint hands loadInputs the --event alone, so with none it takes the first event, as before § 11. */
const DEFAULT_ANCHOR = "eventId: eventId ?? PRINT_EVENT";
const FIRST_EVENT = "eventId";

/** Replace `from` (present exactly once) with `to` in the mirror's file `rel`. */
async function edit(dir, rel, from, to) {
  const path = join(dir, rel);
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${rel} once: ${from}`);
  await writeFile(path, text.replace(from, () => to));
}

async function withMirror(change, fn) {
  const dir = await printMirror(change);
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("§ 11 mutant (control): the unchanged mirror passes QE13", { skip: NO_CHROME }, async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await printDefaultProblems(dir, { fourFlyers: false }), []);
  });
});

test("§ 11 mutant: the print default back to the first event fails QE13", { skip: NO_CHROME }, async (t) => {
  await withMirror(
    (dir) => edit(dir, BUILD_PRINT, DEFAULT_ANCHOR, FIRST_EVENT),
    async (dir) => {
      const problems = await printDefaultProblems(dir, { fourFlyers: false });
      t.diagnostic(`QE13 on the mutant: ${problems.length} problems: ${JSON.stringify(problems)}`);
      assert.ok(problems.some((p) => p.startsWith("the report's QR line: ") && p.includes('event \\"demo\\"')), `the report names demo:\n${problems.join("\n")}`);
      assert.ok(problems.some((p) => p.includes('decodes to "https://eatfitaf.com/"')), `a printed code decodes to demo's URL:\n${problems.join("\n")}`);
    },
  );
});
