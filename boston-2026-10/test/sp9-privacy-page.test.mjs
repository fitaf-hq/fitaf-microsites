// SP9 (SPEC-save-offer-production.md § 9 items 1 and 3): /privacy/, one static page built from consent/DRAFT.md § 6, in
// the template's fonts and colours, no script, served as /why/ is. The development build always carries it, marked as
// the step is; the production build carries it only with `production` true (approved fixtures), never with false; its
// every paragraph is § 6's; and the form's "Privacy notice" (data/save.json privacy_notice_url, "/privacy/") resolves to
// it in both builds. A bracket left in § 6 refuses the production build, naming the page that would print it.
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 1.3 (2026-10-23, the Advisor: "yes please"; the entry cards printed for the Boston
// events name eatfitaf.com/privacy/): production carries /privacy/ once § 6 is approved, whatever `production` says. The
// approval is one line inside § 6, `<!-- approved YYYY-MM-DD -->`, written only on the Advisor's word: these cases mark a
// COPY of DRAFT.md (build()'s draftPath), never the committed file. With it and `production` false the production build
// writes privacy/index.html as with `production` true, and every other file byte for byte; without it, as before; a
// bracket with it, or a marker whose date is no real date, refuses the build, naming the page. § 6 gains the drawing's
// paragraph, after "What we collect and why", on both builds' page. ⭐ Mutant (a mirror of the package, the build's one
// line reading the marker made to ignore it): a production build without the marker writes the page -> SP9 fails.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { copyFile, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import events from "../data/events.json" with { type: "json" };
import saveConfig from "../data/save.json" with { type: "json" };
import { build, ROOT } from "../build.mjs";
import { isSameOrigin, loadedUrls } from "./helpers.mjs";
import { DRAFT_FILE, pageText, productionBuild, section6Paragraphs, withBracketInSection6 } from "./sp-production.mjs";
import { mirror } from "./cc-harness.mjs";
import { createHash } from "node:crypto";
import { relative } from "node:path";
import { pathToFileURL } from "node:url";

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
  // Since SPEC-ui-and-copy-pass § 1.3 item 3, seven: the drawing's, after "What we collect and why".
  assert.equal(paragraphs.length, 7, "control: § 6 has seven paragraphs");
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
    // Since SPEC-save-offer-production § 10 item 5 the draft's contact and response days are filled; since
    // SPEC-ui-and-copy-pass § 1 item 5 (2026-10-23) § 6 names Resend alone, so no placeholder is left on the page (UC5).
    assert.doesNotMatch(pageText(html), /\[[^\]]*\]/, "no placeholder left, shown on the development page");
    assert.ok(pageText(html).includes("Contact: privacy@eatfitaf.com."), "§ 10 item 5: the decided contact");
    assert.ok(pageText(html).includes("we'll answer within 30 days"), "§ 10 item 5: the decided response days");
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
  assert.ok(pageText(privacy).includes("Contact: privacy@eatfitaf.com."), "control: § 6's contact address as committed (§ 10 item 5)");
  const href = PRIVACY_LINK.exec(html)?.[1];
  assert.equal(new URL(href, "https://site.invalid/").pathname, "/privacy/", "the production page's link resolves to /privacy/");
});

test("SP9: a bracket left in DRAFT § 6 refuses the production build, naming the privacy page that would print it", async () => {
  const { error, files } = await productionBuild({ unfixed: "a bracket left in DRAFT § 6" });
  assert.ok(error);
  assert.match(error.message, /the privacy page prints a placeholder: \[Mailchimp\]/);
  assert.deepEqual(files, [], "nothing written");
});

// ---- SPEC-ui-and-copy-pass § 1.3: the privacy page in production once § 6 is approved ----

/** The drawing's paragraph's heading, § 1.3 item 3's, as § 6 sets it (a bold heading opening a blockquote line). */
const DRAWING = "Our Boston drawing.";
const WHAT_WE_COLLECT = "What we collect and why.";

