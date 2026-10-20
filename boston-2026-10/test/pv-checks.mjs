// The checks of PV1–PV7 (SPEC-preview-sites.md § 4) as functions over a PACKAGE (`root`: this one, or a mirror of it),
// each returning one line per thing the package gets wrong ([] when it is right). The cases run them on this package;
// § 4's two mutants run THE SAME checks on a mirror carrying one mutation (test/pv-mutants.test.mjs), and
// test/pv-05-record.mjs runs PV5's build hashing on the contract commit's own tree. Not a test file itself. Every
// expectation is the contract's, written here, never read back from the code under test.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, symlink, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { parseHTML } from "linkedom";
import { ROOT } from "../build.mjs";
import { DAYS, hiddenInTree, midday, openPlanPage } from "./cc-harness.mjs";
import { FRAGMENTS } from "./u-checks.mjs";
import { pageAsset, picksText, withPicksText } from "./wc-harness.mjs";
import {
  ABSENT_WEEK,
  dataKey,
  FIXTURE_DIR,
  FLAT_SHEET,
  moduleOf,
  OTHER_WEEK,
  pagePath,
  previewBuild,
  previewContentOf,
  previewFrom,
  readFixture,
  runContent,
  SHEET,
  sheetKey,
  sheetPath,
  startPreview,
  tempDir,
  WEEK,
} from "./pv-harness.mjs";

/** § 1 item 2 and PV1: the store; the built page holds no URL of it at all. */
export const STORE_HOST = "fitafnutrition.com";
/** § 1 item 2's banner, as the contract writes it ({date} the week's delivery, as the address names it: § 7 of the
 *  build's notes), and the words added when no approval binds to the week's picks. */
export const BANNER_WORDS = "Preview of the week delivered {date}. Ordering is off.";
export const NOT_APPROVED_WORDS = "Not yet approved.";
/** A browser clock for the cases (no date decides the week: SPEC-week-content § 2.2). */
const NOW = midday(DAYS["S-5"]);
/** The individual fragments whose answer set has a cart in the fixture (all eight rows: every one), and two more. */
const INDIVIDUAL = [...FRAGMENTS, "#lean-7", "#signature-14"];

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const collapse = (s) => s.replace(/\s+/g, " ").trim();
const message = (err) => (err?.message ?? String(err)).split("\n")[0];

async function filesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await filesUnder(path)));
    else out.push(path);
  }
  return out;
}

/** Every file under `dir` by path from it: SHA-256. */
export async function hashesUnder(dir) {
  const hashes = {};
  for (const f of (await filesUnder(dir)).sort()) hashes[relative(dir, f)] = sha256(await readFile(f));
  return hashes;
}

/** PV5: the SHA-256 of every file `root`'s build() writes for `target`, into an empty temporary directory. */
export async function buildHashes(root, target) {
  const { build } = await moduleOf(root, "build.mjs");
  const t = await tempDir(`build-${target}`);
  try {
    await build({ target, outDir: t.dir });
    return await hashesUnder(t.dir);
  } finally {
    await t.done();
  }
}

/** An element's text as shown: without its hidden descendants, whitespace collapsed. */
function shownText(node) {
  const copy = node.cloneNode(true);
  for (const n of [...copy.querySelectorAll("*")]) if (n.hasAttribute("hidden")) n.remove();
  return collapse(copy.textContent);
}

const nameOf = (a) => (a.id ? `#${a.id}` : a.getAttribute("data-cell") ? `cell ${a.getAttribute("data-cell")}` : a.getAttribute("data-plan") ? `${a.getAttribute("data-plan")} link` : `a.${a.className}`);

/** The links of a document that lead somewhere, or are not shown disabled. */
function linkLines(document, where) {
  const lines = [];
  for (const a of document.querySelectorAll("a")) {
    if (a.hasAttribute("href")) lines.push(`${where}: ${nameOf(a)} leads somewhere (${a.getAttribute("href")})`);
    if (a.getAttribute("aria-disabled") !== "true") lines.push(`${where}: ${nameOf(a)} is not shown disabled`);
  }
  return lines;
}

/** PV1 on the page as built (before any script runs): no store URL anywhere and no link with an href; the plan links a
 *  visitor without JavaScript sees (the grid's cells, Family's button) shown disabled; no beacon, no rung 4. The links
 *  the scripts fill (the result card's, the Chef's Choice card's) are hidden until they run, and are checked running. */
