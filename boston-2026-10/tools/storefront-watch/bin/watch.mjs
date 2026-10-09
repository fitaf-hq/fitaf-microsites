// `npm run watch -- [--full] [--daily] [--no-browser] [--issue] [--report <file>]` (SPEC-storefront-watch §§ 2–3, 5, 12)
//   (none)        the hourly check: two requests; on a change, F1 to F5. On a Friday in New York (data/save.json's
//                 send_time_zone), until a switch is seen that Friday, also F6 (§ 12): one headless visit, the menu
//   --full        F1 to F6 whatever the hourly check finds and whatever the day (the workflow passes it on a dispatch)
//   --daily       also F3 and F4 (the workflow passes it at 07:17 UTC)
//   --no-browser  skip F3 to F6 (the static checks alone; the report says they did not run)
//   --issue       on a flag, open or update the issue with `gh` (CI only; the runner's GITHUB_TOKEN): the release's
//                 issue for F1-F5, the menu's own for F6; and on a Friday, first ask whether this Friday's switch was
//                 already seen (without --issue F6 runs every Friday run)
//   --report      also write the report to a file
// Exit 0 green, 1 flagged, 2 the watch itself failed.
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { BASELINE_PATH, DEPENDENCIES_PATH, SAVE_PATH, STORE_PAGE } from "../lib/config.mjs";
import { ghRunner } from "../lib/issue.mjs";
import { switchSeen } from "../lib/menu-issue.mjs";
import { renderReport } from "../lib/report.mjs";
import { fileRunIssues } from "../lib/run-issues.mjs";
import { storeFetcher } from "../lib/store-fetch.mjs";
import { runWatch } from "../lib/watch.mjs";

async function main() {
  const { values } = parseArgs({
    options: {
      full: { type: "boolean", default: false },
      daily: { type: "boolean", default: false },
      "no-browser": { type: "boolean", default: false },
      issue: { type: "boolean", default: false },
      report: { type: "string" },
    },
  });
  const baseline = JSON.parse(await readFile(BASELINE_PATH, "utf8"));
  const dependencies = JSON.parse(await readFile(DEPENDENCIES_PATH, "utf8"));
  const { send_time_zone: timeZone } = JSON.parse(await readFile(SAVE_PATH, "utf8"));
  if (!timeZone) throw new Error(`${SAVE_PATH} names no send_time_zone: F6's Friday is read in it`);
  const gh = values.issue ? ghRunner() : null;
  const browser = !values["no-browser"];
  const visit = browser ? async (opts = {}) => (await import("../lib/visit.mjs")).ordinaryVisit({ page: STORE_PAGE, ...opts }) : null;
  const smoke = browser ? async ({ liveBlocks }) => (await import("../lib/smoke.mjs")).smoke({ liveBlocks }) : null;

  const result = await runWatch({
    fetcher: storeFetcher(),
    baseline,
    dependencies,
    page: STORE_PAGE,
    full: values.full,
    daily: values.daily,
    visit,
    smoke,
    cutover: { timeZone, seen: gh ? switchSeen({ gh }) : null },
  });
  const report = renderReport(result);
  process.stdout.write(report);
  if (values.report) await writeFile(values.report, report);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);
  if (result.flags.length && gh) {
    const done = await fileRunIssues({ gh, result, report });
    for (const [which, d] of Object.entries(done)) console.log(`\n${which} issue: ${d.action}${d.number ? ` #${d.number}` : ""}`);
  }
  return result.flags.length ? 1 : 0;
}

main().then(
  (code) => process.stdout.write("", () => process.exit(code)),
  (err) => {
    console.error(`storefront-watch: ${err.stack ?? err}`);
    process.exit(2);
  },
);
