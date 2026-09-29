// W1 (SPEC-storefront-watch § 6): the synthetic entry and its imports, unchanged from the baseline: green, and the
// hourly check has fetched two files (the page and its entry), nothing else.
import test from "node:test";
import assert from "node:assert/strict";
import { storeFetcher } from "../lib/store-fetch.mjs";
import { runWatch } from "../lib/watch.mjs";
import { DEPENDENCIES, fakeFetch, ORIGIN, PAGE, syntheticStore, w1Baseline } from "./synthetic-store.mjs";

test("W1: unchanged entry and imports: green, two fetches (the page, then its entry)", async () => {
  const { fetchImpl, calls } = fakeFetch(syntheticStore());
  const result = await runWatch({
    fetcher: storeFetcher({ fetchImpl, origin: ORIGIN }),
    baseline: w1Baseline(),
    dependencies: DEPENDENCIES,
    page: PAGE,
  });
  assert.deepEqual(result.flags, []);
  assert.equal(result.cheap.changed, false);
  assert.equal(result.entry, "main-SYNTH001.js");
  assert.deepEqual(calls, [PAGE, `${ORIGIN}/main-SYNTH001.js`]);
  assert.equal(result.fetches, 2);
  assert.equal(result.f1.ran, false, "no flag, no in-depth check");
});

test("W1 (in depth, as on a dispatch): every reachable file fetched once, the hashes and every literal match: green", async () => {
  const { fetchImpl, calls } = fakeFetch(syntheticStore());
  const result = await runWatch({
    fetcher: storeFetcher({ fetchImpl, origin: ORIGIN }),
    baseline: w1Baseline(),
    dependencies: DEPENDENCIES,
    page: PAGE,
    full: true,
  });
  assert.deepEqual(result.flags, []);
  assert.equal(result.f1.ran, true);
  assert.equal(result.f2.ran, true);
  assert.deepEqual(result.f2.missing, []);
  assert.equal(result.f2.found, DEPENDENCIES.literals.length);
  // The page, then the entry (once), then its closure: static, side-effect and dynamic imports, two levels deep.
  assert.deepEqual(
    [...calls].sort(),
    [PAGE, ...["chunk-AAAA0001.js", "chunk-BBBB0002.js", "chunk-CCCC0003.js", "chunk-DDDD0004.js", "main-SYNTH001.js"].map((n) => `${ORIGIN}/${n}`)].sort(),
  );
  assert.equal(new Set(calls).size, calls.length, "no file fetched twice");
});
