import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyStatic, ROOT } from "../build.mjs";
import { bodyOf, hrefsOf, linksOfText, tagsOf } from "./email-html.mjs";
import { SAMPLE, sampleMessages } from "./email-fixture.mjs";

const LOGO_PATH = "assets/fitaf-logo.png";

test("M16: every href and src is absolute on SITE_URL; the hrefs are the text part's links, in order", () => {
  for (const [name, message] of Object.entries(sampleMessages())) {
    const tags = tagsOf(bodyOf(message.html));
    const urls = tags.flatMap((t) => [t.attrs.href, t.attrs.src].filter((u) => u !== undefined));
    assert.ok(urls.length >= 2, `control: ${name} has a link and the logo`);
    for (const url of urls) {
      assert.match(url, /^https:\/\//, `${name}: absolute: ${url}`);
      assert.ok(url.startsWith(`${SAMPLE.siteUrl}/`), `${name}: on SITE_URL: ${url}`);
    }
    const textLinks = linksOfText(message.text);
    assert.ok(textLinks.length >= 1, `control: ${name}'s text part has a link`);
    assert.deepEqual(hrefsOf(message.html), textLinks, `${name}: the same links as the text part, in order`);
  }
});

test("M16: the logo is the page's own file, served from the Worker's assets: SITE_URL/assets/fitaf-logo.png, 88x56, alt \"Fit AF\"", async () => {
  for (const [name, message] of Object.entries(sampleMessages())) {
    const imgs = tagsOf(bodyOf(message.html)).filter((t) => t.name === "img");
    assert.equal(imgs.length, 1, `${name}: one image, the logo`);
    const [logo] = imgs;
    assert.equal(logo.attrs.src, `${SAMPLE.siteUrl}/${LOGO_PATH}`);
    assert.equal(logo.attrs.alt, "Fit AF");
    assert.equal(logo.attrs.width, "88");
    assert.equal(logo.attrs.height, "56");
    assert.ok(!/<a\b[^>]*>\s*<img/.test(message.html), `${name}: the logo is not a link (the text part has no such link)`);
  }
  // The build copies the file beside both pages (dist/ and dist-dev/), which are the Workers' assets.
  const out = await mkdtemp(join(tmpdir(), "boston-email-logo-"));
  try {
    const written = (await copyStatic(out)).map((f) => f.slice(out.length + 1));
    assert.ok(written.includes(LOGO_PATH), "the build copies the logo into the assets");
    assert.deepEqual(await readFile(join(out, LOGO_PATH)), await readFile(join(ROOT, "src", LOGO_PATH)));
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
