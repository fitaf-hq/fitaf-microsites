// `npm run catalog -- --out <dir> [--mpid 26] [--every <minutes>] [--max <minutes>]` (SPEC-storefront-watch § 13), apart
// from the process: bin/catalog.mjs runs it against the live store, and the tests (CT-1–CT-6) against the synthetic store.
// The store's page's OWN /catalog/products response, read by `visit` (lib/visit.mjs's ordinaryVisit with `capture`: F6's
// launcher and visit, a fresh profile each time), is saved byte for byte as <dir>/products.json, with <dir>/visit.json
// beside it: the page's URL, the times the page loaded and the response arrived (UTC), the status, the content type, the
// body's bytes and SHA-256, the request's host and path and its parameters' NAMES (never a value: the storefront's key is
// one, and the visit never hands the URL over), the browser's agent, and each read's counts of all-meals and snacks.
// The command itself requests nothing, of the store or its backend: every request is the page's (§ 2, § 12 item 1).
// Without --every, one read, written as it is. With --every M, a read is due every M minutes from the first (one at once
// if the last ran late), while no later than --max; once two consecutive reads carry the same all-meals and snacks names
// (as sets), the LAST is written; a read refused by item 4 agrees with nothing and the reads go on, but a body holding the
// key stops them at once. Exit 0 written; 1 nothing written because of what the store served (item 4, more than one
// catalog response in one visit, or no two reads agreeing by --max); 2 a usage error or an --out refused (item 4's and
// item 5's), both before any visit, or the visit itself failing. Nothing is written unless it returns 0.
import { createHash } from "node:crypto";
import { lstat, realpath, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { catalogProducts, MENU_CATEGORY, namesIn } from "./catalog-response.mjs";
import { REPO_DIR, STORE_ORIGIN } from "./config.mjs";

export const USAGE = `usage: npm run catalog -- --out <dir> [--mpid 26] [--every <minutes>] [--max <minutes>]
  --out <dir>        required: an existing directory outside this repository, holding neither products.json nor visit.json
  --mpid <N>         the plan page visited, /order?mpid=N (default 26)
  --every <minutes>  2 or more: a fresh visit every M minutes until two consecutive reads carry the same all-meals and
                     snacks names; then the last read is written
  --max <minutes>    with --every only, and not below it: no read is due later (default 120); none agreeing, nothing written
  (no --every)       one read, written as it is`;

/** § 13 item 1: the plan the 2026-10-02 and 2026-10-09 captures used. */
export const DEFAULT_MPID = 26;
/** § 13 item 2: a person's pace. */
export const MIN_EVERY_MINUTES = 2;
/** --every without --max: the switch of 2026-10-09 ran about an hour; twice that. */
export const DEFAULT_MAX_MINUTES = 120;
const MINUTE_MS = 60_000;
/** The snacks' category, as lib/probe-snacks.mjs reads it. */
const SNACKS = "snacks";
const PRODUCTS = "products.json";
const VISIT = "visit.json";
/** § 13 item 4: `sk_` followed by a letter or digit, the storefront's key's shape. A body holding it is never saved. */
const KEY = /sk_[A-Za-z0-9]/;
const holdsKey = (text) => KEY.test(text);
const KEY_REFUSAL = 'the body holds "sk_" and a letter or digit: the storefront\'s key is never saved';

class Usage extends Error {}

const sleepFor = (ms) => new Promise((done) => setTimeout(done, ms));
const held = (path) => lstat(path).then(() => true, () => false);

function usage(err, why) {
  err(`storefront-watch catalog: ${why}`);
  err(USAGE);
  return 2;
}

/** A number of minutes, or a usage error. */
function minutes(value, name) {
  const n = Number(value);
  if (value === "" || !Number.isFinite(n)) throw new Usage(`${name} must be a number of minutes, got ${value}`);
  return n;
}

function parse(argv) {
  let values;
  try {
    ({ values } = parseArgs({ args: argv, options: { out: { type: "string" }, mpid: { type: "string" }, every: { type: "string" }, max: { type: "string" } } }));
  } catch (e) {
    throw new Usage(e.message);
  }
  if (values.out === undefined) throw new Usage("--out is required: the directory the catalog is written into, outside this repository");
  const mpid = values.mpid === undefined ? DEFAULT_MPID : Number(values.mpid);
  if (!Number.isInteger(mpid) || mpid < 1) throw new Usage(`--mpid must be a whole number above 0, got ${values.mpid}`);
  if (values.every === undefined) {
    if (values.max !== undefined) throw new Usage("--max goes with --every: without it the command reads once");
    return { out: values.out, mpid, every: null, max: null };
  }
  const every = minutes(values.every, "--every");
  if (every < MIN_EVERY_MINUTES) throw new Usage(`--every must be ${MIN_EVERY_MINUTES} minutes or more (a person's pace), got ${values.every}`);
  const max = values.max === undefined ? DEFAULT_MAX_MINUTES : minutes(values.max, "--max");
  if (max < every) throw new Usage(`--max (${values.max}) is below --every (${values.every}): there would be one read, which can agree with none`);
  return { out: values.out, mpid, every, max };
}

/** Why `dir` cannot take the files (§ 13 items 3 and 5), or null. */
async function outRefusal(dir) {
  let st;
  try {
    st = await stat(dir);
  } catch {
    return `${dir} does not exist`;
  }
  if (!st.isDirectory()) return `${dir} is not a directory`;
  const rel = relative(await realpath(REPO_DIR), await realpath(dir));
  const outside = rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
  if (!outside) return `${dir} is inside this repository, which is public: what the command writes is never kept here`;
  for (const name of [PRODUCTS, VISIT]) if (await held(join(dir, name))) return `${dir} already holds ${name}`;
  return null;
}

/** One read: the visit's capture judged by § 13 item 4. `meals` and `snacks` its names, or `refused` why (`stop`: a key). */
function judge(capture) {
  const read = { loadedAt: capture.loadedAt, userAgent: capture.userAgent };
  const { responses } = capture;
  if (!responses.length) return { ...read, refused: "no catalog response within the visit's deadline" };
  if (responses.length > 1) return { ...read, refused: `${responses.length} catalog responses in one visit (a paged catalog, or asked for twice): one file holds one response` };
  const [response] = responses;
  if (response.error) return { ...read, refused: response.error };
  const text = response.body.toString("utf8");
  if (holdsKey(text)) return { ...read, refused: KEY_REFUSAL, stop: true };
  if (response.status !== 200) return { ...read, refused: `HTTP ${response.status}, not 200` };
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return { ...read, refused: "the body is not JSON" };
  }
  if (!Array.isArray(body?.data)) return { ...read, refused: "the body has no data array" };
  // The same shape escaped in the JSON's text (`sk_…`) is the same key once read.
  if (holdsKey(JSON.stringify(body))) return { ...read, refused: KEY_REFUSAL, stop: true };
  const products = catalogProducts(body);
  return { ...read, response, meals: namesIn(products, MENU_CATEGORY), snacks: namesIn(products, SNACKS) };
}

