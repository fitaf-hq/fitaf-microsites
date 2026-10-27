// Shared by EL1–EL10, E1 in the flyers' language (SPEC-ui-and-copy-pass.md § 8). Not a test file itself.
//   - the band as the flyer draws it, read here from the flyer's own files (data/flyer-front.json, its words, and
//     print/print.css, its colours), independently of the email's renderer;
//   - a mirror of the Worker's modules and data (a copy in a temporary directory; the committed files are never written);
//   - a generated GIF, flat colours only (⛔ never a photograph), and the checks the slideshow's file must pass.
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";

export const FLYER_FRONT_PATH = join(ROOT, "data", "flyer-front.json");
export const PRINT_CSS_PATH = join(ROOT, "print", "print.css");

/** § 8 item 1, the images E1's band and footer draw: served from the Worker's assets beside the logo (SITE_URL/assets/). */
export const EMAIL_IMAGE_PATHS = {
  halftoneInk: "assets/email/halftone-ink.png",
  halftoneCta: "assets/email/halftone-cta.png",
  logo: "assets/email/fitaf-logo-reversed.png",
};
/** The reversed logo at the band's top right and at the footer's right, as drawn (its file is twice the band's width). */
export const BAND_LOGO_PX = { width: 120, height: 52 };
export const FOOT_LOGO_PX = { width: 90, height: 39 };
export const LOGO_FILE_PX = { width: 240, height: 104 };
/** § 8's email-safe rule for the slideshow, and Gmail's clip for the HTML part. */
export const SLIDESHOW_MAX_BYTES = 800 * 1024;
export const GMAIL_CLIP_BYTES = 102 * 1024;

/** § 8's words (the Advisor's, quoted there), and the lines DRAFT § 3 kept. */
export const CLAIM = "Claim my offer";
export const SEE = "See my offer";
export const ENDED = "This offer has ended";
export const ALREADY = "Already ordered? Enjoy your meals!";
export const FOOTER_LINE = "You're getting this email because you saved an offer at eatfitaf.com";
export const POSTAL = "Fit AF Nutrition, 10 Enterprise, Carbondale, PA 18407.";
/** Each E1 sample of test/email-fixture.mjs: the line under its button (§ 8 item 4). */
export const SAVED_LINES = {
  e1_ticked: "Your code: SAMP-LE23 · held until November 30, 2026",
  e1_unticked: "Your code: SAMP-LE23 · held until November 30, 2026",
  e1_held_ticked: "Your pricing is held until October 29, 2026",
  e1_held_unticked: "Your pricing is held until October 29, 2026",
  e1_held_ended: ENDED,
  e1_held_slideshow: "Your pricing is held until October 29, 2026",
};
/** § 8's E1, top to bottom, as a reader reads its lines: the band's, the button's label, the line under it, Already
 *  ordered?, the footer's two. (The slideshow has no words.) */
export const expectedLines = (name, band) => [...band.lines, name === "e1_held_ended" ? SEE : CLAIM, SAVED_LINES[name], ALREADY, FOOTER_LINE, POSTAL];

/** The words between asterisks of a line, and the line as a reader reads it (the asterisks gone). */
export const accentWords = (line) => line.split("*").filter((_, i) => i % 2 === 1);
export const plainLine = (line) => line.replaceAll("*", "");

/** The flyer's accent colours, from its own stylesheet (print.css): the headline's, and the lede's by `ledeAccent`. */
export async function flyerAccents() {
  const css = await readFile(PRINT_CSS_PATH, "utf8");
  const headline = /\.print-flyer \.fb-accent \{ color: var\((--[a-z-]+)\); \}/.exec(css)?.[1];
  const lede = Object.fromEntries(
    [...css.matchAll(/\.fb-lede\[data-lede-accent="([a-z]+)"\] \.fb-lede-accent \{ color: var\((--[a-z-]+)\); \}/g)].map((m) => [m[1], m[2]]),
  );
  assert.ok(headline && Object.keys(lede).length >= 3, "control: print.css's accent rules were read");
  return { headline, lede };
}

