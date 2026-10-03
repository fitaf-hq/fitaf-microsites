// R2-29 (SPEC-rung2 § 11 item 5, the Advisor's ruling: "We can go up to 10k for the footer. 5k is a good target"): over
// each WHOLE built file, the build WARNS above 5,120 bytes and REFUSES above 20,480 (SPEC-rung2-progress-and-checkout § 25.7; 15,360 by its § 17.3, 10,240 before), writing nothing. Padded copies of
// a source (a `/* */` comment at its top, which ships, so every file grows by the same bytes) are built to exact sizes:
// 5,200 and 10,300 as the contract names them, and each limit's edge. The ceiling's are reached from the source itself.
// A pad only adds, and fill B's files are well over the target unpadded (8,631 bytes since rung 2's two faces,
// SPEC-rung2-progress-and-checkout), so the target's (5,120, 5,121 and 5,200) are reached from a SMALL source: only the
// build's four slots (the plan counts, the screen's words and colours, the meal-key function), which the build fills
// as it fills the real one. (Until the two faces, a copy with the shipped header comment trimmed was small enough; and
// before SPEC-rung2 § 12 the file padded to the target was fill A's, which is retired.)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildStorefront, MAX_SHIPPED_BYTES, STOREFRONT_SOURCE, TARGET_SHIPPED_BYTES } from "../scripts/build-storefront.mjs";

const COMMIT = "0000000"; // fixed, so the version line's length does not depend on the checkout
const B = "fitaf-handoff.fill-B.console.js";
const FOOTER = "fitaf-handoff.html";
/** A source with nothing but the build's four slots, each filled as in the real one: small enough to pad to 5,120. */
const SMALL = '(function () {\nvar COUNTS = /*COUNTS*/ {}, UI = /*UI*/ {}, key = /*KEY*/ null, CSS = "/*TOKENS*/";\n})();\n';

/** A comment of exactly `bytes` bytes, its newline included: at least 5 (the two delimiters and the newline). */
function pad(bytes) {
  assert.ok(bytes >= 5, `a pad of ${bytes} bytes`);
  return `/*${"x".repeat(bytes - 5)}*/\n`;
}

/** A copy of the source (or, if `small`, the SMALL source), padded by `padBytes`. */
async function withCopy({ padBytes = 0, small = false }, fn) {
  const dir = await mkdtemp(join(tmpdir(), "boston-storefront-r2-29-"));
  try {
    const source = join(dir, "fitaf-handoff.js");
    const text = small ? SMALL : await readFile(STOREFRONT_SOURCE, "utf8");
    await writeFile(source, (padBytes ? pad(padBytes) : "") + text);
    return await fn({ source, out: join(dir, "out") });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const build = (source, out) => buildStorefront({ outDir: out, sourcePath: source, commit: COMMIT });

/** Each file's size, unpadded (from the SMALL source if `small`). */
async function sizes({ small = false } = {}) {
  return withCopy({ small }, async ({ source, out }) => Object.fromEntries((await build(source, out)).files.map((f) => [f.name, f.bytes])));
}

/** Built with `file` at exactly `bytes`: every file, its size on disk, and the warnings. */
async function builtWith(file, bytes, { small = false } = {}) {
  const base = await sizes({ small });
  return withCopy({ padBytes: bytes - base[file], small }, async ({ source, out }) => {
    const built = await build(source, out);
    const onDisk = {};
    for (const f of built.files) onDisk[f.name] = (await stat(join(out, f.name))).size;
    return { built, onDisk };
  });
}

/** Refused with `file` at exactly `bytes`: the error, and whether anything was written. */
async function refusedWith(file, bytes) {
  const base = await sizes();
  return withCopy({ padBytes: bytes - base[file] }, async ({ source, out }) => {
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

test("R2-29 fixture control: the limits; a pad can reach 20,480 from fill B's file, and 5,120 from the small source", async () => {
  assert.deepEqual([TARGET_SHIPPED_BYTES, MAX_SHIPPED_BYTES], [5120, 20480]); // § 25.7 (15,360 by § 17.3; 10,240 before)
  const base = await sizes();
  assert.ok(base[FOOTER] <= MAX_SHIPPED_BYTES - 5, `the Footer block: ${base[FOOTER]} bytes`);
  assert.ok(base[B] > TARGET_SHIPPED_BYTES, `fill B's console file is over the target unpadded: ${base[B]} bytes`);
  const small = await sizes({ small: true });
  assert.ok(small[B] <= TARGET_SHIPPED_BYTES - 5, `the small source's console file: ${small[B]} bytes`);
  const text = await readFile(STOREFRONT_SOURCE, "utf8");
  for (const slot of ["/*COUNTS*/ {}", "/*UI*/ {}", "/*KEY*/ null", "/*TOKENS*/"]) {
    assert.ok(text.includes(slot) && SMALL.includes(slot), `the small source carries the real one's ${slot}`);
  }
});

test("R2-29a: a built file of 5,200 bytes — built, with a warning naming it; every file written", async () => {
  const { built, onDisk } = await builtWith(B, 5200, { small: true });
  assert.equal(onDisk[B], 5200);
  assert.ok(warned(built).includes(B), JSON.stringify(built.warnings));
  assert.match(built.warnings.find((w) => w.startsWith(B)), /^fitaf-handoff\.fill-B\.console\.js: 5,200 bytes, over the 5,120-byte target/);
  assert.deepEqual(Object.keys(onDisk).sort(), [B, FOOTER].sort());
  for (const [name, bytes] of Object.entries(onDisk)) assert.equal(warned(built).includes(name), bytes > 5120, name);
});

test("R2-29b: a built file of 20,520 bytes — refused, naming it, and nothing written", async () => {
  const { error, written } = await refusedWith(FOOTER, 20520);
  assert.match(String(error?.message), /^fitaf-handoff\.html: 20,520 bytes; the ceiling is 20,480/);
  assert.equal(written, false, "nothing written, not even the directory");
});

test("R2-29c: the edges — 5,120 bytes is no warning and 5,121 is one; 20,480 is built and 20,481 refused", async () => {
  const onTarget = await builtWith(B, 5120, { small: true });
  assert.equal(onTarget.onDisk[B], 5120, "5,120: built");
  assert.ok(!warned(onTarget.built).includes(B), "5,120: on the target, no warning");
  assert.ok(warned((await builtWith(B, 5121, { small: true })).built).includes(B), "5,121: a warning");
  const top = await builtWith(FOOTER, 20480);
  assert.equal(top.onDisk[FOOTER], 20480, "20,480: built");
  const over = await refusedWith(FOOTER, 20481);
  assert.match(String(over.error?.message), /20,481 bytes; the ceiling is 20,480/);
  assert.equal(over.written, false);
});
