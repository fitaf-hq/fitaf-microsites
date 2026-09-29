// Build the storefront hand-off (SPEC-rung2 § 6): the script the store's Custom Scripts page injects in its
// Footer slot. `npm run build:storefront` writes dist-storefront/ (git-ignored), ONE FILL PER FILE:
//   fitaf-handoff.html               <script>, version line, text, </script>: the fill the source's FILL names,
//                                    ready to paste in the Footer
//   fitaf-handoff.fill-A.console.js  version line and fill A's text, for a browser console (the one-browser run)
//   fitaf-handoff.fill-B.console.js  the same for fill B
// Every file must be under 5,120 bytes (SPEC-rung2 § 3); the build refuses, writing nothing, if one is not.
// Its own directory and its own npm script, NOT `npm run build`: the production build stays byte-identical (S20).
// The version line is `/* fitaf-handoff <commit> sha256:<hex of the text after it> */`, so what is live can be
// compared with what is kept.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadJson, PLANS_PATH, ROOT } from "../build.mjs";

export const STOREFRONT_SOURCE = join(ROOT, "src", "storefront", "fitaf-handoff.js");
export const DIST_STOREFRONT = join(ROOT, "dist-storefront");
/** SPEC-rung2 § 3, "under 5 KB": measured over each whole file written, tags and version line included. */
export const MAX_SHIPPED_BYTES = 5120;
export const FILLS = ["A", "B"];
const FILL_LINE = /var FILL = "([AB])";/g;
const PLANS_SLOT = "/*PLANS*/ {}";
/** One fill's code: from a `// <fill X>` line to its `// </fill X>` line, both whole lines. Not nestable. */
const FILL_REGION = /^[ \t]*\/\/ <fill ([AB])>\n[\s\S]*?^[ \t]*\/\/ <\/fill \1>\n/gm;
/** A whole line that is only a `//` comment. The script has no template literal, so such a line is always one. */
const SOURCE_ONLY_COMMENT = /^[ \t]*\/\/.*\n/gm;
/** A change to any of these changes a text, so any of them uncommitted marks the version line "-dirty". */
const INPUTS = ["src/storefront", "data/plans.json", "scripts/build-storefront.mjs"];

export const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
export const versionLine = (text, commit) => `/* fitaf-handoff ${commit} sha256:${sha256(text)} */\n`;

/** mpid -> [plan name, per-meal cents], individual plans only: Family is not a portion plan, so A refuses it. */
export function planTable(plans) {
  return Object.fromEntries(
    plans.individual.flatMap((plan) => plan.counts.map((c) => [c.mpid, [plan.name, c.price_per_meal_cents]])),
  );
}

const count = (text, re) => (text.match(re) ?? []).length;

/** Refuse a source whose fill regions a regular expression could misread: every fill needs balanced regions. */
function checkRegions(source, sourcePath) {
  for (const fill of FILLS) {
    const opens = count(source, new RegExp(`^[ \\t]*// <fill ${fill}>$`, "gm"));
    const closes = count(source, new RegExp(`^[ \\t]*// </fill ${fill}>$`, "gm"));
    if (!opens || opens !== closes) throw new Error(`${sourcePath}: fill ${fill} regions: ${opens} open, ${closes} close`);
  }
}

/** The FILL the source names: it picks the Footer's fill. */
export async function sourceFill(sourcePath = STOREFRONT_SOURCE) {
  const lines = [...(await readFile(sourcePath, "utf8")).matchAll(FILL_LINE)];
  if (lines.length !== 1) throw new Error(`${sourcePath}: expected one FILL line, found ${lines.length}`);
  return lines[0][1];
}

/**
 * One fill's shipped text: the source without the other fill's regions and without its full-line `//`
 * comments, FILL set to this fill, and the plan table inlined (fill A only has the slot). `fill` defaults to
 * the source's own FILL. The source's `//` lines explain it to a maintainer; they stay in the repository.
 */
export async function storefrontText({ fill, sourcePath = STOREFRONT_SOURCE, plansPath = PLANS_PATH } = {}) {
  const source = await readFile(sourcePath, "utf8");
  fill ??= await sourceFill(sourcePath);
  if (!FILLS.includes(fill)) throw new Error(`fill must be "A" or "B", got ${fill}`);
  checkRegions(source, sourcePath);
  if (source.split(PLANS_SLOT).length !== 2) throw new Error(`${sourcePath}: expected one ${PLANS_SLOT}`);
  const plans = await loadJson(plansPath);
  const table = `/* data/plans.json, read_on ${plans.read_on} */ ${JSON.stringify(planTable(plans))}`;
  return source
    .replace(FILL_REGION, (region, regionFill) => (regionFill === fill ? region : ""))
    .replace(SOURCE_ONLY_COMMENT, "")
    .replace(FILL_LINE, `var FILL = "${fill}";`)
    .replace(PLANS_SLOT, () => table);
}

/** The commit the texts are built from, "-dirty" if any input differs from it: the line never overstates. */
export function gitCommit() {
  const git = (...args) => execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" }).trim();
  const head = git("rev-parse", "--short", "HEAD");
  return git("status", "--porcelain", "--", ...INPUTS) ? `${head}-dirty` : head;
}

export async function buildStorefront({ outDir = DIST_STOREFRONT, sourcePath = STOREFRONT_SOURCE, commit = gitCommit() } = {}) {
  const footerFill = await sourceFill(sourcePath);
  const consoleFile = {};
  for (const fill of FILLS) {
    const text = await storefrontText({ fill, sourcePath });
    consoleFile[fill] = versionLine(text, commit) + text;
  }
  const files = [
    ["fitaf-handoff.html", `<script>\n${consoleFile[footerFill]}</script>\n`],
    ...FILLS.map((fill) => [`fitaf-handoff.fill-${fill}.console.js`, consoleFile[fill]]),
  ].map(([name, content]) => ({ name, content, bytes: Buffer.byteLength(content) }));
  // Refuse before writing anything: a text that could close its own <script> tag, or a file over the limit.
  if (files.some((f) => /<\/script/i.test(f.content.replace(/<\/script>\n$/, "")))) {
    throw new Error("a script text contains </script");
  }
  for (const f of files) {
    if (f.bytes >= MAX_SHIPPED_BYTES) throw new Error(`${f.name}: ${f.bytes} bytes; must be under ${MAX_SHIPPED_BYTES}`);
  }
  // The directory is wholly this build's output, so it starts empty: nothing stale can be pasted.
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  for (const f of files) await writeFile(join(outDir, f.name), f.content);
  return {
    outDir,
    footerFill,
    files: files.map(({ name, content, bytes }) => ({ name, bytes, versionLine: content.match(/fitaf-handoff \S+ sha256:\w+/)[0] })),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = await buildStorefront();
  console.log(`the Footer block carries fill ${out.footerFill} (FILL in src/storefront/fitaf-handoff.js)`);
  for (const f of out.files) console.log(`wrote ${join(out.outDir, f.name)} (${f.bytes} bytes)  /* ${f.versionLine} */`);
}
