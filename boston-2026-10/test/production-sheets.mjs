// Shared by S20 and SP3 (SPEC-week-content.md § 9.2): a production build's file map split into THE SHEETS (every path
// under assets/photo-sheets/) and THE REST. Not a test file itself. The sheets are inputs Fit AF's emitter writes each
// week (README: data/photo-sheets.json + src/assets/photo-sheets/, never by hand here), so a guard over the production
// build holds whatever sheets are committed: they are compared as byte copies of the tree's own src/assets/photo-sheets/,
// and the rest against S20's golden, which pins the code, not the week. The rule is the directory, never a list of weeks
// or a count.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";

/** Where a production build puts the photo sheets (data/photo-sheets.json's relative `base`), as a file map names them. */
export const SHEETS_DIR = "assets/photo-sheets/";

/** `files` (path -> SHA-256) split by the directory: { sheets, rest }, each a file map. */
export function splitSheets(files) {
  const sheets = {};
  const rest = {};
  for (const [path, hash] of Object.entries(files)) (path.startsWith(SHEETS_DIR) ? sheets : rest)[path] = hash;
  return { sheets, rest };
}

/** The tree's own src/assets/photo-sheets/ as a build's file map would name it (`assets/photo-sheets/<file>` -> SHA-256);
 *  a dot-file (a system's, e.g. .DS_Store) is no sheet. */
export async function committedSheets(root = ROOT) {
  const dir = join(root, "src", "assets", "photo-sheets");
  const files = {};
  for (const name of (await readdir(dir)).filter((n) => !n.startsWith(".")).sort()) {
    files[`${SHEETS_DIR}${name}`] = createHash("sha256").update(await readFile(join(dir, name))).digest("hex");
  }
  return files;
}

/** The line S20 and SP3 print and put in their messages: the sheets compared as copies, by name. */
export const sheetsLine = (sheets) => `${Object.keys(sheets).length} sheets compared as byte copies of src/assets/photo-sheets/: ${Object.keys(sheets).map((p) => p.slice(SHEETS_DIR.length)).join(", ")}`;
