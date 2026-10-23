// WC-11 (SPEC-week-content.md § 5), ⭐ mutants, each red on its own case. Each is a change to a MIRROR of the package's
// inputs (cc-harness mirror(): build.mjs, package.json, data/, scripts/, src/ copied to a temporary directory, this
// package's node_modules linked, and its wrangler.jsonc, which the development build reads; never the tree:
// protocols/mutate-in-a-mirror.md), checked by THE SAME function its case runs on this package (test/wc-checks.mjs).
// The unchanged mirror runs first as the control and passes all five.
//
//   the rewrite skipped                        (site.js: the page always returned as the asset)    fails WC-1
//   the shape check that always passes          (site.js: isWeek returns true)                      fails WC-3
//   the date filter kept in the script          (chefs-choice.js: the week only until its valid_to) fails WC-7
//   a path check that allows ".."               (site.js: only the ".jpg" ending checked)            fails WC-5
//   … and its narrow form                       (site.js: the ".." refusal alone removed)            fails WC-5
//   the build embeds the open week              (chefs-choice.mjs: data/picks/'s week open on the     fails WC-12
//                                                case's date, 2026-10-11, put in #picks-data)
//   a file written on the no-file week          (week-content.mjs: the no-picks-file refusal gone)  fails WC-10b
//                                                (SPEC-week-content § 9 item 8; its week derived, § 9 item 4)
import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { windowOf } from "../scripts/chefs-choice.mjs";
import { mirror } from "./cc-harness.mjs";
import { buildWeekProblems, dateProblems, noFileProblems, pathProblems, rewriteProblems, RULING_ON, shapeProblems, weekWithNoFile } from "./wc-checks.mjs";

/** Replace `from` (present exactly once) with `to` in the mirror's file `rel`. */
async function edit(dir, rel, from, to) {
  const path = join(dir, rel);
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${rel} once: ${from.slice(0, 80)}`);
  await writeFile(path, text.replace(from, () => to));
}

/** A mirror (with the package's wrangler.jsonc) changed by `change(dir)`, and `fn(dir)` run over it; removed after. */
async function withMirror(change, fn) {
  const dir = await mirror(async (d) => {
    await copyFile(join(ROOT, "wrangler.jsonc"), join(d, "wrangler.jsonc"));
    await change(d);
  });
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const SITE = join("src", "worker", "site.js");
const SCRIPT = join("src", "chefs-choice", "chefs-choice.js");

test("WC-11 (control): the unchanged mirror passes WC-1, WC-3, WC-5, WC-7 and WC-12", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await rewriteProblems(dir), [], "WC-1");
    assert.deepEqual(await shapeProblems(dir), [], "WC-3");
    assert.deepEqual(await pathProblems(dir), [], "WC-5");
    assert.deepEqual(await dateProblems(dir), [], "WC-7");
    assert.deepEqual(await buildWeekProblems(dir), [], "WC-12");
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

// The build embedding the week open on the case's date: the page's slots made from data/picks/ again, its window read
// against 2026-10-11 (WC-12's --on), as the build did before § 7's ruling. SPEC-week-content § 9 (a guard over the
// committed weeks holds whatever is committed): the picks read with the menus' words, as the content command reads them,
// so a five-menu week is read and embedded (read with Chef's Choice alone, it refused 2026-11-01's "poultry-and-fish").
const NO_WEEK_LINE =
  "  const weeks = []; // ⛔ SPEC-week-content § 7's ruling: no build embeds a week; the bucket is the only source of one.\n" +
  "  const words = chefsChoiceWords(messages);\n";
const OPEN_WEEK =
  "  const words = { ...chefsChoiceWords(messages), ...menuWords(messages) };\n" +
  '  const weeks = (await readPicks(join(ROOT, "data", "picks"), plans, null, words)).filter((w) => windowOf(w.delivery).valid_to >= "2026-10-11");\n';

// The weeks that mutant embeds: every committed week whose window has not ended by WC-12's date (2026-10-11), computed
// from data/picks/ as the mutant reads it (once 2026-10-25.json was committed, two: a literal ["2026-10-18"] went stale).
const OPEN_WEEKS = (await readdir(join(ROOT, "data", "picks")))
  .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
  .map((name) => name.slice(0, 10))
  .filter((delivery) => windowOf(delivery).valid_to >= RULING_ON)
  .sort();

test("WC-11: the build embedding the open week fails WC-12", async () => {
  assert.ok(OPEN_WEEKS.includes("2026-10-18"), `control: WC-12's week is among the open ones: ${OPEN_WEEKS}`);
  await withMirror(
    (dir) => edit(dir, join("scripts", "chefs-choice.mjs"), NO_WEEK_LINE, OPEN_WEEK),
    async (dir) => {
      const problems = await buildWeekProblems(dir);
      for (const label of ["build", "build:dev"]) {
        assert.ok(problems.includes(`${label}: #picks-data holds ${JSON.stringify(OPEN_WEEKS)}, not []`), `WC-12 fails it (${label}):\n${problems.join("\n")}`);
      }
    },
  );
});

// SPEC-week-content § 9 item 8 (WC-10b's first refusal on a derived week, § 9 item 4): the content command's refusal of a
// week with no picks file removed, so it writes the week's content (no week in it) for the derived week; read by
// WC-10b's own check over the mirror. The unchanged mirror first, its control.
const NO_FILE_REFUSAL = "  if (week !== undefined && !weeks.length) throw new Error(`no picks file for ${week}: data/picks/${week}.json`);\n";

test("WC-11 (SPEC-week-content § 9): a file written on the derived no-file week fails WC-10b", async (t) => {
  const { latest, week } = await weekWithNoFile();
  t.diagnostic(`the week with no picks file: ${week}, seven days after ${latest}`);
  await withMirror(async () => {}, async (dir) => assert.deepEqual(await noFileProblems(dir), [], "control: the unchanged mirror refuses it"));
  await withMirror(
    (dir) => edit(dir, join("scripts", "week-content.mjs"), NO_FILE_REFUSAL, ""),
    async (dir) => {
      const problems = await noFileProblems(dir);
      assert.ok(problems.includes(`${week}: wrote week/picks-data.json`), `WC-10b fails it (a file written):\n${problems.join("\n")}`);
      assert.ok(problems.includes(`${week}: exit 0, not refused`), `and it was not refused:\n${problems.join("\n")}`);
    },
  );
});
