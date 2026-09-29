// W3 (SPEC-storefront-watch § 6): a dependency literal removed from the synthetic bundle: F2 names it.
// ⭐ The mutant: a copy of the check that always passes is caught. The copy is of lib/ in a temporary directory,
// mutated there; no file in the repository is edited. The control: the unmutated module passes the same case.
import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderReport } from "../lib/report.mjs";
import { storeFetcher } from "../lib/store-fetch.mjs";
import { DEPENDENCIES, fakeFetch, ORIGIN, PAGE, syntheticStore, w1Baseline } from "./synthetic-store.mjs";

const LIB = fileURLToPath(new URL("../lib/", import.meta.url));
const REMOVED = DEPENDENCIES.literals.find((d) => d.id === "checkout-now");
/** The check's one test of a file's text; the mutant makes it true of every file. */
const CHECK = ".includes(dep.literal)";

async function w3Case(watchModuleUrl) {
  const { runWatch } = await import(watchModuleUrl);
  const files = syntheticStore((f) => {
    for (const [path, text] of f) f.set(path, text.split(`x(${REMOVED.literal});`).join(""));
  });
  assert.ok(![...files.values()].some((t) => t.includes(REMOVED.literal)), "the literal is gone from every file");
  const { fetchImpl } = fakeFetch(files);
  // In depth, as on a dispatch: the synthetic store's file names do not follow their content, so this edit leaves
  // the entry's name and imports as they were. (In the real bundle every name is a content hash, so a changed chunk
  // renames each file up to the entry and the hourly check flags it: W2.)
  const result = await runWatch({
    fetcher: storeFetcher({ fetchImpl, origin: ORIGIN }),
    baseline: w1Baseline(),
    dependencies: DEPENDENCIES,
    page: PAGE,
    full: true,
  });
  assert.deepEqual(result.flags, ["F1", "F2"], "a changed chunk (F1) and a missing literal (F2)");
  assert.deepEqual(
    result.f2.missing.map((d) => d.literal),
    [REMOVED.literal],
  );
  const report = renderReport(result);
  assert.ok(report.includes(REMOVED.literal), "the report quotes the literal");
  assert.ok(report.includes(REMOVED.use), "and says what the hand-off uses it for");
  assert.ok(report.includes(REMOVED.spec), "and where the contract says so");
}

test("W3 control: a literal removed from the bundle: F2 names it", async () => {
  await w3Case(new URL("../lib/watch.mjs", import.meta.url).href);
});

test("W3 mutant: a check that always passes is caught (W3 fails on it)", async () => {
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-w3-"));
  try {
    await cp(LIB, join(dir, "lib"), { recursive: true });
    const target = join(dir, "lib", "dependencies-check.mjs");
    const source = await readFile(target, "utf8");
    assert.equal(source.split(CHECK).length, 2, "the check appears exactly once");
    await writeFile(target, source.replace(CHECK, '.includes("")'));
    await assert.rejects(w3Case(pathToFileURL(join(dir, "lib", "watch.mjs")).href), (err) => {
      assert.ok(err instanceof assert.AssertionError, String(err));
      return true;
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
