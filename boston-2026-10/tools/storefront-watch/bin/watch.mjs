// `npm run watch -- [--full] [--daily] [--no-browser] [--issue] [--report <file>]` (SPEC-storefront-watch §§ 2–3, 5)
//   (none)        the hourly check: two requests; on a change, F1 to F5
//   --full        F1 to F5 whatever the hourly check finds (the workflow passes it on a dispatch)
//   --daily       also F3 and F4 (the workflow passes it at 07:17 UTC)
//   --no-browser  skip F3 to F5 (the static checks alone; the report says they did not run)
//   --issue       on a flag, open or update the issue with `gh` (CI only; the runner's GITHUB_TOKEN)
//   --report      also write the report to a file
// Exit 0 green, 1 flagged, 2 the watch itself failed.
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { BASELINE_PATH, DEPENDENCIES_PATH, STORE_PAGE } from "../lib/config.mjs";
import { fileIssue, ghRunner } from "../lib/issue.mjs";
import { renderReport } from "../lib/report.mjs";
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
  const browser = !values["no-browser"];
  const visit = browser ? async () => (await import("../lib/visit.mjs")).ordinaryVisit({ page: STORE_PAGE }) : null;
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
  });
  const report = renderReport(result);
  process.stdout.write(report);
  if (values.report) await writeFile(values.report, report);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);
  if (result.flags.length && values.issue) {
    const done = await fileIssue({ gh: ghRunner(), entry: result.entry ?? "(no entry)", flags: result.flags, report });
    console.log(`\nissue: ${done.action}${done.number ? ` #${done.number}` : ""}`);
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
