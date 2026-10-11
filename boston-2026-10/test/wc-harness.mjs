// Shared by the wc-*.test.mjs files (SPEC-week-content.md: the week as content, each Worker serving it from its bucket).
// Not a test file itself. No request leaves the machine and no file in the repository is written:
//
// - The Worker runs in Miniflare (local workerd: HTMLRewriter is the platform's own), bundled from a package's
//   src/worker/<entry>.js by esbuild, under a thin wrapper that only RECORDS: each request the Worker script is given,
//   and each read of the bucket (WEEK's get/head, passed through unchanged). The wrapper answers one path of its own,
//   /__wc/log, which no case of the contract names.
// - A fake ASSETS: a service binding to a function here, which records every request it is asked and answers from a
//   table (path -> response) or a function. A fake WEEK: Miniflare's in-memory R2 bucket, filled by the case.
// - `configured()` runs the Worker as wrangler.jsonc configures it, through wrangler's OWN translation of the file
//   (unstable_readConfig, unstable_getMiniflareWorkerOptions): its `main`, its bindings, and the real asset router with
//   `run_worker_first`, over a directory a case built. Only the assets directory is replaced (a temporary build).
// - The content is made by the package's own scripts/week-content.mjs (imported from `root`, so a mirror's own code).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build as esbuild } from "esbuild";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { ROOT } from "../build.mjs";
import { hiddenInTree, openPlanPage } from "./cc-harness.mjs";

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** The object keys and paths of SPEC-week-content § 1 (the interface with fitaf-infra), written here from the contract. */
export const WEEK_DATA_KEY = "week/picks-data.json";
export const sheetPath = (file) => `/week/${file}`;
export const sheetKeyOf = (file) => `week/${file}`;
/** The interface's bucket names, by environment (§ 1). */
export const BUCKETS = { prod: "fitaf-microsite-content-prod", dev: "fitaf-microsite-content-dev" };
/** The week the regression is about (WC-9) and its committed photo sheet. */
export const WEEK_1018 = "2026-10-18";
export const SHEET_1018 = "chefs-choice-2026-10-18.jpg";

/** The v2 fixture week (invented names), and a copy whose shown names carry every character the escaping must keep. */
export const V2_FIXTURE_DIR = join(ROOT, "test", "fixtures", "picks-v2");
export const V2_WEEK = "2026-10-04";
/** A `display` (shown, never keyed) carrying what scriptJson must neutralise and what it must leave alone. */
export const AWKWARD_DISPLAY = `Mac & Cheese </script><b class="x">'Q'</b> crème brûlée   🟠`;

/** A temporary picks directory holding the v2 fixture with its first meal's `display` made awkward. */
export async function awkwardPicks() {
  const week = JSON.parse(await readFile(join(V2_FIXTURE_DIR, `${V2_WEEK}.json`), "utf8"));
  for (const cart of week.lists["chefs-choice"].carts) {
    for (const item of cart.items) if (item.name === cart.items[0].name) item.display = AWKWARD_DISPLAY;
  }
  const dir = await mkdtemp(join(tmpdir(), "boston-wc-picks-"));
  await writeFile(join(dir, `${V2_WEEK}.json`), JSON.stringify(week, null, 2));
  return { dir, done: () => rm(dir, { recursive: true, force: true }) };
}

/** A package's scripts/week-content.mjs (a mirror's own, when `root` is one). */
export const contentModule = (root = ROOT) => import(pathToFileURL(join(root, "scripts", "week-content.mjs")).href);

/**
 * The content for `week` (SPEC-week-content § 3), made by the package's own weekContent(): { data, text, files }, where
 * `files` maps each object key to its bytes and `data` is week/picks-data.json parsed.
 */
export async function contentOf({ root = ROOT, week, picksDir, target } = {}) {
  const { weekContent } = await contentModule(root);
  const out = await weekContent({ week, ...(picksDir ? { picksDir } : {}), ...(target ? { target } : {}) });
  const files = Object.fromEntries(out.files.map((f) => [f.key, Buffer.from(f.bytes)]));
  assert.ok(files[WEEK_DATA_KEY], `the content has ${WEEK_DATA_KEY}`);
  const text = files[WEEK_DATA_KEY].toString("utf8");
  return { data: JSON.parse(text), text, files };
}

