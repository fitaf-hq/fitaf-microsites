// Shared by SP1-SP8 (SPEC-save-offer-production.md §§ 3-5). Not a test file itself.
//
// THE APPROVED INPUTS are made here, never committed: each is the committed input with its unapproved parts fixed (so
// one source; a change to a committed input reaches the fixture), written to a temporary directory. A refusal case takes
// the approved set and leaves ONE part unfixed (`unfixed`), so each refusal is seen alone:
//   - data/save.json: `production` true, `wording_version` "v1" (added to `known_wording_versions`), and the privacy
//     notice's address (`privacy_notice_url`), so the page links the notice in place of DRAFT § 1's "[Privacy notice]";
//   - consent/DRAFT.md: its status line approving v1 with a date, and § 6's Owner placeholder filled ([Mailchimp]; since
//     § 10 item 5 the committed draft fills [email] and [30] itself); every other word as committed;
//   - data/offers.json: "status": "approved", every label the fixture's (distinct, no bracket), the shared code a
//     fixture's (no PLACEHOLDER; invented, it is no store's code);
//   - data/delivery-zips.json: "status": "official" (the list itself as committed; since § 10 the committed list is the
//     official one, and "the ZIPs a mock" sets it back);
//   - the production vars (wrangler.jsonc's top level): the decided sender (§ 10 item 4: Fit AF <offers@eatfitaf.com>, no
//     longer a placeholder), and a site key that is not one of Cloudflare's published test keys (invented).
// ⛔ Nothing here is a real code or key, and no address is a person's: every address is @example.com but the business's
//    own decided sender.
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
  MAIL_FROM: "Fit AF <offers@eatfitaf.com>", // § 10 item 4: the decided sender
  TURNSTILE_SITE_KEY: "0x4AAAAAAA-sp-fixture-site-key",
  SEND_WITHOUT_ALLOWLIST: "true",
});
export const APPROVED_VERSION = "v1";
/** Release (b) (SPEC-save-offer-production § 12) committed the approved wording and offers, so a part left unapproved is
 *  SET to what release (a) committed (its version, its status line's first line, its offers' status), not read from the tree. */
export const DRAFT_VERSION = "v0.3-draft";
export const DRAFT_STATUS_LINE =
  "**Status**: ⛔ **DRAFT — not live.** v0.3 written 2026-09-27 for the Owner to route through legal; it replaces";
export const APPROVED_STATUS = "**Status**: ✅ **Approved — v1, 2026-10-24** (the sp fixture's: no word below is changed by it).";
export const PRIVACY_URL = "/privacy/";
export const FIXTURE_CODE = "SPFIXTURE25"; // invented: no store has it
/** DRAFT § 6's Owner placeholders and what the fixture fills them with. Since § 10 item 5 the committed draft fills [email]
 *  and [30] itself (privacy@eatfitaf.com, 30), and since SPEC-ui-and-copy-pass § 1 item 5 (2026-10-23) § 6 names Resend
 *  alone, so its [Mailchimp] went: none is left for the fixture to fill. */
export const DRAFT_FILLS = {};

