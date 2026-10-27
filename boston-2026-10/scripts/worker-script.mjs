// `npm run worker:script`: the offer page's analytics script (SPEC-analytics.md § 16 item 1), into
// src/worker/page-script.json.
//
// The offer page (/o/<code>, src/worker/redeem.js, drawn by src/worker/pages.js page()) counts its own opening with the
// plan page's own analytics script: the same sender, its one call site (§ 4), no second transport. A Worker cannot read
// src/analytics.js at run time, so it imports this copy (a JSON import, as src/worker/page-style.json is): the build's
// own ANALYTICS slot (build.mjs analyticsSlot, over data/events.json), byte for byte the <script> every built page
// carries. The copy is DERIVED: EM-A1 fails when it differs from the build's slot, so a change to src/analytics.js,
// src/qr-event.js or data/events.json reaches the offer page by running this script, never by editing the JSON.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyticsSlot, EVENTS_PATH, loadJson, ROOT } from "../build.mjs";

export const PAGE_SCRIPT = join(ROOT, "src", "worker", "page-script.json");

const ABOUT =
  "DERIVED: do not edit. The offer page's analytics script (SPEC-analytics.md § 16 item 1): the plan page's own, " +
  "build.mjs's ANALYTICS slot (src/qr-event.js, src/analytics.js, data/events.json's ids), written by `npm run " +
  "worker:script` (a Worker cannot read src/analytics.js at run time). Test EM-A1 fails when this file differs from it.";

export const workerScriptFile = async () => ({
  about: ABOUT,
  source: "build.mjs analyticsSlot: src/qr-event.js, src/analytics.js, data/events.json",
  html: await analyticsSlot(await loadJson(EVENTS_PATH)),
});
export const serialise = (file) => JSON.stringify(file, null, 2) + "\n";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await writeFile(PAGE_SCRIPT, serialise(await workerScriptFile()));
  console.log(`wrote ${PAGE_SCRIPT}`);
}