/** The page a build writes with NO week (an empty picks directory): what the assets serve. `root` is the package. */
export async function noWeekPage({ root = ROOT, target = "prod" } = {}) {
  const { build } = await import(pathToFileURL(join(root, "build.mjs")).href);
  const outDir = await mkdtemp(join(tmpdir(), `boston-wc-${target}-`));
  const picksDir = await mkdtemp(join(tmpdir(), "boston-wc-no-picks-"));
  try {
    await build({ target, outDir, picksDir });
    return await readFile(join(outDir, "index.html"), "utf8");
  } finally {
    await rm(outDir, { recursive: true, force: true });
    await rm(picksDir, { recursive: true, force: true });
  }
}

/** The text of a page's `#picks-data` element, exactly as it stands in the HTML (null when there is none). */
export function picksText(html) {
  const m = /<script type="application\/json" id="picks-data">([\s\S]*?)<\/script>/.exec(html);
  return m ? m[1] : null;
}

/** `html` with the text of its `#picks-data` element replaced by `inner`, everything else as it was. */
export function withPicksText(html, inner) {
  const old = picksText(html);
  assert.ok(old !== null, "the page has a #picks-data element");
  const open = '<script type="application/json" id="picks-data">';
  assert.equal(html.split(open + old + "</script>").length - 1, 1, "the element is on the page once");
  return html.replace(open + old + "</script>", () => open + inner + "</script>");
}

const WRAPPER = (entry) => `
import worker from ${JSON.stringify(entry)};
const log = { invocations: [], reads: [] };
const counted = (bucket) => ({
  get(key, options) { log.reads.push(key); return bucket.get(key, options); },
  head(key) { log.reads.push(key); return bucket.head(key); },
});
export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/__wc/log") {
      const out = JSON.stringify(log);
      log.invocations = [];
      log.reads = [];
      return new Response(out, { headers: { "content-type": "application/json" } });
    }
    log.invocations.push(request.method + " " + pathname);
    return worker.fetch(request, env.WEEK ? { ...env, WEEK: counted(env.WEEK) } : env, ctx);
  },
};
`;

/** The Worker `entry` (an absolute path), bundled under the recording wrapper. */
async function bundle(entry) {
  const out = await esbuild({
    stdin: { contents: WRAPPER(entry), resolveDir: ROOT, loader: "js" },
    bundle: true,
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  return out.outputFiles[0].text;
}

/** A response, read whole: its status, headers (an object), body bytes and text. */
async function readResponse(res) {
  const body = Buffer.from(await res.arrayBuffer());
  return { status: res.status, headers: Object.fromEntries(res.headers), body, text: body.toString("utf8") };
}

/** Put each `objects` key (bytes or text) in a Miniflare R2 bucket. */
async function fill(bucket, objects) {
  for (const [key, value] of Object.entries(objects)) {
    await bucket.put(key, typeof value === "string" ? value : new Uint8Array(value));
  }
}

/** What a started Worker offers a case: `get(path, init)`, the recorder's `log()`, the fake ASSETS' requests. */
function handle(mf, assetRequests) {
  return {
    mf,
    assetRequests,
    async get(path, init = {}) {
      return readResponse(await mf.dispatchFetch(`http://localhost${path}`, { redirect: "manual", ...init }));
    },
    async log() {
      return JSON.parse(await (await mf.dispatchFetch("http://localhost/__wc/log")).text());
    },
    bucket: () => mf.getR2Bucket("WEEK"),
    dispose: () => mf.dispose(),
  };
}

/**
 * The Worker `entry` ("site": src/worker/site.js, production's; "index": the development Worker) of the package at
 * `root`, with a fake ASSETS answering from `assets` (a path -> { status, headers, body } table, or a function of the
 * Request) and a WEEK bucket holding `objects`; `week: false` starts it with no WEEK binding at all.
 */
export async function startSite({ root = ROOT, entry = "site", assets = {}, objects = {}, week = true } = {}) {
  const assetRequests = [];
  const answer = async (request) => {
    const { pathname } = new URL(request.url);
    assetRequests.push({ method: request.method, path: pathname, headers: Object.fromEntries(request.headers) });
    if (typeof assets === "function") return assets(request);
    const hit = assets[pathname];
    if (!hit) return new Response(null, { status: 404 });
    return new Response(request.method === "HEAD" ? null : hit.body, { status: hit.status ?? 200, headers: hit.headers ?? {} });
  };
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: `wc-${entry}`,
          modules: true,
          script: await bundle(join(root, "src", "worker", `${entry}.js`)),
          compatibilityDate: "2026-09-26",
          serviceBindings: { ASSETS: answer },
          ...(week ? { r2Buckets: { WEEK: "wc-week" } } : {}),
        },
      ],
    }),
  );
  try {
    if (week) await fill(await mf.getR2Bucket("WEEK"), objects);
  } catch (err) {
    await mf.dispose(); // a workerd left running keeps the test file's process from ever exiting
    throw err;
  }
  return handle(mf, assetRequests);
}

