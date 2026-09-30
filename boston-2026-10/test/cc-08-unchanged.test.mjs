// CC-8 (SPEC-chefs-choice § 4): unchanged. The store's Footer block's text, the watch's expected Footer, and the Worker
// are byte-identical to what they were before this contract (cc-08-unchanged-golden.json, recorded at e431b55, the
// contract's own commit). The Footer block's text is fill B's shipped text (R2-32 pins it); the watch's expectation is
// storefront/watch-baseline.json's expectedFooter; the Worker is every file its entry (wrangler.jsonc's main) reaches
// by import, its data files included. And a build with a picks file changes none of them.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { storefrontText } from "../scripts/build-storefront.mjs";
import { builtPage, ON, picksData, workerFiles } from "./cc-harness.mjs";

const golden = JSON.parse(await readFile(new URL("./cc-08-unchanged-golden.json", import.meta.url), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("CC-8a: the Footer block's text and the watch's expected Footer are unchanged", async () => {
  const text = await storefrontText();
  assert.equal(sha256(Buffer.from(text, "utf8")), golden.footer_text_sha256, "fill B's shipped text");
  const baseline = JSON.parse(await readFile(join(ROOT, "storefront", "watch-baseline.json"), "utf8"));
  assert.equal(baseline.expectedFooter, golden.watch_expected_footer, "the watch's expectedFooter");
  assert.ok(baseline.expectedFooter.endsWith(`sha256:${golden.footer_text_sha256}`), "control: the watch expects that text");
});

test("CC-8b: the Worker, every file its entry reaches, is unchanged", async () => {
  const config = await readFile(join(ROOT, "wrangler.jsonc"), "utf8");
  assert.match(config, /"main":\s*"src\/worker\/index\.js"/, "control: the Worker's entry");
  const files = await workerFiles();
  assert.ok(Object.keys(files).length >= 20, `control: the walk reaches the Worker's modules (${Object.keys(files).length})`);
  assert.deepEqual(files, golden.worker);
  for (const path of Object.keys(files)) assert.doesNotMatch(path, /chefs-choice|picks/, `the Worker reaches ${path}`);
});

test("CC-8c: a build carrying the week leaves the Footer's text and the Worker as they were", async () => {
  const { html } = await builtPage({ on: ON });
  assert.ok(picksData(html), "control: the build carried the week");
  assert.equal(sha256(Buffer.from(await storefrontText(), "utf8")), golden.footer_text_sha256);
  assert.deepEqual(await workerFiles(), golden.worker);
});
