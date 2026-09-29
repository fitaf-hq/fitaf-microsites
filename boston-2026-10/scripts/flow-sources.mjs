// The mermaid blocks of flows/*.md and the renders that must match them. The .md files are the
// source; flows/rendered/<name>.svg is an output, stamped with the SHA-256 of the block it was drawn
// from and of the theme it was drawn in. Nothing here needs a browser (test F1 runs it on every `npm test`).
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { ROOT } from "../build.mjs";

export const FLOWS_DIR = join(ROOT, "flows");
export const RENDERED_DIR = join(FLOWS_DIR, "rendered");

/** A fenced ```mermaid block: the fence lines themselves are not part of the source. */
const MERMAID_BLOCK = /^```mermaid[^\S\n]*\n([\s\S]*?)^```[^\S\n]*$/gm;

/** flows/README.md's one diagram is the journey across all flows; it sorts first. */
const NAME_OVERRIDES = { "README.md": "00-journey" };

/** The stamp written as the SVG's first line, and read back by the test. */
const STAMP = /^<!-- (\S+) block (\d+) · source-sha256 ([0-9a-f]{64}) · theme-sha256 ([0-9a-f]{64}) · /;

export const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/** The source text of every mermaid block in one Markdown file, in order. */
export const mermaidBlocks = (markdown) => [...markdown.matchAll(MERMAID_BLOCK)].map((m) => m[1]);

/** `01-save-offer.md` → `01-save-offer`; a file with several blocks gets `-1`, `-2` … */
export function renderName(file, index, count) {
  const base = NAME_OVERRIDES[file] ?? basename(file, ".md");
  return count > 1 ? `${base}-${index + 1}` : base;
}

/** Every block of every flows/*.md, in file order then block order. */
export async function flowBlocks(flowsDir = FLOWS_DIR) {
  const files = (await readdir(flowsDir)).filter((f) => f.endsWith(".md")).sort();
  const blocks = [];
  for (const file of files) {
    const sources = mermaidBlocks(await readFile(join(flowsDir, file), "utf8"));
    sources.forEach((source, index) => {
      blocks.push({ file, index, name: renderName(file, index, sources.length), source, sourceHash: sha256(source) });
    });
  }
  return blocks;
}

/** The comment that opens a rendered SVG. */
export const stamp = (block, themeHash, renderer) =>
  `<!-- ${block.file} block ${block.index + 1} · source-sha256 ${block.sourceHash} · theme-sha256 ${themeHash} · ` +
  `rendered by \`npm run render:flows\` (${renderer}); the .md is the source, do not edit -->\n`;

export function readStamp(svg) {
  const m = svg.match(STAMP);
  return m && { file: m[1], block: Number(m[2]), sourceHash: m[3], themeHash: m[4] };
}

/**
 * What is out of date in the rendered directory: a block with no SVG, an SVG drawn from other text or
 * under another theme, and an SVG no block accounts for. An empty list means every render is current.
 */
export async function staleRenders({ flowsDir = FLOWS_DIR, renderedDir = RENDERED_DIR, themeHash }) {
  const blocks = await flowBlocks(flowsDir);
  const svgs = new Set((await readdir(renderedDir).catch(() => [])).filter((f) => f.endsWith(".svg")));
  const problems = [];
  for (const block of blocks) {
    const svgFile = `${block.name}.svg`;
    const where = `${block.file} block ${block.index + 1} → rendered/${svgFile}`;
    if (!svgs.delete(svgFile)) {
      problems.push(`missing: ${where}`);
      continue;
    }
    const got = readStamp(await readFile(join(renderedDir, svgFile), "utf8"));
    if (!got) problems.push(`no stamp: ${where}`);
    else if (got.file !== block.file || got.block !== block.index + 1) problems.push(`drawn from another block: ${where}`);
    else if (got.sourceHash !== block.sourceHash) problems.push(`stale (the block changed): ${where}`);
    else if (got.themeHash !== themeHash) problems.push(`stale (the theme changed): ${where}`);
  }
  for (const orphan of svgs) problems.push(`orphan (no block draws it): rendered/${orphan}`);
  return problems;
}
