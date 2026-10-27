// `npm run email:images`: the images E1 draws (SPEC-ui-and-copy-pass § 8), made from committed sources, never by hand,
// into src/assets/email/ (the build copies them into the assets of each Worker that sends E1):
//   - halftone-ink.png, the flyer's halftone for the band and the footer: one dot of the flyer's own colour (print.css
//     .fb-dots, --muted) on --ink, on the flyer's grid (mockups/pieces.mjs HALFTONE_PITCH, 9 px), as a tile the email
//     repeats as a cell's background image;
//   - halftone-cta.png, the same grid on the button's --cta, its dot the darker --cta-hover (the white label crosses the
//     dots, and white on the flyer's lighter --orange would fall under the label's contrast);
//   - fitaf-logo-reversed.png, print/assets/fitaf-logo-reversed.png's drawing at twice the band's 120 px (240 x 104), on the
//     band's own --ink (as the flyer draws it: print.css .fb-logo-rev, "so the halftone does not show through its field").
// Colours are src/worker/email-tokens.json's (the template's :root, `npm run email:tokens`). The PNGs are RGB, every pixel
// opaque; EL9 compares the committed files with this script's output pixel for pixel.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "../build.mjs";

const { PNG } = createRequire(import.meta.url)("pngjs");

export const EMAIL_IMAGES_DIR = join(ROOT, "src", "assets", "email");
export const LOGO_SOURCE = join(ROOT, "print", "assets", "fitaf-logo-reversed.png");
const TOKENS = join(ROOT, "src", "worker", "email-tokens.json");

/** The flyer's halftone grid (mockups/pieces.mjs HALFTONE_PITCH) and one dot's radius: about the approved mock's weight
 *  (its dots 1.3 px at a tenth of white; here the flyer's opaque --muted, so smaller). */
const HALFTONE_PITCH_PX = 9;
const HALFTONE_DOT_RADIUS_PX = 1.0;
/** Samples per pixel side for a dot's edge. */
const SUPERSAMPLE = 8;
const TILES = {
  "halftone-ink.png": { ground: "--ink", dot: "--muted" },
  "halftone-cta.png": { ground: "--cta", dot: "--cta-hover" },
};
/** The band's logo, 120 x 52, at twice that; its ground the band's. */
const LOGO = { file: "fitaf-logo-reversed.png", width: 240, height: 104, ground: "--ink" };

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** An RGB PNG of `width` x `height` from `pixel(x, y)` -> [r, g, b]. */
function png(width, height, pixel) {
  const image = new PNG({ width, height, colorType: 2 });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b] = pixel(x, y);
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(image, { colorType: 2 });
}

/** A tile with one dot at its centre: each pixel the ground mixed with the dot by the share of it the dot covers. */
function tile(ground, dot) {
  const centre = HALFTONE_PITCH_PX / 2;
  return png(HALFTONE_PITCH_PX, HALFTONE_PITCH_PX, (x, y) => {
    let inside = 0;
    for (let sy = 0; sy < SUPERSAMPLE; sy++) {
      for (let sx = 0; sx < SUPERSAMPLE; sx++) {
        const d = Math.hypot(x + (sx + 0.5) / SUPERSAMPLE - centre, y + (sy + 0.5) / SUPERSAMPLE - centre);
        if (d <= HALFTONE_DOT_RADIUS_PX) inside++;
      }
    }
    const share = inside / SUPERSAMPLE ** 2;
    return ground.map((g, k) => Math.round(g + (dot[k] - g) * share));
  });
}

/** One axis of an area-average: for each output index, the source indices it covers and by how much. */
function spans(from, to) {
  const scale = from / to;
  return Array.from({ length: to }, (_, o) => {
    const [start, end] = [o * scale, (o + 1) * scale];
    const out = [];
    for (let s = Math.floor(start); s < Math.min(from, Math.ceil(end)); s++) out.push([s, Math.min(end, s + 1) - Math.max(start, s)]);
    return out;
  });
}

/** The logo's drawing laid on `ground` (its alpha), then area-averaged to `width` x `height`. */
async function logo(ground) {
  const source = PNG.sync.read(await readFile(LOGO_SOURCE));
  const flat = new Float64Array(source.width * source.height * 3);
  for (let i = 0; i < source.width * source.height; i++) {
    const a = source.data[i * 4 + 3] / 255;
    for (let k = 0; k < 3; k++) flat[i * 3 + k] = source.data[i * 4 + k] * a + ground[k] * (1 - a);
  }
  const [xs, ys] = [spans(source.width, LOGO.width), spans(source.height, LOGO.height)];
  return png(LOGO.width, LOGO.height, (x, y) => {
    const sum = [0, 0, 0];
    let weight = 0;
    for (const [sy, wy] of ys[y]) {
      for (const [sx, wx] of xs[x]) {
        const w = wx * wy;
        const i = (sy * source.width + sx) * 3;
        for (let k = 0; k < 3; k++) sum[k] += flat[i + k] * w;
        weight += w;
      }
    }
    return sum.map((v) => Math.round(v / weight));
  });
}

/** Every image, as { file: PNG bytes }. */
export async function emailImages() {
  const { tokens } = JSON.parse(await readFile(TOKENS, "utf8"));
  const colour = (name) => {
    if (!/^#[0-9a-f]{6}$/i.test(tokens[name] ?? "")) throw new Error(`src/worker/email-tokens.json has no colour ${name}`);
    return rgb(tokens[name]);
  };
  const out = {};
  for (const [file, { ground, dot }] of Object.entries(TILES)) out[file] = tile(colour(ground), colour(dot));
  out[LOGO.file] = await logo(colour(LOGO.ground));
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await mkdir(EMAIL_IMAGES_DIR, { recursive: true });
  for (const [file, bytes] of Object.entries(await emailImages())) {
    await writeFile(join(EMAIL_IMAGES_DIR, file), bytes);
    console.log(`wrote ${join(EMAIL_IMAGES_DIR, file)} (${bytes.length} bytes)`);
  }
}
