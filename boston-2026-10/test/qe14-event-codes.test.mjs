// QE14 (SPEC-print-pieces.md § 11 item 5's Q14; the name Q14 is § 8's, see qe-checks.mjs): `npm run build` writes the
// `boston` and `seminar` codes beside `demo`'s (§ 11 item 3), each decoding to its URL, decoded here and not assumed:
// each PNG by jsQR, each SVG drawn module by module from its path and decoded by jsQR (qe-checks.mjs decodeSvg).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { build, writeQrCodes } from "../build.mjs";
import { BOSTON_URL, decodePng, decodeSvg, SEMINAR_URL } from "./qe-checks.mjs";

const CODES = [
  ["demo", "https://eatfitaf.com/"],
  ["boston", BOSTON_URL],
  ["seminar", SEMINAR_URL],
];

test("QE14: the production build writes qr/boston and qr/seminar, PNG and SVG, beside demo's, each decoding to its URL", async () => {
  const out = await mkdtemp(join(tmpdir(), "boston-qe14-"));
  try {
    const built = await build({ target: "prod", outDir: out });
    const names = CODES.flatMap(([id]) => [`${id}.png`, `${id}.svg`]).sort();
    assert.deepEqual((await readdir(join(out, "qr"))).sort(), names);
    assert.deepEqual(built.qr.map((f) => relative(out, f)).sort(), names.map((n) => join("qr", n)), "the build reports each code it wrote");
    for (const [id, url] of CODES) {
      assert.equal(decodePng(await readFile(join(out, "qr", `${id}.png`))), url, `${id}.png`);
      assert.equal(decodeSvg(await readFile(join(out, "qr", `${id}.svg`), "utf8")), url, `${id}.svg`);
    }
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("QE14 (control): the SVG reader decodes a code writeQrCodes makes for another URL, and refuses what it cannot draw", async () => {
  const out = await mkdtemp(join(tmpdir(), "boston-qe14-control-"));
  try {
    const url = "https://example.com/?e=qe14-control";
    await writeQrCodes([{ id: "control", url }], out);
    const svg = await readFile(join(out, "qr", "control.svg"), "utf8");
    assert.equal(decodeSvg(svg), url);
    assert.throws(() => decodeSvg(svg.replace(/<path\b[^>]*\bstroke="[^"]+"[^>]*\/>/, "")), /not writeQrCodes' SVG/);
    assert.throws(() => decodeSvg(svg.replace(/(\bstroke="[^"]+" d=")M/, "$1L")), /a path command this reader does not draw: L/);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
