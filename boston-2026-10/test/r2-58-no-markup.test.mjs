// R2-58 (SPEC-rung2-progress-and-checkout § 11): the store's admin validator reads the text INSIDE the Footer block's
// <script> as HTML ("<div> isn't allowed here"; "Attribute values can't contain < or >"). So the shipped text holds no
// `<` followed by a letter, `/` or `!`: the Footer block has exactly its own one `<script>` and one `</script>`, the
// console file none, and neither anything else tag-like. The screen and its style are built with createElement.
// ⭐ The mutant, in the suite: a copy of the source with the screen's markup string restored (the statement that built
// the screen before § 11) builds files R2-58 refuses. Copies are made in a temporary directory; nothing in the
// repository is edited. The control: an unmutated copy passes.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildStorefront, STOREFRONT_SOURCE } from "../scripts/build-storefront.mjs";

const TAGLIKE = /<[A-Za-z/!]/g;
/** The statement that built the screen until § 11 (at ed422ad … 75dc67e), a markup string. */
const MARKUP =
  'S.innerHTML = "<style>" + CSS + "</style><div><h2></h2><div class=b><i></i></div><div class=c></div><p role=status aria-live=polite></p></div>";';
/** Where the mutant puts it back: right after the screen's element gets its id. */
const ANCHOR = 'S.id = "fitaf-screen";';

/** R2-58's check over the build of `sourcePath`: throws (an AssertionError) if a built file holds tag-like text. */
async function scanCase(sourcePath) {
  const out = await mkdtemp(join(tmpdir(), "boston-storefront-r2-58-"));
  try {
    await buildStorefront({ outDir: out, sourcePath, commit: "0000000" });
    const footer = await readFile(join(out, "fitaf-handoff.html"), "utf8");
    const consoleFile = await readFile(join(out, "fitaf-handoff.fill-B.console.js"), "utf8");
    assert.equal((footer.match(/<script/g) ?? []).length, 1, "the Footer block: exactly one <script");
    assert.equal((footer.match(/<\/script>/g) ?? []).length, 1, "the Footer block: exactly one </script>");
    assert.ok(footer.startsWith("<script>\n") && footer.endsWith("</script>\n"), "and they are its own, first and last");
    const inside = footer.slice("<script>\n".length, -"</script>\n".length);
    assert.deepEqual(inside.match(TAGLIKE) ?? [], [], "nothing tag-like inside the Footer block's script");
    assert.deepEqual(consoleFile.match(TAGLIKE) ?? [], [], "nothing tag-like in the console file");
  } finally {
    await rm(out, { recursive: true, force: true });
  }
}

async function withCopy(edit, fn) {
  const dir = await mkdtemp(join(tmpdir(), "boston-storefront-r2-58-src-"));
  try {
    const copy = join(dir, "fitaf-handoff.js");
    await writeFile(copy, edit(await readFile(STOREFRONT_SOURCE, "utf8")));
    return await fn(copy);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("R2-58: the built files hold no tag-like text but the Footer block's own <script> and </script>", async () => {
  await scanCase(STOREFRONT_SOURCE);
});

test("R2-58 (mutant): the screen's markup string restored — R2-58 fails", async () => {
  await withCopy((source) => source, scanCase); // control: an unmutated copy passes
  await withCopy(
    (source) => {
      assert.equal(source.split(ANCHOR).length, 2, "the anchor appears exactly once");
      return source.replace(ANCHOR, `${ANCHOR}\n  ${MARKUP}`);
    },
    (copy) =>
      assert.rejects(scanCase(copy), (err) => {
        assert.ok(err instanceof assert.AssertionError, String(err));
        assert.match(err.message, /nothing tag-like/);
        return true;
      }),
  );
});
