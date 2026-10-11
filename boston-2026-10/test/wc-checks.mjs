// The checks of WC-1, WC-3, WC-5, WC-7 and WC-12 (SPEC-week-content.md § 5, § 7) as functions over a PACKAGE (`root`: this one, or
// a mirror of it), each returning one line per thing the package gets wrong ([] when it is right). The cases run them on
// this package; WC-11's mutants run THE SAME checks on a mirror carrying one mutation (test/wc-11-mutants.test.mjs).
// Not a test file itself. Every expectation is the contract's, written here, never read back from the code under test.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { ROOT } from "../build.mjs";
import { card, openPlanPage } from "./cc-harness.mjs";
import { pageOf, V2_DIR } from "./ms-harness.mjs";
import {
  AWKWARD_DISPLAY,
  awkwardPicks,
  contentOf,
  noWeekPage,
  pageAsset,
  picksText,
  SHEET_1018,
  sheetKeyOf,
  startSite,
  V2_WEEK,
  WEEK_DATA_KEY,
  withPicksText,
} from "./wc-harness.mjs";

/** § 4.2: "escaped exactly as scriptJson escapes it at build" — the build's rule (build.mjs), written here on its own:
 *  JSON with every "<" as the escape \u003c, so nothing in it can close the element. WC-1 also checks the build agrees. */
export const scriptJsonRef = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

/** Where two texts first differ, for a problem line. */
export function firstDifference(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return `at ${i}: ${JSON.stringify(a.slice(Math.max(0, i - 40), i + 60))} vs ${JSON.stringify(b.slice(Math.max(0, i - 40), i + 60))}`;
}

/** The shown name a list line carries, as the page shows it (whitespace collapsed and trimmed). */
const shownName = (s) => s.replace(/\s+/g, " ").trim();

/**
 * WC-1: the bucket holds a valid one-week week/picks-data.json (the content command's own, of the fixture week with an
 * awkward shown name); a request for `/` gets the asset with `#picks-data`'s text replaced by the object's JSON, escaped
 * as at build, and every other byte the asset's; and the page so served shows the week.
 */
export async function rewriteProblems(root = ROOT) {
  const problems = [];
  const picks = await awkwardPicks();
  let site;
  try {
    const asset = await noWeekPage({ root });
    const { text } = await contentOf({ root, week: V2_WEEK, picksDir: picks.dir });
    const data = JSON.parse(text);
    site = await startSite({ root, assets: { "/": pageAsset(asset) }, objects: { [WEEK_DATA_KEY]: text } });
    const res = await site.get("/");
    const expected = withPicksText(asset, scriptJsonRef(data));
    if (res.status !== 200) problems.push(`/: status ${res.status}, not 200`);
    if (!/^text\/html/.test(res.headers["content-type"] ?? "")) problems.push(`/: content-type ${res.headers["content-type"]}`);
    if (res.text !== expected) problems.push(`/: not the asset with #picks-data replaced, ${firstDifference(res.text, expected)}`);
    if (res.text === asset) problems.push("/: the asset unchanged (the week was not put in)");
    const served = picksText(res.text);
    if (served !== null && served.includes("</")) problems.push("/: the element's text holds '</'");
    const page = openPlanPage(res.text, { hash: "#lean-or-7d", now: Date.parse("2031-01-01T17:00:00Z") });
    const state = card(page);
    if (!state.list) problems.push("/ at #lean-or-7d: the week's list is not shown");
    if (!state.meals.some((line) => line.includes(shownName(AWKWARD_DISPLAY)))) {
      problems.push(`/ at #lean-or-7d: no line shows ${JSON.stringify(shownName(AWKWARD_DISPLAY))}: ${JSON.stringify(state.meals)}`);
    }
  } catch (err) {
    problems.push(`no response to check: ${err.message}`);
  } finally {
    await site?.dispose();
    await picks.done();
  }
  return problems;
}

