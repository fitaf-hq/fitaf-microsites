// W8 (SPEC-storefront-watch § 7 item 1): when the cheap check finds a NEW entry bundle, the entry's Last-Modified (the
// release's publish time, read while the file is live: HMP deletes a release's files at the next release) goes in the
// report and in the issue's body. It is read from the one request the cheap check already makes for the entry: no
// second request, no other method.
import test from "node:test";
import assert from "node:assert/strict";
import { fileIssue } from "../lib/issue.mjs";
import { renderReport } from "../lib/report.mjs";
import { storeFetcher } from "../lib/store-fetch.mjs";
import { runWatch } from "../lib/watch.mjs";
import { DEPENDENCIES, fakeFetch, ORIGIN, PAGE, syntheticStore, w1Baseline } from "./synthetic-store.mjs";

const NEW_ENTRY = "main-SYNTH002.js";
const LAST_MODIFIED = "Tue, 29 Sep 2026 22:41:07 GMT";

const release = () =>
  syntheticStore((f) => {
    f.set("/order?mpid=21", f.get("/order?mpid=21").replace("main-SYNTH001.js", NEW_ENTRY));
    f.set(`/${NEW_ENTRY}`, f.get("/main-SYNTH001.js"));
    f.delete("/main-SYNTH001.js");
  });

async function watchRelease({ headers = { [`/${NEW_ENTRY}`]: { "last-modified": LAST_MODIFIED } } } = {}) {
  const { fetchImpl, calls, methods } = fakeFetch(release(), { headers });
  const result = await runWatch({
    fetcher: storeFetcher({ fetchImpl, origin: ORIGIN }),
    baseline: w1Baseline(),
    dependencies: DEPENDENCIES,
    page: PAGE,
  });
  return { result, calls, methods };
}

test("W8: a new entry with a Last-Modified — the time is in the result, the report and the issue's body", async () => {
  const { result, calls, methods } = await watchRelease();
  assert.deepEqual(result.flags, ["F1"]);
  assert.deepEqual(result.release, { entry: NEW_ENTRY, lastModified: LAST_MODIFIED });
  const report = renderReport(result);
  assert.ok(report.includes(LAST_MODIFIED), report);
  assert.ok(report.includes("2026-09-29T22:41:07Z"), "the same instant, in UTC ISO form");
  assert.ok(report.includes("2026-09-29 18:41 EDT"), "and in Boston's time");
  assert.equal(calls.filter((u) => u === `${ORIGIN}/${NEW_ENTRY}`).length, 1, "the entry is requested once");
  assert.ok(methods.every((m) => m === "GET"), `only GETs: ${methods}`);

  const gh = [];
  await fileIssue({
    gh: async (args, input) => {
      gh.push({ args, input });
      return args[0] === "issue" && args[1] === "list" ? "[]" : "";
    },
    entry: result.entry,
    flags: result.flags,
    report,
  });
  const create = gh.find((c) => c.args[0] === "issue" && c.args[1] === "create");
  assert.ok(create.input.includes(LAST_MODIFIED), "in the issue's body");
});

test("W8: a new entry the store sends WITHOUT a Last-Modified — the report says so, and nothing else is requested", async () => {
  const { result, calls } = await watchRelease({ headers: {} });
  assert.deepEqual(result.release, { entry: NEW_ENTRY, lastModified: null });
  assert.match(renderReport(result), /the new entry sent no Last-Modified/);
  assert.equal(calls.filter((u) => u === `${ORIGIN}/${NEW_ENTRY}`).length, 1);
});

test("W8: the same entry (no release, a dispatch) — no release line", async () => {
  const { fetchImpl } = fakeFetch(syntheticStore(), { headers: { "/main-SYNTH001.js": { "last-modified": LAST_MODIFIED } } });
  const result = await runWatch({
    fetcher: storeFetcher({ fetchImpl, origin: ORIGIN }),
    baseline: w1Baseline(),
    dependencies: DEPENDENCIES,
    page: PAGE,
    full: true,
  });
  assert.equal(result.release, null);
  assert.ok(!renderReport(result).includes(LAST_MODIFIED));
});
