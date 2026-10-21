// SP3 (SPEC-save-offer-production.md § 3 item 1, § 4 item 1, § 5): with `production` false the production build and the
// production Worker are the base's. "The base" is 63275a8, the contract's own commit (no code of it), extracted by
// `git archive` (sp-production.mjs basePackage).
//   - S20: `npm run build` byte-identical to S20's golden (not re-recorded by this contract), and to the base tree's build;
//   - the production T5 as the base's: no script src, no fetch (T5 itself runs on its own);
//   - the production Worker (src/worker/site.js, wrangler.jsonc's top-level `main`) answers every request as the base's
//     does, byte for byte (status, headers, body), in Miniflare with the same fake assets and bucket; and it has no
//     scheduled handler.
// ⚠ CC-8b's golden is the DEVELOPMENT Worker's file map (every file src/worker/index.js reaches), and § 3 item 1 (the flag
// in data/save.json) and § 4 item 2 (site.js serving rung 4's routes when true) change files in it by construction, so its
// bytes cannot stay the base's; § 4 item 1's "byte-identical in behaviour" is what is checked here, and CC-8b's map is
// compared with the base's file by file: only the files this contract names move (SPEC § 8).
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import saveConfig from "../data/save.json" with { type: "json" };
import { build, renderPage, ROOT } from "../build.mjs";
import { workerFiles } from "./cc-harness.mjs";
import { loadPlans } from "./helpers.mjs";
import { assertProductionT5, basePackage, BASE } from "./sp-production.mjs";
import { pageAsset, startSite, WEEK_DATA_KEY } from "./wc-harness.mjs";

const s20 = JSON.parse(await readFile(new URL("./s20-production-golden.json", import.meta.url), "utf8"));
const base = await basePackage();
test.after(() => base.dispose());

/** The files this contract changes in the development Worker's reach (SPEC § 8 lists why each moves). */
const MOVED_WORKER_FILES = ["data/save.json", "src/worker/choose-sender.js", "src/worker/pages.js", "src/worker/site.js"];

async function hashesOf(dir, top = dir) {
  const out = {};
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(out, await hashesOf(path, top));
    else out[relative(top, path)] = createHash("sha256").update(await readFile(path)).digest("hex");
  }
  return out;
}

test("SP3: data/save.json's production is false (control)", () => {
  assert.equal(saveConfig.production, false);
});

test("SP3 (S20): npm run build with production false is S20's golden, and the base tree's build, byte for byte", async () => {
  const dir = await mkdtemp(join(tmpdir(), "boston-sp3-"));
  try {
    const { build: baseBuild } = await import(pathToFileURL(join(base.pkg, "build.mjs")).href);
    await build({ target: "prod", outDir: join(dir, "now") });
    await baseBuild({ target: "prod", outDir: join(dir, "base") });
    const [now, before] = [await hashesOf(join(dir, "now")), await hashesOf(join(dir, "base"))];
    assert.deepEqual(now, s20.files, "S20's golden");
    assert.deepEqual(now, before, `${BASE}'s build`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("SP3 (T5): the production page with production false has no script src and no fetch, as the base's", async () => {
  const html = await renderPage(await loadPlans());
  assertProductionT5(html, { production: false });
  const { renderPage: baseRender } = await import(pathToFileURL(join(base.pkg, "build.mjs")).href);
  assert.equal(html, await baseRender(JSON.parse(await readFile(join(base.pkg, "data", "plans.json"), "utf8"))), `${BASE}'s page`);
});

const REQUESTS = [
  ["GET", "/"],
  ["GET", "/index.html"],
  ["GET", "/week/chefs-choice-2026-10-18.jpg"],
  ["GET", "/week/nothing-here.jpg"],
  ["POST", "/api/save", JSON.stringify({ kind: "offer", email: "dummy-sp3@example.com", zip: "02118" })],
  ["GET", "/api/save"],
  ["GET", "/confirm/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ"],
  ["POST", "/confirm/abc", "action=yes"],
  ["GET", "/o/ABCD2345"],
  ["GET", "/fonts/poppins-latin-700-normal.woff2"],
];

test("SP3 (§ 4 item 1): the production Worker answers every request as the base's, byte for byte, and has no scheduled handler", async () => {
  const page = "<!doctype html><title>p</title><script type=\"application/json\" id=\"picks-data\">{\"weeks\":[]}</script>";
  const week = JSON.stringify({ weeks: [{ carts: {} }] });
  const assets = { "/": pageAsset(page), "/fonts/poppins-latin-700-normal.woff2": { status: 200, headers: { "content-type": "font/woff2" }, body: "font" } };
  const objects = { [WEEK_DATA_KEY]: week, "week/chefs-choice-2026-10-18.jpg": "jpeg bytes" };
  const now = await startSite({ entry: "site", assets, objects });
  const before = await startSite({ root: base.pkg, entry: "site", assets, objects });
  try {
    for (const [method, path, body] of REQUESTS) {
      const init = { method, ...(body ? { body, headers: { "content-type": "application/json" } } : {}) };
      const [a, b] = [await now.get(path, init), await before.get(path, init)];
      assert.equal(a.status, b.status, `${method} ${path}: status`);
      assert.deepEqual(a.headers, b.headers, `${method} ${path}: headers`);
      assert.ok(a.body.equals(b.body), `${method} ${path}: body`);
    }
    assert.deepEqual(now.assetRequests, before.assetRequests, "the same requests of the assets");
  } finally {
    await now.dispose();
    await before.dispose();
  }
  const worker = (await import("../src/worker/site.js")).default;
  assert.deepEqual(Object.keys(worker), ["fetch"], "production false: fetch only, no scheduled handler");
});

test("SP3 (CC-8b): the development Worker's files are the base's but for the files this contract names", async () => {
  const now = await workerFiles();
  const before = await workerFiles(join(base.pkg, "src", "worker", "index.js"));
  // workerFiles names a file by its path from this package; the base's, from the base package.
  const b = Object.fromEntries(Object.entries(before).map(([k, v]) => [relative(base.pkg, resolve(ROOT, k)), v]));
  const a = now;
  const moved = Object.keys({ ...a, ...b }).filter((k) => a[k] !== b[k]).sort();
  assert.deepEqual(moved, MOVED_WORKER_FILES, "only these files differ (SPEC § 8)");
});
