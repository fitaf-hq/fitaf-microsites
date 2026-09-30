// R2-58 (SPEC-rung2-progress-and-checkout § 11, as amended): the store's admin validator reads the text INSIDE the
// Footer block's <script> as HTML, and reads `<` followed by whitespace and a letter as a tag too ("<s> isn't allowed
// here", from `i < s.length`). So the shipped text holds NO `<` at all: the Footer block's only two are its own
// `<script>` and `</script>`, first and last; the console file has none. Comparisons are written the other way round.
// ⭐ The mutants, in the suite, each in a copy of the source in a temporary directory (nothing in the repository is
// edited), each scanned as the build composes the files (storefrontFiles): a `<` comparison restored, and the screen's
// markup string restored (§ 11 as first written). R2-58b: the build itself refuses such a text and writes nothing, as it
// refuses a size above the ceiling. The control: an unmutated copy passes.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as build from "../scripts/build-storefront.mjs";

const { buildStorefront, STOREFRONT_SOURCE } = build;
const FOOTER = "fitaf-handoff.html";
const CONSOLE = "fitaf-handoff.fill-B.console.js";
/** A comparison as fill B wrote it until the amendment, and as it is written now (the other way round). */
const COMPARISON = { now: "it.qty > n", was: "n < it.qty" };
/** The statement that built the screen until § 11 (at ed422ad … 75dc67e), a markup string. */
const MARKUP =
  'S.innerHTML = "<style>" + CSS + "</style><div><h2></h2><div class=b><i></i></div><div class=c></div><p role=status aria-live=polite></p></div>";';
const ANCHOR = 'S.id = "fitaf-screen";';

/** R2-58's scan over the two files' contents: throws (an AssertionError) if any `<` is there but the block's own two. */
function scan({ footer, consoleFile }) {
  assert.ok(footer.startsWith("<script>\n") && footer.endsWith("</script>\n"), "the Footer block is one <script>, first and last");
  const inside = footer.slice("<script>\n".length, -"</script>\n".length);
  assert.equal((footer.match(/</g) ?? []).length, 2, "the Footer block: its own two '<' and no other");
  assert.deepEqual(inside.match(/.{0,12}<.{0,12}/g) ?? [], [], "no '<' inside the Footer block's script");
  assert.deepEqual(consoleFile.match(/.{0,12}<.{0,12}/g) ?? [], [], "no '<' in the console file");
}

/** The files the build composes from `sourcePath`, not written (the build's own storefrontFiles). */
async function composed(sourcePath) {
  const files = await build.storefrontFiles({ sourcePath, commit: "0000000" });
  const content = (name) => files.find((f) => f.name === name).content;
  return { footer: content(FOOTER), consoleFile: content(CONSOLE) };
}

async function withCopy(edit, fn) {
  const dir = await mkdtemp(join(tmpdir(), "boston-storefront-r2-58-src-"));
  try {
    const copy = join(dir, "fitaf-handoff.js");
    await writeFile(copy, edit(await readFile(STOREFRONT_SOURCE, "utf8")));
    return await fn(copy, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const restoreComparison = (source) => {
  assert.equal(source.split(COMPARISON.now).length, 2, `"${COMPARISON.now}" appears exactly once`);
  return source.replace(COMPARISON.now, COMPARISON.was);
};
const restoreMarkup = (source) => {
  assert.equal(source.split(ANCHOR).length, 2, "the anchor appears exactly once");
  return source.replace(ANCHOR, `${ANCHOR}\n  ${MARKUP}`);
};
const failsTheScan = (err) => {
  assert.ok(err instanceof assert.AssertionError, String(err));
  assert.match(err.message, /'<'/);
  return true;
};

test("R2-58: the built files hold no '<' but the Footer block's own <script> and </script>", async () => {
  const out = await mkdtemp(join(tmpdir(), "boston-storefront-r2-58-"));
  try {
    await buildStorefront({ outDir: out, commit: "0000000" });
    scan({ footer: await readFile(join(out, FOOTER), "utf8"), consoleFile: await readFile(join(out, CONSOLE), "utf8") });
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("R2-58 (mutant): a '<' comparison restored — R2-58 fails", async () => {
  await withCopy((source) => source, async (copy) => scan(await composed(copy))); // control
  await withCopy(restoreComparison, async (copy) => assert.rejects(async () => scan(await composed(copy)), failsTheScan));
});

test("R2-58 (mutant): the screen's markup string restored — R2-58 fails", async () => {
  await withCopy(restoreMarkup, async (copy) => assert.rejects(async () => scan(await composed(copy)), failsTheScan));
});

test("R2-58b: the build refuses a text with a '<' (a comparison, or markup), naming it, and writes nothing", async () => {
  for (const edit of [restoreComparison, restoreMarkup]) {
    await withCopy(edit, async (copy, dir) => {
      const out = join(dir, "never-written");
      await assert.rejects(buildStorefront({ outDir: out, sourcePath: copy, commit: "0000000" }), /a '<' in the text/);
      assert.equal(existsSync(out), false, "nothing written");
    });
  }
});
