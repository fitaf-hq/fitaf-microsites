// P4: the mock-ups carry the build's own event QR code: the files are what build.mjs writeQrCodes writes,
// byte for byte, they decode to the event's URL, every piece shows exactly one, and the mock-up code has
// no QR generator of its own.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { EVENTS_PATH, loadJson, writeQrCodes } from "../build.mjs";
import { buildMockups, MOCKUPS_DIR, PIECES } from "../mockups/build-mockups.mjs";
import { elements, hasClass } from "./mockup-html.mjs";

const events = await loadJson(EVENTS_PATH);
const out = await mkdtemp(join(tmpdir(), "boston-mockups-"));
const ref = await mkdtemp(join(tmpdir(), "boston-qr-ref-"));
const noPhotos = join(out, "no-such-folder");
after(async () => {
  await rm(out, { recursive: true, force: true });
  await rm(ref, { recursive: true, force: true });
});
const built = await buildMockups({ outDir: join(out, "dist"), png: false, photosDir: noPhotos });
await writeQrCodes(events, ref);

test("P4: the mock-ups' QR files are byte-identical to the build's", async () => {
  const names = (await readdir(join(ref, "qr"))).sort();
  assert.deepEqual((await readdir(join(out, "dist", "qr"))).sort(), names);
  for (const name of names) {
    assert.ok((await readFile(join(out, "dist", "qr", name))).equals(await readFile(join(ref, "qr", name))), name);
  }
});

test("P4: the QR each piece shows decodes to its event's URL", async () => {
  const event = events[0];
  const png = PNG.sync.read(await readFile(join(out, "dist", "qr", `${event.id}.png`)));
  assert.equal(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data, event.url);
  for (const piece of PIECES) {
    const html = await readFile(join(out, "dist", piece.file), "utf8");
    const qrs = elements(html).filter((e) => e.tag === "img" && hasClass(e, "qr"));
    assert.equal(qrs.length, 1, `${piece.id} shows one QR code`);
    assert.equal(qrs[0].attrs.src, `qr/${event.id}.svg`, piece.id);
    assert.equal(qrs[0].attrs["data-src"], "data/events.json#/0/url", piece.id);
  }
  assert.deepEqual(built.pages.map((p) => p.replace(/^.*\//, "")).sort(), PIECES.map((p) => p.file).concat("index.html").sort());
});

test("P4: the mock-up code has no QR generator of its own", async () => {
  for (const name of await readdir(MOCKUPS_DIR)) {
    if (!/\.(m?js)$/.test(name)) continue;
    const code = await readFile(join(MOCKUPS_DIR, name), "utf8");
    assert.doesNotMatch(code, /from\s+["']qrcode["']|import\(\s*["']qrcode["']|require\(\s*["']qrcode["']/, name);
  }
});
