// Shared by SP1-SP8 (SPEC-save-offer-production.md §§ 3-5). Not a test file itself.
//
// THE APPROVED INPUTS are made here, never committed: each is the committed input with its unapproved parts fixed (so
// one source; a change to a committed input reaches the fixture), written to a temporary directory. A refusal case takes
// the approved set and leaves ONE part unfixed (`unfixed`), so each refusal is seen alone:
//   - data/save.json: `production` true, `wording_version` "v1" (added to `known_wording_versions`), and the privacy
//     notice's address (`privacy_notice_url`), so the page links the notice in place of DRAFT § 1's "[Privacy notice]";
//   - consent/DRAFT.md: its status line approving v1 with a date, and § 6's Owner placeholders filled ([email], [30],
//     [Mailchimp]); every other word as committed;
//   - data/offers.json: "status": "approved", every label the fixture's (distinct, no bracket), the shared code a
//     fixture's (no PLACEHOLDER; invented, it is no store's code);
//   - data/delivery-zips.json: "status": "official" (the list itself as committed);
//   - the production vars (wrangler.jsonc's top level): a sender that is not the placeholder, and a site key that is not
//     one of Cloudflare's published test keys (both invented).
// ⛔ Nothing here is a real code, key or address: every address is @example.com.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { isSameOrigin, loadedUrls, assertOneWhyFrame } from "./helpers.mjs";

export const SAVE_FILE = join(ROOT, "data", "save.json");
export const OFFERS_FILE = join(ROOT, "data", "offers.json");
export const ZIPS_FILE = join(ROOT, "data", "delivery-zips.json");
export const DRAFT_FILE = join(ROOT, "consent", "DRAFT.md");
export const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** The production vars a release would carry (§ 4.3), invented: none of them is real. */
export const APPROVED_VARS = Object.freeze({
  SITE_URL: "https://eatfitaf.com",
  MAIL_FROM: "Fit AF <offers-sp-fixture@example.com>",
  TURNSTILE_SITE_KEY: "0x4AAAAAAA-sp-fixture-site-key",
  SEND_WITHOUT_ALLOWLIST: "true",
});
export const APPROVED_VERSION = "v1";
export const APPROVED_STATUS = "**Status**: ✅ **Approved — v1, 2026-10-24** (the sp fixture's: no word below is changed by it).";
export const PRIVACY_URL = "/privacy/";
export const FIXTURE_CODE = "SPFIXTURE25"; // invented: no store has it
/** DRAFT § 6's Owner placeholders and what the fixture fills them with. */
export const DRAFT_FILLS = { "[email]": "privacy@example.com", "[30]": "30", "[Mailchimp]": "Mailchimp" };