/** The parts a refusal case may leave unfixed, each with the words its refusal must name. */
export const UNFIXED = {
  "a draft wording version": { name: /wording_version v0\.3-draft is a draft/ },
  "the status line still a draft": { name: /consent\/DRAFT\.md.*status line does not approve v1/ },
  "v1 not a known version": { name: /known_wording_versions does not hold v1/ },
  "a bracket left in DRAFT § 6": { name: /DRAFT\.md § 6 holds a placeholder: \[Mailchimp\]/ },
  "no privacy notice to link": { name: /the page prints a placeholder: \[Privacy notice\]/ },
  "offers a placeholder": { name: /data\/offers\.json: status is placeholder, not approved/ },
  "an offer's label a placeholder": { name: /data\/offers\.json: offer .* label is a placeholder: \[The offer\]/ },
  "an offer's code a placeholder": { name: /data\/offers\.json: offer .* shared_code is a placeholder/ },
  "the ZIPs a mock": { name: /data\/delivery-zips\.json: status is mock, not official/ },
  // § 10 item 4: the decided sender is not a placeholder; the gate refuses only an empty sender or one outside eatfitaf.com,
  // and an offer whose code_mode is none carrying a code.
  "an empty sender": { name: /vars\.MAIL_FROM is not set/ },
  "a sender outside eatfitaf.com": { name: /vars\.MAIL_FROM is not an address at eatfitaf\.com/ },
  "a code on an offer without codes": { name: /offer event-boston-2026-10-placeholder carries a code/ },
  "a test site key": { name: /TURNSTILE_SITE_KEY is one of Cloudflare's test keys/ },
};

const json = (v) => JSON.stringify(v, null, 2) + "\n";

/** The part "a bracket left in DRAFT § 6", as the draft is now: SPEC-ui-and-copy-pass § 1 item 5 (2026-10-23) left the
 *  committed § 6 no placeholder (its "[Mailchimp]" went), so the part puts that one back beside the email provider § 6
 *  names, and the gate must refuse it as before. */
export const SECTION_6_BRACKET = "[Mailchimp]";
export function withBracketInSection6(draft) {
  const [head, six] = draft.split(/^(?=## 6\. )/m);
  const [section, ...rest] = six.split(/^(?=## 7\. )/m);
  assert.ok(section.includes("Resend"), "DRAFT § 6 names Resend, where the part puts its bracket");
  return head + section.replace("Resend", `Resend; ${SECTION_6_BRACKET}`) + rest.join("");
}

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
  save.wording_version = leave("a draft wording version") ? DRAFT_VERSION : APPROVED_VERSION;
  const others = save.known_wording_versions.filter((v) => v !== APPROVED_VERSION);
  save.known_wording_versions = leave("v1 not a known version") ? others : [...others, APPROVED_VERSION];
  // Since § 9 item 1 the committed address is /privacy/; the case sets none, as before it was committed.
  save.privacy_notice_url = leave("no privacy notice to link") ? null : PRIVACY_URL;

  let draft = await readFile(DRAFT_FILE, "utf8");
  draft = draft.replace(/^\*\*Status\*\*:.*$/m, leave("the status line still a draft") ? DRAFT_STATUS_LINE : APPROVED_STATUS);
  for (const [placeholder, value] of Object.entries(DRAFT_FILLS)) draft = draft.replaceAll(placeholder, value);
  if (leave("a bracket left in DRAFT § 6")) draft = withBracketInSection6(draft);

  const offers = JSON.parse(await readFile(OFFERS_FILE, "utf8"));
  offers.status = leave("offers a placeholder") ? "placeholder" : "approved";
  for (const [i, o] of offers.offers.entries()) {
    o.label = `SP fixture offer ${i + 1}: 25% off every cart`;
    if ("shared_code" in o) o.shared_code = FIXTURE_CODE;
  }
  // Since § 10.7 the committed file holds no placeholder at all, so these two parts set one on its first offer.
  if (leave("an offer's label a placeholder")) offers.offers[0].label = "[The offer]";
  if (leave("an offer's code a placeholder")) Object.assign(offers.offers[0], { code_mode: "shared", shared_code: "PLACEHOLDER" });
  if (leave("a code on an offer without codes")) {
    Object.assign(offers.offers.find((o) => o.id === "event-boston-2026-10-placeholder"), { code_mode: "none", shared_code: FIXTURE_CODE });
  }

  const zips = JSON.parse(await readFile(ZIPS_FILE, "utf8"));
  zips.status = leave("the ZIPs a mock") ? "mock" : "official";

  const vars = { ...APPROVED_VARS };
  if (leave("an empty sender")) vars.MAIL_FROM = "";
  if (leave("a sender outside eatfitaf.com")) vars.MAIL_FROM = "Fit AF <offers-sp-fixture@example.com>";
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
/** ⚠ Changes to the production page made after this contract merged, each by its own contract, as [from, to] commits:
 *  BASE's package gets each one's diff over the page's sources (LATER_PATHS), applied by `patch`, so SP3 still holds
 *  the production page to the base's with § 9 item 2's reading alone. SPEC-every-menu-and-nutrition § 11 (2026-10-22,
 *  the Advisor's review of the live page), and SPEC-meal-selection § 13 (2026-10-20, built 2026-10-22: one comment of
 *  scripts/selection.mjs, a file the development Worker reaches, and no page), built together on boston/review-1022:
 *  ce91cba (§ 11's contract) to 773e597 (the last of their code, § 11.2's button; between them only tests, goldens and
 *  contract text outside LATER_PATHS). A third element names the paths of an entry whose diff over LATER_PATHS would not
 *  apply to the base: SPEC-ui-and-copy-pass § 1 (2026-10-23) moves the production page by item 8's card alone (the chips
 *  and the count badge: src/chefs-choice/ and scripts/chefs-choice.mjs's one slot), from e875280 (its contract) to
 *  ede2e07 (its last code); its other items change only the pages with an offer, which the production page with
 *  `production` false is not (shown: both trees' production pages differ by the card's lines alone). */
export const LATER = [
  ["ce91cba", "773e597"],
  ["e875280", "ede2e07", ["src/chefs-choice", "scripts/chefs-choice.mjs"]],
  // SPEC-ui-and-copy-pass § 1.2 item 1 (the card's meals and its weekly total at the plan's price a meal), the one commit
  // of the production page's change (clientData and app.js); its items 2–3 move only the pages with an offer. Its
  // doc-comment hunk does not apply to the base (whose comment predates the preview build's), and a hunk that changes only
  // comments moves no page: `codeOnly` leaves such hunks out.
  ["bd80a41", "eae4d94", ["src/app.js", "build.mjs"], { codeOnly: true }],
  // SPEC-ui-and-copy-pass § 2 (2026-10-25: who it is for first, the goal last; the Family line; read_on) changes lines the
  // preview build added (renderPage's `orderLinks`, familySection's, the template's {{PREVIEW_STYLE}}, the preview's
  // words), which no entry here carried, since the preview build moved no production or development page (PV5 at its
  // merge). So first the preview build itself (SPEC-preview-sites §§ 1–7, the merge 4e73661 over its first parent
  // 544e496), its one hunk in build()'s target branch left out (`dropHunks`): the base's build() predates its context, and
  // no production page passes through that branch.
  ["544e496", "4e73661", ["build.mjs", "src/template.html", "data/messages.json"], { dropHunks: /^\+\s*const preview = target === "preview"/m }],
  // Then § 2, from 81a1199 (its contract) to 8bfe4f8 (its code, one commit), over the files that make the production page
  // (the calculator's move is the development page's alone, src/save/), its hunk in the preview's Why cut list
  // (SPEC-preview-sites § 8, PREVIEW_WITHOUT_WHY, which the base never had; it cuts the preview page alone) left out.
  ["81a1199", "8bfe4f8", ["src/template.html", "src/app.js", "build.mjs", "data/messages.json", "data/plans.json"], { dropHunks: /^-\s*\["the Why rule at 720 px"/m }],
  // § 2.2 (Family's own question, 2026-10-25) moves the result card's markup beside a line § 1 changed and the base never
  // took (`{{SAVE_FAMILY}}`, empty on this page): so first § 1's own template change (ce6b54e over its contract, e875280:
  // that slot gone, the empty DEV_SCRIPT after the card's script; no production-false page moves by it), then § 2.2, from
  // 8bfe4f8 (§ 2's code) to 5eaad96 (its code, 077f472, and the Family door's [hidden] rule), over the same files and the
  // module build.mjs now imports,
  // scripts/family.mjs (new; the content's and the block's files make no page). Its import line's hunk does not apply to
  // the base, whose next import is not § 1's, so it is left out and the line put after the selection import the base has
  // (`insertAfter`: [path, anchor found once, the text after it]).
  ["e875280", "ce6b54e", ["src/template.html"]],
  [
    "8bfe4f8",
    "5eaad96",
    ["src/template.html", "src/app.js", "build.mjs", "data/messages.json", "data/plans.json", "scripts/family.mjs"],
    {
      dropHunks: /^\+import \{ checkFamily \} from "\.\/scripts\/family\.mjs";$/m,
      insertAfter: [["build.mjs", 'import { checkSelection, legacyKey } from "./scripts/selection.mjs";\n', 'import { checkFamily } from "./scripts/family.mjs";\n']],
    },
  ],
];

/** A unified diff without its hunks whose every changed line is a comment's (`*`, `//`, `/*` after the +/-). */
const codeHunks = (diff) => {
  const comment = /^[+-]\s*(\*|\/\/|\/\*)/;
  return keptHunks(diff, (hunk) => hunk.some((l) => /^[+-]/.test(l) && !comment.test(l)));
};

/** A unified diff without its hunks whose text matches `pattern` (SPEC-ui-and-copy-pass § 2.1); refused unless it drops
 *  at least one, so an entry cannot outlive the hunk it names. */
function withoutHunks(diff, pattern) {
  let dropped = 0;
  const out = keptHunks(diff, (hunk) => !(pattern.test(hunk.join("\n")) && ++dropped));
  if (!dropped) throw new Error(`basePackage: no hunk matches ${pattern}`);
  return out;
}

/** A unified diff keeping the hunks `keep` accepts (each hunk its lines, its @@ line first). */
function keptHunks(diff, keep) {
  const out = [];
  let hunk = null;
  const flush = () => {
    if (hunk && keep(hunk)) out.push(...hunk);
    hunk = null;
  };
  for (const line of diff.split("\n")) {
    if (line.startsWith("@@")) {
      flush();
      hunk = [line];
    } else if (line.startsWith("diff --git")) {
      flush();
      out.push(line);
    } else if (hunk) hunk.push(line);
    else out.push(line);
  }
  flush();
  return out.join("\n");
}
const LATER_PATHS = ["build.mjs", "data", "scripts", "src"];

function run(cmd, args, { input } = {}) {
  const r = spawnSync(cmd, args, { input, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status}: ${r.stderr}`);
  return r.stdout;
}

/** BASE's package, extracted by `git archive` into a temporary directory (read only), this package's node_modules linked
 *  in, and each of LATER's diffs applied (`patch` refuses one that does not apply cleanly). Returns its path and a
 *  disposer. */
export async function basePackage() {
  const scratch = await realpath(await mkdtemp(join(tmpdir(), "boston-sp-base-")));
  const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
  const prefix = relative(top, ROOT);
  await mkdir(join(scratch, "base"), { recursive: true });
  run("tar", ["-x", "-C", join(scratch, "base")], { input: run("git", ["-C", top, "archive", "--format=tar", BASE, prefix]) });
  const pkg = join(scratch, "base", prefix);
  await symlink(join(ROOT, "node_modules"), join(pkg, "node_modules"));
  for (const [from, to, paths = LATER_PATHS, { codeOnly = false, dropHunks = null, insertAfter = [] } = {}] of LATER) {
    const whole = run("git", ["-C", top, "diff", "--no-color", from, to, "--", ...paths.map((p) => `${prefix}/${p}`)]);
    const kept = codeOnly ? codeHunks(whole.toString("utf8")) : dropHunks ? withoutHunks(whole.toString("utf8"), dropHunks) : null;
    const diff = kept === null ? whole : Buffer.from(kept);
    if (diff.length) run("patch", ["-p1", "--forward", "--silent", "-d", join(scratch, "base")], { input: diff });
    // SPEC-ui-and-copy-pass § 2.2: a line put after an anchor the base has, found exactly once, or the base is refused.
    for (const [path, anchor, text] of insertAfter) {
      const file = join(pkg, path);
      const source = await readFile(file, "utf8");
      if (source.split(anchor).length !== 2) throw new Error(`basePackage: ${path} holds its anchor ${source.split(anchor).length - 1} times, not once: ${anchor.trim()}`);
      await writeFile(file, source.replace(anchor, () => anchor + text));
    }
  }
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
