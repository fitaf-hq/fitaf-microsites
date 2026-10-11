// WC-6 (SPEC-week-content.md § 4.1, § 4.5, § 5): production's Worker does § 4's two behaviours and nothing else. Any
// other route (/api/save, /confirm/x, /o/x, a POST anywhere) is the assets' answer, as today: the script hands the
// request on and passes back what the assets say, and never reads the bucket. Then wrangler.jsonc: production's `main`
// is src/worker/site.js and its bindings are the assets' and WEEK's alone (no D1, no rate limiter, no cron); the page's
// routes run the Worker first (`assets.run_worker_first`) and every other route stays assets-first, measured through
// wrangler's own translation of the file and the real asset router.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { build, ROOT } from "../build.mjs";
import { BUCKETS, configured, startSite, wranglerConfig } from "./wc-harness.mjs";

const OTHER = [
  ["POST", "/api/save"],
  ["GET", "/api/save"],
  ["GET", "/confirm/x"],
  ["POST", "/confirm/x"],
  ["GET", "/o/ABCDEFGH"],
  ["GET", "/qr/demo.png"],
  ["PUT", "/"],
];

test("WC-6a: production's Worker hands every other route to the assets and returns their answer unchanged; the bucket is never read", async () => {
  const answer = (request) => {
    const { pathname } = new URL(request.url);
    return new Response(`assets: ${request.method} ${pathname}`, { status: 404, headers: { "x-from": "assets", "content-type": "text/plain" } });
  };
  const site = await startSite({ assets: answer, objects: { "week/picks-data.json": "{}" } });
  try {
    for (const [method, path] of OTHER) {
      const res = await site.get(path, { method, ...(method === "POST" || method === "PUT" ? { body: "{}" } : {}) });
      assert.equal(res.status, 404, `${method} ${path}`);
      assert.equal(res.text, `assets: ${method} ${path}`, `${method} ${path}: the assets' own answer`);
      assert.equal(res.headers["x-from"], "assets", `${method} ${path}: its headers`);
      assert.deepEqual((await site.log()).reads, [], `${method} ${path}: the bucket not read`);
      const asked = site.assetRequests.at(-1);
      assert.deepEqual([asked.method, asked.path], [method, path], `${method} ${path}: the assets were asked the same request`);
    }
  } finally {
    await site.dispose();
  }
});

test("WC-6b: wrangler.jsonc, production: main is site.js; its bindings ASSETS and WEEK (the prod bucket) alone; the page's routes run first", async () => {
  const prod = await wranglerConfig(undefined);
  assert.equal(relative(ROOT, prod.main), join("src", "worker", "site.js"));
  assert.equal(prod.assets.binding, "ASSETS");
  assert.deepEqual(prod.assets.run_worker_first, ["/", "/index.html"]);
  assert.deepEqual(prod.r2_buckets, [{ binding: "WEEK", bucket_name: BUCKETS.prod }]);
  for (const none of ["d1_databases", "ratelimits", "kv_namespaces", "durable_objects", "services", "queues"]) {
    const value = prod[none];
    const empty = value === undefined || (Array.isArray(value) && !value.length) || (value?.bindings && !value.bindings.length) || (value?.producers && !value.producers.length && !value.consumers?.length);
    assert.ok(empty, `production has no ${none}: ${JSON.stringify(value)}`);
  }
  assert.deepEqual(prod.triggers?.crons ?? [], [], "production has no cron");
  const dev = await wranglerConfig("dev");
  assert.equal(relative(ROOT, dev.main), join("src", "worker", "index.js"));
  assert.equal(dev.assets.binding, "ASSETS");
  assert.deepEqual(dev.r2_buckets, [{ binding: "WEEK", bucket_name: BUCKETS.dev }]);
  assert.deepEqual(dev.assets.run_worker_first, ["/", "/index.html", "/*/", "/*/index.html"]);
  assert.equal(dev.d1_databases.length, 1, "the development Worker keeps what it has");
  assert.deepEqual(dev.triggers.crons, ["*/5 * * * *"]);
});

test("WC-6c: as configured, production's page routes reach the script first; every other asset is served without it", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "boston-wc-dist-prod-"));
  const picksDir = await mkdtemp(join(tmpdir(), "boston-wc-no-picks-"));
  let site;
  try {
    await build({ target: "prod", outDir, picksDir });
    site = await configured({ env: undefined, distDir: outDir });
    await site.log();
    const assetsFirst = ["/fonts/poppins-latin-700-normal.woff2", "/assets/fitaf-logo.png", "/qr/demo.png", "/assets/photo-sheets/carousel.jpg"];
    for (const path of assetsFirst) {
      const res = await site.get(path);
      assert.equal(res.status, 200, path);
      assert.ok(res.body.equals(await readFile(join(outDir, path))), `${path}: the asset`);
      assert.deepEqual((await site.log()).invocations, [], `${path}: the script never ran`);
    }
    const page = await site.get("/");
    assert.equal(page.status, 200);
    assert.deepEqual((await site.log()).invocations, ["GET /"], "/: the script ran first");
    const redirect = await site.get("/index.html");
    assert.equal(redirect.status, 307, "/index.html: the assets' own redirect to /");
    assert.equal(redirect.headers.location, "/");
    assert.deepEqual((await site.log()).invocations, ["GET /index.html"], "/index.html: the script ran first, and passed the redirect on");
    const save = await site.get("/api/save", { method: "POST", body: "{}" });
    assert.equal(save.status, 404, "/api/save: the assets' 404, as today");
    assert.deepEqual((await site.log()).reads, [], "/api/save: the bucket not read");
  } finally {
    await site?.dispose();
    await rm(outDir, { recursive: true, force: true });
    await rm(picksDir, { recursive: true, force: true });
  }
});