const counts = (read) => (read.refused ? `refused: ${read.refused}` : `${read.meals.length} all-meals, ${read.snacks.length} snacks`);
const readLine = (read, n) => `read ${n} at ${read.loadedAt ?? "—"}: ${counts(read)}`;
/** visit.json's record of a read: its counts, or why it was refused. */
const readRecord = (read) => (read.refused ? { loadedAt: read.loadedAt, refused: read.refused } : { loadedAt: read.loadedAt, allMeals: read.meals.length, snacks: read.snacks.length });

const sameSet = (a, b) => {
  const x = new Set(a);
  const y = new Set(b);
  return x.size === y.size && [...x].every((name) => y.has(name));
};
/** § 13 item 2: two reads agree when both were read and they carry the same all-meals and snacks names, as sets. */
const agree = (a, b) => Boolean(a?.response && b?.response) && sameSet(a.meals, b.meals) && sameSet(a.snacks, b.snacks);

/** § 13 item 3: products.json, the body byte for byte, and visit.json. */
async function save({ dir, page, reads, out, err }) {
  const written = reads.at(-1);
  for (const name of [PRODUCTS, VISIT]) {
    if (await held(join(dir, name))) {
      err(`storefront-watch catalog: refused: ${dir} now holds ${name}. Nothing written.`);
      return 2;
    }
  }
  const { response } = written;
  const sha256 = createHash("sha256").update(response.body).digest("hex");
  const visit = {
    page,
    loadedAt: written.loadedAt,
    receivedAt: response.receivedAt,
    status: response.status,
    contentType: response.contentType,
    bytes: response.body.length,
    sha256,
    request: response.request,
    userAgent: written.userAgent,
    reads: reads.map(readRecord),
  };
  await writeFile(join(dir, PRODUCTS), response.body, { flag: "wx" });
  await writeFile(join(dir, VISIT), `${JSON.stringify(visit, null, 2)}\n`, { flag: "wx" });
  out(`wrote ${join(dir, PRODUCTS)}: ${visit.bytes} bytes, sha256 ${sha256}, ${counts(written)}`);
  out(`wrote ${join(dir, VISIT)}: the response from ${response.request.at}, its parameters ${response.request.params.join(", ") || "none"} (names only)`);
  return 0;
}