function builtPageProblems(html) {
  const problems = [];
  const hits = html.split(STORE_HOST).length - 1;
  if (hits) problems.push(`the built page holds ${hits} URL(s) of ${STORE_HOST}`);
  const { document } = parseHTML(html);
  const planLinks = [...document.querySelectorAll("a.cell, a[data-plan]")];
  if (planLinks.length !== 7) problems.push(`the built page has ${planLinks.length} plan links, not the grid's six and Family's one (control)`);
  for (const a of document.querySelectorAll("a[href]")) problems.push(`the built page: ${nameOf(a)} leads somewhere (${a.getAttribute("href")})`);
  for (const a of planLinks) if (a.getAttribute("aria-disabled") !== "true") problems.push(`the built page: ${nameOf(a)} is not shown disabled`);
  if (html.includes("sendBeacon")) problems.push("the built page carries the analytics beacon");
  for (const mark of ['id="save-data"', 'class="draft-banner"', 'id="offer-box"']) if (html.includes(mark)) problems.push(`the built page carries rung 4 (${mark})`);
  return problems;
}

/**
 * PV1 (§ 1 item 2): a preview file builds a page whose every store link is absent and whose controls are disabled: the
 * preview build's page (no week, as built) holds no fitafnutrition.com URL at all; the content made from the fixture's
 * preview file carries no address; and the page served with it, run as a browser runs it, offers no link at any moment
 * (on load and at every individual fragment and Family), while the week's Chef's Choice card IS filled in (so the
 * page is not passing by showing nothing): its list, Continue to checkout and Choose my own meals shown, disabled.
 */
export async function linkProblems(root = ROOT) {
  const problems = [];
  const from = await previewFrom();
  try {
    const { html } = await previewBuild(root);
    problems.push(...builtPageProblems(html));
    const { text } = await previewContentOf({ root, from: from.dir });
    if (text === null) return [...problems, "the preview content has no picks-data.json"];
    if (text.includes(STORE_HOST) || /https?:/.test(text)) problems.push("the preview content carries an address");
    if (text.includes("#fitaf=")) problems.push("the preview content carries a deep-cart link");
    const served = withPicksText(html, text);
    if (served.includes(STORE_HOST)) problems.push(`the served page carries ${STORE_HOST}`);
    const page = openPlanPage(served, { hash: "", now: NOW });
    const el = (id) => page.document.getElementById(id);
    problems.push(...linkLines(page.document, "on load"));
    for (const fragment of [...INDIVIDUAL, "#family"]) {
      page.go(fragment);
      problems.push(...linkLines(page.document, fragment));
      if (fragment === "#family") continue;
      if (!el("cc-list") || hiddenInTree(el("cc-list"))) problems.push(`${fragment}: the week's Chef's Choice is not shown (the card is not filled in)`);
      for (const id of ["cc-checkout", "cc-own"]) if (!el(id) || hiddenInTree(el(id))) problems.push(`${fragment}: #${id} is not shown`);
    }
  } catch (err) {
    problems.push(`no page to check: ${message(err)}`);
  } finally {
    await from.done();
  }
  return problems;
}

/**
 * PV2 (§ 1 item 2): the banner at the top names the date, and "Not yet approved." only when `approved` is false. The
 * words are data/messages.json's (`preview`), carried by no source file. Checked for the fixture's two weeks: 2026-11-01
 * (approved false) and 2026-10-25 (approved true), on load and after a fragment change.
 */
