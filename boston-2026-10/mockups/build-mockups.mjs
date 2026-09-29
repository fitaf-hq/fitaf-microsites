// `npm run build:mockups`: the four marketing mock-ups for the Boston trip, written to dist-mockups/
// (git-ignored): tent-card, flyer and banner as HTML + PNG, slideshow.html, and index.html. They are
// OUTPUTS of the page's own inputs (data/, src/template.html's tokens and fonts, the logo), the build's own
// QR code, and the photo manifest (mockups/photos.json). Never hand-edit dist-mockups/.
//
//   node mockups/build-mockups.mjs [--no-png] [--on YYYY-MM-DD] [--event <id>]
//
// --on picks the offer as the Worker would on that date (default: today in the send time zone);
// --event picks the event whose QR code the pieces carry (default: the first in data/events.json).
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyStatic, ROOT, writeQrCodes } from "../build.mjs";
import { loadInputs } from "./inputs.mjs";
import { campaign } from "./parts.mjs";
import { indexPage, PIECES, renderMockups } from "./pieces.mjs";
import { CHROME_DEFAULT, screenshot, sheetWindow } from "./png.mjs";

export * from "./inputs.mjs";
export { PIECES, renderMockups } from "./pieces.mjs";
export const DIST_MOCKUPS = join(ROOT, "dist-mockups");

/** Copy each photo the manifest names and the folder holds. Only named files: never the whole folder. */
async function copyPhotos(inputs, outDir) {
  const files = [...new Set(Object.values(inputs.photos).filter((p) => p.present).map((p) => p.file))].sort();
  if (files.length) await mkdir(join(outDir, "photos"), { recursive: true });
  for (const file of files) await copyFile(join(inputs.photosDir, file), join(outDir, "photos", file));
  return files.map((file) => join(outDir, "photos", file));
}

export async function buildMockups({ outDir = DIST_MOCKUPS, png = true, chrome = process.env.CHROME || CHROME_DEFAULT, ...options } = {}) {
  const inputs = await loadInputs(options);
  const pages = renderMockups(inputs);
  // The folder is wholly this build's output, so it starts empty: no stale piece or photo survives.
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const files = await copyStatic(outDir); // the page's fonts and logo
  const qr = await writeQrCodes(inputs.data.events, outDir); // the build's own QR codes
  const photos = await copyPhotos(inputs, outDir);
  const written = [];
  for (const piece of PIECES) {
    const path = join(outDir, piece.file);
    await writeFile(path, pages[piece.id]);
    written.push(path);
  }
  const index = join(outDir, "index.html");
  await writeFile(index, indexPage(inputs, { pngs: png }));
  written.push(index);
  const pngs = [];
  if (png) {
    for (const piece of PIECES.filter((p) => p.png)) {
      pngs.push(await screenshot({ chrome, html: join(outDir, piece.file), png: join(outDir, piece.png), ...sheetWindow(piece) }));
    }
  }
  return { pages: written, files, qr, photos, pngs, inputs };
}

function argsOf(argv) {
  const out = { png: true };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--no-png") out.png = false;
    else if (argv[i] === "--on") out.today = argv[(i += 1)];
    else if (argv[i] === "--event") out.eventId = argv[(i += 1)];
    else throw new Error(`unknown option ${argv[i]}`);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = await buildMockups(argsOf(process.argv.slice(2)));
  const { inputs } = out;
  for (const f of [...out.pages, ...out.pngs]) console.log(`wrote ${f}`);
  console.log(`${out.files.length + out.qr.length} fonts, logo and QR files; ${out.photos.length} photo(s) copied`);
  const missing = Object.entries(inputs.photos).filter(([, p]) => !p.present);
  for (const [slot, p] of missing) console.log(`placeholder: slot ${slot} (mockups/photos/${p.file} is not there)`);
  const { offer } = campaign(inputs);
  console.log(`offer: ${offer.id} (offerForSave on ${inputs.today}); QR: event "${inputs.data.events[inputs.eventIndex].id}"`);
}
