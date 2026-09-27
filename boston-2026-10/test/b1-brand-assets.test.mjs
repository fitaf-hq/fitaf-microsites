// The branding pass: self-hosted fonts and the store's logo, served from the page's own origin.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyStatic, renderPage, ROOT } from "../build.mjs";
import { isSameOrigin, loadedUrls, loadPlans } from "./helpers.mjs";

const FONT_BUDGET_BYTES = 90 * 1024;
const LOGO_BUDGET_BYTES = 8 * 1024;
const html = await renderPage(await loadPlans());

test("B1: every file the page loads is copied beside it, and nothing else is", async () => {
  const out = await mkdtemp(join(tmpdir(), "boston-static-"));
  try {
    const written = (await copyStatic(out)).map((f) => f.slice(out.length + 1)).sort();
    const referenced = [...new Set(loadedUrls(html).filter((u) => !u.startsWith("data:")))].sort();
    assert.deepEqual(written, referenced);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("B1: four self-hosted WOFF2 faces, all font-display: swap, under the font budget, with the OFL", async () => {
  const faces = [...html.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
  assert.equal(faces.length, 4);
  for (const f of faces) assert.match(f, /font-display:\s*swap/);
  const dir = join(ROOT, "src", "fonts");
  const woff2 = (await readdir(dir)).filter((n) => n.endsWith(".woff2"));
  assert.equal(woff2.length, 4);
  let total = 0;
  for (const n of woff2) {
    const bytes = await readFile(join(dir, n));
    assert.equal(bytes.subarray(0, 4).toString("latin1"), "wOF2", `${n} is WOFF2`);
    total += bytes.length;
  }
  assert.ok(total < FONT_BUDGET_BYTES, `fonts are ${total} bytes`);
  for (const lic of ["OFL-Poppins.txt", "OFL-OpenSans.txt"]) {
    assert.match(await readFile(join(dir, lic), "utf8"), /SIL OPEN FONT LICENSE Version 1\.1/);
  }
});

test("B1: the logo replaces the wordmark: alt \"Fit AF\", a 330x210 PNG shown at 88x56 (crisp past 2x)", async () => {
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  assert.equal(imgs.length, 1);
  assert.match(imgs[0], /src="assets\/fitaf-logo\.png"/);
  assert.match(imgs[0], /alt="Fit AF"/);
  assert.match(imgs[0], /width="88" height="56"/);
  assert.doesNotMatch(html, /class="wordmark"/);
  const path = join(ROOT, "src", "assets", "fitaf-logo.png");
  const png = await readFile(path);
  assert.equal(png.readUInt32BE(16), 330);
  assert.equal(png.readUInt32BE(20), 210);
  assert.ok((await stat(path)).size < LOGO_BUDGET_BYTES);
});

test("B1: the same-origin rule refuses another host (control for T5)", () => {
  for (const url of ["https://fonts.gstatic.com/s/poppins.woff2", "//cdn.example/x.png", "http://x/y"]) {
    assert.equal(isSameOrigin(url), false, url);
  }
  for (const url of ["fonts/a.woff2", "assets/fitaf-logo.png", "data:image/svg+xml,x"]) {
    assert.equal(isSameOrigin(url), true, url);
  }
});
