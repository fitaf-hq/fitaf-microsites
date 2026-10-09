// `npm run accept -- --release main-<name>.js [--footer <built block> | --footer null]` (SPEC-storefront-watch § 5,
// § 8): after the smoke passes on a release (or the script is fixed), rewrite ../../storefront/watch-baseline.json from
// the live store's public files, for THAT release only. `--release` names it exactly as the watch's issue title does,
// and accept refuses, writing nothing, unless it is the live entry both before and after its files are read. Static
// only (requests to the store's origin, no browser), but for --menu, which is one headless visit and no request of its
// own. The commit that lands the new baseline names the issue, which closes it.
//   --release <entry>  required: `main-<name>.js`
//   --footer <file>    set expectedFooter from a built block's version line (dist-storefront/fitaf-handoff.html), once
//                      that block is pasted in the Footer; the block's text must match its line, and not be -dirty
//   --footer null      clear it (no block expected: F3 informational)
//   (no --footer)      keep the baseline's expectedFooter as it is
//   --menu             alone (§ 12 item 5): the live menu's keys into the baseline, from one headless visit of the
//                      order page reading the page's own catalog response; nothing else changes. In the commit that
//                      releases the next week, naming the "menu switched" issue, which closes it
// Exit 0 accepted (the first line printed: `accepted <entry>`, or `accepted the menu: N meals`), 1 refused (not the live
// release; or the live menu could not be read), 2 a usage error or accept itself failed. The command is lib/accept-command.mjs, which the tests run against a synthetic store.
import { acceptCommand } from "../lib/accept-command.mjs";
import { BASELINE_PATH, STORE_PAGE } from "../lib/config.mjs";
import { storeFetcher } from "../lib/store-fetch.mjs";

acceptCommand(process.argv.slice(2), {
  fetcher: storeFetcher(),
  path: BASELINE_PATH,
  page: STORE_PAGE,
  out: (line) => console.log(line),
  err: (line) => console.error(line),
  visit: async (opts = {}) => (await import("../lib/visit.mjs")).ordinaryVisit({ page: STORE_PAGE, ...opts }),
}).then(
  (code) => process.stdout.write("", () => process.exit(code)),
  (err) => {
    console.error(`storefront-watch accept: ${err.stack ?? err}`);
    process.exit(2);
  },
);
