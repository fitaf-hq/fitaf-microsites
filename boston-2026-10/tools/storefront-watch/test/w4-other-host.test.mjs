// W4 (SPEC-storefront-watch § 6): a URL on another host in the HTML: refused, never fetched. Every request the watch
// makes is to fitafnutrition.com (§ 2); it plants a URL of the store's own backend, the one host SPEC § 0 names.
import test from "node:test";
import assert from "node:assert/strict";
import { renderReport } from "../lib/report.mjs";
import { RefusedHost, storeFetcher } from "../lib/store-fetch.mjs";
import { runWatch } from "../lib/watch.mjs";
import { DEPENDENCIES, fakeFetch, ORIGIN, PAGE, syntheticStore, w1Baseline } from "./synthetic-store.mjs";

const FOREIGN = "https://backend.happymealprep.com/api/v1/tenant/planted.js";
const offStore = (calls) => calls.filter((u) => new URL(u).origin !== ORIGIN);

test("W4: a script on another host in the page: refused, never fetched, and the page's script list flags F1", async () => {
  const files = syntheticStore((f) => {
    f.set("/order?mpid=21", f.get("/order?mpid=21").replace("</head>", `<script src="${FOREIGN}"></script></head>`));
  });
  for (const full of [false, true]) {
    const { fetchImpl, calls } = fakeFetch(files);
    const result = await runWatch({
      fetcher: storeFetcher({ fetchImpl, origin: ORIGIN }),
      baseline: w1Baseline(),
      dependencies: DEPENDENCIES,
      page: PAGE,
      full,
    });
    assert.deepEqual(offStore(calls), [], `no request off the store (full: ${full})`);
    assert.deepEqual(result.refused, [FOREIGN]);
    assert.ok(result.flags.includes("F1"), "a new script in the page is a release");
    assert.deepEqual(result.cheap.html.added, [FOREIGN]);
    assert.ok(renderReport(result).includes(FOREIGN));
  }
});

test("W4: an import of another host inside a chunk: refused, never fetched", async () => {
  const files = syntheticStore((f) => {
    f.set("/chunk-DDDD0004.js", `${f.get("/chunk-DDDD0004.js")}var y=()=>import("${FOREIGN}");\n`);
  });
  const { fetchImpl, calls } = fakeFetch(files);
  const result = await runWatch({
    fetcher: storeFetcher({ fetchImpl, origin: ORIGIN }),
    baseline: w1Baseline(),
    dependencies: DEPENDENCIES,
    page: PAGE,
    full: true,
  });
  assert.deepEqual(offStore(calls), []);
  assert.deepEqual(result.refused, [FOREIGN]);
  assert.ok(result.flags.includes("F1"));
});

test("W4: the fetcher refuses another host, plain http and a redirect off the store, before any request", async () => {
  const { fetchImpl, calls } = fakeFetch(syntheticStore());
  const fetcher = storeFetcher({ fetchImpl, origin: ORIGIN });
  await assert.rejects(fetcher.get(FOREIGN), RefusedHost);
  await assert.rejects(fetcher.get("http://fitafnutrition.com/order?mpid=21"), RefusedHost);
  await assert.rejects(fetcher.get("https://www.fitafnutrition.com/order?mpid=21"), RefusedHost);
  assert.deepEqual(calls, [], "nothing was requested");
  assert.deepEqual(fetcher.refused.length, 3);

  // The store answers with a redirect to another host: the redirect is not followed.
  const hops = [];
  const redirecting = storeFetcher({
    origin: ORIGIN,
    fetchImpl: async (url, init) => {
      hops.push(String(url));
      assert.equal(init.redirect, "manual", "redirects are the fetcher's to follow, not fetch's");
      return new Response(null, { status: 302, headers: { location: FOREIGN } });
    },
  });
  await assert.rejects(redirecting.get(PAGE), RefusedHost);
  assert.deepEqual(hops, [PAGE]);
});
