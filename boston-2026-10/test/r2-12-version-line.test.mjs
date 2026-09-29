// R2-12: the version line (SPEC-rung2 § 6, item 3): `/* fitaf-handoff <commit> sha256:<hex> */`, whose hash,
// recomputed here from the script text that follows it, matches — so what is live can be compared with what is
// kept. The Footer block is fill B's console file wrapped in <script> tags (fill B is the one fill: SPEC-rung2 § 12).
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { buildStorefront } from "../scripts/build-storefront.mjs";
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
  const { text, commit } = verified(files.B);
  assert.equal(text, await script("B"), "fill B: the text is the source built");
  assert.equal(commit.replace(/-dirty$/, ""), head);
});

test("R2-12b: the Footer block is <script>, the fill-B console file, </script> — the source's FILL is B", async () => {
  const { footer, B } = await built();
  assert.equal(footer, wrap(B));
  assert.match(verified(B).text, /var FILL = "B";/);
});

test("R2-12 mutant: one changed character in the text breaks the recorded hash", async () => {
  const { B } = await built();
  const tampered = B.replace("POLL_MS = 200", "POLL_MS = 201");
  assert.notEqual(tampered, B, "the mutation applied");
  assert.throws(() => verified(tampered), /sha256 recomputed/);
});