/** The parts a refusal case may leave unfixed, each with the words its refusal must name. */
export const UNFIXED = {
  "a draft wording version": { name: /wording_version v0\.3-draft is a draft/ },
  "the status line still a draft": { name: /consent\/DRAFT\.md.*status line does not approve v1/ },
  "v1 not a known version": { name: /known_wording_versions does not hold v1/ },
  "a bracket left in DRAFT § 6": { name: /DRAFT\.md § 6 holds a placeholder: \[email\]/ },
  "no privacy notice to link": { name: /the page prints a placeholder: \[Privacy notice\]/ },
  "offers a placeholder": { name: /data\/offers\.json: status is placeholder, not approved/ },
  "an offer's label a placeholder": { name: /data\/offers\.json: offer .* label is a placeholder: \[The offer\]/ },
  "an offer's code a placeholder": { name: /data\/offers\.json: offer .* shared_code is a placeholder/ },
  "the ZIPs a mock": { name: /data\/delivery-zips\.json: status is mock, not official/ },
  "the placeholder sender": { name: /MAIL_FROM is the placeholder Fit AF <offers@eatfitaf\.com>/ },
  "a test site key": { name: /TURNSTILE_SITE_KEY is one of Cloudflare's test keys/ },
};

const json = (v) => JSON.stringify(v, null, 2) + "\n";

/**
 * The inputs of a production build in a new temporary directory: the approved set, with `unfixed` (a key of UNFIXED)
 * left as committed. Returns the build's options (paths and vars) and `dir`.
 */
export async function productionInputs({ unfixed = null, production = true } = {}) {
  if (unfixed !== null) assert.ok(unfixed in UNFIXED, `unknown part ${unfixed}`);
  const leave = (part) => unfixed === part;
  const dir = await realpath(await mkdtemp(join(tmpdir(), "boston-sp-inputs-")));

  const save = JSON.parse(await readFile(SAVE_FILE, "utf8"));
  save.production = production;
  if (!leave("a draft wording version")) save.wording_version = APPROVED_VERSION;
  if (!leave("v1 not a known version")) save.known_wording_versions = [...save.known_wording_versions, APPROVED_VERSION];
  // Since § 9 item 1 the committed address is /privacy/; the case sets none, as before it was committed.
  save.privacy_notice_url = leave("no privacy notice to link") ? null : PRIVACY_URL;

  let draft = await readFile(DRAFT_FILE, "utf8");
  if (!leave("the status line still a draft")) draft = draft.replace(/^\*\*Status\*\*:.*$/m, APPROVED_STATUS);
  for (const [placeholder, value] of Object.entries(DRAFT_FILLS)) {
    if (leave("a bracket left in DRAFT § 6") && placeholder === "[email]") continue;
    draft = draft.replaceAll(placeholder, value);
  }

  const offers = JSON.parse(await readFile(OFFERS_FILE, "utf8"));
  if (!leave("offers a placeholder")) offers.status = "approved";
  for (const [i, o] of offers.offers.entries()) {
    if (!(leave("an offer's label a placeholder") && i === 0)) o.label = `SP fixture offer ${i + 1}: 25% off every cart`;
    if ("shared_code" in o && !leave("an offer's code a placeholder")) o.shared_code = FIXTURE_CODE;
  }

  const zips = JSON.parse(await readFile(ZIPS_FILE, "utf8"));
  if (!leave("the ZIPs a mock")) zips.status = "official";

  const vars = { ...APPROVED_VARS };
  if (leave("the placeholder sender")) vars.MAIL_FROM = "Fit AF <offers@eatfitaf.com>";
  if (leave("a test site key")) vars.TURNSTILE_SITE_KEY = "1x00000000000000000000AA";

  const paths = { savePath: join(dir, "save.json"), offersPath: join(dir, "offers.json"), zipsPath: join(dir, "delivery-zips.json"), draftPath: join(dir, "DRAFT.md") };
  await writeFile(paths.savePath, json(save));
  await writeFile(paths.offersPath, json(offers));
  await writeFile(paths.zipsPath, json(zips));
  await writeFile(paths.draftPath, draft);
  return { dir, options: { ...paths, productionVars: vars }, save, offers, zips, vars };
}

/** Every file under `dir` (relative paths); [] when it does not exist. */
async function filesUnder(dir, top = dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await filesUnder(path, top)));
    else out.push(relative(top, path));
  }
  return out;
}

/** The build module of the package at `root` (this one, or a mutant's mirror). */
export const buildOf = async (root = ROOT) => (await import(pathToFileURL(join(root, "build.mjs")).href)).build;

/**
 * A production build (`npm run build`) of the package at `root` with the inputs `productionInputs` makes. Returns the
 * page (null when the build refused), the error, the inputs, and the files written.
 */
export async function productionBuild({ root = ROOT, unfixed = null, production = true } = {}) {
  const inputs = await productionInputs({ unfixed, production });
  const outDir = join(inputs.dir, "dist");
  try {
    const build = await buildOf(root);
    let error = null;
    try {
      await build({ target: "prod", outDir, ...inputs.options });
    } catch (err) {
      error = err;
    }
    const files = await filesUnder(outDir);
    const html = error ? null : await readFile(join(outDir, "index.html"), "utf8");
    const privacy = files.includes(join("privacy", "index.html")) ? await readFile(join(outDir, "privacy", "index.html"), "utf8") : null;
    const draftText = await readFile(inputs.options.draftPath, "utf8");
    return { html, privacy, error, files, inputs, draftText };
  } finally {
    await rm(inputs.dir, { recursive: true, force: true });
  }
}

/** SP4: each part left unapproved in turn, the build refuses, naming it, and writes nothing. */
export async function assertEachRefusal({ root = ROOT } = {}) {
  for (const [part, { name }] of Object.entries(UNFIXED)) {
    const { error, files } = await productionBuild({ root, unfixed: part });
    assert.ok(error, `${part}: the build refuses`);
    assert.match(error.message, name, `${part}: the refusal names it`);
    assert.match(error.message, /^production build refused/, `${part}: as the production build's refusal`);
    assert.deepEqual(files, [], `${part}: nothing written`);
  }
}

/** SP4 and SP5: the production page with every input approved: Flow 1 at the end, as the development build has it, and
 *  no draft tag; the production site key; its form posting to its own origin's /api/save. Returns the page. */
export async function approvedPage({ root = ROOT } = {}) {
  const { html, error, inputs } = await productionBuild({ root });
  assert.equal(error, null, `the approved inputs build (${error?.message})`);
  return { html, inputs };
}

/** The page's save-data (what Flow 1's script reads). */
export const saveData = (html) => JSON.parse(/<script type="application\/json" id="save-data">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? "null");

