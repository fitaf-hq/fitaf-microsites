// EL10 (SPEC-ui-and-copy-pass.md § 8, its email-safe rule and item 2): every image E1 loads is on SITE_URL and is a file
// the build of each Worker that sends E1 writes into that Worker's assets: the development build always, the production
// build with `production` true (and the slideshow, a photo sheet, wherever the manifest names it); the production build
// with `production` false, whose Worker sends nothing, writes none of the email's own images (S20 unchanged). And each
// HTML part is under Gmail's 102 KB clip.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, PHOTO_SHEETS_DIR, PHOTOS_PATH } from "../build.mjs";
import { productionFalseSavePath } from "./cc-harness.mjs";
import { imagesOf } from "./email-html.mjs";
import { SAMPLE, sampleE1s, sampleMessages } from "./email-fixture.mjs";
import { GMAIL_CLIP_BYTES } from "./el-fixtures.mjs";

const onSite = (url) => {
  assert.ok(url.startsWith(`${SAMPLE.siteUrl}/`), `on SITE_URL: ${url}`);
  return url.slice(SAMPLE.siteUrl.length + 1);
};

test("EL10: the images E1 loads, on SITE_URL: the band's tile and logo, the button's tile, the footer's tile and logo (and the slideshow)", () => {
  for (const [name, m] of Object.entries(sampleE1s())) {
    const paths = imagesOf(m.html).map((i) => onSite(i.url));
    const expected = [
      "assets/email/halftone-ink.png",
      "assets/email/fitaf-logo-reversed.png",
      ...(name === "e1_held_slideshow" ? ["assets/photo-sheets/email-slideshow.gif"] : []),
      "assets/email/halftone-cta.png",
      "assets/email/halftone-ink.png",
      "assets/email/fitaf-logo-reversed.png",
    ];
    assert.deepEqual(paths, expected, `${name}: its images, in order`);
  }
});

test("EL10: the development build and the production build with production true write every image E1 loads; production false, none of assets/email/", async () => {
  const dir = await mkdtemp(join(tmpdir(), "boston-el10-"));
  try {
    const sheets = join(dir, "sheets");
    await cp(PHOTO_SHEETS_DIR, sheets, { recursive: true });
    await writeFile(join(sheets, "email-slideshow.gif"), Buffer.from("GIF89a, not a photograph: EL10's stand-in"));
    const manifest = { ...(existsSync(PHOTOS_PATH) ? JSON.parse(await readFile(PHOTOS_PATH, "utf8")) : {}), ...SAMPLE.photos };
    const photosPath = join(dir, "photo-sheets.json");
    await writeFile(photosPath, JSON.stringify(manifest));
    const wanted = [...new Set(Object.values(sampleE1s()).flatMap((m) => imagesOf(m.html).map((i) => onSite(i.url))))].sort();
    for (const [what, options, writes] of [
      ["development", { target: "dev" }, true],
      ["production, production true", { target: "prod" }, true],
      ["production, production false", { target: "prod", savePath: await productionFalseSavePath() }, false],
    ]) {
      const outDir = join(dir, what.replaceAll(/\W+/g, "-"));
      await build({ ...options, outDir, photosPath, sheetsDir: sheets });
      for (const path of wanted) {
        const isSheet = path.startsWith("assets/photo-sheets/");
        assert.equal(existsSync(join(outDir, path)), writes || isSheet, `${what}: ${path} ${writes || isSheet ? "written" : "not written"}`);
      }
      if (!writes) assert.equal(existsSync(join(outDir, "assets", "email")), false, `${what}: no assets/email/ at all`);
      else assert.deepEqual((await readdir(join(outDir, "assets", "email"))).sort(), wanted.filter((p) => p.startsWith("assets/email/")).map((p) => p.slice("assets/email/".length)).sort());
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("EL10: each HTML part is under Gmail's 102 KB clip", () => {
  for (const [name, m] of Object.entries(sampleMessages())) {
    assert.ok(Buffer.byteLength(m.html) < GMAIL_CLIP_BYTES, `${name}: ${Buffer.byteLength(m.html)} bytes`);
  }
});
