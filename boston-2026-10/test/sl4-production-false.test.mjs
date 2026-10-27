// SL4 (SPEC-ui-and-copy-pass.md § 6 items 1 and 4): the production page with `production` false (S20's, the rollback:
// no save step) opened at `#save` opens nothing: no save dialog on it, no dialog opened, the page at its start. And the
// pages that are not the plan page (/why/ and /privacy/, both builds) carry no script, so nothing on them reads `#save`.
// The first check is sl-checks.mjs's.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../build.mjs";
import { productionFalseProblems } from "./sl-checks.mjs";

test("SL4: the production page with production false, opened at #save, opens nothing", async () => {
  assert.deepEqual(await productionFalseProblems(), []);
});

test("SL4: /why/ and /privacy/ carry no script, on both builds, so #save means nothing there", async () => {
  for (const target of ["prod", "dev"]) {
    const outDir = await mkdtemp(join(tmpdir(), `boston-sl4-${target}-`));
    try {
      await build({ target, outDir });
      for (const page of ["why", "privacy"]) {
        const html = await readFile(join(outDir, page, "index.html"), "utf8");
        assert.doesNotMatch(html, /<script\b/i, `${target}: /${page}/ carries no script`);
      }
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  }
});
