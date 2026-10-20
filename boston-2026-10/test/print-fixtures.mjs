// Shared by the Q*.test.mjs files (the printed pieces, SPEC-print-pieces.md). Not a test file itself.
//
// ⛔ No photograph is used: every "photo" here is a synthetic JPEG made at test time (a flat grey frame of the size asked
// for, every coefficient zero), written to a temporary folder and removed after. Its photo IDs are made at random each
// run, so no committed file can name one (Q5 checks that none does).
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { BACK_PATH } from "../print/back.mjs";
import { buildPrint } from "../print/build-print.mjs";
import { campaign } from "../mockups/parts.mjs";
import { CHROME_DEFAULT } from "../mockups/png.mjs";

export const CHROME = process.env.CHROME || CHROME_DEFAULT;

/**
 * SPEC-print-pieces.md § 12 item 5: a back whose words do not fit is REFUSED, and the whole build with it. The words are
 * the Advisor's to edit (data/flyer-back.md), so the cases about anything else build with words that fit: the committed
 * file less its last paragraph (read from it at run time, so every other word is the committed one), written to a
 * temporary file once per test process. Whether the committed file itself fits is a case of its own (Q23), the only one.
 */
export const fittingBackText = (text) => `${text.replace(/\n+$/, "").split("\n\n").slice(0, -1).join("\n\n")}\n`;
const FIT_DIR = mkdtempSync(join(tmpdir(), "boston-print-back-"));
export const FITTING_BACK_PATH = join(FIT_DIR, "flyer-back.md");
writeFileSync(FITTING_BACK_PATH, fittingBackText(readFileSync(BACK_PATH, "utf8")));
process.on("exit", () => rmSync(FIT_DIR, { recursive: true, force: true }));
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

/** One Chrome user at a time across the suite: the builds, and any case that runs Chrome itself. */
export { oneAtATime };

/**
 * buildPrint with the cases' Chrome and, unless a case names its own, the back's words that fit (FITTING_BACK_PATH), one
 * build at a time; any Chrome run it had to retry is printed into the suite's output.
 */
export const lockedBuild = (options) =>
  oneAtATime(async () => {
    const built = await buildPrint({ chrome: CHROME, backPath: FITTING_BACK_PATH, ...options });
    for (const note of built.retries) console.log(`print build: ${note}`);
    return built;
  });

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

/**
 * The words SPEC-print-pieces.md § 8 drops, read from the pieces' own data (never typed here): the tent's subhead and scan
 * prompt (item 1), and since § 10 its bar's words; the flyer's headline block, its headline, tagline, four plan names and
 * lowest price, and its scan prompt (item 2), and since § 9 its header bar's words ("Fit AF in Boston", "October 2026").
 */
export function droppedWords(inputs, pieceId) {
  const c = campaign(inputs);
  const bar = c.eventLine.map((v) => v.value);
  if (pieceId === "tent-card") return [...bar, c.subhead.value, c.scan.value];
  return [...bar, c.headline.value, c.tagline.value, ...c.plans.map((p) => p.name.value), c.fromPrice.value, c.scan.value];
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

/** The keys each fixture photo's squares are listed under, in the deliverable's order: the first is the one used. */
export const SQUARE_KEYS = ["tight", "as-composed"];

/**
 * A deliverable in the shape Image Gauge publishes for the glam set (`photos.<id>.squares[].key`, his good squares, best
 * first), listing `keys` for each ID; the IDs in `none` are listed with no square (`squares: []`).
 */
export const deliverableDoc = (ids, keys = SQUARE_KEYS, none = []) => ({
  what: "a test fixture: each synthetic photo's squares",
  photos: Object.fromEntries(ids.map((id) => [id, { squares: none.includes(id) ? [] : keys.map((key) => ({ key, box: [0, 0, 1, 1] })) }])),
});

/**
 * A folder of synthetic photos, the rungs file that names them and the deliverable that lists their squares. Each photo
 * is there as composed (`<id>.jpg`, 3000 × 2000, landscape, unless `sizes` maps its role to another [width, height]) and
 * as each square (`<id>-sq-<key>.jpg`, 1200 × 1200, or `squareSizes[role]`), but for the roles in `noSquare`, which have
 * no square file and which the deliverable lists with none. Rung 1 is the flyer's photo then another;
 * rung 3's first array holds the flyer's photo (so the rule must skip it), its second does not; rung 4's first array
 * holds one of the tent's photos (so § 8's rule must skip it), its second (`one` to `four`) does not. Since § 12 (the
 * flyer's back) rung 3 has two more arrays: the third holds one of the four flyers' photos (`two`), so the back's rule
 * must skip it, as it skips the first two (the flyer's photo, the tent's three); the fourth (`back1` to `back3`) is the
 * back's.
 */
export async function photoSet({ sizes = {}, squareSizes = {}, noSquare = [], rung1 = ["flyer", "other"] } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "boston-print-photos-"));
  const roles = ["flyer", "other", "large", "top", "bottom", "spare", "portrait", "one", "two", "three", "four", "back1", "back2", "back3"];
  const ids = Object.fromEntries(roles.map((role) => [role, randomId()]));
  for (const [role, id] of Object.entries(ids)) {
    await writeFile(join(dir, `${id}.jpg`), fixtureJpeg(...(sizes[role] ?? (role === "portrait" ? [2000, 3000] : [3000, 2000]))));
    if (noSquare.includes(role)) continue;
    for (const key of SQUARE_KEYS) await writeFile(join(dir, `${id}-sq-${key}.jpg`), fixtureJpeg(...(squareSizes[role] ?? [1200, 1200])));
  }
  const doc = rungsDoc({
    strongest: [],
    alsoGood: rung1.map((role) => ids[role]),
    arrays: {
      3: [[ids.spare, ids.flyer, ids.other], [ids.large, ids.top, ids.bottom], [ids.spare, ids.two, ids.other], [ids.back1, ids.back2, ids.back3]],
      4: [[ids.spare, ids.top, ids.other, ids.flyer], [ids.one, ids.two, ids.three, ids.four]],
    },
  });
  const rungsPath = join(dir, "image-rungs.json");
  await writeFile(rungsPath, JSON.stringify(doc, null, 1));
  const deliverablePath = join(dir, "deliverable.json");
  await writeFile(deliverablePath, JSON.stringify(deliverableDoc(Object.values(ids), SQUARE_KEYS, noSquare.map((role) => ids[role])), null, 1));
  /** The three photo options a build takes. */
  const photos = { photosDir: dir, rungsPath, deliverablePath };
  return { dir, ids, rungsPath, deliverablePath, doc, photos };
}
