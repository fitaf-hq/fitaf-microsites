// `npm run email:tokens`: copy the :root tokens of src/template.html into src/worker/email-tokens.json.
//
// The emails (src/worker/messages.js, email-style.js) draw the page's colours and font stacks, and a Worker
// cannot read the template at run time, so it imports this copy (a JSON import, as data/offers.json is).
// The copy is DERIVED: test M17 fails when it differs from the template, so a changed token reaches the
// emails by running this script, never by editing the JSON (SPEC-rung5 § 9).
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "../build.mjs";

export const TEMPLATE = join(ROOT, "src", "template.html");
export const EMAIL_TOKENS = join(ROOT, "src", "worker", "email-tokens.json");

const ABOUT =
  "DERIVED: do not edit. The :root tokens of src/template.html, copied by `npm run email:tokens` so the " +
  "Worker's emails draw the page's colours and fonts (a Worker cannot read the template at run time). " +
  "Test M17 fails when this file differs from the template.";

/** The template's one :root block, as { "--name": "value as written" }. */
export function rootTokens(templateHtml) {
  const css = [...templateHtml.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  const blocks = [...css.matchAll(/:root\s*\{([^{}]*)\}/g)];
  if (blocks.length !== 1) throw new Error(`expected one :root block in the template, found ${blocks.length}`);
  const tokens = {};
  for (const [, name, value] of blocks[0][1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    if (name in tokens) throw new Error(`token ${name} is declared twice`);
    tokens[name] = value.trim();
  }
  return tokens;
}

export const tokensFile = (templateHtml) => ({ about: ABOUT, source: "src/template.html :root", tokens: rootTokens(templateHtml) });
export const serialise = (file) => JSON.stringify(file, null, 2) + "\n";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = tokensFile(await readFile(TEMPLATE, "utf8"));
  await writeFile(EMAIL_TOKENS, serialise(file));
  console.log(`wrote ${EMAIL_TOKENS} (${Object.keys(file.tokens).length} tokens)`);
}
