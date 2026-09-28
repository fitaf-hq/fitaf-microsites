// S7: send_at at 23:59 and 00:01 Eastern, and across the DST change of 2026-11-01 — in Node AND in workerd.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build as esbuild } from "esbuild";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import saveConfig from "../data/save.json" with { type: "json" };
import { ROOT } from "../build.mjs";
import { nextDayAt, zonedTimeToInstant } from "../src/worker/zoned-time.js";

const OPTS = { zone: saveConfig.send_time_zone, hour: saveConfig.send_hour };
// [a save at (UTC), what the clock in New York reads, the send time expected (UTC)]
const CASES = [
  ["2026-10-16T03:59:00.000Z", "Thu Oct 15 23:59 EDT", "2026-10-16T13:00:00.000Z"],
  ["2026-10-16T04:01:00.000Z", "Fri Oct 16 00:01 EDT", "2026-10-17T13:00:00.000Z"],
  ["2026-10-31T16:00:00.000Z", "Sat Oct 31 12:00 EDT: tomorrow is the change", "2026-11-01T14:00:00.000Z"],
  ["2026-11-01T03:59:00.000Z", "Sat Oct 31 23:59 EDT", "2026-11-01T14:00:00.000Z"],
  ["2026-11-01T04:30:00.000Z", "Sun Nov 1 00:30 EDT, before the change", "2026-11-02T14:00:00.000Z"],
  ["2026-11-01T05:30:00.000Z", "Sun Nov 1 01:30 EDT (the first 01:30)", "2026-11-02T14:00:00.000Z"],
  ["2026-11-01T06:30:00.000Z", "Sun Nov 1 01:30 EST (the second 01:30)", "2026-11-02T14:00:00.000Z"],
  ["2026-11-02T04:59:00.000Z", "Sun Nov 1 23:59 EST", "2026-11-02T14:00:00.000Z"],
  ["2026-11-02T05:01:00.000Z", "Mon Nov 2 00:01 EST", "2026-11-03T14:00:00.000Z"],
  ["2027-03-13T17:00:00.000Z", "Sat Mar 13 12:00 EST: tomorrow springs forward", "2027-03-14T13:00:00.000Z"],
];
const run = (cases) => cases.map(([at]) => new Date(nextDayAt(Date.parse(at), OPTS)).toISOString());

test("S7 (Node): the right next-day 09:00 Eastern each time", () => {
  assert.deepEqual(run(CASES), CASES.map((c) => c[2]));
});

test("S7 (helper): wall-clock hours on either side of a changeover settle to the right instant", () => {
  // At 09:00 the changeover (02:00 local) is always hours behind, so the send hour alone cannot show
  // that the second pass is needed. These hours straddle it.
  const at = (ymd, hour) => new Date(zonedTimeToInstant(ymd, hour, OPTS.zone)).toISOString();
  assert.equal(at("2027-03-14", 3), "2027-03-14T07:00:00.000Z", "03:00 EDT, the first hour after springing forward");
  assert.equal(at("2026-11-01", 5), "2026-11-01T10:00:00.000Z", "05:00 EST, after falling back");
  assert.equal(at("2026-11-01", 0), "2026-11-01T04:00:00.000Z", "00:00 EDT, before it");
});

// The same module, bundled into a Worker, computed by workerd's own Intl.
const script = (
  await esbuild({
    stdin: {
      contents:
        'import { nextDayAt } from "./src/worker/zoned-time.js";\n' +
        "export default { async fetch(req) { const { at, opts } = await req.json();\n" +
        "  return Response.json(at.map((a) => new Date(nextDayAt(Date.parse(a), opts)).toISOString())); } };",
      resolveDir: ROOT,
      sourcefile: "s07-probe.js",
    },
    bundle: true,
    format: "esm",
    write: false,
    logLevel: "silent",
  })
).outputFiles[0].text;
const mf = new Miniflare(convertV4MiniflareOptions({ workers: [{ name: "s07", modules: true, script, compatibilityDate: "2026-09-26" }] }));
after(() => mf.dispose());

test("S7 (workerd): the Workers runtime computes the same instants", async () => {
  const res = await mf.dispatchFetch("http://localhost/", { method: "POST", body: JSON.stringify({ at: CASES.map((c) => c[0]), opts: OPTS }) });
  assert.deepEqual(await res.json(), CASES.map((c) => c[2]));
});
