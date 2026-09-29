// `npm run accept -- [--footer <built block> | --footer null]` (SPEC-storefront-watch § 5): after the smoke passes (or
// the script is fixed), rewrite ../../storefront/watch-baseline.json from the live store's public files. Static only:
// requests to the store's origin, no browser. The commit that lands the new baseline names the issue, which closes it.
//   --footer <file>  set expectedFooter from a built block's version line (dist-storefront/fitaf-handoff.html), once
//                    that block is pasted in the Footer; the block's text must match its line, and not be -dirty
//   --footer null    clear it (no block expected: F3 informational)
//   (neither)        keep the baseline's expectedFooter as it is
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { acceptBaseline } from "../lib/baseline.mjs";
import { BASELINE_PATH, STORE_PAGE } from "../lib/config.mjs";
import { storeFetcher } from "../lib/store-fetch.mjs";

async function main() {
  const { values } = parseArgs({ options: { footer: { type: "string" } } });
  const footer = values.footer === undefined ? undefined : values.footer === "null" ? null : await readFile(values.footer, "utf8");
  const fetcher = storeFetcher();
  const b = await acceptBaseline({ fetcher, path: BASELINE_PATH, page: STORE_PAGE, footer });
  console.log(`wrote ${BASELINE_PATH}`);
  console.log(`  entry ${b.entry}; ${b.imports.length} imports; ${Object.keys(b.files).length} JS files hashed; ${b.html.length} page scripts`);
  console.log(`  expectedFooter: ${b.expectedFooter ?? "null"}`);
  console.log(`  ${fetcher.calls.length} requests, every one to ${fetcher.origin}; refused, never fetched: ${fetcher.refused.join(", ") || "none"}`);
  return 0;
}

main().then(
  (code) => process.stdout.write("", () => process.exit(code)),
  (err) => {
    console.error(`storefront-watch accept: ${err.stack ?? err}`);
    process.exit(2);
  },
);
