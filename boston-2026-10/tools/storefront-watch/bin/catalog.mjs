// `npm run catalog -- --out <dir> [--mpid 26] [--every <minutes>] [--max <minutes>]` (SPEC-storefront-watch § 13): the
// week's catalog at the store's switch, for Fit AF's week_menu.py --storefront. One headless visit of the live store's
// /order?mpid=N (26 by default), a fresh profile, nothing pressed and nothing typed; the page's OWN /catalog/products
// response saved byte for byte as <dir>/products.json, with <dir>/visit.json (its times, status, content type, bytes and
// SHA-256, the request's host, path and parameter NAMES, the browser's agent, each read's counts). The command requests
// nothing of its own: not the store's backend, not anything else.
//   --out <dir>        required: an existing directory OUTSIDE this repository (it is public; what this writes is not),
//                      holding neither file; a relative one is from where the command was typed
//   --mpid <N>         the plan page (default 26)
//   --every <minutes>  2 or more: a fresh visit every M minutes until two consecutive reads carry the same all-meals and
//                      snacks names, then the LAST read is written (the switch of 2026-10-09 ran about an hour)
//   --max <minutes>    with --every: no read is due later (default 120); none agreeing, nothing written
// Exit 0 written; 1 nothing written because of what the store served; 2 a usage error, an --out refused, or the command's
// own failure. The command is lib/catalog-command.mjs, which the tests (CT-1–CT-6) run against a synthetic store.
import { catalogCommand } from "../lib/catalog-command.mjs";

catalogCommand(process.argv.slice(2), {
  out: (line) => console.log(line),
  err: (line) => console.error(line),
  visit: async (opts) => (await import("../lib/visit.mjs")).ordinaryVisit(opts),
}).then(
  (code) => process.stdout.write("", () => process.exit(code)),
  (err) => {
    console.error(`storefront-watch catalog: ${err.stack ?? err}`);
    process.exit(2);
  },
);
