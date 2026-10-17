// FC-8's mutants (SPEC-rung2-fill-c § 8 item 5, ⭐): each a change to a MIRROR of the package (cc-harness mirror():
// build.mjs, package.json, data/, scripts/, src/ copied to a temporary directory; never the tree: MS-10's way), built by
// the mirror's own build (its scripts/build-storefront.mjs, imported from the mirror), and checked by THE SAME function
// the case runs on the tree (fc-08-checks.mjs). The unchanged mirror runs first as the control, and must pass all three.
//
//   the allowed totals from the plan's count alone   fails FC-8a (the 5-meal link refused at decode)
//   § 1.4 against the plan's count                   fails FC-8e (CHECKOUT pressed with the plan showing 4 of 5)
//   the selection row's `plan` ignored               fails FC-8h (every row's meals added to every plan)
//
// Each mutant's problems are written to the run's output (t.diagnostic): the red, as the check reports it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { mirror } from "./cc-harness.mjs";
import { extraMealProblems, fixtureTableProblems, showsFourProblems } from "./fc-08-checks.mjs";

const BUILD = join("scripts", "build-storefront.mjs");
const SOURCE = join("src", "storefront", "fitaf-handoff.js");
const FIXTURE = JSON.parse(await readFile(join(ROOT, "test", "fixtures", "fc-08-plans.json"), "utf8"));

/** Replace `from` (present exactly once) with `to` in the mirror's file `rel`. */
async function edit(dir, rel, from, to) {
  const path = join(dir, rel);
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${rel} once: ${from.slice(0, 80)}`);
  await writeFile(path, text.replace(from, to));
}

/** A mirror changed by `change(dir)`; `fn(build)` given the mirror's own build module; the mirror removed after. */
async function withMirror(change, fn) {
  const dir = await mirror(change);
  try {
    return await fn(await import(pathToFileURL(join(dir, BUILD)).href));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("FC-8 mutants (control): the unchanged mirror passes FC-8a, FC-8e and FC-8h", async () => {
  await withMirror(async () => {}, async (build) => {
    const text = await build.storefrontText();
    assert.deepEqual(await extraMealProblems(text), [], "FC-8a");
    assert.deepEqual((await showsFourProblems(text)).problems, [], "FC-8e");
    assert.deepEqual(fixtureTableProblems(build.countTable(FIXTURE)), [], "FC-8h");
  });
});

// The allowed totals are the plan's own count alone: the table the block carries before § 8, in § 8's shape.
const TOTALS_OF = "  const totalsOf = (P) => [...new Set([P, ...rows.filter((row) => row.plan === P).map((row) => row.meals)])].sort((a, b) => a - b);\n";

test("FC-8 mutant: the allowed totals from the plan's count alone — FC-8a fails (5 on Lean 4 refused at decode)", async (t) => {
  await withMirror(
    (dir) => edit(dir, BUILD, TOTALS_OF, "  const totalsOf = (P) => [P];\n"),
    async (build) => {
      const problems = await extraMealProblems(await build.storefrontText());
      t.diagnostic(`FC-8a on the mutant: ${JSON.stringify(problems)}`);
      assert.ok(problems.some((p) => p === "not done: [fitaf-handoff] stopped: the plan needs 4 meals; the link has 5"), problems.join("\n"));
    },
  );
});

// § 1.4 compares the plan's displayed count with the plan's own count (the smallest allowed total, COUNTS[mpid][0]), as
// fill C did when a link always was its plan's count; the sidebar's snack units kept.
const PLAN_CHECKED = "if (b && (k || n[0] === (n[1] ? p.units : p.total)))";
const PLAN_COUNT_CHECKED = "if (b && (k || n[0] === (n[1] ? p.units - p.total + COUNTS[p.mpid][0] : COUNTS[p.mpid][0])))";

test("FC-8 mutant: § 1.4 against the plan's count — FC-8e fails (CHECKOUT pressed with the plan showing 4 of a 5-meal link)", async (t) => {
  for (const width of ["bar", "sidebar"]) {
    await withMirror(
      (dir) => edit(dir, SOURCE, PLAN_CHECKED, PLAN_COUNT_CHECKED),
      async (build) => {
        const text = await build.storefrontText();
        assert.ok(text.includes(PLAN_COUNT_CHECKED), "control: the mutant is in the mirror's shipped text");
        const { problems } = await showsFourProblems(text, { width });
        t.diagnostic(`FC-8e ${width} on the mutant: ${JSON.stringify(problems)}`);
        assert.ok(problems.some((p) => p === 'CHECKOUT pressed with the plan showing 4 of a 5-meal link: ["checkout:shown"]'), problems.join("\n"));
      },
    );
  }
});

test("FC-8 mutant: the selection row's plan ignored — FC-8h fails (8 takes every row's meals, and so do 7 and Family)", async (t) => {
  await withMirror(
    (dir) => edit(dir, BUILD, "rows.filter((row) => row.plan === P).map((row) => row.meals)", "rows.map((row) => row.meals)"),
    async (build) => {
      const problems = fixtureTableProblems(build.countTable(FIXTURE));
      t.diagnostic(`FC-8h on the mutant: ${JSON.stringify(problems)}`);
      assert.deepEqual(problems, ['countTable over the fixture is {"101":[7,9],"102":[7,8,9],"103":[1,7,9]}, not {"101":[7],"102":[8,9],"103":[1]}']);
    },
  );
});
