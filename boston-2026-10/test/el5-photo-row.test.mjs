// EL5 (SPEC-ui-and-copy-pass.md § 8 item 2, "no photo row without the manifest's slideshow"): with the photo manifest's
// `email_slideshow` (data/photo-sheets.json, written by Fit AF's emitter alone) E1 has one photo row between the band and
// the button, one animated GIF from the Worker's assets as the page's photo sheets are (`base` + file), 600 × 400, alt="";
// with none (the entry absent, or `base` null: every photograph removed, README's rule) it has no photo row. The Worker
// reads the entry from its derived copy, src/worker/email-photos.json (`npm run email:photos`), which must be the
// manifest's; the build copies the GIF beside the sheets and refuses a manifest naming one it lacks; and the GIF itself is
// what § 8's email-safe rule asks (at most 800 KB). Every GIF here is generated (flat colours, never a photograph).
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyStatic, PHOTO_SHEETS_DIR, PHOTOS_PATH } from "../build.mjs";
import { e1 } from "../src/worker/messages.js";
import { declarations, imagesOf, layoutRows } from "./email-html.mjs";
import { SAMPLE } from "./email-fixture.mjs";
import { editJson, fixtureGif, readGif, slideshowProblems, workerMirror } from "./el-fixtures.mjs";

const GIF_URL = `${SAMPLE.siteUrl}/assets/photo-sheets/email-slideshow.gif`;
const inputs = { to: SAMPLE.to, code: SAMPLE.code, offer: SAMPLE.heldOffer, event: SAMPLE.event, siteUrl: SAMPLE.siteUrl, token: null };
const slideshowImgs = (html) => imagesOf(html).filter((i) => i.kind === "img" && /slideshow/.test(i.url));

test("EL5: with the manifest's slideshow, one photo row after the band: the GIF from base + file, 600 x 400, alt=\"\"", () => {
  const m = e1({ ...inputs, photos: SAMPLE.photos });
  const imgs = slideshowImgs(m.html);
  assert.equal(imgs.length, 1, "one slideshow image");
  const [{ tag }] = imgs;
  assert.equal(tag.attrs.src, GIF_URL, "SITE_URL/ + base + file");
  assert.equal(tag.attrs.width, "600");
  assert.equal(tag.attrs.height, "400");
  assert.equal(tag.attrs.alt, "", "decorative: no new words");
  const style = declarations(tag.attrs.style);
  assert.equal(style.display, "block");
  assert.equal(style["max-width"], "600px", "fluid below 600");
  assert.equal(style.height, "auto");
  const rows = layoutRows(m.html);
  assert.equal(rows.findIndex((r) => r.includes(GIF_URL)), 1, "the second row, after the band");
  assert.ok(!m.text.includes("slideshow") && !m.text.includes(".gif"), "the text part has no photo and no word for it");
});

test("EL5: an absolute base (a CDN, the README's other kind) is the GIF's whole address", () => {
  const photos = { ...SAMPLE.photos, base: "https://cdn.example.test/sheets/" };
  assert.equal(slideshowImgs(e1({ ...inputs, photos }).html)[0]?.tag.attrs.src, "https://cdn.example.test/sheets/email-slideshow.gif");
});

test("EL5: no slideshow in the manifest (base null, or no entry), no photo row", () => {
  const withPhotos = e1({ ...inputs, photos: SAMPLE.photos });
  assert.equal(slideshowImgs(withPhotos.html).length, 1, "control: the same inputs with the entry have the row");
  for (const [what, photos] of [
    ["base null (every photograph removed)", { base: null, email_slideshow: SAMPLE.photos.email_slideshow }],
    ["no entry", { base: "assets/photo-sheets/" }],
    ["no manifest", null],
  ]) {
    const m = e1({ ...inputs, photos });
    assert.equal(slideshowImgs(m.html).length, 0, `${what}: no slideshow`);
    assert.equal(layoutRows(m.html).length, layoutRows(withPhotos.html).length - 1, `${what}: one row fewer`);
    assert.equal(m.text, withPhotos.text, `${what}: the text part is the same`);
  }
});

test("EL5: src/worker/email-photos.json is the manifest's slideshow, as `npm run email:photos` derives it", async () => {
  const { EMAIL_PHOTOS, emailPhotos, serialise } = await import("../scripts/email-photos.mjs");
  const manifest = existsSync(PHOTOS_PATH) ? JSON.parse(await readFile(PHOTOS_PATH, "utf8")) : null;
  assert.equal(await readFile(EMAIL_PHOTOS, "utf8"), serialise(emailPhotos(manifest)), "regenerate with `npm run email:photos`");
  const derived = emailPhotos(manifest);
  assert.equal(derived.base, manifest?.base ?? null);
  assert.deepEqual(derived.email_slideshow ?? null, manifest?.email_slideshow ?? null);
  assert.equal(emailPhotos(null).base, null, "no manifest: no photo");
});