/** The band as the flyer front's file and stylesheet give it: its lines in order (the headline's, then the lede's, as
 *  a reader reads them) and every accented word with the token it is drawn in. */
export async function bandExpected(path = FLYER_FRONT_PATH) {
  const front = JSON.parse(await readFile(path, "utf8"));
  const ledeLines = typeof front.lede === "string" ? [front.lede] : front.lede;
  const { headline, lede } = await flyerAccents();
  const ledeToken = lede[front.ledeAccent ?? "orange"];
  return {
    front,
    lines: [...front.headline.map(plainLine), ...ledeLines.map(plainLine)],
    headlineLines: front.headline.map(plainLine),
    ledeLines: ledeLines.map(plainLine),
    accents: [
      ...front.headline.flatMap(accentWords).map((text) => ({ text, token: headline, where: "headline" })),
      ...ledeLines.flatMap(accentWords).map((text) => ({ text, token: ledeToken, where: "lede" })),
    ],
  };
}

/**
 * A copy of src/worker/ and data/ in a temporary directory, `edit(dir)` applied to it (the committed files are never
 * written). `module(file)` imports a module of the copy (its own data files with it, by its relative imports).
 */
export async function workerMirror(edit = async () => {}) {
  const dir = await mkdtemp(join(tmpdir(), "boston-el-mirror-"));
  await cp(join(ROOT, "src", "worker"), join(dir, "src", "worker"), { recursive: true });
  await cp(join(ROOT, "data"), join(dir, "data"), { recursive: true });
  await edit(dir);
  return {
    dir,
    module: (file) => import(pathToFileURL(join(dir, "src", "worker", file)).href),
    dispose: () => rm(dir, { recursive: true, force: true }),
  };
}

/** A JSON file of the mirror, changed by `change(value)` (which returns the new value). */
export async function editJson(path, change) {
  const value = JSON.parse(await readFile(path, "utf8"));
  await writeFile(path, JSON.stringify(change(value), null, 2) + "\n");
}

// ---- A generated GIF: flat colours, `frames` frames of `delayCs` hundredths, looping (NETSCAPE2.0). ----

const PALETTE = [
  [0x21, 0x25, 0x29],
  [0xd6, 0x64, 0x00],
  [0x8c, 0xc6, 0x3f],
  [0xff, 0xff, 0xff],
];
const MIN_CODE_SIZE = 2;
const CLEAR = 1 << MIN_CODE_SIZE;
const CODE_BITS = MIN_CODE_SIZE + 1;
/** A clear code after every two pixels keeps every code at 3 bits (no dictionary entry reaches 8), so no LZW is needed. */
const PIXELS_PER_CLEAR = 2;

const le16 = (n) => [n & 0xff, (n >> 8) & 0xff];

function frameData(width, height, colour) {
  const codes = [];
  for (let i = 0; i < width * height; i++) {
    if (i % PIXELS_PER_CLEAR === 0) codes.push(CLEAR);
    codes.push(colour);
  }
  codes.push(CLEAR + 1); // end of information
  const bytes = [];
  let acc = 0;
  let bits = 0;
  for (const c of codes) {
    acc |= c << bits;
    bits += CODE_BITS;
    while (bits >= 8) {
      bytes.push(acc & 0xff);
      acc >>= 8;
      bits -= 8;
    }
  }
  if (bits) bytes.push(acc & 0xff);
  const blocks = [Buffer.from([MIN_CODE_SIZE])];
  for (let i = 0; i < bytes.length; i += 255) {
    const chunk = bytes.slice(i, i + 255);
    blocks.push(Buffer.from([chunk.length, ...chunk]));
  }
  blocks.push(Buffer.from([0]));
  return Buffer.concat(blocks);
}

