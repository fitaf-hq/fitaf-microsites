// Shared by the sb-*.test.mjs files (SPEC-storybook.md § 5). Not a test file itself.
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const TOOL = dirname(dirname(fileURLToPath(import.meta.url)));
export const SITE = join(TOOL, "..", "..");
export const REPO = join(SITE, "..");
export const MODULE = join(SITE, "src", "storefront", "progress-screen.js");
export const CONTRACT = join(SITE, "SPEC-rung2-progress-and-checkout.md");

/** The tool's files under git (tracked and not ignored), as paths relative to the tool. */
export function toolFiles() {
  const out = execFileSync("git", ["-C", REPO, "ls-files", "--cached", "--others", "--exclude-standard", "--", relative(REPO, TOOL)], { encoding: "utf8" });
  return out.split("\n").filter(Boolean).map((p) => relative(relative(REPO, TOOL), p));
}

/** Every file under `dir`, recursively, but node_modules and the static build. */
export async function filesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (["node_modules", "storybook-static"].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await filesUnder(path)));
    else out.push(path);
  }
  return out;
}

export const read = (path) => readFile(path, "utf8");
