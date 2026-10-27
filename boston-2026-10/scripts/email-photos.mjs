// `npm run email:photos`: copy the photo manifest's slideshow (data/photo-sheets.json's `base` and `email_slideshow`, Fit
// AF's emitter's) into src/worker/email-photos.json, the copy the Worker reads when it renders E1 (SPEC-ui-and-copy-pass
// § 8 item 2).
//
// Why a copy, as src/worker/email-tokens.json is: a Worker reads no file at run time, so it imports one, and importing the
// manifest itself would put every week's Chef's Choice sheet into the Worker (the manifest grows each week: the Worker's
// files, CC-8b, would move with it) and would refuse to bundle once the manifest is deleted (the README's way to remove
// every photograph). The copy is DERIVED: EL5 fails when it differs from the manifest, so a slideshow the emitter adds or
// removes reaches E1 by running this script, never by editing the JSON.
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PHOTOS_PATH, ROOT } from "../build.mjs";

export const EMAIL_PHOTOS = join(ROOT, "src", "worker", "email-photos.json");

const ABOUT =
  "DERIVED: do not edit. data/photo-sheets.json's base and email_slideshow (Fit AF's emitter's), copied by `npm run " +
  "email:photos` so the Worker draws E1's slideshow (SPEC-ui-and-copy-pass § 8 item 2) without importing the whole " +
  "manifest. No email_slideshow, or a null base: E1 has no photo row. Test EL5 fails when this file differs from the manifest.";

/** The copy, from a manifest (null when there is none: no photograph). */
export function emailPhotos(manifest) {
  const slideshow = manifest?.email_slideshow;
  return { about: ABOUT, source: "data/photo-sheets.json", base: manifest?.base ?? null, ...(slideshow ? { email_slideshow: slideshow } : {}) };
}

export const serialise = (file) => JSON.stringify(file, null, 2) + "\n";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const manifest = existsSync(PHOTOS_PATH) ? JSON.parse(await readFile(PHOTOS_PATH, "utf8")) : null;
  const file = emailPhotos(manifest);
  await writeFile(EMAIL_PHOTOS, serialise(file));
  console.log(`wrote ${EMAIL_PHOTOS} (${file.email_slideshow ? `slideshow ${file.email_slideshow.file}` : "no slideshow"})`);
}
