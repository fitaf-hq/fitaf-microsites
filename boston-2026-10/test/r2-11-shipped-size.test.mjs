// R2-11: the size rule (SPEC-rung2 § 3, "under 5 KB"), enforced BY THE BUILD on every file it writes: the Footer
// block, which carries ONLY the fill the source's FILL names, and one console file per fill for the one-browser
// run. Each file is self-contained and holds one fill's code, not both. The limit is shown to fire (R2-11c).
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildStorefront, MAX_SHIPPED_BYTES, STOREFRONT_SOURCE } from "../scripts/build-storefront.mjs";

const FILES = ["fitaf-handoff.fill-A.console.js", "fitaf-handoff.fill-B.console.js", "fitaf-handoff.html"];
/** Code that exists only in one fill: its presence in the other fill's file means the strip failed. */
const ONLY_IN = {
  A: [/hmp_local_cart/, /localStorage/, /function fillA/, /10538/, /productId/],
  B: [/app-product-card/, /\.click\(/, /setTimeout/, /function fillB/, /Add to Cart/],
};

async function withBuild(fn, options = {}) {
  const out = await mkdtemp(join(tmpdir(), "boston-storefront-"));
  try {
    const built = await buildStorefront({ outDir: out, ...options });
    const read = (name) => readFile(join(out, name), "utf8");
    return await fn({ built, read, out });
  } finally {
    await rm(out, { recursive: true, force: true });
  }
}

test("R2-11a: build:storefront writes exactly three files, each under 5,120 bytes", async () => {
  assert.equal(MAX_SHIPPED_BYTES, 5120);
  await withBuild(async ({ built, out }) => {
    assert.deepEqual(built.files.map((f) => f.name).sort(), FILES);
    for (const f of built.files) {
      const bytes = (await readFile(join(out, f.name))).length;
      assert.equal(bytes, f.bytes);
      assert.ok(bytes < MAX_SHIPPED_BYTES, `${f.name}: ${bytes} bytes`);
    }
  });
});

test("R2-11b: each file holds one fill only, is self-contained, and names nothing that sends or loads", async () => {
  await withBuild(async ({ read }) => {
    const files = {
      A: await read("fitaf-handoff.fill-A.console.js"),
      B: await read("fitaf-handoff.fill-B.console.js"),
      footer: await read("fitaf-handoff.html"),
    };
    const fillOf = { A: "A", B: "B", footer: "B" }; // the committed source's FILL is B
    for (const [label, text] of Object.entries(files)) {
      const own = fillOf[label];
      const other = own === "A" ? "B" : "A";
      assert.match(text, new RegExp(`var FILL = "${own}";`), `${label} names its fill`);
      for (const re of ONLY_IN[own]) assert.match(text, re, `${label} has its own fill's ${re}`);
      for (const re of ONLY_IN[other]) assert.doesNotMatch(text, re, `${label} carries fill ${other}'s ${re}`);
      assert.doesNotMatch(text, /^\s*(import|export)\b/m, "no module syntax");
      assert.doesNotMatch(text, /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts)\b/);
      assert.doesNotMatch(text, /\bnew Image\b|createElement\(\s*["']script/, "loads nothing else");
      assert.doesNotMatch(text, /https?:\/\//, "names no other address");
      assert.doesNotMatch(text, /<fill [AB]>|^\s*\/\//m, "no source-only line left");
    }
    assert.equal((files.footer.match(/<script>/g) ?? []).length, 1);
    assert.equal((files.footer.match(/<\/script>/g) ?? []).length, 1, "the text cannot close its own tag early");
  });
});

test("R2-11c: the limit fires — a source padded past it is refused, and nothing is written", async () => {
  const dir = await mkdtemp(join(tmpdir(), "boston-storefront-src-"));
  try {
    const padded = join(dir, "fitaf-handoff.js");
    const pad = `/* ${"x".repeat(MAX_SHIPPED_BYTES)} */\n`;
    await writeFile(padded, pad + (await readFile(STOREFRONT_SOURCE, "utf8")));
    const out = join(dir, "never-written");
    await assert.rejects(buildStorefront({ outDir: out, sourcePath: padded }), /must be under 5120/);
    assert.equal(existsSync(out), false, "nothing written");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
