// W2 (SPEC-storefront-watch § 6): one import renamed (a release): F1, with the name in the diff.
import test from "node:test";
import assert from "node:assert/strict";
import { renderReport } from "../lib/report.mjs";
import { storeFetcher } from "../lib/store-fetch.mjs";
import { runWatch } from "../lib/watch.mjs";
import { DEPENDENCIES, fakeFetch, ORIGIN, PAGE, syntheticStore, w1Baseline } from "./synthetic-store.mjs";

const OLD = "chunk-BBBB0002.js";
const NEW = "chunk-BBBB0099.js";

const renamed = () =>
  syntheticStore((f) => {
    f.set("/main-SYNTH001.js", f.get("/main-SYNTH001.js").replace(OLD, NEW));
    f.set(`/${NEW}`, f.get(`/${OLD}`));
    f.delete(`/${OLD}`);
  });

test("W2: one import renamed: F1, the old and the new name in the diff", async () => {
  const { fetchImpl } = fakeFetch(renamed());
  const result = await runWatch({
    fetcher: storeFetcher({ fetchImpl, origin: ORIGIN }),
    baseline: w1Baseline(),
    dependencies: DEPENDENCIES,
    page: PAGE,
  });
  assert.deepEqual(result.flags, ["F1"]);
  assert.equal(result.cheap.changed, true);
  assert.deepEqual(result.cheap.imports, { added: [NEW], removed: [OLD] });
  // On the flag, the in-depth F1: the file set and the entry's changed hash.
  assert.equal(result.f1.ran, true);
  assert.deepEqual(result.f1.added, [NEW]);
  assert.deepEqual(result.f1.removed, [OLD]);
  assert.deepEqual(result.f1.changed, ["main-SYNTH001.js"]);
  // F2 ran on the flag and found every literal.
  assert.equal(result.f2.ran, true);
  assert.deepEqual(result.f2.missing, []);
  const report = renderReport(result);
  assert.ok(report.includes(NEW), report);
  assert.ok(report.includes(OLD), report);
  assert.match(report, /\bF1\b/);
});