/** A valid GIF89a of flat colour frames (each frame the next palette colour). */
export function fixtureGif({ width = 600, height = 400, frames = 2, delayCs = 250 } = {}) {
  const out = [Buffer.from([...Buffer.from("GIF89a"), ...le16(width), ...le16(height), 0xf1, 0, 0, ...PALETTE.flat()])];
  out.push(Buffer.from([0x21, 0xff, 0x0b, ...Buffer.from("NETSCAPE2.0"), 0x03, 0x01, 0, 0, 0]));
  for (let f = 0; f < frames; f++) {
    out.push(Buffer.from([0x21, 0xf9, 0x04, 0x00, ...le16(delayCs), 0, 0]));
    out.push(Buffer.from([0x2c, 0, 0, 0, 0, ...le16(width), ...le16(height), 0]));
    out.push(frameData(width, height, f % PALETTE.length));
  }
  out.push(Buffer.from([0x3b]));
  return Buffer.concat(out);
}

/** What a GIF's bytes say: its screen size, its frames' delays (hundredths) and whether it loops. */
export function readGif(bytes) {
  if (bytes.subarray(0, 6).toString("latin1") !== "GIF89a") return null;
  const width = bytes.readUInt16LE(6);
  const height = bytes.readUInt16LE(8);
  const packed = bytes[10];
  let i = 13 + (packed & 0x80 ? 3 * 2 ** ((packed & 7) + 1) : 0);
  const delays = [];
  let loops = false;
  const skipBlocks = () => {
    while (bytes[i] !== 0) i += bytes[i] + 1;
    i += 1;
  };
  while (i < bytes.length) {
    const b = bytes[i];
    if (b === 0x3b) break;
    if (b === 0x21) {
      const label = bytes[i + 1];
      if (label === 0xf9) delays.push(bytes.readUInt16LE(i + 4));
      if (label === 0xff && bytes.subarray(i + 3, i + 14).toString("latin1") === "NETSCAPE2.0") loops = true;
      i += 2;
      skipBlocks();
    } else if (b === 0x2c) {
      const p = bytes[i + 9];
      i += 10 + (p & 0x80 ? 3 * 2 ** ((p & 7) + 1) : 0);
      i += 1; // LZW minimum code size
      skipBlocks();
    } else {
      return null;
    }
  }
  return { width, height, frames: delays.length, delays, loops };
}

/**
 * § 8 item 2 and its email-safe rule, over a photo manifest and the sheets directory beside it: when the manifest names a
 * slideshow, its file is there, is a looping GIF of the manifest's size and frames at its frame_ms, 600 × 400 (3:2), and
 * at most 800 KB. Returns the problems (none for a manifest without one).
 */
export async function slideshowProblems(manifest, sheetsDir) {
  const entry = manifest?.base == null ? null : manifest.email_slideshow;
  if (!entry) return [];
  const problems = [];
  let bytes;
  try {
    bytes = await readFile(join(sheetsDir, entry.file));
  } catch {
    return [`the manifest names ${entry.file}, which is not in the sheets' directory`];
  }
  if (bytes.length > SLIDESHOW_MAX_BYTES) problems.push(`${entry.file} is ${bytes.length} bytes, over ${SLIDESHOW_MAX_BYTES}`);
  const gif = readGif(bytes);
  if (!gif) return [...problems, `${entry.file} is not a GIF89a`];
  if (gif.width !== 600 || gif.height !== 400) problems.push(`${entry.file} is ${gif.width} x ${gif.height}, not 600 x 400`);
  if (gif.width !== entry.width || gif.height !== entry.height) problems.push(`the manifest says ${entry.width} x ${entry.height}`);
  if (gif.frames !== entry.frames) problems.push(`${gif.frames} frames, the manifest says ${entry.frames}`);
  if (!gif.delays.every((d) => d * 10 === entry.frame_ms)) problems.push(`frame delays ${gif.delays.join(",")} cs, the manifest says ${entry.frame_ms} ms`);
  if (!gif.loops) problems.push(`${entry.file} does not loop`);
  return problems;
}
