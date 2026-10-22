// SP9 (SPEC-save-offer-production.md § 9 items 1 and 3): /privacy/, one static page built from consent/DRAFT.md § 6, in
// the template's fonts and colours, no script, served as /why/ is. The development build always carries it, marked as
// the step is; the production build carries it only with `production` true (approved fixtures), never with false; its
// every paragraph is § 6's; and the form's "Privacy notice" (data/save.json privacy_notice_url, "/privacy/") resolves to
// it in both builds. A bracket left in § 6 refuses the production build, naming the page that would print it.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import events from "../data/events.json" with { type: "json" };
import saveConfig from "../data/save.json" with { type: "json" };
import { build, ROOT } from "../build.mjs";
import { isSameOrigin, loadedUrls } from "./helpers.mjs";
import { DRAFT_FILE, pageText, productionBuild, section6Paragraphs } from "./sp-production.mjs";

const PRIVACY_LINK = /<a class="save-privacy" href="([^"]+)">Privacy notice<\/a>/;
const rootTokens = (html) => /:root\s*\{[^{}]*--navy[^{}]*\}/.exec(html)?.[0];

/** The form's link, resolved against the page's own path, names a file the build wrote. */
function assertLinkResolves(pageHtml, pagePath, outDir) {
  const href = PRIVACY_LINK.exec(pageHtml)?.[1];
  assert.equal(href, saveConfig.privacy_notice_url, `${pagePath}: the form's Privacy notice links data/save.json's address`);
  const resolved = new URL(href, `https://site.invalid${pagePath}`).pathname;
  assert.ok(existsSync(join(outDir, resolved, "index.html")), `${pagePath}: ${href} resolves to ${resolved}index.html`);
}

/** What every build's /privacy/ is: § 6's paragraphs, no script, the template's tokens and fonts, nothing from elsewhere. */
async function assertPrivacyPage(html, draftText, where) {
  const text = pageText(html);
  const paragraphs = section6Paragraphs(draftText);
  assert.equal(paragraphs.length, 6, "control: § 6 has six paragraphs");
  for (const p of paragraphs) assert.ok(text.includes(p), `${where}: § 6's paragraph is on the page: ${p.slice(0, 60)}…`);
  assert.doesNotMatch(html, /<script\b/i, `${where}: no script`);
  assert.doesNotMatch(html, /<link\b|<iframe\b|@import/i, `${where}: nothing else loaded`);
  for (const url of loadedUrls(html)) assert.ok(isSameOrigin(url), `${where}: same-origin only, got ${url}`);
  const template = await readFile(join(ROOT, "src", "template.html"), "utf8");
  assert.equal(rootTokens(html), rootTokens(template), `${where}: the template's colour tokens and font stacks`);
  for (const face of template.match(/^@font-face \{.*\}$/gm)) {
    assert.ok(html.includes(face.replace("{{ASSET_PREFIX}}", "/")), `${where}: the template's font face ${/fonts\/([^"]+)/.exec(face)[1]}`);
  }
}

test("SP9: data/save.json's privacy_notice_url is /privacy/ (control)", () => {
  assert.equal(saveConfig.privacy_notice_url, "/privacy/");
});

test("SP9: the development build carries /privacy/, marked as the step is; every development page's link resolves to it", async () => {
  const out = await mkdtemp(join(tmpdir(), "boston-sp9-dev-"));
  try {
    await build({ target: "dev", outDir: out });
    const html = await readFile(join(out, "privacy", "index.html"), "utf8");
    await assertPrivacyPage(html, await readFile(DRAFT_FILE, "utf8"), "dev /privacy/");
    assert.match(pageText(html), new RegExp(`DRAFT — not for use · wording ${saveConfig.wording_version}`), "the step's DRAFT marking");
    assert.ok(pageText(html).includes("[email]"), "control: the draft's own placeholders, shown on the development page");
    assertLinkResolves(await readFile(join(out, "index.html"), "utf8"), "/", out);
    for (const e of events) assertLinkResolves(await readFile(join(out, e.id, "index.html"), "utf8"), `/${e.id}/`, out);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("SP9: the production build with production false has no /privacy/ (and no link: no step)", async () => {
  const out = await mkdtemp(join(tmpdir(), "boston-sp9-prod-"));
  try {
    await build({ target: "prod", outDir: out });
    assert.equal(existsSync(join(out, "privacy")), false, "no privacy/");
    assert.doesNotMatch(await readFile(join(out, "index.html"), "utf8"), PRIVACY_LINK);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("SP9: production true with approved inputs — /privacy/ is § 6's, unmarked, no bracket; the page's link resolves to it", async () => {
  const { html, privacy, files, draftText, error } = await productionBuild();
  assert.equal(error, null);
  assert.ok(files.includes(join("privacy", "index.html")), "privacy/index.html written");
  await assertPrivacyPage(privacy, draftText, "production /privacy/");
  assert.doesNotMatch(privacy, /DRAFT — not for use|class="draft-tag"/, "no draft marking");
  assert.doesNotMatch(pageText(privacy), /\[[^\]]*\]/, "no bracket");
  assert.ok(pageText(privacy).includes("Contact: privacy@example.com."), "control: § 6's contact address as the fixture approved it");
  const href = PRIVACY_LINK.exec(html)?.[1];
  assert.equal(new URL(href, "https://site.invalid/").pathname, "/privacy/", "the production page's link resolves to /privacy/");
});

test("SP9: a bracket left in DRAFT § 6 refuses the production build, naming the privacy page that would print it", async () => {
  const { error, files } = await productionBuild({ unfixed: "a bracket left in DRAFT § 6" });
  assert.ok(error);
  assert.match(error.message, /the privacy page prints a placeholder: \[email\]/);
  assert.deepEqual(files, [], "nothing written");
});
