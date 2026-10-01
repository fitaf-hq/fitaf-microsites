// Shared by the sm-*.test.mjs files (SPEC-storybook-microsite.md § 5). Not a test file itself.
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const TOOL = dirname(dirname(fileURLToPath(import.meta.url)));
export const SITE = join(TOOL, "..", "..");
export const REPO = join(SITE, "..");

/** What SM-4 does not read (§ 5): the install and the static build. */
export const NOT_THE_TOOLS_OWN = ["node_modules", "storybook-static"];

/** The tool's files under git (tracked, or new and not ignored), as paths relative to the tool. */
export function toolFiles() {
  const out = execFileSync("git", ["-C", REPO, "ls-files", "--cached", "--others", "--exclude-standard", "--", relative(REPO, TOOL)], {
    encoding: "utf8",
  });
  return out
    .split("\n")
    .filter(Boolean)
    .map((p) => relative(relative(REPO, TOOL), p));
}

/** Every file under `dir`, recursively, but node_modules/ and storybook-static/. */
export async function filesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (NOT_THE_TOOLS_OWN.includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await filesUnder(path)));
    else out.push(path);
  }
  return out;
}

export const read = (path) => readFile(path, "utf8");
export const readJson = async (path) => JSON.parse(await read(path));