/** WC-3's objects: each must leave the page the asset, byte for byte. `valid` is a one-week object to break. */
export function badObjects(valid) {
  const week = valid.weeks[0];
  const anyCart = Object.keys(week.carts)[0];
  const anySnacks = Object.keys(week.snacks ?? {})[0];
  const without = (key, ...path) => {
    const copy = structuredClone(valid);
    let at = copy.weeks[0];
    for (const p of path) at = at[p];
    delete at[key];
    return JSON.stringify(copy);
  };
  const set = (fn) => {
    const copy = structuredClone(valid);
    fn(copy);
    return JSON.stringify(copy);
  };
  return {
    "not JSON": '{"weeks": [',
    "JSON null": "null",
    "a JSON array": JSON.stringify([valid]),
    // Not `{ ...valid, weeks: [] }`: that is byte for byte the no-week build's own #picks-data, so a page that took it
    // would still be the asset, and the case could not see it taken.
    "weeks: []": JSON.stringify({ weeks: [] }),
    "two weeks": JSON.stringify({ ...valid, weeks: [week, week] }),
    "weeks not a list": JSON.stringify({ ...valid, weeks: week }),
    "no weeks": set((c) => delete c.weeks),
    "a week without carts": without("carts"),
    "a cart without links": without("links", "carts", anyCart),
    "a cart without meals": without("meals", "carts", anyCart),
    "a cart without thumbs": without("thumbs", "carts", anyCart),
    "a cart without heading": without("heading", "carts", anyCart),
    "a cart's meals not a list": set((c) => (c.weeks[0].carts[anyCart].meals = "Turkey Chili Verde")),
    "a cart's link not text": set((c) => (c.weeks[0].carts[anyCart].links[Object.keys(c.weeks[0].carts[anyCart].links)[0]] = 21)),
    "carts a list": set((c) => (c.weeks[0].carts = Object.values(c.weeks[0].carts))),
    "carted not true or false": set((c) => (c.carted = "yes")),
    ...(anySnacks ? { "snacks without meals": without("meals", "snacks", anySnacks) } : {}),
  };
}

/** WC-3: each malformed object (and, WC-2, none at all) leaves `/` the asset byte for byte; nothing is thrown. */
export async function shapeProblems(root = ROOT) {
  const problems = [];
  let site;
  try {
    const asset = await noWeekPage({ root });
    const { text } = await contentOf({ root, week: V2_WEEK, picksDir: V2_DIR });
    const valid = JSON.parse(text);
    site = await startSite({ root, assets: { "/": pageAsset(asset) } });
    const bucket = await site.bucket();
    // The control: the valid object does change the page, so a comparison below can see a change.
    await bucket.put(WEEK_DATA_KEY, text);
    const control = await site.get("/");
    if (control.text === asset) problems.push("control: the valid object did not change the page");
    for (const [label, body] of Object.entries(badObjects(valid))) {
      await bucket.put(WEEK_DATA_KEY, body);
      const res = await site.get("/");
      if (res.status !== 200) problems.push(`${label}: status ${res.status}, not 200`);
      if (res.text !== asset) problems.push(`${label}: not the asset byte for byte, ${firstDifference(res.text, asset)}`);
    }
  } catch (err) {
    problems.push(`no response to check: ${err.message}`);
  } finally {
    await site?.dispose();
  }
  return problems;
}

/** WC-5's paths: never a key, so the bucket is never read for them. `/week/../x.jpg` reaches the Worker normalised (a
 *  URL's own rule), so the file-name check is also asked directly, with the raw path. */
export const REFUSED_PATHS = ["/week/../x.jpg", "/week/a/b.jpg", "/week/x.png", "/week/x..jpg", "/week/..%2Fx.jpg", "/week/%2e%2e/x.jpg", "/week/", "/week/.jpg"];

