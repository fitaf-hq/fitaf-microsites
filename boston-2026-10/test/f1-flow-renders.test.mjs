// F1: every mermaid block in flows/*.md has a committed render in flows/rendered/, drawn from the block's
// current text under the current theme (`npm run render:flows` stamps each SVG with both hashes). No
// Chrome: the stamps are compared, not the pictures. Each mutant runs on a COPY and must be caught.
import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FLOWS_DIR, flowBlocks, staleRenders } from "../scripts/flow-sources.mjs";
import { TEMPLATE_PATH, flowTheme } from "../scripts/flow-theme.mjs";

const theme = await flowTheme();

/** A copy of flows/ (the .md files and rendered/*.svg) to mutate. */
async function flowsCopy() {
  const dir = await mkdtemp(join(tmpdir(), "boston-flows-"));
  await cp(FLOWS_DIR, dir, { recursive: true, filter: (src) => !src.endsWith(".png") });
  return { dir, rendered: join(dir, "rendered"), done: () => rm(dir, { recursive: true, force: true }) };
}

test("F1: every mermaid block has a current render (control, on the committed files)", async () => {
  const blocks = await flowBlocks();
  assert.ok(blocks.length > 0, "flows/*.md holds mermaid blocks");
  assert.deepEqual(await staleRenders({ themeHash: theme.hash }), []);
});

test("F1: no block is missed — one extracted block per ```mermaid fence in each file", async () => {
  const blocks = await flowBlocks();
  for (const file of (await readdir(FLOWS_DIR)).filter((f) => f.endsWith(".md"))) {
    const fences = (await readFile(join(FLOWS_DIR, file), "utf8")).split("\n").filter((l) => l.startsWith("```mermaid"));
    assert.equal(blocks.filter((b) => b.file === file).length, fences.length, file);
  }
});

test("F1 mutant: a block's text changes and its render is reported stale", async () => {
  const copy = await flowsCopy();
  try {
    const path = join(copy.dir, "08-this-weeks-menu.md");
    const md = await readFile(path, "utf8");
    await writeFile(path, md.replace("MEAL --> MENU : close", "MEAL --> MENU : close the meal"));
    assert.deepEqual(await staleRenders({ flowsDir: copy.dir, renderedDir: copy.rendered, themeHash: theme.hash }), [
      "stale (the block changed): 08-this-weeks-menu.md block 1 → rendered/08-this-weeks-menu.svg",
    ]);
  } finally {
    await copy.done();
  }
});

test("F1 mutant: a colour token changes and every render is reported stale", async () => {
  const dir = await mkdtemp(join(tmpdir(), "boston-template-"));
  try {
    const template = join(dir, "template.html");
    const html = await readFile(TEMPLATE_PATH, "utf8");
    await writeFile(template, html.replace("--navy: #1b2360;", "--navy: #1b2361;"));
    const mutated = await flowTheme(template);
    assert.notEqual(mutated.hash, theme.hash);
    const problems = await staleRenders({ themeHash: mutated.hash });
    assert.equal(problems.length, (await flowBlocks()).length);
    assert.ok(problems.every((p) => p.startsWith("stale (the theme changed): ")), problems.join("\n"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("F1 mutant: a missing render and an orphan render are both reported", async () => {
  const copy = await flowsCopy();
  try {
    await rm(join(copy.rendered, "04-text.svg"));
    await cp(join(copy.rendered, "02-choose.svg"), join(copy.rendered, "09-retired.svg"));
    assert.deepEqual(await staleRenders({ flowsDir: copy.dir, renderedDir: copy.rendered, themeHash: theme.hash }), [
      "missing: 04-text.md block 1 → rendered/04-text.svg",
      "orphan (no block draws it): rendered/09-retired.svg",
    ]);
  } finally {
    await copy.done();
  }
});
