// P5: the mock-ups wear the site's own look and say where each part comes from.
//   - the colour tokens and font faces are the page's (src/template.html), copied at build time: a token
//     changed in the template reaches all four pieces;
//   - the mock-up stylesheet draws no colour of its own and no translucency (text never sits on a photo
//     through a see-through panel);
//   - no text run is inside a photo;
//   - each legend lists exactly the files the piece's parts cite, plus the template for colours and fonts.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderPage, ROOT } from "../build.mjs";
import { loadInputs, MOCKUPS_DIR, renderMockups, TOKENS_SOURCE } from "../mockups/build-mockups.mjs";
import { rawColours } from "../scripts/contrast.mjs";
import { loadPlans } from "./helpers.mjs";
import { dataSources, elements, hasClass, pieceRuns } from "./mockup-html.mjs";

const TEMPLATE = join(ROOT, "src", "template.html");
const template = await readFile(TEMPLATE, "utf8");
const tmp = await mkdtemp(join(tmpdir(), "boston-p5-"));
after(async () => {
  await rm(tmp, { recursive: true, force: true });
  assert.equal(await readFile(TEMPLATE, "utf8"), template, "committed template untouched");
});
const noPhotos = join(tmp, "no-such-folder");
const pages = renderMockups(await loadInputs({ photosDir: noPhotos }));

// The reference is the PRODUCTION PAGE as build.mjs renders it (its font prefix resolved by the build, not
// by this test), so a mistake in how the mock-ups read the template cannot be repeated here and pass.
const shipped = await renderPage(await loadPlans());
const shippedFaces = [...shipped.matchAll(/@font-face\s*\{[^{}]*\}/g)].map((m) => m[0]);
const shippedRoot = /:root\s*\{[^{}]*\}/.exec(shipped)[0];
const styleOf = (html) => /<style>([\s\S]*?)<\/style>/.exec(html)[1];

test("P5: every piece carries the page's :root tokens and its four font faces, exactly as the page ships them", () => {
  assert.equal(shippedFaces.length, 4, "control: the shipped page has four faces (B1)");
  for (const face of shippedFaces) assert.match(face, /src: url\("fonts\/[a-z0-9-]+\.woff2"\) format\("woff2"\)/);
  for (const [id, html] of Object.entries(pages)) {
    assert.ok(html.includes(shippedRoot), `${id} has the page's :root`);
    const faces = [...styleOf(html).matchAll(/@font-face\s*\{[^{}]*\}/g)].map((m) => m[0]);
    assert.deepEqual(faces, shippedFaces, `${id}: the font faces are the page's`);
  }
});

test("P5: each piece's stylesheet is well formed: its braces balance and no template slot is left", () => {
  for (const [id, html] of Object.entries(pages)) {
    const css = styleOf(html).replace(/\/\*[\s\S]*?\*\//g, "").replace(/"[^"]*"/g, '""');
    let depth = 0;
    for (const ch of css) {
      depth += ch === "{" ? 1 : ch === "}" ? -1 : 0;
      assert.ok(depth >= 0, `${id}: a } closes nothing`);
    }
    assert.equal(depth, 0, `${id}: every { is closed`);
    assert.doesNotMatch(html, /\{\{|\}\}/, `${id}: no {{SLOT}} text is left`);
  }
  // Control: the defect this case was written after (a rule cut off inside a slot's braces) is caught.
  const cut = '@font-face { src: url("{{ASSET_PREFIX}fonts/a.woff2"); }';
  assert.match(cut, /\{\{|\}\}/);
});

test("P5: every file a piece loads (fonts, logo, QR, photos) is written beside it", async () => {
  const { buildMockups } = await import("../mockups/build-mockups.mjs");
  const out = join(tmp, "built");
  const built = await buildMockups({ outDir: out, png: false, photosDir: noPhotos });
  for (const page of built.pages) {
    const html = await readFile(page, "utf8");
    // <img src> by attribute (helpers.mjs's loadedUrls would also read data-src), and every CSS url().
    const imgs = elements(html).filter((e) => e.tag === "img").map((e) => e.attrs.src);
    const css = [...styleOf(html).matchAll(/url\(\s*["']?([^"')]+)/g)].map((m) => m[1]);
    const urls = [...new Set([...imgs, ...css].filter((u) => !u.startsWith("data:")))];
    assert.ok(urls.some((u) => u.startsWith("fonts/")), `${page}: the extractor sees the fonts`);
    if (!page.endsWith("index.html")) assert.ok(urls.includes("assets/fitaf-logo.png"), `${page}: and the logo`);
    for (const url of urls) {
      assert.doesNotMatch(url, /^([a-z]+:|\/\/)/i, `${page}: ${url} is not same-origin`);
      assert.ok(existsSync(join(out, decodeURIComponent(url))), `${page}: loads ${url}, which is not there`);
    }
  }
});

test("P5: a colour token changed in the template reaches all four pieces", async () => {
  const path = join(tmp, "template.html");
  assert.ok(template.includes("--navy: #1b2360;"), "mutation anchor present");
  await writeFile(path, template.replace("--navy: #1b2360;", "--navy: #123456;"));
  const changed = renderMockups(await loadInputs({ templatePath: path, photosDir: noPhotos }));
  for (const [id, html] of Object.entries(changed)) {
    assert.ok(html.includes("--navy: #123456;") && !html.includes("#1b2360"), id);
  }
});

test("P5: the mock-up stylesheet draws no raw colour and nothing translucent", async () => {
  const css = await readFile(join(MOCKUPS_DIR, "mockups.css"), "utf8");
  assert.deepEqual(rawColours(css), []);
  assert.doesNotMatch(css, /:root\s*\{/, "declares no tokens of its own");
  assert.doesNotMatch(css, /\bopacity\s*:|\btransparent\b|mix-blend-mode|backdrop-filter/i);
  // Control: the raw-colour check fires on this stylesheet's own syntax.
  assert.equal(rawColours(".offer { background: #d66400; }").length, 1);
});

test("P5: no text sits inside a photo", () => {
  for (const [id, html] of Object.entries(pages)) {
    for (const run of pieceRuns(html)) {
      assert.ok(!run.path.some((el) => hasClass(el, "photo")), `${id}: "${run.text}" is inside a photo`);
    }
  }
});

test("P5: each piece shows the site's logo", () => {
  for (const [id, html] of Object.entries(pages)) {
    const logos = elements(html).filter((e) => e.tag === "img" && e.attrs.src === "assets/fitaf-logo.png");
    assert.ok(logos.length >= 1, id);
    for (const l of logos) assert.equal(l.attrs.alt, "Fit AF");
  }
});

test("P5: each legend lists exactly the files the piece cites, plus the template for colours and fonts", () => {
  for (const [id, html] of Object.entries(pages)) {
    const cited = new Set(dataSources(html).map((s) => s.split("#")[0]));
    cited.add(TOKENS_SOURCE);
    const listed = elements(html).filter((e) => e.attrs["data-file"]).map((e) => e.attrs["data-file"]);
    assert.equal(new Set(listed).size, listed.length, `${id}: no file listed twice`);
    assert.deepEqual([...listed].sort(), [...cited].sort(), id);
    for (const file of ["data/messages.json", "data/offers.json", "data/events.json", "mockups/photos.json"]) {
      assert.ok(listed.includes(file), `${id} lists ${file}`);
    }
  }
});
