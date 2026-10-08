// SM-7 (SPEC-storybook-microsite.md § 5, SB-4's rule): no photograph. No image file is tracked, or waiting to be, under
// tools/storybook/. The page's logo and QR codes reach the stories only through the site's build, into git-ignored
// directories (node_modules/.cache/ and storybook-static/), never as a file of this package.
//
// § 8.4, SM-7 extended to the Hand-off stories: the images their store serves (handoff/store.mjs builds them into its
// own git-ignored directory) are the fixture's generated logo and each meal's generated tile, every one an SVG document
// with no image inside it: none is a photograph. Mutant (in the suite, in a copy of a built store): a photograph's bytes
// (a JPEG's) in place of one tile fails.
import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toolFiles } from "./paths.mjs";

const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|heic)$/i;
/** A generated image here is SVG text: an <svg> document, nothing embedded (no raster, no other document). */
const SVG_DOCUMENT = /^<svg [^>]*>[\s\S]*<\/svg>\n?$/;
const EMBEDDED = /<image|<foreignObject|data:|href=/i;
/** The first bytes of a JPEG (a photograph's usual file), for the mutant. */
const JPEG_START = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

test("SM-7: no image file tracked under tools/storybook", () => {
  const files = toolFiles();
  assert.ok(files.includes("package.json"), "fixture control: the tool's files were listed");
  assert.deepEqual(files.filter((f) => IMAGE.test(f)), [], "no image file");
});

/** One line per image under `dir` that is not a generated SVG document; [] when every one is. */
async function notGenerated(dir) {
  const problems = [];
  for (const name of await readdir(dir)) {
    const bytes = await readFile(join(dir, name));
    const text = bytes.toString("utf8");
    if (!name.endsWith(".svg") || !SVG_DOCUMENT.test(text) || EMBEDDED.test(text) || !Buffer.from(text, "utf8").equals(bytes)) {
      problems.push(`${name}: not a generated SVG document (${bytes.length} bytes, starting ${JSON.stringify(bytes.subarray(0, 8).toString("latin1"))})`);
    }
  }
  return problems;
}

/** The Hand-off store, built into a fresh directory: its images' directory. */
async function builtStoreImages(t) {
  const dir = await mkdtemp(join(tmpdir(), "fitaf-storybook-sm-7-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  // Imported here, not at the top: the tracked-file check above stands on its own.
  const { buildStore } = await import("../handoff/store.mjs");
  const manifest = await buildStore({ outDir: dir });
  const images = join(dir, "img");
  const names = await readdir(images);
  assert.ok(names.includes("logo.svg") && names.length === manifest.meals.length + 1, `fixture control: the logo and a tile per meal (${names.join(", ")})`);
  return images;
}

test("SM-7 (§ 8.4): every image the Hand-off stories serve is a generated SVG, none a photograph", async (t) => {
  assert.deepEqual(await notGenerated(await builtStoreImages(t)), []);
});

test("SM-7 (§ 8.4, mutant): a photograph's bytes in place of a tile fails", async (t) => {
  const images = await builtStoreImages(t);
  const copy = await mkdtemp(join(tmpdir(), "fitaf-storybook-sm-7-mutant-"));
  t.after(() => rm(copy, { recursive: true, force: true }));
  await cp(images, copy, { recursive: true });
  await writeFile(join(copy, "meal-0.svg"), JPEG_START);
  const problems = await notGenerated(copy);
  for (const line of problems) t.diagnostic(line);
  assert.equal(problems.length, 1, problems.join("\n"));
  assert.match(problems[0], /^meal-0\.svg: not a generated SVG document/);
});