/** The page the fake ASSETS serves at `/`: the HTML as the assets would send it (their own headers, measured). */
export const pageAsset = (html) => ({
  status: 200,
  headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate", etag: '"asset-etag"' },
  body: html,
});

/** wrangler.jsonc as wrangler reads it, for `env` (undefined: the top level, production). */
export async function wranglerConfig(env, root = ROOT) {
  const { unstable_readConfig } = await import("wrangler");
  return unstable_readConfig({ config: join(root, "wrangler.jsonc"), env }, { hideWarnings: true });
}

/**
 * The Worker as wrangler.jsonc configures it for `env`, through wrangler's own translation, with its assets directory
 * replaced by `distDir` (a build a case made) and its bucket holding `objects`. The script is the config's `main`, under
 * the recording wrapper; the router (run_worker_first) is the real one.
 */
export async function configured({ env, distDir, objects = {}, root = ROOT }) {
  process.env.WRANGLER_SEND_METRICS = "false";
  const { unstable_getMiniflareWorkerOptions } = await import("wrangler");
  const cfg = await wranglerConfig(env, root);
  assert.ok(cfg.main, `wrangler.jsonc gives ${env ?? "production"} a main module`);
  const main = cfg.main;
  cfg.assets = { ...cfg.assets, directory: distDir };
  const { workerOptions } = unstable_getMiniflareWorkerOptions(cfg, env);
  const options = { ...workerOptions, name: `wc-${env ?? "prod"}`, modules: true, script: await bundle(main) };
  delete options.modulesRules;
  delete options.scriptPath;
  const mf = new Miniflare(convertV4MiniflareOptions({ workers: [options] }));
  try {
    await fill(await mf.getR2Bucket("WEEK"), objects);
  } catch (err) {
    await mf.dispose();
    throw err;
  }
  return { ...handle(mf, []), cfg, main };
}

/** The visible page: the body after the page's scripts ran at `hash`, without what is hidden (an element carrying
 *  `hidden`, and all inside it), scripts and styles; whitespace runs collapsed, none between tags. */
export function visible(html, { hash = "", now } = {}) {
  const page = openPlanPage(html, { hash, ...(now !== undefined ? { now } : {}) });
  const body = page.document.body.cloneNode(true);
  for (const node of [...body.querySelectorAll("*")]) {
    if (["SCRIPT", "STYLE", "TEMPLATE"].includes(node.tagName) || node.hasAttribute("hidden")) node.remove();
  }
  return body.innerHTML.replace(/\s+/g, " ").replace(/> </g, "><").trim();
}

/** Whether the element `id` is on the page and shown (neither it nor an ancestor carries `hidden`). */
export const shownOn = (page, id) => {
  const node = page.document.getElementById(id);
  return Boolean(node) && !hiddenInTree(node);
};
