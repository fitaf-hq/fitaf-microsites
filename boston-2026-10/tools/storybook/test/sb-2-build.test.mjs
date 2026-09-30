// SB-2 (SPEC-storybook.md § 5): build-storybook succeeds, and its index.json lists the stories Timeline and Stage. The
// build goes to a temporary directory (the package's own script, its output directory given), so the tree is not
// written while it runs.
import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { TOOL } from "./paths.mjs";

const run = promisify(execFile);

test("SB-2: build-storybook succeeds; its index.json lists Timeline and Stage", { timeout: 300_000 }, async () => {
  const out = await mkdtemp(join(tmpdir(), "fitaf-storybook-sb-2-"));
  try {
    await run("npm", ["--prefix", TOOL, "run", "build-storybook", "--", "--output-dir", out, "--quiet"], {
      env: { ...process.env, STORYBOOK_DISABLE_TELEMETRY: "1" },
      maxBuffer: 64 * 1024 * 1024,
    });
    const index = JSON.parse(await readFile(join(out, "index.json"), "utf8"));
    const names = Object.values(index.entries).filter((e) => e.type === "story").map((e) => e.name);
    for (const name of ["Timeline", "Stage"]) assert.ok(names.includes(name), `index.json lists ${name}: ${names.join(", ")}`);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