export async function bannerProblems(root = ROOT) {
  const problems = [];
  const messages = JSON.parse(await readFile(join(root, "data", "messages.json"), "utf8"));
  if (messages.preview?.banner !== BANNER_WORDS) problems.push(`data/messages.json: preview.banner is ${JSON.stringify(messages.preview?.banner)}, not § 1's words`);
  if (messages.preview?.not_approved !== NOT_APPROVED_WORDS) problems.push(`data/messages.json: preview.not_approved is ${JSON.stringify(messages.preview?.not_approved)}`);
  const sources = ["src/template.html", "src/app.js", "src/preview/banner.html", "src/preview/preview.js", "src/preview/style.css", "build.mjs", "scripts/week-content.mjs", "src/worker/preview.js"];
  for (const file of sources) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    const text = await readFile(path, "utf8");
    for (const part of ["Preview of the week delivered", "Ordering is off", NOT_APPROVED_WORDS]) if (text.includes(part)) problems.push(`${file} carries the banner's words: ${JSON.stringify(part)}`);
  }
  const from = await previewFrom();
  try {
    const { html } = await previewBuild(root);
    for (const [week, approved] of [[WEEK, false], [OTHER_WEEK, true]]) {
      if ((await readFixture(week)).approved !== approved) problems.push(`fixture control: ${week}.json is not approved: ${approved}`);
      const { text } = await previewContentOf({ root, week, from: from.dir });
      const page = openPlanPage(withPicksText(html, text), { hash: "", now: NOW });
      const banner = page.document.getElementById("preview-banner");
      if (!banner) {
        problems.push(`${week}: the page has no #preview-banner`);
        continue;
      }
      if (page.document.body.firstElementChild !== banner) problems.push(`${week}: the banner is not the first thing on the page`);
      if (hiddenInTree(banner)) problems.push(`${week}: the banner is hidden`);
      const expected = BANNER_WORDS.replace("{date}", week) + (approved ? "" : ` ${NOT_APPROVED_WORDS}`);
      for (const at of ["", "#lean-or-7d"]) {
        if (at) page.go(at);
        const seen = shownText(banner);
        if (seen !== expected) problems.push(`${week}${at ? ` at ${at}` : ""}: the banner reads ${JSON.stringify(seen)}, not ${JSON.stringify(expected)}`);
      }
    }
  } catch (err) {
    problems.push(`no page to check: ${message(err)}`);
  } finally {
    await from.done();
  }
  return problems;
}

/** `fn` rejects; a line when it does not, or when its reason does not match `reason`. */
async function refuses(fn, reason, label) {
  try {
    await fn();
    return [`${label}: accepted`];
  } catch (err) {
    return reason.test(err.message) ? [] : [`${label}: refused, but not for being a preview: ${message(err)}`];
  }
}

/**
 * PV3 (§ 2): checkPicks refuses `preview: true` wherever no preview is read, so a preview can never reach the live site:
 * checkPicks itself without a preview read (and, the control, accepts it in one); the LIVE content command, for the
 * production Worker and with --env dev for the development Worker, as a function and as the program, over a picks
 * directory holding the preview file alone and holding it beside a live week (the v2 fixture's), which then cannot be
 * made either. Each refusal writes nothing.
 */
export async function liveRefusalProblems(root = ROOT) {
  const problems = [];
  const PREVIEW = /preview/i;
  const { checkPicks } = await moduleOf(root, "scripts", "chefs-choice.mjs");
  const { weekContent } = await moduleOf(root, "scripts", "week-content.mjs");
  const plans = JSON.parse(await readFile(join(root, "data", "plans.json"), "utf8"));
  const file = await readFixture(WEEK);
  if (file.preview !== true) problems.push("fixture control: the file says preview: true");
  problems.push(...(await refuses(() => checkPicks(structuredClone(file), `${WEEK}.json`, plans), PREVIEW, "checkPicks, no preview read")));
  try {
    checkPicks(structuredClone(file), `${WEEK}.json`, plans, null, { preview: true });
  } catch (err) {
    problems.push(`control: checkPicks in a preview read refuses the fixture: ${message(err)}`);
  }
  const alone = await tempDir("picks-alone");
  const beside = await tempDir("picks-beside");
  try {
    await writeFile(join(alone.dir, `${WEEK}.json`), JSON.stringify(file, null, 2));
    const live = await readFile(join(ROOT, "test", "fixtures", "picks-v2", "2026-10-04.json"));
    await writeFile(join(beside.dir, "2026-10-04.json"), live);
    try {
      await weekContent({ week: "2026-10-04", picksDir: beside.dir });
    } catch (err) {
      problems.push(`control: the live week alone is refused: ${message(err)}`);
    }
    await writeFile(join(beside.dir, `${WEEK}.json`), JSON.stringify(file, null, 2));
    for (const target of ["prod", "dev"]) {
      problems.push(...(await refuses(() => weekContent({ week: WEEK, picksDir: alone.dir, target }), PREVIEW, `the live content (${target}) of the preview file`)));
      problems.push(...(await refuses(() => weekContent({ week: "2026-10-04", picksDir: beside.dir, target }), PREVIEW, `the live content (${target}) of a live week beside the preview file`)));
      const out = await tempDir("out");
      try {
        const r = runContent(root, ["--week", WEEK, "--out", out.dir, "--picks", alone.dir, ...(target === "dev" ? ["--env", "dev"] : [])]);
        if (r.status === 0) problems.push(`the live content program (${target}) of the preview file: exit 0`);
        else if (!PREVIEW.test(r.stderr)) problems.push(`the live content program (${target}): refused, but not for being a preview: ${r.stderr.trim()}`);
        const written = await readdir(out.dir);
        if (written.length) problems.push(`the live content program (${target}) wrote ${written.join(", ")}`);
      } finally {
        await out.done();
      }
    }
  } finally {
    await alone.done();
    await beside.done();
  }
  return problems;
}

