// WC-1 (SPEC-week-content.md § 4.2, § 5): the bucket holds a valid one-week week/picks-data.json; a request for `/`
// gets the page with `#picks-data`'s text replaced by the object's JSON, escaped exactly as the build's scriptJson
// escapes it, and every other byte the asset's. Production's Worker (src/worker/site.js) and the development Worker
// (src/worker/index.js, which imports the same handlers), under a fake ASSETS and a fake WEEK; then both as
// wrangler.jsonc configures them (wrangler's own translation, the real asset router). § 4.4's freshness here too: the
// page carries `Cache-Control: no-cache` and no validator, and a browser's conditional request still gets the week.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import events from "../data/events.json" with { type: "json" };
import { build, scriptJson } from "../build.mjs";
import { rewriteProblems, scriptJsonRef } from "./wc-checks.mjs";
import { V2_DIR } from "./ms-harness.mjs";
import {
  configured,
  contentOf,
  noWeekPage,
  pageAsset,
  picksText,
  startSite,
  V2_WEEK,
  WEEK_1018,
  WEEK_DATA_KEY,
  withPicksText,
} from "./wc-harness.mjs";

test("WC-1a: production's Worker puts the bucket's week into #picks-data, escaped as at build; every other byte the asset's", async () => {
  assert.deepEqual(await rewriteProblems(), []);
});

test("WC-1b: the build's scriptJson is the escaping WC-1 expects (the same rule, on the same week)", async () => {
  const { data } = await contentOf({ week: V2_WEEK, picksDir: V2_DIR });
  assert.equal(scriptJson(data), scriptJsonRef(data));
  const awkward = { s: "</script><!-- & ' \"  " };
  assert.equal(scriptJson(awkward), scriptJsonRef(awkward));
  assert.ok(!scriptJson(awkward).includes("<"), "no '<' survives");
});

test("WC-1c (§ 4.4): the page carries Cache-Control no-cache and no validator; a conditional request still gets the week", async () => {
  const asset = await noWeekPage();
  const { text } = await contentOf({ week: V2_WEEK, picksDir: V2_DIR });
  const site = await startSite({ assets: { "/": pageAsset(asset) }, objects: { [WEEK_DATA_KEY]: text } });
  try {
    const conditional = { "if-none-match": '"asset-etag"', "if-modified-since": "Sun, 11 Oct 2026 00:00:00 GMT", range: "bytes=0-9" };
    const res = await site.get("/", { headers: conditional });
    assert.equal(res.status, 200, "never a 304 (nor a 206) for a page that may hold a new week");
    assert.equal(res.text, withPicksText(asset, scriptJsonRef(JSON.parse(text))), "the week, whole");
    assert.equal(res.headers["cache-control"], "no-cache");
    assert.equal(res.headers.etag, undefined, "no ETag: the asset's names the asset, not this page");
    assert.equal(res.headers["last-modified"], undefined);
    const asked = site.assetRequests.at(-1);
    for (const h of Object.keys(conditional)) assert.equal(asked.headers[h], undefined, `the assets are not asked conditionally (${h})`);
    // The fallback carries the same: a page served without a week is not kept with a validator either.
    await (await site.bucket()).delete(WEEK_DATA_KEY);
    const fallback = await site.get("/", { headers: conditional });
    assert.equal(fallback.status, 200);
    assert.equal(fallback.text, asset);
    assert.equal(fallback.headers["cache-control"], "no-cache");
    assert.equal(fallback.headers.etag, undefined);
  } finally {
    await site.dispose();
  }
});

test("WC-1d: the development Worker (index.js) does the same at / and at every event's page", async () => {
  const asset = await noWeekPage({ target: "dev" });
  const { text } = await contentOf({ week: V2_WEEK, picksDir: V2_DIR, target: "dev" });
  const paths = ["/", ...events.map((e) => `/${e.id}/`)];
  const site = await startSite({ entry: "index", assets: Object.fromEntries(paths.map((p) => [p, pageAsset(asset)])), objects: { [WEEK_DATA_KEY]: text } });
  try {
    for (const path of paths) {
      const res = await site.get(path);
      assert.equal(res.status, 200, path);
      assert.equal(res.text, withPicksText(asset, scriptJsonRef(JSON.parse(text))), path);
    }
  } finally {
    await site.dispose();
  }
});

/** A build of this package into a temporary directory (holding no week, as every build does). */
async function noWeekBuild(target) {
  const outDir = await mkdtemp(join(tmpdir(), `boston-wc-dist-${target}-`));
  await build({ target, outDir });
  return { outDir, done: () => rm(outDir, { recursive: true, force: true }) };
}

for (const [env, target, pages] of [
  [undefined, "prod", ["/"]],
  ["dev", "dev", ["/", ...events.map((e) => `/${e.id}/`)]],
]) {
  test(`WC-1e: as wrangler.jsonc configures ${env ?? "production"} (the real asset router): ${pages.join(", ")} carry the bucket's week`, async () => {
    const dist = await noWeekBuild(target);
    const { text } = await contentOf({ week: WEEK_1018, target });
    const site = await configured({ env, distDir: dist.outDir, objects: { [WEEK_DATA_KEY]: text } });
    try {
      for (const path of pages) {
        const asset = await readFile(join(dist.outDir, path, "index.html"), "utf8");
        const res = await site.get(path);
        assert.equal(res.status, 200, path);
        assert.equal(picksText(res.text), scriptJsonRef(JSON.parse(text)), `${path}: the bucket's week`);
        assert.equal(res.text, withPicksText(asset, scriptJsonRef(JSON.parse(text))), `${path}: every other byte the asset's`);
        assert.ok((await site.log()).invocations.includes(`GET ${path}`), `${path} reached the Worker first`);
      }
    } finally {
      await site.dispose();
      await dist.done();
    }
  });
}
