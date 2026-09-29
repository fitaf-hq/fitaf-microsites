// R2-12: the version line (SPEC-rung2 § 6, item 3): `/* fitaf-handoff <commit> sha256:<hex> */`, whose hash,
// recomputed here from the script text that follows it, matches — so what is live can be compared with what is
// kept. The Footer block is the console file of the source's FILL wrapped in <script> tags; the source's FILL
// is what picks it.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { buildStorefront, STOREFRONT_SOURCE } from "../scripts/build-storefront.mjs";
import { script } from "./r2-harness.mjs";

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const VERSION_LINE = /^\/\* fitaf-handoff ([0-9a-f]{7,40}(?:-dirty)?) sha256:([0-9a-f]{64}) \*\/\n/;
const wrap = (consoleFile) => `<script>\n${consoleFile}</script>\n`;

async function built(options = {}) {
  const out = await mkdtemp(join(tmpdir(), "boston-storefront-"));
  try {
    await buildStorefront({ outDir: out, ...options });
    const read = (name) => readFile(join(out, name), "utf8");
    return {
      footer: await read("fitaf-handoff.html"),
      A: await read("fitaf-handoff.fill-A.console.js"),
      B: await read("fitaf-handoff.fill-B.console.js"),
    };
  } finally {
    await rm(out, { recursive: true, force: true });
  }
}

/** Split a console file into its version line's fields and the text after it; check the hash. */
function verified(file) {
  const m = VERSION_LINE.exec(file);
  assert.ok(m, `version line: ${JSON.stringify(file.slice(0, 120))}`);
  const text = file.slice(m[0].length);
  assert.equal(sha256(text), m[2], "sha256 recomputed from the text");
  return { commit: m[1], hash: m[2], text };
}

test("R2-12a: each console file's version line holds: its hash, its fill's text, this checkout's commit", async () => {
  const files = await built();
  const head = execFileSync("git", ["-C", ROOT, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  for (const fill of ["A", "B"]) {
    const { text, commit } = verified(files[fill]);
    assert.equal(text, await script(fill), `fill ${fill}: the text is the source built for fill ${fill}`);
    assert.equal(commit.replace(/-dirty$/, ""), head);
  }
  assert.notEqual(verified(files.A).hash, verified(files.B).hash);
});

test("R2-12b: the Footer block is <script>, the fill-B console file, </script> — the source's FILL is B", async () => {
  const { footer, B } = await built();
  assert.equal(footer, wrap(B));
  assert.match(verified(B).text, /var FILL = "B";/);
});

test("R2-12c: the source's FILL picks the Footer's fill — a copy set to A builds a fill-A Footer", async () => {
  const dir = await mkdtemp(join(tmpdir(), "boston-storefront-src-"));
  try {
    const source = await readFile(STOREFRONT_SOURCE, "utf8");
    const switched = source.replace('var FILL = "B";', 'var FILL = "A";');
    assert.notEqual(switched, source, "the switch applied");
    const copy = join(dir, "fitaf-handoff.js");
    await writeFile(copy, switched);
    const { footer, A } = await built({ sourcePath: copy });
    assert.equal(footer, wrap(A));
    assert.match(verified(A).text, /var FILL = "A";/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("R2-12 mutant: one changed character in the text breaks the recorded hash", async () => {
  const { B } = await built();
  const tampered = B.replace("POLL_MS = 200", "POLL_MS = 201");
  assert.notEqual(tampered, B, "the mutation applied");
  assert.throws(() => verified(tampered), /sha256 recomputed/);
});