/** PV3's builds: `npm run build` and `npm run build:dev` of a mirror whose data/picks/ holds the preview file (beside the
 *  committed weeks) embed no week: `#picks-data` holds `weeks: []` (SPEC-week-content § 7's ruling, kept). */
export async function buildEmbedsNoPreviewProblems(mirrorOf) {
  const problems = [];
  const file = await readFixture(WEEK);
  const m = await mirrorOf(async (pkg) => {
    await mkdir(join(pkg, "data", "picks"), { recursive: true });
    await writeFile(join(pkg, "data", "picks", `${WEEK}.json`), JSON.stringify(file, null, 2));
  });
  try {
    for (const target of ["prod", "dev"]) {
      const { build } = await moduleOf(m.pkg, "build.mjs");
      const out = await tempDir(`build-${target}`);
      try {
        await build({ target, outDir: out.dir });
        const text = picksText(await readFile(join(out.dir, "index.html"), "utf8"));
        const weeks = text === null ? null : JSON.parse(text).weeks;
        if (!Array.isArray(weeks) || weeks.length) problems.push(`${target}: #picks-data holds ${JSON.stringify(weeks)}, not []`);
      } catch (err) {
        problems.push(`${target}: the build failed: ${message(err)}`);
      } finally {
        await out.done();
      }
    }
  } finally {
    await m.done();
  }
  return problems;
}

/** The fake ASSETS of the preview Worker's cases: dist-preview's page at "/", one font, the logo. */
async function previewAssets(html) {
  const font = "open-sans-latin-400-normal.woff2";
  return {
    font: `/fonts/${font}`,
    fontBytes: await readFile(join(ROOT, "src", "fonts", font)),
    table: {
      "/": pageAsset(html),
      [`/fonts/${font}`]: { status: 200, headers: { "content-type": "font/woff2" }, body: await readFile(join(ROOT, "src", "fonts", font)) },
    },
  };
}

/** PV4's guard: a live week (the v2 fixture's delivery) and a date a preview is mis-filed under. */
const LIVE_WEEK = "2026-10-04";
const MISFILED_WEEK = "2026-11-29";

/** Paths a preview Worker must answer with a 404 without reading its bucket: a "..", raw (route) or encoded (served), and
 *  a segment that is not a date (or not a real one), and the shapes § 3 does not name. */
export const REFUSED_RAW = [`/${WEEK}/week/../x.jpg`, `/../${WEEK}/`, `/${WEEK}/../`, `/${WEEK}/week/x..jpg`];
export const REFUSED_SERVED = [
  `/${WEEK}/week/..%2Fx.jpg`,
  `/${WEEK}/week/%2e%2e/x.jpg`,
  "/..%2F2026-11-01/",
  "/2026-13-01/",
  "/2026-02-30/",
  "/2026-11-1/",
  "/latest/",
  `/${WEEK}`,
  `/${WEEK}/index.html`,
  `/${WEEK}/week/x.png`,
  `/${WEEK}/week/a/b.jpg`,
  `/${WEEK}/week/`,
  "/index.html",
  "/week/x.jpg",
  "/previews/",
];

/**
 * PV4 (§ 3): the preview Worker over a fake ASSETS and a fake PREVIEW holding the content the preview content command
 * made for the fixture's two deliveries (and, to be ignored, a stray object and a delivery with a sheet but no data):
 * `/` lists the two, newest first, each a link; `/2026-11-01/` is dist-preview's page with that week's object as its
 * `#picks-data` (escaped as at build), every other byte the asset's, `Cache-Control` the live page's; `/2026-11-08/` (no
 * object) a 404 naming the date; `/2026-11-01/week/<sheet>` the sheet, image/jpeg; the page's static files from the
 * assets; a path with ".." or a non-date a 404, the bucket never read for it. And (the build's reading of § 1 item 2: the
 * page has no link to the store at all) an object that is not a preview of its date, a live week's content or a preview
 * filed under another date, is a 404 naming the date.
 */