test("EL5: a mirror whose manifest gains a slideshow: the derived copy differs until derived, then E1 (its default) has the row", async () => {
  const { emailPhotos, serialise } = await import("../scripts/email-photos.mjs");
  const mirror = await workerMirror(async (dir) => {
    await editJson(join(dir, "data", "photo-sheets.json"), (m) => ({ ...m, email_slideshow: SAMPLE.photos.email_slideshow }));
  });
  try {
    const manifest = JSON.parse(await readFile(join(mirror.dir, "data", "photo-sheets.json"), "utf8"));
    const copy = join(mirror.dir, "src", "worker", "email-photos.json");
    assert.notEqual(await readFile(copy, "utf8"), serialise(emailPhotos(manifest)), "the committed copy no longer matches: M17-style refusal");
    await writeFile(copy, serialise(emailPhotos(manifest)));
    const { e1: mirrorE1 } = await mirror.module("messages.js");
    const m = mirrorE1({ ...inputs, siteUrl: SAMPLE.siteUrl });
    assert.equal(slideshowImgs(m.html).length, 1, "derived: the photo row");
  } finally {
    await mirror.dispose();
  }
});

test("EL5: the build copies the slideshow the manifest names beside the sheets, and refuses one it lacks", async () => {
  const sheets = await mkdtemp(join(tmpdir(), "boston-el5-sheets-"));
  const out = await mkdtemp(join(tmpdir(), "boston-el5-out-"));
  try {
    const gif = fixtureGif({ frames: 5 });
    await writeFile(join(sheets, "email-slideshow.gif"), gif);
    const manifest = { base: "assets/photo-sheets/", email_slideshow: SAMPLE.photos.email_slideshow };
    const written = (await copyStatic(out, manifest, sheets)).map((f) => f.slice(out.length + 1));
    assert.ok(written.includes("assets/photo-sheets/email-slideshow.gif"), "copied into the Worker's assets");
    assert.deepEqual(await readFile(join(out, "assets", "photo-sheets", "email-slideshow.gif")), gif, "byte for byte");
    await rm(join(sheets, "email-slideshow.gif"));
    await mkdir(join(out, "again"));
    await assert.rejects(copyStatic(join(out, "again"), manifest, sheets), /email-slideshow\.gif/, "a slideshow the directory lacks refuses the build");
  } finally {
    await rm(sheets, { recursive: true, force: true });
    await rm(out, { recursive: true, force: true });
  }
});

test("EL5: the slideshow's file: a looping GIF of the manifest's size and frames, 600 x 400, at most 800 KB (§ 8's email-safe rule)", async () => {
  const committed = existsSync(PHOTOS_PATH) ? JSON.parse(await readFile(PHOTOS_PATH, "utf8")) : null;
  assert.deepEqual(await slideshowProblems(committed, PHOTO_SHEETS_DIR), [], "the committed manifest and sheets (none until the emitter writes one)");
  const dir = await mkdtemp(join(tmpdir(), "boston-el5-gif-"));
  try {
    const entry = SAMPLE.photos.email_slideshow;
    const manifest = { base: "assets/photo-sheets/", email_slideshow: entry };
    await writeFile(join(dir, entry.file), fixtureGif({ frames: 5 }));
    assert.deepEqual(readGif(await readFile(join(dir, entry.file))), { width: 600, height: 400, frames: 5, delays: [250, 250, 250, 250, 250], loops: true }, "control: the fixture reads back");
    assert.deepEqual(await slideshowProblems(manifest, dir), [], "control: a fixture within the rule passes");
    await writeFile(join(dir, entry.file), fixtureGif({ frames: 7 }));
    const over = await slideshowProblems({ ...manifest, email_slideshow: { ...entry, frames: 7 } }, dir);
    assert.equal(over.length, 1, "seven frames: over 800 KB, and nothing else");
    assert.match(over[0], /over 819200/);
    await writeFile(join(dir, entry.file), fixtureGif({ width: 900, height: 600, frames: 1 }));
    assert.ok((await slideshowProblems(manifest, dir)).some((p) => /not 600 x 400/.test(p)), "a 900 x 600 GIF is refused");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
