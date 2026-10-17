// `npm run build:print`: the printed tent card and quarter-sheet flyer (SPEC-print-pieces.md), written to dist-print/
// (git-ignored, emptied at every run): tent-card.pdf and flyer.pdf, a PNG proof of each at 1× (one pixel per CSS pixel,
// 96 per inch), and assignment.json (which photo went where). A piece still carrying a placeholder (a photo, or the
// offer) is a proof: its files end "-PROOF", and the report's last line says what remains. The pieces are OUTPUTS of the
// mock-ups' own faces, parts and inputs (mockups/), so a change to a shared file changes the mock-up and the printed piece
// alike; the legend is not printed.
//
//   node print/build-print.mjs [--photos-dir DIR --rungs FILE] [--on YYYY-MM-DD] [--event ID]
//
// --photos-dir: the glam set's files, `<id>.jpg`; --rungs: Image Gauge's image-rungs.json for it (§ 3's rule picks the
// photos). Without them every photo position shows the mock-ups' labelled placeholder. --on and --event as the mock-ups'.
//
// Before printing, a measuring pass (measure.js, in Chrome, over a copy of each page) finds every photo's window, every
// run of text, the QR code and every painted field; the build refuses, printing nothing, when a photo is below MIN_PPI at
// its window, when text or the QR code is less than SAFE_IN inside the trim, or when a field meets a cut edge without
// running into the bleed (checks.mjs).
//
// ⛔ The photographs never enter this repository. They are read from --photos-dir, copied under their position's own file
// name (mockups/photos.json) into a temporary folder that the pages are printed from and that is removed after; only
// dist-print/ (ignored) holds what carries them, and only dist-print/assignment.json names their IDs.
import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyStatic, loadJson, ROOT, writeQrCodes } from "../build.mjs";
import { loadInputs, MANIFEST_PATH, readManifest } from "../mockups/inputs.mjs";
import { campaign } from "../mockups/parts.mjs";
import { CHROME_DEFAULT, runChrome, screenshot, SETTLE_MS } from "../mockups/png.mjs";
import { assignPhotos } from "./assign.mjs";
import { layoutRefusals, resolution } from "./checks.mjs";
import { jpegSize } from "./jpeg.mjs";
import { placeholdersOf, printPage } from "./pages.mjs";
import { CSS_PX_PER_INCH, pageOf, PRINT_PIECES } from "./sizes.mjs";

export const PRINT_DIR = dirname(fileURLToPath(import.meta.url));
export const DIST_PRINT = join(ROOT, "dist-print");
export const PROOF_SUFFIX = "-PROOF";
const PROOF_SCALE = 1;
const MEASURED = /<script\b[^>]*\bid="print-measure"[^>]*>([\s\S]*?)<\/script>/;
const DUMPED_UNMEASURED = Symbol("the page was dumped without its measurement");
const PDF_END = /%%EOF\s*$/;
const PDF_TAIL_BYTES = 64;
/**
 * A Chrome run silent this long has stalled (a healthy one took at most 2.0 s, measured 2026-10-17 over 270 runs at loads
 * to 137); it is run again, fresh, up to STALL_ATTEMPTS runs in all, each retry named in the report. A hang that is the
 * page's stalls every attempt and still fails (mockups/png.mjs runChrome; test/qc-chrome-stall.test.mjs).
 */
const STALL_MS = 30_000;
const STALL_ATTEMPTS = 3;

/** The file name before its extension: a piece with a placeholder left is a proof. */
export const stemOf = (piece, placeholders) => piece.stem + (placeholders.length ? PROOF_SUFFIX : "");

/** § 3: the rule's photos, each checked to be in --photos-dir and read for its pixel size, copied under its position's name. */
async function stagePhotos({ photosDir, rungsPath, manifest, stagedPhotos }) {
  const assignment = assignPhotos(await loadJson(rungsPath));
  await mkdir(stagedPhotos, { recursive: true });
  const pixels = {};
  for (const [position, id] of Object.entries(assignment.positions)) {
    const from = join(photosDir, `${id}.jpg`);
    if (!existsSync(from)) throw new Error(`photo position ${position}: ${id}.jpg is not in --photos-dir (${assignment.from[position]})`);
    const file = manifest.slots[position];
    if (!file) throw new Error(`photo position ${position} is not in mockups/photos.json`);
    try {
      pixels[position] = jpegSize(await readFile(from));
    } catch (err) {
      throw new Error(`photo position ${position}: ${id}.jpg: ${err.message}`);
    }
    await copyFile(from, join(stagedPhotos, file));
  }
  return { assignment, pixels };
}

