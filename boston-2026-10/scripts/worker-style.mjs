// `npm run worker:style`: the Worker's pages' stylesheet (SPEC-save-offer-production § 10.3), into
// src/worker/page-style.json.
//
// The Worker's pages (src/worker/pages.js page()) wear the site's look, as /privacy/ does (build.mjs privacyPage): the
// template's :root tokens, the DRAFT token, its @font-face rules (the fonts from the site's own /fonts/), then
// src/worker/page.css's rules. A Worker cannot read the template at run time, so it imports this copy (a JSON import, as
// src/worker/email-tokens.json is). The copy is DERIVED: SP15 fails when it differs from its sources, so a changed token
// or rule reaches the pages by running this script, never by editing the JSON.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, siteStyle } from "../build.mjs";

export const PAGE_CSS = join(ROOT, "src", "worker", "page.css");
export const PAGE_STYLE = join(ROOT, "src", "worker", "page-style.json");

const ABOUT =
  "DERIVED: do not edit. The Worker's pages' stylesheet: src/template.html's :root tokens and @font-face rules, " +
  "src/save/style.css's DRAFT token and src/worker/page.css's rules, written by `npm run worker:style` (a Worker cannot " +
  "read the template at run time). Test SP15 fails when this file differs from them.";

export const workerStyleFile = async () => ({
  about: ABOUT,
  source: "src/template.html :root and @font-face, src/save/style.css --draft, src/worker/page.css",
  css: await siteStyle(PAGE_CSS, { draft: true }),
});
export const serialise = (file) => JSON.stringify(file, null, 2) + "\n";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await writeFile(PAGE_STYLE, serialise(await workerStyleFile()));
  console.log(`wrote ${PAGE_STYLE}`);
}
