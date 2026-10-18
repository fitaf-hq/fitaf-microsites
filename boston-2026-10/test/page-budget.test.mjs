// The page budget's one measure (SPEC.md § 1's note of 2026-10-18; test/page-budget.mjs): the page gzip-compressed under
// 60 × 1024 bytes, the raw size printed and never asserted. This file shows the measure is that one, and that it can
// fail: a page over the limit compressed fails it, in a MIRROR (cc-harness mirror(), never the tree:
// protocols/mutate-in-a-mirror.md) whose src/template.html carries, just before </body>, an HTML comment of 102,400
// characters that gzip cannot shrink below the budget (base64 of SHA-256 blocks, deterministic). The unchanged mirror's
// page passes first, as the control.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { builtPage } from "./a-harness.mjs";
import { mirror } from "./cc-harness.mjs";
import { assertPageBudget, PAGE_BUDGET_BYTES, transferBytes } from "./page-budget.mjs";

/** `blocks` × 32 bytes that do not compress (SHA-256 of a counter), as base64: 4/3 characters a byte. */
const incompressible = (blocks) =>
  Buffer.concat(Array.from({ length: blocks }, (_, i) => createHash("sha256").update(`page-budget ${i}`).digest())).toString("base64");

/** The production page of a mirror whose template is changed by `change(text)`; the mirror removed after. */
async function mirroredPage(change = (text) => text) {
  const dir = await mirror(async (d) => {
    const path = join(d, "src", "template.html");
    await writeFile(path, change(await readFile(path, "utf8")));
  });
  try {
    return await builtPage({ root: dir });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("page budget: the measure is gzip, not the raw size (a page over 60 KB raw that compresses under passes)", (t) => {
  const repetitive = `<!doctype html><title>x</title>${"<p>the same line, again and again</p>\n".repeat(2000)}`;
  assert.ok(Buffer.byteLength(repetitive) > PAGE_BUDGET_BYTES, "control: over 60 KB raw");
  assert.ok(transferBytes(repetitive) < PAGE_BUDGET_BYTES, "control: under it compressed");
  assertPageBudget(repetitive, "a repetitive page", t);
});

test("page budget: a mirror's page over the limit compressed fails it; the unchanged mirror's page passes (the control)", async (t) => {
  assertPageBudget(await mirroredPage(), "the unchanged mirror's production page", t);
  const padding = incompressible(2400);
  const heavy = await mirroredPage((text) => {
    assert.equal(text.split("</body>").length - 1, 1, "the template's </body>, once");
    return text.replace("</body>", () => `<!-- ${padding} -->\n</body>`);
  });
  assert.ok(heavy.includes(padding), "control: the padding reached the built page");
  assert.ok(transferBytes(heavy) > PAGE_BUDGET_BYTES, `control: over the budget compressed (${transferBytes(heavy)} gzip)`);
  assert.throws(() => assertPageBudget(heavy, "the padded mirror's production page", t), /under the 60 KB budget, gzip-compressed/);
});