/** ⛔ § 3 item 2: the draft tag never in a production build (nor the banner, nor any "not for use" line). */
export function assertNoDraftMarking(html, where) {
  assert.doesNotMatch(html, /DRAFT — not for use/, `${where}: no "DRAFT — not for use"`);
  assert.doesNotMatch(html, /class="draft-(tag|banner)"/, `${where}: no draft tag or banner element`);
  assert.doesNotMatch(html, /not approved, and only dummy data/, `${where}: no development banner's words`);
}

/** SP5: T5 for production. With `production` true, exactly one third-party script, Turnstile's, and one fetch, to its own
 *  origin's save endpoint; with false, none of either. Every other T5 rule as it stands. */
export function assertProductionT5(html, { production }) {
  const srcs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(srcs, production ? [TURNSTILE_SCRIPT] : [], production ? "one third-party script, Turnstile's" : "no script src");
  const fetches = [...html.matchAll(/\bfetch\s*\(([^,)]*)/g)].map((m) => m[1].trim());
  assert.deepEqual(fetches, production ? ["cfg.api"] : [], production ? "one fetch, Flow 1's" : "no fetch(");
  if (production) assert.equal(saveData(html).api, "/api/save", "the fetch goes to its own origin's /api/save");
  assert.doesNotMatch(html, /<link\b/i, "no <link> of any kind");
  assert.doesNotMatch(html, /XMLHttpRequest|@import/i);
  assert.equal([...html.matchAll(/sendBeacon/g)].length, 1, "exactly one sendBeacon");
  assert.match(html, /\bnavigator\.sendBeacon\(\s*(["'])\/a\1\s*,/, "its URL is /a");
  assertOneWhyFrame(html, "SP5");
  for (const url of loadedUrls(html)) assert.ok(isSameOrigin(url), `same-origin or data:, got ${url}`);
}

// ---- The base tree (the contract's own commit, before any of its code): SP3 compares the Worker's behaviour with it ----

/** The contract's commit: SPEC-save-offer-production.md written, no code of it. ⚠ At the merge into
 *  boston/live-week-every-menu (2026-10-21) the base is 768ca36 (it was 63275a8): the merged tree before this contract's
 *  branch, boston/why-button (f4b04e7) with boston/every-menu (78ede74) merged, so SP3 holds the production page to THAT
 *  page with § 9 item 2's reading alone (the other two branches' lines are 768ca36's). 63275a8 is 84807ce plus this
 *  contract's text, and 768ca36 differs from it outside the tests only in app.js, the card's three files,
 *  scripts/chefs-choice.mjs, scripts/week-content.mjs and data/messages.json, none of which either Worker reaches (CC-8b's
 *  map is unmoved by both branches), so SP3's Worker and CC-8b cases compare with the same files as before. */
export const BASE = "768ca36";

function run(cmd, args, { input } = {}) {
  const r = spawnSync(cmd, args, { input, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status}: ${r.stderr}`);
  return r.stdout;
}

/** BASE's package, extracted by `git archive` into a temporary directory (read only), this package's node_modules linked
 *  in. Returns its path and a disposer. */
export async function basePackage() {
  const scratch = await realpath(await mkdtemp(join(tmpdir(), "boston-sp-base-")));
  const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
  const prefix = relative(top, ROOT);
  await mkdir(join(scratch, "base"), { recursive: true });
  run("tar", ["-x", "-C", join(scratch, "base")], { input: run("git", ["-C", top, "archive", "--format=tar", BASE, prefix]) });
  const pkg = join(scratch, "base", prefix);
  await symlink(join(ROOT, "node_modules"), join(pkg, "node_modules"));
  return { pkg, dispose: () => rm(scratch, { recursive: true, force: true }) };
}

// ---- § 9 item 1: the privacy notice's page ----

/** DRAFT.md § 6's paragraphs as a reader reads them, written here from the draft's own layout (independent of the
 *  build): its blockquote, each paragraph starting at a line that opens with a bold heading ("> **Who we are.** …"),
 *  continuation lines joined by a space, the bold marks removed. */
export function section6Paragraphs(draftText) {
  const section = draftText.split(/^## 6\. .*$/m)[1].split(/^## /m)[0];
  const lines = section.split("\n").filter((l) => l.startsWith(">")).map((l) => l.replace(/^>\s?/, ""));
  const paragraphs = [];
  for (const line of lines) {
    if (line.startsWith("**") || !paragraphs.length) paragraphs.push(line);
    else paragraphs[paragraphs.length - 1] += ` ${line}`;
  }
  return paragraphs.map((p) => p.replace(/\*\*/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
}

/** A page's words: the markup without its scripts and styles, its tags, entities decoded, whitespace squashed. */
export const pageText = (html) =>
  html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ")
    .replace(/<\/?(strong|em|b|a|span)\b[^>]*>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
