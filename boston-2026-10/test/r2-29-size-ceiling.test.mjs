// R2-29 (SPEC-rung2 § 11 item 5, the Advisor's ruling: "We can go up to 10k for the footer. 5k is a good target"): over
// each WHOLE built file, the build WARNS above 5,120 bytes and REFUSES above 10,240, writing nothing. Padded copies of
// the source (a `/* */` comment at its top, which ships, so every file grows by the same bytes) are built to exact
// sizes: 5,200 and 10,300 as the contract names them, and each limit's edge.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildStorefront, MAX_SHIPPED_BYTES, STOREFRONT_SOURCE, TARGET_SHIPPED_BYTES } from "../scripts/build-storefront.mjs";

const COMMIT = "0000000"; // fixed, so the version line's length does not depend on the checkout
const A = "fitaf-handoff.fill-A.console.js";
const FOOTER = "fitaf-handoff.html";

/** A comment of exactly `bytes` bytes, its newline included: at least 5 (the two delimiters and the newline). */
function pad(bytes) {
  assert.ok(bytes >= 5, `a pad of ${bytes} bytes`);
  return `/*${"x".repeat(bytes - 5)}*/\n`;
}

async function withCopy(padBytes, fn) {
  const dir = await mkdtemp(join(tmpdir(), "boston-storefront-r2-29-"));
  try {
    const source = join(dir, "fitaf-handoff.js");
    await writeFile(source, (padBytes ? pad(padBytes) : "") + (await readFile(STOREFRONT_SOURCE, "utf8")));
    return await fn({ source, out: join(dir, "out") });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const build = (source, out) => buildStorefront({ outDir: out, sourcePath: source, commit: COMMIT });

/** Each file's size, unpadded. */
async function sizes() {
  return withCopy(0, async ({ source, out }) => Object.fromEntries((await build(source, out)).files.map((f) => [f.name, f.bytes])));
}

/** Built with `file` at exactly `bytes`: every file, its size on disk, and the warnings. */
async function builtWith(file, bytes) {
  const base = await sizes();
  return withCopy(bytes - base[file], async ({ source, out }) => {
    const built = await build(source, out);
    const onDisk = {};
    for (const f of built.files) onDisk[f.name] = (await stat(join(out, f.name))).size;
    return { built, onDisk };
  });
}

/** Refused with `file` at exactly `bytes`: the error, and whether anything was written. */
async function refusedWith(file, bytes) {
  const base = await sizes();
  return withCopy(bytes - base[file], async ({ source, out }) => {
    let error = null;
    try {
      await build(source, out);
    } catch (err) {
      error = err;
    }
    return { error, written: existsSync(out) };
  });
}

const warned = (built) => built.warnings.map((w) => w.split(":")[0]);

test("R2-29 fixture control: the limits, and the unpadded files under the target (so a pad can reach 5,120 exactly)", async () => {
  assert.deepEqual([TARGET_SHIPPED_BYTES, MAX_SHIPPED_BYTES], [5120, 10240]);
  const base = await sizes();
  assert.ok(base[A] <= TARGET_SHIPPED_BYTES - 5, `fill A's console file: ${base[A]} bytes`);
});

test("R2-29a: a built file of 5,200 bytes — built, with a warning naming it; every file written", async () => {
  const { built, onDisk } = await builtWith(A, 5200);
  assert.equal(onDisk[A], 5200);
  assert.ok(warned(built).includes(A), JSON.stringify(built.warnings));
  assert.match(built.warnings.find((w) => w.startsWith(A)), /^fitaf-handoff\.fill-A\.console\.js: 5,200 bytes, over the 5,120-byte target/);
  assert.deepEqual(Object.keys(onDisk).sort(), [A, "fitaf-handoff.fill-B.console.js", FOOTER].sort());
  for (const [name, bytes] of Object.entries(onDisk)) assert.equal(warned(built).includes(name), bytes > 5120, name);
});

test("R2-29b: a built file of 10,300 bytes — refused, naming it, and nothing written", async () => {
  const { error, written } = await refusedWith(FOOTER, 10300);
  assert.match(String(error?.message), /^fitaf-handoff\.html: 10,300 bytes; the ceiling is 10,240/);
  assert.equal(written, false, "nothing written, not even the directory");
});

test("R2-29c: the edges — 5,120 bytes is no warning and 5,121 is one; 10,240 is built and 10,241 refused", async () => {
  assert.ok(!warned((await builtWith(A, 5120)).built).includes(A), "5,120: on the target, no warning");
  assert.ok(warned((await builtWith(A, 5121)).built).includes(A), "5,121: a warning");
  const top = await builtWith(FOOTER, 10240);
  assert.equal(top.onDisk[FOOTER], 10240, "10,240: built");
  const over = await refusedWith(FOOTER, 10241);
  assert.match(String(over.error?.message), /10,241 bytes; the ceiling is 10,240/);
  assert.equal(over.written, false);
});
