// `npm run accept -- --release main-<name>.js [--footer <built block> | --footer null]` (SPEC-storefront-watch § 5,
// § 8), apart from the process: bin/accept.mjs runs it against the live store, and the tests (W7b–W7f) against the
// synthetic store with an injected fetch, no network. It returns the exit code: 0 accepted; 1 refused, the release named
// not the live entry (before or after its files were read); 2 a usage error, before any request. Anything else throws
// (bin/accept.mjs then exits 2). Nothing is written unless it returns 0.
// § 12 item 5, `--menu` (standing alone): the live menu's keys into the baseline, read by `visit` (one headless visit of
// the order page; the tests pass a recorded one), every other field as it was; 1 when the menu could not be read.
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { acceptBaseline, acceptMenu, MenuUnread, NotTheLiveRelease } from "./baseline.mjs";
import { ENTRY_NAME } from "./page-scripts.mjs";

export const USAGE = `usage: npm run accept -- --release main-<name>.js [--footer <built block> | --footer null]
       npm run accept -- --menu
  --release main-<name>.js  the release to accept: the entry bundle's name exactly as the watch's issue title names it
                            (main-2HXLHIG7.js). Refused unless it is the live entry, before and after its files are read.
  --footer <file>           set expectedFooter from a built block's version line (dist-storefront/fitaf-handoff.html),
                            once that block is pasted in the Footer; its text must match its line, and not be -dirty
  --footer null             clear it (no block expected: F3 informational)
  (no --footer)             keep the baseline's expectedFooter as it is
  --menu                    alone: the week's menu (SPEC-storefront-watch § 12), the meal keys of the live order page's
                            own catalog response, read in one headless visit; nothing else in the baseline changes`;

function usage(err, why) {
  err(`storefront-watch accept: ${why}`);
  err(USAGE);
  return 2;
}

/** § 12 item 5: `accept --menu`. */
async function acceptTheMenu({ path, visit, out, err }) {
  let r;
  try {
    r = await acceptMenu({ path, visit });
  } catch (e) {
    if (!(e instanceof MenuUnread)) throw e;
    err(`storefront-watch accept: refused: ${e.message}. Nothing written.`);
    return 1;
  }
  out(`accepted the menu: ${r.live.length} meals`);
  out(`wrote ${path}`);
  for (const m of r.live) out(`  ${m.key}  ${m.name}`);
  return 0;
}

/**
 * `argv`: the arguments after the script. `out` and `err` take one line each (console.log and console.error). `visit`:
 * lib/visit.mjs's ordinaryVisit bound to the order page, for --menu only.
 */
export async function acceptCommand(argv, { fetcher, path, page, out, err, visit = null }) {
  let values;
  try {
    ({ values } = parseArgs({ args: argv, options: { release: { type: "string" }, footer: { type: "string" }, menu: { type: "boolean" } } }));
  } catch (e) {
    return usage(err, e.message);
  }
  if (values.menu) {
    if (values.release !== undefined || values.footer !== undefined) return usage(err, "--menu stands alone: it writes the week's menu and nothing else");
    if (!visit) throw new Error("accept --menu needs a headless visit of the order page");
    return acceptTheMenu({ path, visit, out, err });
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
