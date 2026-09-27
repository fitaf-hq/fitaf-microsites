import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { EVENTS_PATH, loadJson, writeQrCodes } from "../build.mjs";

test("T6: each QR PNG decodes to exactly its event URL; each SVG is written", async () => {
  const events = await loadJson(EVENTS_PATH);
  assert.ok(events.length >= 1);
  const out = await mkdtemp(join(tmpdir(), "boston-qr-"));
  try {
    await writeQrCodes(events, out);
    for (const e of events) {
      const png = PNG.sync.read(await readFile(join(out, "qr", `${e.id}.png`)));
      const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
      assert.ok(decoded, `${e.id}.png did not decode`);
      assert.equal(decoded.data, e.url);
      const svg = await readFile(join(out, "qr", `${e.id}.svg`), "utf8");
      assert.match(svg, /^<svg\b/);
    }
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
