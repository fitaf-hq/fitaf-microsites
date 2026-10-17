// A JPEG's pixel size, read from its header without decoding it: its frame's width and height (the SOF segment), as
// Chrome draws it upright. An EXIF orientation of 5 to 8 turns the frame a quarter, so its width and height swap
// (Chrome applies the orientation by default). SPEC-print-pieces.md § 3: the resolution check reads this.
const SOI = 0xd8;
const SOS = 0xda;
const EOI = 0xd9;
const APP1 = 0xe1;
/** The frame headers (baseline, progressive, lossless, arithmetic): not DHT (c4), JPG (c8) or DAC (cc). */
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const STANDALONE = (m) => m === 0x01 || (m >= 0xd0 && m <= 0xd7);
const ORIENTATION_TAG = 0x0112;
const QUARTER_TURNS = new Set([5, 6, 7, 8]);

/** The orientation in an EXIF block's first directory, or null. */
function exifOrientation(tiff) {
  const order = tiff.toString("latin1", 0, 2);
  if (order !== "II" && order !== "MM") return null;
  const le = order === "II";
  const u16 = (o) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  const dir = u32(4);
  for (let k = 0; k < u16(dir); k += 1) {
    const entry = dir + 2 + 12 * k;
    if (u16(entry) === ORIENTATION_TAG) return u16(entry + 8);
  }
  return null;
}

/** { width, height } in pixels, upright. Throws on anything that is not a JPEG with a frame header. */
export function jpegSize(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== SOI) throw new Error("not a JPEG (it does not start with SOI)");
  let orientation = 1;
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) throw new Error(`not a JPEG (no marker at byte ${i})`);
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i += 1; // a fill byte
      continue;
    }
    if (STANDALONE(marker)) {
      i += 2;
      continue;
    }
    if (marker === SOS || marker === EOI) break;
    const length = bytes.readUInt16BE(i + 2);
    const body = bytes.subarray(i + 4, i + 2 + length);
    if (marker === APP1 && body.toString("latin1", 0, 6) === "Exif\0\0") orientation = exifOrientation(body.subarray(6)) ?? orientation;
    if (SOF.has(marker)) {
      const size = { width: body.readUInt16BE(3), height: body.readUInt16BE(1) };
      return QUARTER_TURNS.has(orientation) ? { width: size.height, height: size.width } : size;
    }
    i += 2 + length;
  }
  throw new Error("not a JPEG (no frame header before the image data)");
}
