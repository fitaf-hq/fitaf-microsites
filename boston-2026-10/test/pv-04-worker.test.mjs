// PV4 (SPEC-preview-sites.md § 3, § 4): the preview Worker (src/worker/preview.js) in Miniflare, with a fake ASSETS
// (dist-preview's page at /, a font) and a fake PREVIEW (an in-memory bucket holding the content the preview content
// command made for the fixture's two deliveries, a stray object and a delivery with a sheet and no data): / lists the
// two newest first; /2026-11-01/ carries that week; /2026-11-08/ with no object is a 404 naming the date;
// /2026-11-01/week/<sheet> serves the sheet; a path with ".." or a non-date is a 404, the bucket never read for it; and a
// live week's content, or a preview filed under another date, is a 404 naming the date (no store link is ever served).
import test from "node:test";
import assert from "node:assert/strict";
import { workerProblems } from "./pv-checks.mjs";

test("PV4: the preview Worker lists, serves each delivery's page and sheet, and refuses everything else", async () => {
  assert.deepEqual(await workerProblems(), []);
});
