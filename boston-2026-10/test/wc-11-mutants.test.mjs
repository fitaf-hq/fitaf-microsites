// WC-11 (SPEC-week-content.md § 5), ⭐ mutants, each red on its own case. Each is a change to a MIRROR of the package's
// inputs (cc-harness mirror(): build.mjs, package.json, data/, scripts/, src/ copied to a temporary directory, this
// package's node_modules linked; never the tree: protocols/mutate-in-a-mirror.md), checked by THE SAME function its case
// runs on this package (test/wc-checks.mjs). The unchanged mirror runs first as the control and passes all four.
//
//   the rewrite skipped                        (site.js: the page always returned as the asset)    fails WC-1
//   the shape check that always passes          (site.js: isWeek returns true)                      fails WC-3
//   the date filter kept in the script          (chefs-choice.js: the week only until its valid_to) fails WC-7
//   a path check that allows ".."               (site.js: only the ".jpg" ending checked)            fails WC-5
//   … and its narrow form                       (site.js: the ".." refusal alone removed)            fails WC-5
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mirror } from "./cc-harness.mjs";
import { dateProblems, pathProblems, rewriteProblems, shapeProblems } from "./wc-checks.mjs";

/** Replace `from` (present exactly once) with `to` in the mirror's file `rel`. */
async function edit(dir, rel, from, to) {
  const path = join(dir, rel);
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${rel} once: ${from.slice(0, 80)}`);
  await writeFile(path, text.replace(from, () => to));
}

/** A mirror changed by `change(dir)`, and `fn(dir)` run over it; the mirror removed after. */
async function withMirror(change, fn) {
  const dir = await mirror(change);
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const SITE = join("src", "worker", "site.js");
const SCRIPT = join("src", "chefs-choice", "chefs-choice.js");

test("WC-11 (control): the unchanged mirror passes WC-1, WC-3, WC-5 and WC-7", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await rewriteProblems(dir), [], "WC-1");
    assert.deepEqual(await shapeProblems(dir), [], "WC-3");
    assert.deepEqual(await pathProblems(dir), [], "WC-5");
    assert.deepEqual(await dateProblems(dir), [], "WC-7");
  });
});

test("WC-11: the rewrite skipped fails WC-1", async () => {
  await withMirror(
    (dir) => edit(dir, SITE, "  if (!week) return page;\n", "  return page;\n"),
    async (dir) => {
      const problems = await rewriteProblems(dir);
      assert.ok(problems.some((p) => /the asset unchanged/.test(p)), `WC-1 fails it:\n${problems.join("\n")}`);
    },
  );
});

test("WC-11: the shape check that always passes fails WC-3", async () => {
  await withMirror(
    (dir) => edit(dir, SITE, "export function isWeek(data) {\n", "export function isWeek(data) {\n  return true;\n"),
    async (dir) => {
      const problems = await shapeProblems(dir);
      for (const label of ["two weeks", "a week without carts", "weeks: []"]) {
        assert.ok(problems.some((p) => p.startsWith(`${label}: not the asset`)), `WC-3 fails it on "${label}":\n${problems.join("\n")}`);
      }
    },
  );
});

test("WC-11: the date filter kept in the script fails WC-7", async () => {
  await withMirror(
    (dir) =>
      edit(
        dir,
        SCRIPT,
        "var week = picks.weeks.length === 1 ? picks.weeks[0] : null;",
        "var week = picks.weeks.length === 1 && new Date().toISOString().slice(0, 10) <= picks.weeks[0].valid_to ? picks.weeks[0] : null;",
      ),
    async (dir) => {
      const problems = await dateProblems(dir);
      assert.ok(problems.some((p) => /^after valid_to: the week's list is not shown$/.test(p)), `WC-7 fails it:\n${problems.join("\n")}`);
    },
  );
});

test("WC-11: a path check that allows '..' (only the .jpg ending checked) fails WC-5", async () => {
  await withMirror(
    (dir) => edit(dir, SITE, '  if (name.includes("/") || name.includes("..") || !SHEET_NAME.test(name)) return null;\n', '  if (!name.endsWith(".jpg")) return null;\n'),
    async (dir) => {
      const problems = await pathProblems(dir);
      assert.ok(problems.some((p) => p.startsWith('sheetKey("/week/../x.jpg") is "week/../x.jpg"')), `WC-5 fails it on /week/../x.jpg:\n${problems.join("\n")}`);
      assert.ok(problems.some((p) => p.startsWith("/week/a/b.jpg: status 200")), `WC-5 fails it on /week/a/b.jpg:\n${problems.join("\n")}`);
      assert.ok(problems.some((p) => p.startsWith("/week/a/b.jpg: the bucket was read")), `the bucket read:\n${problems.join("\n")}`);
    },
  );
});

test("WC-11: the '..' refusal alone removed fails WC-5", async () => {
  await withMirror(
    (dir) => edit(dir, SITE, 'name.includes("..") || ', ""),
    async (dir) => {
      const problems = await pathProblems(dir);
      assert.ok(problems.some((p) => p.startsWith("/week/x..jpg: status 200")), `WC-5 fails it on /week/x..jpg:\n${problems.join("\n")}`);
    },
  );
});
