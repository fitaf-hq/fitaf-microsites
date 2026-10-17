// Shared by the Q*.test.mjs files (the printed pieces, SPEC-print-pieces.md). Not a test file itself.
//
// ⛔ No photograph is used: every "photo" here is a synthetic JPEG made at test time (a flat grey frame of the size asked
// for, every coefficient zero), written to a temporary folder and removed after. Its photo IDs are made at random each
// run, so no committed file can name one (Q5 checks that none does).
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { buildPrint } from "../print/build-print.mjs";
import { CHROME_DEFAULT } from "../mockups/png.mjs";

export const CHROME = process.env.CHROME || CHROME_DEFAULT;
/** Why a Chrome case skips, or false when it runs (the cases say so in the run's output). */
export const NO_CHROME = existsSync(CHROME) ? false : `no Chrome found at ${CHROME} (set CHROME=<path to the Chrome binary>)`;

/**
 * One printed-piece build at a time across the suite's processes (node --test runs files in parallel): each build runs
 * Chrome six times, and several at once beside the rest of the suite starved Chrome past its timeout on a loaded machine
 * (2026-10-17). A directory made atomically is the lock; one older than LOCK_STALE_MS is a crashed run's, and is removed.
 */
const LOCK = join(tmpdir(), "boston-print-chrome.lock");
const LOCK_STALE_MS = 10 * 60_000;
const LOCK_POLL_MS = 250;
async function oneAtATime(work) {
  for (;;) {
    try {
      await mkdir(LOCK);
      break;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      const age = await stat(LOCK).then((s) => Date.now() - s.mtimeMs, () => 0);
      if (age > LOCK_STALE_MS) await rm(LOCK, { recursive: true, force: true });
      await sleep(LOCK_POLL_MS);
    }
  }
  try {
    return await work();
  } finally {
    await rm(LOCK, { recursive: true, force: true });
  }
}

/** buildPrint with the cases' Chrome, one build at a time. */
export const lockedBuild = (options) => oneAtATime(() => buildPrint({ chrome: CHROME, ...options }));

const segment = (marker, body) => {
  const head = Buffer.from([0xff, marker, 0, 0]);
  head.writeUInt16BE(body.length + 2, 2);
  return Buffer.concat([head, body]);
};

/** An EXIF block (APP1) holding only an orientation, big-endian. */
function exifOrientation(orientation) {
  const tiff = Buffer.alloc(8 + 2 + 12 + 4);
  tiff.write("MM", 0, "latin1");
  tiff.writeUInt16BE(42, 2);
  tiff.writeUInt32BE(8, 4); // the first directory, right after the header
  tiff.writeUInt16BE(1, 8); // one entry
  tiff.writeUInt16BE(0x0112, 10); // Orientation
  tiff.writeUInt16BE(3, 12); // SHORT
  tiff.writeUInt32BE(1, 14);
  tiff.writeUInt16BE(orientation, 18);
  return segment(0xe1, Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]));
}

/**
 * A valid baseline JPEG, `width` × `height`, one grey channel, every block's coefficients zero (so a decoder draws it a
 * flat mid-grey). Each Huffman table holds one one-bit code: DC category 0, and AC end-of-block. `orientation` adds EXIF.
 */
export function fixtureJpeg(width, height, { orientation } = {}) {
  const dqt = segment(0xdb, Buffer.concat([Buffer.from([0x00]), Buffer.alloc(64, 1)]));
  const sof = segment(0xc0, Buffer.from([8, height >> 8, height & 0xff, width >> 8, width & 0xff, 1, 1, 0x11, 0]));
  const oneCode = (tableClass) => segment(0xc4, Buffer.from([tableClass << 4, 1, ...new Array(15).fill(0), 0]));
  const sos = segment(0xda, Buffer.from([1, 1, 0x00, 0, 63, 0]));
  const bits = Math.ceil(width / 8) * Math.ceil(height / 8) * 2; // per block: DC "0", then AC "0" (end of block)
  const scan = Buffer.alloc(Math.ceil(bits / 8), 0);
  if (bits % 8) scan[scan.length - 1] = (1 << (8 - (bits % 8))) - 1; // the last byte padded with ones
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    orientation ? exifOrientation(orientation) : Buffer.alloc(0),
    dqt,
    sof,
    oneCode(0),
    oneCode(1),
    sos,
    scan,
    Buffer.from([0xff, 0xd9]),
  ]);
}

/**
 * A PDF's pages, read from its bytes as Chrome writes them (objects in the clear): the page count (`/Type /Page`, not
 * `/Pages`) and every media box, as [x0, y0, x1, y1] in points.
 */
export function pdfPages(bytes) {
  const text = bytes.toString("latin1");
  if (!text.startsWith("%PDF-")) throw new Error("not a PDF");
  const pages = (text.match(/\/Type\s*\/Page(?![A-Za-z])/g) ?? []).length;
  const boxes = [...text.matchAll(/\/MediaBox\s*\[\s*([-\d.\s]+)\]/g)].map((m) => m[1].trim().split(/\s+/).map(Number));
  return { pages, boxes };
}

/** A photo ID in Image Gauge's form (p + six hex digits), new each run. */
export const randomId = () => `p${randomBytes(3).toString("hex")}`;

/**
 * A rungs file in the shape Image Gauge publishes for the glam set (`pools.<pool>.rungs`: rung "1" as `strongest` and
 * `also_good` photo IDs, rung k > 1 as `arrays` of k IDs), from the given rungs of the `glam` pool.
 */
export function rungsDoc({ strongest = [], alsoGood = [], arrays = {} } = {}, pool = "glam") {
  const rungs = { 1: { strongest, also_good: alsoGood } };
  for (const [k, list] of Object.entries(arrays)) rungs[k] = { arrays: list };
  return { what: "a test fixture: rungs of synthetic photo IDs", pools: { [pool]: { what: "fixture", rungs, unvetted: {} } }, photos: {} };
}

/**
 * A folder of synthetic photos and the rungs file that names them: rung 1 is `flyer` then others; rung 3's first array
 * holds the flyer's photo (so the rule must skip it), its second does not. `sizes` maps a role to [width, height].
 */
export async function photoSet({ sizes = {} } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "boston-print-photos-"));
  const ids = { flyer: randomId(), other: randomId(), large: randomId(), top: randomId(), bottom: randomId(), spare: randomId() };
  const size = (role) => sizes[role] ?? [2400, 2400];
  for (const [role, id] of Object.entries(ids)) await writeFile(join(dir, `${id}.jpg`), fixtureJpeg(...size(role)));
  const doc = rungsDoc({
    strongest: [],
    alsoGood: [ids.flyer, ids.other],
    arrays: { 3: [[ids.spare, ids.flyer, ids.other], [ids.large, ids.top, ids.bottom]] },
  });
  const rungsPath = join(dir, "image-rungs.json");
  await writeFile(rungsPath, JSON.stringify(doc, null, 1));
  return { dir, ids, rungsPath, doc };
}