/** The measuring pass: a copy of the page with measure.js, its DOM dumped by Chrome, the measurement read back. */
async function measure(run, html, measureJs) {
  const copy = html.replace(/\.html$/, ".measure.html");
  const page = await readFile(html, "utf8");
  await writeFile(copy, page.replace("</body>", `<script>\n${measureJs.trim()}\n</script>\n</body>`));
  const json = await runChrome({
    ...run,
    html: copy,
    args: [`--virtual-time-budget=${SETTLE_MS}`, "--dump-dom"],
    // A whole page dumped without the measurement will never gain it: say so at once rather than wait out the timeout
    ready: ({ stdout }) => MEASURED.exec(stdout)?.[1] ?? (stdout.includes("</html>") ? DUMPED_UNMEASURED : undefined),
    what: `measure ${basename(html)}`,
  });
  if (json === DUMPED_UNMEASURED) throw new Error(`Chrome dumped ${basename(copy)} before the measuring pass wrote its result`);
  return JSON.parse(json);
}

const completePdf = (path) => existsSync(path) && PDF_END.test(readFileSync(path).subarray(-PDF_TAIL_BYTES).toString("latin1"));

async function printPdf(run, html, pdf) {
  await runChrome({
    ...run,
    html,
    args: [`--virtual-time-budget=${SETTLE_MS}`, "--no-pdf-header-footer", `--print-to-pdf=${pdf}`],
    ready: () => completePdf(pdf),
    what: `write ${pdf}`,
  });
  return pdf;
}

/** The pages, each measured and checked; nothing printed. Throws the refusals, every piece's, when there are any. */
async function planPieces({ run, stage, inputs, pixels }) {
  const printCss = await readFile(join(PRINT_DIR, "print.css"), "utf8");
  const measureJs = await readFile(join(PRINT_DIR, "measure.js"), "utf8");
  const planned = [];
  for (const piece of PRINT_PIECES) {
    const html = join(stage, `${piece.id}.html`);
    await writeFile(html, printPage(piece, inputs, printCss));
    const measured = await measure(run, html, measureJs);
    const photos = resolution(measured.faces.flatMap((f) => f.photos), pixels);
    const refusals = [...layoutRefusals(piece, measured), ...photos.refusals];
    const placeholders = placeholdersOf(piece, inputs);
    planned.push({ piece, html, measured, photos: photos.rows, refusals, placeholders, stem: stemOf(piece, placeholders) });
  }
  const refused = planned.flatMap((p) => p.refusals.map((r) => `${p.piece.id}: ${r}`));
  if (refused.length) throw new Error(`refused, nothing printed:\n${refused.join("\n")}`);
  return planned;
}

function assignmentRecord(chosen, planned) {
  const rows = Object.fromEntries(planned.flatMap((p) => p.photos.map((r) => [r.slot, r])));
  const positions = PRINT_PIECES.flatMap((p) => p.positions).map((position) => {
    if (!chosen) return [position, null];
    const r = rows[position];
    const windowIn = [r.w, r.h].map((n) => Number(n.toFixed(3)));
    return [position, { id: chosen.assignment.positions[position], from: chosen.assignment.from[position], pixels: [r.width, r.height], window_in: windowIn, ppi: Math.floor(r.ppi) }];
  });
  return {
    about: "SPEC-print-pieces.md § 3: which photo went where, by rule. Written by npm run build:print into dist-print/, which git ignores: never committed.",
    pool: chosen ? chosen.assignment.pool : null,
    positions: Object.fromEntries(positions),
    pieces: Object.fromEntries(planned.map((p) => [p.piece.id, { pdf: `${p.stem}.pdf`, png: `${p.stem}.png`, placeholders: p.placeholders }])),
  };
}