export async function workerProblems(root = ROOT) {
  const problems = [];
  const from = await previewFrom();
  let worker;
  try {
    const { html } = await previewBuild(root);
    const one = await previewContentOf({ root, week: WEEK, from: from.dir });
    const two = await previewContentOf({ root, week: OTHER_WEEK, from: from.dir });
    const objects = { ...one.files, ...two.files, "previews/notes.txt": "not a preview", [sheetKey("2026-11-15", SHEET)]: await readFile(FLAT_SHEET) };
    if (!one.files[sheetKey(WEEK, SHEET)]) problems.push(`fixture control: the content of ${WEEK} has its sheet ${sheetKey(WEEK, SHEET)}`);
    const assets = await previewAssets(html);
    const route = (await moduleOf(root, "src", "worker", "preview.js")).route;
    for (const path of REFUSED_RAW) if (route(path) !== null) problems.push(`route(${JSON.stringify(path)}) is ${JSON.stringify(route(path))}, not null`);
    worker = await startPreview({ root, assets: assets.table, objects });
    await worker.reads();

    // GET /: the deliveries with a preview, newest first, each a link.
    const list = await worker.get("/");
    if (list.status !== 200 || !/^text\/html/.test(list.headers["content-type"] ?? "")) problems.push(`/: ${list.status} ${list.headers["content-type"]}`);
    const links = [...parseHTML(list.text).document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
    if (JSON.stringify(links) !== JSON.stringify([pagePath(WEEK), pagePath(OTHER_WEEK)])) problems.push(`/: links ${JSON.stringify(links)}, not ${WEEK} then ${OTHER_WEEK}`);
    if (list.headers["cache-control"] !== "no-cache") problems.push(`/: Cache-Control ${list.headers["cache-control"]}`);

    // GET /2026-11-01/: the page with that week.
    await worker.reads();
    const page = await worker.get(pagePath(WEEK));
    if (page.status !== 200) problems.push(`${pagePath(WEEK)}: status ${page.status}`);
    if (picksText(page.text) !== one.text) problems.push(`${pagePath(WEEK)}: #picks-data is not the object's text`);
    if (page.text !== withPicksText(html, one.text)) problems.push(`${pagePath(WEEK)}: the rest of the page is not the asset's, byte for byte`);
    if (page.headers["cache-control"] !== "no-cache" || page.headers.etag || page.headers["last-modified"]) {
      problems.push(`${pagePath(WEEK)}: Cache-Control ${page.headers["cache-control"]}, ETag ${page.headers.etag}, Last-Modified ${page.headers["last-modified"]} (the live page's: no-cache, no validator)`);
    }
    const asked = worker.assetRequests.at(-1);
    if (!asked || asked.path !== "/") problems.push(`${pagePath(WEEK)}: the assets were asked ${asked?.path}, not / (dist-preview's page)`);
    const again = await worker.get(pagePath(OTHER_WEEK), { headers: { "if-none-match": '"asset-etag"' } });
    if (again.status !== 200 || picksText(again.text) !== two.text) problems.push(`${pagePath(OTHER_WEEK)} with If-None-Match: ${again.status}, not the page with its week`);
    if (worker.assetRequests.at(-1)?.headers["if-none-match"]) problems.push("the assets were asked with the visitor's If-None-Match");

    // GET /2026-11-08/: no object, a 404 naming the date.
    const absent = await worker.get(pagePath(ABSENT_WEEK));
    if (absent.status !== 404) problems.push(`${pagePath(ABSENT_WEEK)}: status ${absent.status}, not 404`);
    if (!absent.text.includes(ABSENT_WEEK)) problems.push(`${pagePath(ABSENT_WEEK)}: the 404 does not name the date`);

    // GET /2026-11-01/week/<sheet>: the sheet.
    const sheet = await worker.get(sheetPath(WEEK, SHEET));
    if (sheet.status !== 200 || !sheet.body.equals(await readFile(FLAT_SHEET))) problems.push(`${sheetPath(WEEK, SHEET)}: ${sheet.status}, not the sheet's bytes`);
    if (sheet.headers["content-type"] !== "image/jpeg") problems.push(`${sheetPath(WEEK, SHEET)}: ${sheet.headers["content-type"]}`);
    const sheetAbsent = await worker.get(sheetPath(WEEK, "absent.jpg"));
    if (sheetAbsent.status !== 404) problems.push(`an absent sheet: ${sheetAbsent.status}, not 404`);

    // The page's static files, from the assets.
    const font = await worker.get(assets.font);
    if (font.status !== 200 || !font.body.equals(assets.fontBytes)) problems.push(`${assets.font}: ${font.status}, not the asset`);

    // Refused: a 404, the bucket never read.
    await worker.reads();
    for (const path of REFUSED_SERVED) {
      const res = await worker.get(path);
      const reads = await worker.reads();
      if (res.status !== 404) problems.push(`${path}: status ${res.status}, not 404`);
      if (reads.length) problems.push(`${path}: the bucket was read (${reads.join(", ")})`);
    }
    for (const method of ["POST", "PUT", "DELETE"]) {
      const res = await worker.get(pagePath(WEEK), { method });
      if (res.status !== 404) problems.push(`${method} ${pagePath(WEEK)}: status ${res.status}, not 404`);
    }
    await worker.dispose();
    worker = undefined;

    // Not a preview of that date (§ 1 item 2: the page has no link to the store at all): a LIVE week's content (the
    // live content command's, carrying the store's links) at a delivery's key, and a preview filed under another date,
    // are each a 404 naming the date. A second Worker, so the list above is the contract's two.
    const { weekContent } = await moduleOf(root, "scripts", "week-content.mjs");
    const live = await weekContent({ week: LIVE_WEEK, picksDir: join(ROOT, "test", "fixtures", "picks-v2") });
    const liveText = Buffer.from(live.files[0].bytes).toString("utf8");
    if (!liveText.includes(STORE_HOST)) problems.push(`fixture control: the live content of ${LIVE_WEEK} carries the store's links`);
    worker = await startPreview({ root, assets: assets.table, objects: { [dataKey(LIVE_WEEK)]: liveText, [dataKey(MISFILED_WEEK)]: one.text } });
    for (const date of [LIVE_WEEK, MISFILED_WEEK]) {
      const res = await worker.get(pagePath(date));
      if (res.status !== 404 || !res.text.includes(date)) problems.push(`${pagePath(date)} (${date === LIVE_WEEK ? "a live week's content" : `${WEEK}'s preview filed there`}): ${res.status}, not a 404 naming the date`);
      if (res.text.includes(STORE_HOST)) problems.push(`${pagePath(date)}: the response carries ${STORE_HOST}`);
    }
  } catch (err) {
    problems.push(`no Worker to check: ${message(err)}`);
  } finally {
    await worker?.dispose();
    await from.done();
  }
  return problems;
}

/**
 * PV6 (§ 2: "deterministic, as § 3 there"): `npm run content -- --preview --week 2026-11-01 --from <dir> --out <dir>`,
 * the program, twice into two empty directories: exit 0, the same files byte for byte (the data and the sheet, at
 * § 2's keys, the sheet byte-identical to the one --from holds), and the same report (path, size, SHA-256) but for the
 * --out given. The data is the week's, marked a preview and not approved, its tiles' sheet at the Worker's address.
 */
export async function determinismProblems(root = ROOT) {
  const problems = [];
  const from = await previewFrom();
  const runs = [await tempDir("out-a"), await tempDir("out-b")];
  try {
    const results = runs.map((out) => runContent(root, ["--preview", "--week", WEEK, "--from", from.dir, "--out", out.dir]));
    results.forEach((r, i) => {
      if (r.status !== 0) problems.push(`run ${i + 1}: exit ${r.status}: ${r.stderr.trim()}`);
    });
    if (problems.length) return problems;
    const [a, b] = await Promise.all(runs.map((out) => hashesUnder(out.dir)));
    const keys = [dataKey(WEEK), sheetKey(WEEK, SHEET)].sort();
    if (JSON.stringify(Object.keys(a)) !== JSON.stringify(keys)) problems.push(`the files are ${JSON.stringify(Object.keys(a))}, not ${JSON.stringify(keys)}`);
    if (JSON.stringify(a) !== JSON.stringify(b)) problems.push("the two runs' files differ");
    if (a[sheetKey(WEEK, SHEET)] !== sha256(await readFile(FLAT_SHEET))) problems.push("the sheet is not --from's, byte for byte");
    const report = (r, out) => r.stdout.split(out).join("<out>");
    if (report(results[0], runs[0].dir) !== report(results[1], runs[1].dir)) problems.push("the two runs' reports differ");
    for (const key of keys) {
      const bytes = await readFile(join(runs[0].dir, key));
      const line = `wrote ${join(runs[0].dir, key)} (${bytes.length} bytes) sha256:${sha256(bytes)}`;
      if (!results[0].stdout.split("\n").includes(line)) problems.push(`the report has no line ${JSON.stringify(line)}`);
    }
    const data = JSON.parse(await readFile(join(runs[0].dir, dataKey(WEEK)), "utf8"));
    const week = data.weeks?.[0];
    if (data.weeks?.length !== 1 || week.delivery !== WEEK) problems.push(`the data holds ${JSON.stringify(data.weeks?.map((w) => w.delivery))}, not [${WEEK}]`);
    else {
      if (week.preview !== true || week.approved !== false) problems.push(`the week says preview ${week.preview}, approved ${week.approved}`);
      const url = `url("${sheetPath(WEEK, SHEET)}")`;
      const thumbs = Object.values(week.carts ?? {}).flatMap((c) => c.thumbs ?? []);
      if (!thumbs.some((t) => t && t.includes(url))) problems.push(`no tile shows the sheet at ${url}`);
    }
  } finally {
    for (const out of runs) await out.done();
    await from.done();
  }
  return problems;
}

/**
 * PV7 (§ 2, amended 2026-10-20): the preview content command refused, writing nothing, without --from, with a --from
 * that does not exist, and with a --from that resolves inside this repository's tree (the package's top level is one
 * directory below the repository's): the committed fixture, the package, the repository's top level, a directory of the
 * repository outside the package, and a link elsewhere that resolves into the repository. Its control: a temporary
 * copy of the fixture is accepted.
 */
export async function fromRefusalProblems(root = ROOT) {
  const problems = [];
  const from = await previewFrom();
  const links = await tempDir("link");
  try {
    const base = ["--preview", "--week", WEEK];
    const repo = dirname(root);
    const outsidePackage = (await readdir(repo, { withFileTypes: true })).find((e) => e.isDirectory() && join(repo, e.name) !== root && !e.name.startsWith("."));
    const linked = join(links.dir, "from");
    await symlink(existsSync(join(root, "test", "fixtures", "previews")) ? join(root, "test", "fixtures", "previews") : join(root, "data"), linked);
    const refused = [
      ["no --from", []],
      ["a --from that does not exist", ["--from", join(from.dir, "no-such-directory")]],
      ...(existsSync(join(root, "test", "fixtures", "previews")) ? [["--from the committed fixture", ["--from", join(root, "test", "fixtures", "previews")]]] : []),
      ["--from the package", ["--from", root]],
      ["--from the repository's top level", ["--from", repo]],
      ...(outsidePackage ? [[`--from the repository's ${outsidePackage.name}/`, ["--from", join(repo, outsidePackage.name)]]] : []),
      ["--from a link that resolves into the repository", ["--from", linked]],
      ["--from without --preview (the live command takes none)", ["--week", WEEK, "--from", from.dir]],
    ];
    for (const [label, args] of refused) {
      const out = await tempDir("out");
      try {
        const r = runContent(root, [...(label.includes("without --preview") ? [] : base), ...args, "--out", out.dir]);
        if (r.status === 0) problems.push(`${label}: exit 0`);
        else if (!/--from/.test(r.stderr)) problems.push(`${label}: refused, but its words do not name --from: ${r.stderr.trim()}`);
        const written = await readdir(out.dir);
        if (written.length) problems.push(`${label}: wrote ${written.join(", ")}`);
      } finally {
        await out.done();
      }
    }
    const out = await tempDir("out");
    try {
      const r = runContent(root, [...base, "--from", from.dir, "--out", out.dir]);
      if (r.status !== 0) problems.push(`control: a temporary copy of the fixture is refused: ${r.stderr.trim()}`);
      else if (!existsSync(join(out.dir, dataKey(WEEK)))) problems.push(`control: ${dataKey(WEEK)} not written`);
    } finally {
      await out.done();
    }
  } finally {
    await links.done();
    await from.done();
  }
  return problems;
}

/** The fixture directory, for a case that needs to name it. */
export { FIXTURE_DIR };
