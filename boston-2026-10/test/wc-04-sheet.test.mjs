// WC-4 (SPEC-week-content.md § 4.3, § 5): /week/chefs-choice-2026-10-18.jpg present in the bucket: its bytes, with
// Content-Type image/jpeg. Both Workers. § 4.4's freshness: `Cache-Control: no-cache` with the object's own ETag, so a
// browser revalidates every time and a re-written sheet is seen at once; a matching If-None-Match is a 304, no body.
// Then as wrangler.jsonc configures each Worker: /week/ is no asset, so it reaches the script assets-first.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, PHOTO_SHEETS_DIR } from "../build.mjs";
import { configured, SHEET_1018, sheetKeyOf, sheetPath, startSite } from "./wc-harness.mjs";

const SHEET = await readFile(join(PHOTO_SHEETS_DIR, SHEET_1018));

for (const entry of ["site", "index"]) {
  test(`WC-4 (${entry}.js): a sheet in the bucket is served whole, image/jpeg, no-cache with its ETag; If-None-Match is a 304`, async () => {
    const site = await startSite({ entry, objects: { [sheetKeyOf(SHEET_1018)]: SHEET } });
    try {
      const res = await site.get(sheetPath(SHEET_1018));
      assert.equal(res.status, 200);
      assert.ok(res.body.equals(SHEET), "its bytes, byte for byte");
      assert.equal(res.headers["content-type"], "image/jpeg");
      assert.equal(res.headers["cache-control"], "no-cache");
      assert.match(res.headers.etag ?? "", /^"[0-9a-f]+"$/, "the object's own ETag");
      assert.deepEqual((await site.log()).reads, [sheetKeyOf(SHEET_1018)]);
      assert.equal(site.assetRequests.length, 0, "the assets are not asked");
      const again = await site.get(sheetPath(SHEET_1018), { headers: { "if-none-match": res.headers.etag } });
      assert.equal(again.status, 304);
      assert.equal(again.body.length, 0);
      const changed = await site.get(sheetPath(SHEET_1018), { headers: { "if-none-match": '"0000"' } });
      assert.equal(changed.status, 200, "another ETag gets the sheet");
      assert.ok(changed.body.equals(SHEET));
    } finally {
      await site.dispose();
    }
  });
}

for (const [env, target] of [[undefined, "prod"], ["dev", "dev"]]) {
  test(`WC-4c: as wrangler.jsonc configures ${env ?? "production"}: /week/<sheet> reaches the script and is served from the bucket`, async () => {
    const outDir = await mkdtemp(join(tmpdir(), `boston-wc-dist-${target}-`));
    const picksDir = await mkdtemp(join(tmpdir(), "boston-wc-no-picks-"));
    let site;
    try {
      await build({ target, outDir, picksDir });
      site = await configured({ env, distDir: outDir, objects: { [sheetKeyOf(SHEET_1018)]: SHEET } });
      const res = await site.get(sheetPath(SHEET_1018));
      assert.equal(res.status, 200);
      assert.ok(res.body.equals(SHEET));
      assert.equal(res.headers["content-type"], "image/jpeg");
      assert.deepEqual((await site.log()).invocations, [`GET ${sheetPath(SHEET_1018)}`]);
    } finally {
      await site?.dispose();
      await rm(outDir, { recursive: true, force: true });
      await rm(picksDir, { recursive: true, force: true });
    }
  });
}
