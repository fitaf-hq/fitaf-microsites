// SPEC-print-pieces.md § 17 item 5's two mutants, each of which must turn its case red: the tout's fit check off (QG31)
// and the bracket rule off (QG33). Each change is made to a MIRROR of the package (qe-checks.mjs printMirror: never the
// tree, protocols/mutate-in-a-mirror) and checked by THE SAME function its case runs on this package (qg-checks.mjs). The
// unchanged mirror runs each check first, as the control, and passes. Each mutant's problems are written to the run's
// output (t.diagnostic): the red, as the check reports it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NO_CHROME } from "./print-fixtures.mjs";
import { printMirror } from "./qe-checks.mjs";
import { proofRuleProblems, toutFitProblems } from "./qg-checks.mjs";

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

const MUTANTS = {
  /** QG31: a box whose words run over it never refused. */
  fit: [join("print", "checks.mjs"), "if (worst > 0) refusals.push(", "if (false) refusals.push("],
  /** QG33: no bracket ever found, so a piece holding one is named as final. */
  bracket: [join("print", "pages.mjs"), "const BRACKET = /\\[[^\\][]*\\]/g;", "const BRACKET = /(?!)/g;"],
};

test("§ 17 mutant: the bracket rule off fails QG33 (the unchanged mirror, its control, passes)", async (t) => {
  await withMirror(async () => {}, async (dir) => assert.deepEqual(await proofRuleProblems(dir), [], "control"));
  await withMirror((dir) => edit(dir, ...MUTANTS.bracket), async (dir) => {
    const problems = await proofRuleProblems(dir);
    t.diagnostic(`QG33 on the mutant: ${problems.length} problems: ${JSON.stringify(problems)}`);
    assert.ok(problems.includes("the tout with brackets is tout, not tout-PROOF"), problems.join("\n"));
  });
});

test("§ 17 mutant: the tout's fit check off fails QG31 (the unchanged mirror, its control, passes)", { skip: NO_CHROME }, async (t) => {
  await withMirror(async () => {}, async (dir) => assert.deepEqual(await toutFitProblems(dir), [], "control"));
  await withMirror((dir) => edit(dir, ...MUTANTS.fit), async (dir) => {
    const problems = await toutFitProblems(dir);
    t.diagnostic(`QG31 on the mutant: ${problems.length} problems: ${JSON.stringify(problems)}`);
    assert.ok(problems.includes("headline line 1 too long was not refused"), problems.join("\n"));
  });
});