/** The report: a line per file, the photos, the offer, the QR code, and LAST what placeholders remain. */
function reportLines({ written, chosen, planned, inputs, eventId, retries }) {
  const { offer } = campaign(inputs);
  const event = inputs.data.events[inputs.eventIndex];
  const lines = written.map((f) => `wrote ${f}`);
  if (!chosen) lines.push("photos: none given (--photos-dir and --rungs): every position shows its placeholder");
  for (const r of planned.flatMap((p) => p.photos)) {
    lines.push(`photo ${r.slot}: ${chosen.assignment.from[r.slot]}; ${r.width} × ${r.height} px over ${r.w.toFixed(2)} × ${r.h.toFixed(2)} in = ${Math.floor(r.ppi)} ppi`);
  }
  lines.push(`offer: ${offer.id} (offerForSave on ${inputs.today}): "${offer.value}"`);
  const which = eventId === undefined ? "the first in data/events.json" : "--event";
  lines.push(`QR: event "${event.id}" (${which}) carries ${event.url} (qr/${event.id}.svg, written by build.mjs writeQrCodes)`);
  lines.push(...retries);
  const proofs = planned.filter((p) => p.placeholders.length);
  lines.push(
    proofs.length
      ? `placeholders remain: ${proofs.map((p) => `${p.stem}.pdf (${p.placeholders.join(", ")})`).join("; ")}`
      : `placeholders remain: none (${planned.map((p) => `${p.stem}.pdf`).join(", ")})`,
  );
  return lines;
}

export async function buildPrint({
  outDir = DIST_PRINT,
  chrome = process.env.CHROME || CHROME_DEFAULT,
  photosDir,
  rungsPath,
  manifestPath = MANIFEST_PATH,
  today,
  eventId,
  ...paths
} = {}) {
  if (Boolean(photosDir) !== Boolean(rungsPath)) throw new Error("--photos-dir and --rungs go together: give both, or neither for placeholders");
  // dist-print/ is wholly this build's output: emptied first, so a refused run leaves nothing to mistake for a piece.
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const stage = await mkdtemp(join(tmpdir(), "boston-print-"));
  const retries = [];
  const run = { chrome, timeoutMs: STALL_MS, attempts: STALL_ATTEMPTS, onRetry: (note) => retries.push(note) };
  try {
    const stagedPhotos = join(stage, "photos");
    const manifest = await readManifest(manifestPath);
    const chosen = photosDir ? await stagePhotos({ photosDir, rungsPath, manifest, stagedPhotos }) : null;
    const inputs = await loadInputs({ ...paths, manifestPath, photosDir: stagedPhotos, today, eventId });
    await copyStatic(stage, { base: null }); // the page's fonts and logo; no photo sheet
    await writeQrCodes(inputs.data.events, stage); // the build's own QR codes
    const planned = await planPieces({ run, stage, inputs, pixels: chosen?.pixels ?? {} });
    const written = [];
    for (const p of planned) {
      written.push(await printPdf(run, p.html, join(outDir, `${p.stem}.pdf`)));
      const page = pageOf(p.piece);
      const size = { width: Math.round(page.w * CSS_PX_PER_INCH), height: Math.round(page.h * CSS_PX_PER_INCH) };
      written.push(await screenshot({ ...run, html: p.html, png: join(outDir, `${p.stem}.png`), ...size, scale: PROOF_SCALE }));
    }
    const assignment = join(outDir, "assignment.json");
    await writeFile(assignment, `${JSON.stringify(assignmentRecord(chosen, planned), null, 2)}\n`);
    written.push(assignment);
    return { written, planned, inputs, chosen, retries, lines: reportLines({ written, chosen, planned, inputs, eventId, retries }) };
  } catch (err) {
    if (retries.length) err.message += `\n(and Chrome runs retried before it: ${retries.join("; ")})`;
    throw err;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

function argsOf(argv) {
  const out = {};
  const value = (i) => {
    if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) throw new Error(`${argv[i]} needs a value`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === "--photos-dir") out.photosDir = value(i);
    else if (argv[i] === "--rungs") out.rungsPath = value(i);
    else if (argv[i] === "--on") out.today = value(i);
    else if (argv[i] === "--event") out.eventId = value(i);
    else throw new Error(`unknown option ${argv[i]}`);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { lines } = await buildPrint(argsOf(process.argv.slice(2)));
  for (const line of lines) console.log(line);
}
