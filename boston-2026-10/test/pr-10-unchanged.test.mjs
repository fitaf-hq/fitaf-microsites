// PR-10 (SPEC-plan-page-refinement ⛔, § 5): unchanged. The Footer block's text (SHA-256 2a7f15ff…, R2-32's pin, moved
// from 914668de… by SPEC-rung2-progress-and-checkout §§ 17, 19, 21, 23 and 25, which change the text; built
// from the same data/messages.json and template the page now reads); the Worker as CC-8's golden records it; and the
// mock-ups' build still carries the phrases the page stopped showing (the event line, the hero, the plans' promises).
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadInputs, MOCKUPS_DIR, renderMockups } from "../mockups/build-mockups.mjs";
import { buildStorefront } from "../scripts/build-storefront.mjs";
import { MESSAGES, PLANS, workerFiles } from "./cc-harness.mjs";

const FOOTER_TEXT_SHA256 = "2a7f15ffe00be33ae7def70a45ecb667f1fb04f5cb6817e5504095a93f309214";
const VERSION_LINE = /^\/\* fitaf-handoff \S+ sha256:[0-9a-f]{64} \*\/\n/;
const golden = JSON.parse(await readFile(new URL("./cc-08-unchanged-golden.json", import.meta.url), "utf8"));

test("PR-10: the Footer block's text, CC-8's Worker, and the mock-ups' phrases are unchanged", async () => {
  const out = await mkdtemp(join(tmpdir(), "boston-pr-10-"));
  try {
    await buildStorefront({ outDir: out, commit: "0000000" });
    const text = (await readFile(join(out, "fitaf-handoff.fill-B.console.js"), "utf8")).replace(VERSION_LINE, "");
    assert.equal(createHash("sha256").update(text, "utf8").digest("hex"), FOOTER_TEXT_SHA256, "the Footer block's text");
  } finally {
    await rm(out, { recursive: true, force: true });
  }
  assert.deepEqual(await workerFiles(), golden.worker, "the Worker, as CC-8's golden");
  const pieces = Object.values(renderMockups(await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder"), today: "2026-10-15" }))).join("\n");
  for (const phrase of [MESSAGES.headline, ...MESSAGES.event_line, ...PLANS.individual.map((p) => p.promise)]) {
    assert.ok(pieces.includes(phrase.replace(/&/g, "&amp;")) || pieces.includes(phrase), `the mock-ups carry: ${phrase}`);
  }
});