/** WC-5: a /week/ request that is not a plain .jpg file name is a 404, the bucket never read; an absent .jpg a 404. */
export async function pathProblems(root = ROOT) {
  const problems = [];
  let site;
  try {
    const { sheetKey } = await import(pathToFileURL(join(root, "src", "worker", "site.js")).href);
    for (const path of REFUSED_PATHS) {
      const key = sheetKey(path);
      if (key !== null) problems.push(`sheetKey(${JSON.stringify(path)}) is ${JSON.stringify(key)}, not null`);
    }
    const good = `/week/${SHEET_1018}`;
    if (sheetKey(good) !== sheetKeyOf(SHEET_1018)) problems.push(`control: sheetKey(${good}) is ${JSON.stringify(sheetKey(good))}`);
    // The bucket holds an object at every key a broken check could reach, so a read would find something.
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const objects = Object.fromEntries(
      ["week/x.png", "week/a/b.jpg", "week/../x.jpg", "x.jpg", "week/x..jpg", "week/..%2Fx.jpg", "week/%2e%2e/x.jpg", "week/", "week/.jpg", sheetKeyOf(SHEET_1018)].map(
        (k) => [k, jpeg],
      ),
    );
    site = await startSite({ root, objects, assets: {} });
    await site.log();
    for (const path of REFUSED_PATHS) {
      const res = await site.get(path);
      const { reads } = await site.log();
      if (res.status !== 404) problems.push(`${path}: status ${res.status}, not 404`);
      if (reads.length) problems.push(`${path}: the bucket was read (${reads.join(", ")})`);
    }
    const absent = await site.get("/week/absent-2026-10-25.jpg");
    if (absent.status !== 404) problems.push(`an absent .jpg: status ${absent.status}, not 404`);
    const present = await site.get(good);
    if (present.status !== 200 || !present.body.equals(jpeg)) problems.push(`control: ${good} is ${present.status}`);
  } catch (err) {
    problems.push(`no response to check: ${err.message}`);
  } finally {
    await site?.dispose();
  }
  return problems;
}

/** A date long after the fixture week's valid_to (2026-10-01), and one long before its valid_from (2026-09-25). */
export const AFTER = Date.parse("2027-03-01T17:00:00Z");
export const BEFORE = Date.parse("2026-01-15T17:00:00Z");

/** WC-7: the page's script, given one week whose valid_to has passed (or whose valid_from has not come), shows it. */
export async function dateProblems(root = ROOT) {
  const problems = [];
  try {
    const html = await pageOf({ root, picks: V2_DIR });
    const data = JSON.parse(picksText(html));
    if (data.weeks.length !== 1 || data.weeks[0].valid_to !== "2026-10-01") problems.push(`control: the page carries ${data.weeks.length} week(s)`);
    for (const [label, now] of [["after valid_to", AFTER], ["before valid_from", BEFORE]]) {
      const state = card(openPlanPage(html, { hash: "#lean-or-7d", now }));
      if (!state.list) problems.push(`${label}: the week's list is not shown`);
      if (state.choose) problems.push(`${label}: Choose your meals is still the card's only link`);
    }
  } catch (err) {
    problems.push(`no page to check: ${err.message}`);
  }
  return problems;
}

/** WC-12's week and date (§ 7's ruling: "a build with data/picks/2026-10-18.json present and --on 2026-10-11"). */
export const RULING_WEEK = "2026-10-18";
export const RULING_ON = "2026-10-11";
const run = promisify(execFile);

/**
 * WC-12 (§ 7, the orchestrator's ruling on its first open question): the build embeds NO week. With
 * data/picks/2026-10-18.json in the package and `--on 2026-10-11` given (the week's window open that day), the programs
 * `npm run build` and `npm run build:dev` run (`node build.mjs [--env dev] --on 2026-10-11 --out <tmp>`, in the package)
 * write a page whose #picks-data holds `weeks: []`. The development build needs the package's wrangler.jsonc.
 */
export async function buildWeekProblems(root = ROOT) {
  const problems = [];
  if (!existsSync(join(root, "data", "picks", `${RULING_WEEK}.json`))) return [`control: no data/picks/${RULING_WEEK}.json in the package`];
  for (const env of [[], ["--env", "dev"]]) {
    const label = env.length ? "build:dev" : "build";
    const out = await mkdtemp(join(tmpdir(), "boston-wc12-"));
    try {
      await run(process.execPath, [join(root, "build.mjs"), ...env, "--on", RULING_ON, "--out", out], { cwd: root });
      const text = picksText(await readFile(join(out, "index.html"), "utf8"));
      if (text === null) {
        problems.push(`${label}: no #picks-data on the page`);
        continue;
      }
      const weeks = JSON.parse(text).weeks;
      if (!Array.isArray(weeks) || weeks.length) problems.push(`${label}: #picks-data holds ${JSON.stringify(weeks?.map?.((w) => w.delivery) ?? weeks)}, not []`);
    } catch (err) {
      problems.push(`${label}: no page to check: ${err.message}`);
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  }
  return problems;
}
