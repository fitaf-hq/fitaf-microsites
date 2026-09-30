// `npm run accept -- --release main-<name>.js [--footer <built block> | --footer null]` (SPEC-storefront-watch § 5,
// § 8), apart from the process: bin/accept.mjs runs it against the live store, and the tests (W7b–W7f) against the
// synthetic store with an injected fetch, no network. It returns the exit code: 0 accepted; 1 refused, the release named
// not the live entry (before or after its files were read); 2 a usage error, before any request. Anything else throws
// (bin/accept.mjs then exits 2). Nothing is written unless it returns 0.
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { acceptBaseline, NotTheLiveRelease } from "./baseline.mjs";
import { ENTRY_NAME } from "./page-scripts.mjs";

export const USAGE = `usage: npm run accept -- --release main-<name>.js [--footer <built block> | --footer null]
  --release main-<name>.js  the release to accept: the entry bundle's name exactly as the watch's issue title names it
                            (main-2HXLHIG7.js). Refused unless it is the live entry, before and after its files are read.
  --footer <file>           set expectedFooter from a built block's version line (dist-storefront/fitaf-handoff.html),
                            once that block is pasted in the Footer; its text must match its line, and not be -dirty
  --footer null             clear it (no block expected: F3 informational)
  (no --footer)             keep the baseline's expectedFooter as it is`;

function usage(err, why) {
  err(`storefront-watch accept: ${why}`);
  err(USAGE);
  return 2;
}

/** `argv`: the arguments after the script. `out` and `err` take one line each (console.log and console.error). */
export async function acceptCommand(argv, { fetcher, path, page, out, err }) {
  let values;
  try {
    ({ values } = parseArgs({ args: argv, options: { release: { type: "string" }, footer: { type: "string" } } }));
  } catch (e) {
    return usage(err, e.message);
  }
  if (values.release === undefined) return usage(err, "--release is required: the release to accept, as the issue's title names it");
  if (!ENTRY_NAME.test(values.release)) return usage(err, `--release ${values.release} is not an entry bundle's name`);
  const footer = values.footer === undefined ? undefined : values.footer === "null" ? null : await readFile(values.footer, "utf8");
  let b;
  try {
    b = await acceptBaseline({ fetcher, path, page, footer, release: values.release });
  } catch (e) {
    if (!(e instanceof NotTheLiveRelease)) throw e;
    err(`storefront-watch accept: refused: ${e.message}. Nothing written.`);
    return 1;
  }
  out(`accepted ${b.entry}`);
  out(`wrote ${path}`);
  out(`  entry ${b.entry}; ${b.imports.length} imports; ${Object.keys(b.files).length} JS files hashed; ${b.html.length} page scripts`);
  out(`  expectedFooter: ${b.expectedFooter ?? "null"}`);
  out(`  ${fetcher.calls.length} requests, every one to ${fetcher.origin}; refused, never fetched: ${fetcher.refused.join(", ") || "none"}`);
  return 0;
}