/** DRAFT.md's text with § 6's approval line, `<!-- approved ${date} -->` (or `line` as given), at § 6's end. */
function withApproval(draftText, { date = "2026-10-26", line = `<!-- approved ${date} -->` } = {}) {
  const [head, six] = draftText.split(/^(?=## 6\. )/m);
  const [section, ...rest] = six.split(/^(?=## 7\. )/m);
  return `${head}${section.trimEnd()}\n\n${line}\n\n${rest.join("")}`;
}

/** Every file under `dir`, by path: its SHA-256. */
async function hashes(dir, top = dir) {
  const out = {};
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) Object.assign(out, await hashes(p, top));
    else out[relative(top, p)] = createHash("sha256").update(await readFile(p)).digest("hex");
  }
  return out;
}

/** The production build (production false, data/save.json as committed) of the package at `root` with DRAFT.md's text
 *  `draftText` (a copy), into a new directory: its files' hashes and its privacy page, or the build's refusal. */
async function productionWith(draftText, { root = ROOT } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "boston-sp9-approved-"));
  try {
    const draftPath = join(dir, "DRAFT.md");
    await writeFile(draftPath, draftText);
    const out = join(dir, "out");
    const { build: buildOf } = await import(pathToFileURL(join(root, "build.mjs")).href);
    const error = await buildOf({ target: "prod", outDir: out, draftPath }).then(() => null, (e) => e);
    if (error) return { error, files: existsSync(out) ? await hashes(out) : {} };
    const page = existsSync(join(out, "privacy", "index.html")) ? await readFile(join(out, "privacy", "index.html"), "utf8") : null;
    return { error: null, files: await hashes(out), privacy: page };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** § 1.3 items 1-2 on the package at `root`: without the marker no page; with it the page, and nothing else moved. */
async function assertApprovalRule(root, where) {
  const draft = await readFile(DRAFT_FILE, "utf8");
  assert.equal(saveConfig.production, false, "control: production false");
  assert.doesNotMatch(draft, /<!--\s*approved/, "control: the committed § 6 carries no approval line");
  const without = await productionWith(draft, { root });
  assert.equal(without.error, null, `${where}: control: it builds`);
  assert.equal(without.privacy, null, `${where}: without the approval line, no /privacy/ in the production build`);
  const approved = await productionWith(withApproval(draft), { root });
  assert.equal(approved.error, null, `${where}: with it, it builds`);
  assert.ok(approved.privacy, `${where}: with it, /privacy/ in the production build`);
  const { [join("privacy", "index.html")]: page, ...rest } = approved.files;
  assert.ok(page, `${where}: privacy/index.html written`);
  assert.deepEqual(rest, without.files, `${where}: every other file byte for byte (index.html among them)`);
  return { draft, privacy: approved.privacy };
}

test("SP9 (§ 1.3): production false with § 6 approved — /privacy/ is § 6's, unmarked, no script; nothing else moves; without the line, none", async () => {
  const { draft, privacy } = await assertApprovalRule(ROOT, "the package");
  await assertPrivacyPage(privacy, draft, "production /privacy/ (§ 6 approved, production false)");
  assert.doesNotMatch(privacy, /DRAFT — not for use|class="draft-tag"/, "no draft marking");
  const { privacy: asProductionTrue } = await productionBuild();
  assert.equal(privacy, asProductionTrue, "the same page as production true writes from the approved fixtures");
});

test("SP9 (§ 1.3 item 2): with the approval line, a bracket in § 6 or a line whose date is not a real date refuses, naming the page", async () => {
  const draft = await readFile(DRAFT_FILE, "utf8");
  const bracket = await productionWith(withApproval(withBracketInSection6(draft)));
  assert.match(String(bracket.error?.message), /the privacy page prints a placeholder: \[Mailchimp\]/, "a bracket");
  assert.deepEqual(bracket.files, {}, "nothing written");
  for (const line of ["<!-- approved 2026-02-30 -->", "<!-- approved 26-10-2026 -->", "<!-- approved -->", "<!-- approved 2026-10-26 by me -->"]) {
    const bad = await productionWith(withApproval(draft, { line }));
    assert.match(String(bad.error?.message), /consent\/DRAFT\.md § 6's approval line .* the privacy page/, `refused: ${line}`);
    assert.deepEqual(bad.files, {}, `nothing written: ${line}`);
  }
});

test("SP9 (§ 1.3 item 3): the drawing's paragraph in § 6, after What we collect and why, on both builds' /privacy/", async () => {
  const draft = await readFile(DRAFT_FILE, "utf8");
  const paragraphs = section6Paragraphs(draft);
  const at = paragraphs.findIndex((p) => p.startsWith(DRAWING));
  assert.ok(at > 0, "§ 6 carries the drawing's paragraph");
  assert.ok(paragraphs[at - 1].startsWith(WHAT_WE_COLLECT), "directly after What we collect and why");
  assert.match(paragraphs[at], /October 26–29, 2026/, "the events' dates");
  assert.match(paragraphs[at], /privacy@eatfitaf\.com/, "the address to ask");
  const dev = await mkdtemp(join(tmpdir(), "boston-sp9-dev-drawing-"));
  try {
    await build({ target: "dev", outDir: dev });
    const text = pageText(await readFile(join(dev, "privacy", "index.html"), "utf8"));
    assert.ok(text.includes(paragraphs[at]), "the development page carries it (DRAFT-tagged, as the rest)");
    assert.ok(text.indexOf(paragraphs[at - 1]) < text.indexOf(paragraphs[at]), "in its place");
  } finally {
    await rm(dev, { recursive: true, force: true });
  }
  const { privacy } = await productionWith(withApproval(draft));
  assert.ok(pageText(privacy).includes(paragraphs[at]), "the production page with § 6 approved carries it");
});

test("SP9 (§ 1.3): mutant — the approval line ignored (a production build without it writes the page) -> SP9 fails", async () => {
  const SITE = "const privacyApproved = privacyApproval(draftText);";
  const withConfig = (dir) => copyFile(join(ROOT, "wrangler.jsonc"), join(dir, "wrangler.jsonc"));
  const control = await mirror(withConfig);
  const mutant = await mirror(async (dir) => {
    await withConfig(dir);
    const path = join(dir, "build.mjs");
    const source = await readFile(path, "utf8");
    assert.equal(source.split(SITE).length - 1, 1, "the mutation site occurs exactly once in the mirror's build.mjs");
    await writeFile(path, source.replace(SITE, "const privacyApproved = privacyApproval(draftText) || \"ignored\";"));
  });
  try {
    await assertApprovalRule(control, "the unchanged mirror");
    await assert.rejects(
      assertApprovalRule(mutant, "the mutant"),
      (err) => err instanceof assert.AssertionError && /the mutant: without the approval line, no \/privacy\//.test(err.message),
      "SP9 must fail on the mutant, by its own assertion",
    );
  } finally {
    await rm(control, { recursive: true, force: true });
    await rm(mutant, { recursive: true, force: true });
  }
});
