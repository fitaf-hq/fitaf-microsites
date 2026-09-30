// R2-32 (SPEC-rung2 § 12 item 3): fill B's shipped text is pinned BYTE FOR BYTE. In both built files, the text after the
// version line has the SHA-256 below, and the version line declares that same hash. A change to the shipped text is a
// separate amendment, with the live smoke before its paste, and it moves this pin in the same commit.
// ⭐ Moved by SPEC-rung2-progress-and-checkout (rung 2's two faces): from 054e6be87aa3d690814be2b8165b29830d36f1503a5da418d4cc6b2a680bb2b8
// (8945de1's text, the Footer block placed on 2026-09-29, when fill A was retired) to 28ce3983… (7b0d74f), aa773aec…
// (ed422ad, the screen in the top layer), c87cb754… (9e67484, its § 10: the extras pop-up made invisible under the
// screen; H7–H10), 5eb8416e… (4697f19, its § 11: the screen built with createElement) and, by § 11 as amended (no `<`
// at all in the text: comparisons written the other way round), the hash below. The block live in the store's Footer is the old text until a new one is smoked and pasted.
// ⭐ The mutant: a copy of the source with ONE byte of fill B's code changed builds a text R2-32 refuses. The copy is
// made in a temporary directory; no file in the repository is edited. The control: an unmutated copy passes.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildStorefront, STOREFRONT_SOURCE } from "../scripts/build-storefront.mjs";

/** Fill B's text SHA-256 with rung 2's two faces (SPEC-rung2-progress-and-checkout). Was 054e6be8… (8945de1). */
const SHIPPED_SHA256 = "c67754610077710b8e194ec5605daee5b357baa9fe9bd7eee6fc5685075e3744";
/** The version line's commit is not part of the text; fixed, so a copy outside the repository builds too. */
const COMMIT = "0000000";
const VERSION_LINE = /^\/\* fitaf-handoff (\S+) sha256:([0-9a-f]{64}) \*\/\n/;
const CONSOLE = "fitaf-handoff.fill-B.console.js";
const FOOTER = "fitaf-handoff.html";
/** One byte of fill B's code: its wait before a press, 50 polls, becomes 51. */
const MUTATION = ["MAX_POLLS = 50", "MAX_POLLS = 51"];

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

/** The Footer block's script: what is between `<script>\n` and `</script>\n`. */
function unwrap(footer) {
  assert.ok(footer.startsWith("<script>\n") && footer.endsWith("</script>\n"), "the Footer block is one <script>");
  return footer.slice("<script>\n".length, -"</script>\n".length);
}

/** R2-32's check over the build of `sourcePath`: each file's text hash, recomputed and as its version line declares. */
async function shippedTextCase(sourcePath) {
  const out = await mkdtemp(join(tmpdir(), "boston-storefront-r2-32-"));
  try {
    await buildStorefront({ outDir: out, sourcePath, commit: COMMIT });
    const read = (name) => readFile(join(out, name), "utf8");
    for (const [name, script] of [
      [CONSOLE, await read(CONSOLE)],
      [FOOTER, unwrap(await read(FOOTER))],
    ]) {
      const m = VERSION_LINE.exec(script);
      assert.ok(m, `${name}: a version line`);
      assert.equal(sha256(script.slice(m[0].length)), SHIPPED_SHA256, `${name}: the text's SHA-256`);
      assert.equal(m[2], SHIPPED_SHA256, `${name}: the version line's own`);
    }
  } finally {
    await rm(out, { recursive: true, force: true });
  }
}

/** A copy of the source in a temporary directory, `edit`ed there. */
async function withCopy(edit, fn) {
  const dir = await mkdtemp(join(tmpdir(), "boston-storefront-r2-32-src-"));
  try {
    const copy = join(dir, "fitaf-handoff.js");
    await writeFile(copy, edit(await readFile(STOREFRONT_SOURCE, "utf8")));
    return await fn(copy);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("R2-32: both built files' text SHA-256 (the version line's own) is c6775461…, fill B's with rung 2's two faces", async () => {
  await shippedTextCase(STOREFRONT_SOURCE);
});

test("R2-32 mutant: one byte of the source's fill B changed (MAX_POLLS 50 -> 51): R2-32 fails", async () => {
  await withCopy((source) => source, shippedTextCase); // control: an unmutated copy passes
  await withCopy(
    (source) => {
      assert.equal(source.split(MUTATION[0]).length, 2, "the mutated code appears exactly once");
      const mutant = source.replace(...MUTATION);
      const differing = [...source].filter((ch, i) => ch !== mutant[i]).length;
      assert.deepEqual([mutant.length, differing], [source.length, 1], "exactly one byte changed");
      return mutant;
    },
    (copy) =>
      assert.rejects(shippedTextCase(copy), (err) => {
        assert.ok(err instanceof assert.AssertionError, String(err));
        return true;
      }),
  );
});
