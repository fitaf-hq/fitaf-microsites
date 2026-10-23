// Shared by the cases of SPEC-print-pieces.md § 11 (the two event codes, `boston` and `seminar`) and QE13's mirror mutant.
// Not a test file itself.
//
// ⚠ § 11 item 5 names its cases Q12–Q15, which are already § 8's (q12-dropped-words, q13-14-address-and-variants,
// q15-four-flyers). Here they are QE12–QE15, "E" for the event codes, each numbered as § 11 numbers it.
import { copyFile, cp, mkdtemp, readFile, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { ROOT } from "../build.mjs";
import { CHROME, FITTING_BACK_PATH, oneAtATime } from "./print-fixtures.mjs";

export const BOSTON_URL = "https://eatfitaf.com/?e=boston";
export const SEMINAR_URL = "https://eatfitaf.com/?e=seminar";
/** § 11 item 1, word for word, after `demo` as it was committed before it (and stays first). The names of demo and
 *  boston since SPEC-save-offer-production.md § 9 item 2 (the Advisor, 2026-10-21: what E1 says after "You saved this
 *  offer at"); the ids, the URLs and the order as § 11 has them. */
export const EXPECTED_EVENTS = [
  { id: "demo", name: "eatfitaf.com", url: "https://eatfitaf.com/" },
  { id: "boston", name: "Fit AF's Boston event", url: BOSTON_URL },
  { id: "seminar", name: "the seminar of 23 October 2026", url: SEMINAR_URL },
];
/** § 11 item 4 (the orchestrator's ruling, 2026-10-18): the address printed under every event's code, its URL's host. */
export const ADDRESS = "eatfitaf.com";
/** The date the print builds pick the offer on: fixed, so a run does not depend on today. */
export const ON = "2026-10-20";

/** A PNG's QR code decoded by jsQR, or null; `rows` [from, to) decodes that band alone (one tent face at a time). */
export function decodePng(bytes, rows) {
  const png = PNG.sync.read(bytes);
  const [from, to] = rows ?? [0, png.height];
  const row = png.width * 4;
  return jsQR(new Uint8ClampedArray(png.data.subarray(from * row, to * row)), png.width, to - from)?.data ?? null;
}

const MODULE_PX = 8;

/**
 * An SVG code as writeQrCodes writes it (the qrcode package's renderer: a square viewBox of whole modules, one light
 * background path and one stroked dark path of M, m and h, each h a run of dark modules on the row its y falls in),
 * drawn MODULE_PX to a module and decoded by jsQR; null when it does not decode. Any other shape is refused, never
 * guessed at.
 */
export function decodeSvg(svg) {
  const box = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  const dark = [...svg.matchAll(/<path\b[^>]*\bstroke="[^"]+"[^>]*\bd="([^"]+)"/g)];
  if (!box || box[1] !== box[2] || dark.length !== 1) throw new Error("not writeQrCodes' SVG: one square viewBox and one stroked path");
  const n = Number(box[1]);
  const on = Array.from({ length: n }, () => new Array(n).fill(false));
  let x = 0;
  let y = 0;
  for (const [, cmd, args] of dark[0][1].matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
    const v = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (cmd === "M") [x, y] = v;
    else if (cmd === "m") [x, y] = [x + v[0], y + v[1]];
    else if (cmd === "h") {
      for (let i = 0; i < v[0]; i += 1) on[Math.floor(y)][x + i] = true;
      x += v[0];
    } else throw new Error(`a path command this reader does not draw: ${cmd}`);
  }
  const side = n * MODULE_PX;
  const data = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let py = 0; py < side; py += 1) {
    for (let px = 0; px < side; px += 1) {
      if (!on[Math.floor(py / MODULE_PX)][Math.floor(px / MODULE_PX)]) continue;
      data.fill(0, (py * side + px) * 4, (py * side + px) * 4 + 3);
    }
  }
  return jsQR(data, side, side)?.data ?? null;
}

/**
 * QE13's check over a package tree `root` (this package, or a mirror of it): `build:print` with no --event (no photos,
 * so every piece a -PROOF), into a temporary folder, one print build at a time across the suite; since § 12 with the
 * flyer's back's words that fit (print-fixtures.mjs FITTING_BACK_PATH: the back is not this check's). The problems, [] when
 * the pieces carry `boston`:
 *   - the report's QR line names the event `boston`, its URL and its file qr/boston.svg;
 *   - every printed face, as the build's measuring pass found its text, carries the address `eatfitaf.com` once and no
 *     text holding `?e=` (§ 11 item 4: the address is the URL's host; the code carries the full URL);
 *   - every printed page's PNG proof decodes to the boston URL, each face on its own (the tent's two, turned or not);
 *   - writeQrCodes' qr/boston.svg for data/events.json is byte for byte the one it writes for that URL alone, and the
 *     SVG decodes to it.
 */
export async function printDefaultProblems(root, { fourFlyers = true } = {}) {
  const { buildPrint } = await import(pathToFileURL(join(root, "print", "build-print.mjs")).href);
  const { writeQrCodes } = await import(pathToFileURL(join(root, "build.mjs")).href);
  const events = JSON.parse(await readFile(join(root, "data", "events.json"), "utf8"));
  const out = await mkdtemp(join(tmpdir(), "boston-qe13-"));
  const problems = [];
  try {
    const built = await oneAtATime(() => buildPrint({ chrome: CHROME, outDir: join(out, "dist-print"), today: ON, fourFlyers, backPath: FITTING_BACK_PATH }));
    const qr = built.lines.filter((l) => l.startsWith("QR: "));
    const line = /^QR: event "boston" \([^()]+\) carries https:\/\/eatfitaf\.com\/\?e=boston \(qr\/boston\.svg, written by build\.mjs writeQrCodes\)$/;
    if (qr.length !== 1 || !line.test(qr[0])) problems.push(`the report's QR line: ${JSON.stringify(qr)}`);
    for (const p of built.planned) {
      // § 11 item 4 (the orchestrator's ruling): the address printed under the code is the URL's host, on every face
      p.measured.faces.forEach((face, f) => {
        const texts = face.texts.map((t) => t.text);
        const n = texts.filter((t) => t === ADDRESS).length;
        if (n !== 1 || texts.some((t) => t.includes("?e="))) problems.push(`${p.stem}, face ${f + 1}: the address ${JSON.stringify(ADDRESS)} ${n} times; texts with ?e=: ${JSON.stringify(texts.filter((t) => t.includes("?e=")))}`);
      });
      const png = await readFile(join(out, "dist-print", `${p.stem}.png`));
      const height = PNG.sync.read(png).height;
      const band = Math.floor(height / p.piece.faces);
      for (let face = 0; face < p.piece.faces; face += 1) {
        const decoded = decodePng(png, [face * band, (face + 1) * band]);
        if (decoded !== BOSTON_URL) problems.push(`${p.stem}.png, face ${face + 1} of ${p.piece.faces}: decodes to ${JSON.stringify(decoded)}`);
      }
    }
    await writeQrCodes(events, join(out, "events"));
    await writeQrCodes([{ id: "boston", url: BOSTON_URL }], join(out, "url"));
    const svg = await readFile(join(out, "events", "qr", "boston.svg"), "utf8").catch(() => null);
    if (svg === null) problems.push("writeQrCodes wrote no qr/boston.svg for data/events.json");
    else {
      if (svg !== (await readFile(join(out, "url", "qr", "boston.svg"), "utf8"))) problems.push("qr/boston.svg is not writeQrCodes' for the boston URL");
      if (decodeSvg(svg) !== BOSTON_URL) problems.push(`qr/boston.svg decodes to ${JSON.stringify(decodeSvg(svg))}`);
    }
  } finally {
    await rm(out, { recursive: true, force: true });
  }
  return problems;
}

/**
 * A mirror of this package for the print build (protocols/mutate-in-a-mirror): build.mjs, package.json, wrangler.jsonc,
 * data/, scripts/, src/, mockups/ and print/ copied to a temporary directory, this package's node_modules linked, then
 * `edit(dir)`. Never the tree. ⛔ mockups/photos/ (git-ignored: the Owner's photographs, where a tree has them) is not
 * copied. The real path, as cc-harness's mirror(): the system's temporary directory may be reached through a link.
 */
export async function printMirror(edit = async () => {}) {
  const dir = await realpath(await mkdtemp(join(tmpdir(), "boston-qe-mirror-")));
  const photos = join(ROOT, "mockups", "photos");
  const notPhotos = (path) => path !== photos && !path.startsWith(photos + sep);
  for (const name of ["build.mjs", "package.json", "wrangler.jsonc"]) await copyFile(join(ROOT, name), join(dir, name));
  // consent/: the build reads DRAFT.md since SPEC-save-offer-production § 9 item 1.
  for (const name of ["data", "scripts", "src", "consent", "mockups", "print"]) await cp(join(ROOT, name), join(dir, name), { recursive: true, filter: notPhotos });
  await symlink(join(ROOT, "node_modules"), join(dir, "node_modules"));
  await edit(dir);
  return dir;
}