/**
 * `argv`: the arguments after the script. `visit`: lib/visit.mjs's ordinaryVisit (the tests pass it bound to Chrome and
 * the synthetic store, or a recorded one). `out` and `err` take one line each. `origin`: the store's (a test's synthetic
 * one). `cwd`: where a relative --out is from (npm runs this in the package; INIT_CWD is where the command was typed).
 * `minuteMs`: a minute of --every and --max (the tests' is a few milliseconds).
 */
export async function catalogCommand(argv, { visit, out, err, origin = STORE_ORIGIN, cwd = process.env.INIT_CWD ?? process.cwd(), minuteMs = MINUTE_MS, now = Date.now, sleep = sleepFor }) {
  let opts;
  try {
    opts = parse(argv);
  } catch (e) {
    if (e instanceof Usage) return usage(err, e.message);
    throw e;
  }
  const dir = resolve(cwd, opts.out);
  const why = await outRefusal(dir);
  if (why) {
    err(`storefront-watch catalog: refused: ${why}. Nothing written.`);
    return 2;
  }
  const page = `${origin}/order?mpid=${opts.mpid}`;
  // Reads are due at 0, M, 2M … minutes while no later than --max.
  const due = opts.every ? Math.floor(opts.max / opts.every) + 1 : 1;
  const start = now();
  const reads = [];
  for (let k = 0; k < due; k++) {
    if (k) await sleep(Math.max(0, start + k * opts.every * minuteMs - now()));
    let visited;
    try {
      visited = await visit({ page, capture: true });
      if (!visited?.capture) throw new Error("the visit kept no catalog response (it was not asked to capture)");
    } catch (e) {
      err(`storefront-watch catalog: the visit failed: ${e?.message ?? e}. Nothing written.`);
      return 2;
    }
    const read = judge(visited.capture);
    reads.push(read);
    out(readLine(read, reads.length));
    if (read.stop || (!opts.every && read.refused)) {
      err(`storefront-watch catalog: refused: ${read.refused}. Nothing written.`);
      return 1;
    }
    if (!opts.every) return save({ dir, page, reads, out, err });
    if (agree(reads.at(-2), read)) {
      out(`settled: reads ${reads.length - 1} and ${reads.length} carry the same all-meals and snacks names`);
      return save({ dir, page, reads, out, err });
    }
  }
  err(`storefront-watch catalog: refused: no two consecutive reads carried the same names within ${opts.max} minutes. Nothing written. The reads:`);
  reads.forEach((read, i) => err(`  ${readLine(read, i + 1)}`));
  return 1;
}
