// E1: a browser check that cannot run (no Chrome, a crash, a timeout) is a FLAG in the report, never an abort: on a
// release, the run must still reach the issue with F1 in it. Not one of § 6's W cases; the failure path of F3–F5.
import test from "node:test";
import assert from "node:assert/strict";
import { renderReport } from "../lib/report.mjs";
import { storeFetcher } from "../lib/store-fetch.mjs";
import { runWatch } from "../lib/watch.mjs";
import { DEPENDENCIES, fakeFetch, ORIGIN, PAGE, syntheticStore, w1Baseline } from "./synthetic-store.mjs";

const release = () =>
  syntheticStore((f) => {
    f.set("/order?mpid=21", f.get("/order?mpid=21").replace("main-SYNTH001.js", "main-SYNTH002.js"));
    f.set("/main-SYNTH002.js", f.get("/main-SYNTH001.js"));
  });

test("E1: on a release, a visit and a smoke that throw are flagged F3, F4, F5 with the error; F1 still stands", async () => {
  const { fetchImpl } = fakeFetch(release());
  const result = await runWatch({
    fetcher: storeFetcher({ fetchImpl, origin: ORIGIN }),
    baseline: w1Baseline(),
    dependencies: DEPENDENCIES,
    page: PAGE,
    visit: async () => {
      throw new Error("Failed to launch the browser process");
    },
    smoke: async () => {
      throw new Error("Failed to launch the browser process");
    },
  });
  assert.deepEqual(result.flags, ["F1", "F3", "F4", "F5"]);
  assert.equal(result.entry, "main-SYNTH002.js");
  const report = renderReport(result);
  assert.equal(report.split("could not run: Failed to launch the browser process").length - 1, 3, report);
});
