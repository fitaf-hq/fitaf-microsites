// `npm run contrast`: APCA contrast for every colour pair the page draws (src/contrast-pairs.json).
//
// Colours are read from the CSS itself — the :root tokens of src/template.html and src/save/style.css, and
// the mock-ups' stylesheet mockups/mockups.css (which uses the template's tokens) — so a changed token is
// measured as it ships. Three refusals, each exiting 1:
//   1. a pair whose |Lc| is under its role's minimum;
//   2. a raw colour (#hex, rgb(), hsl()) in the CSS outside a :root block — it would bypass this check;
//   3. a colour token that no pair measures and no `not_measured` entry explains, or a pair naming a
//      token that does not exist.
//
// Options (for the mutant cases; the committed files are never written):
//   --template <path>  --save-style <path>  --mockup-style <path>  --pairs <path>
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { APCAcontrast, sRGBtoY } from "apca-w3";
import { ROOT } from "../build.mjs";

export const DEFAULTS = {
  template: join(ROOT, "src", "template.html"),
  saveStyle: join(ROOT, "src", "save", "style.css"),
  mockupStyle: join(ROOT, "mockups", "mockups.css"),
  pairs: join(ROOT, "src", "contrast-pairs.json"),
};

const HEX_TOKEN = /(--[a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\s*;/gi;
const ROOT_BLOCK = /:root\s*\{([^{}]*)\}/g;
const RAW_COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i;

/** The CSS drawn: the template's <style> blocks, the dev build's stylesheet and the mock-ups' stylesheet. */
async function readCss({ template, saveStyle, mockupStyle }) {
  const html = await readFile(template, "utf8");
  const inline = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  return [...inline, await readFile(saveStyle, "utf8"), await readFile(mockupStyle, "utf8")].join("\n");
}

export function tokensOf(css) {
  const tokens = {};
  for (const block of css.matchAll(ROOT_BLOCK)) {
    for (const [, name, hex] of block[1].matchAll(HEX_TOKEN)) {
      if (name in tokens) throw new Error(`colour token ${name} is declared twice`);
      tokens[name] = hex.toLowerCase();
    }
  }
  return tokens;
}

/** Declarations outside :root that carry a literal colour. */
export function rawColours(css) {
  const rest = css.replace(ROOT_BLOCK, "");
  const found = [];
  for (const body of rest.matchAll(/\{([^{}]*)\}/g)) {
    for (const decl of body[1].split(";")) {
      // A data: URI's own content (the check-mark mask's shape) is not a page colour.
      const plain = decl.replace(/url\(\s*"[^"]*"\s*\)/g, "url()");
      if (RAW_COLOUR.test(plain)) found.push(decl.trim());
    }
  }
  return found;
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export const lc = (fgHex, bgHex) => Number(APCAcontrast(sRGBtoY(rgb(fgHex)), sRGBtoY(rgb(bgHex))));

export async function measure(paths = {}) {
  const p = { ...DEFAULTS, ...paths };
  const css = await readCss(p);
  const spec = JSON.parse(await readFile(p.pairs, "utf8"));
  const tokens = tokensOf(css);
  const problems = rawColours(css).map((d) => `raw colour outside :root (use a token): ${d}`);

  const rows = spec.pairs.map((pair) => {
    const role = spec.roles[pair.role];
    if (!role) throw new Error(`unknown role ${pair.role}`);
    const missing = [pair.fg, pair.bg].filter((t) => !(t in tokens));
    if (missing.length) {
      problems.push(`pair names an undeclared token: ${missing.join(", ")} (${pair.where})`);
      return { ...pair, min: role.min_lc, lc: NaN, pass: false };
    }
    const value = lc(tokens[pair.fg], tokens[pair.bg]);
    return { ...pair, fgHex: tokens[pair.fg], bgHex: tokens[pair.bg], min: role.min_lc, lc: value, pass: Math.abs(value) >= role.min_lc };
  });

  const accounted = new Set([...spec.pairs.flatMap((x) => [x.fg, x.bg]), ...spec.not_measured.map((x) => x.token)]);
  for (const name of Object.keys(tokens)) {
    if (!accounted.has(name)) problems.push(`colour token ${name} is in no pair and not in not_measured`);
  }
  const considered = (spec.considered_not_drawn ?? []).map((c) => {
    const value = lc(c.fg, c.bg);
    return { ...c, min: spec.roles[c.role].min_lc, lc: value, pass: Math.abs(value) >= spec.roles[c.role].min_lc };
  });
  return { rows, problems, tokens, considered, notMeasured: spec.not_measured };
}

function table(rows) {
  const head = ["#", "fg", "bg", "role", "min", "Lc", "", "where"];
  const body = rows.map((r, i) => [
    String(i + 1),
    `${r.fg} ${r.fgHex ?? "?"}`,
    `${r.bg} ${r.bgHex ?? "?"}`,
    r.role + (r.build ? ` (${r.build})` : ""),
    String(r.min),
    Number.isNaN(r.lc) ? "—" : r.lc.toFixed(1),
    r.pass ? "pass" : "FAIL",
    r.where,
  ]);
  const widths = head.map((_, c) => Math.max(...[head, ...body].map((row) => row[c].length)));
  const line = (row) => row.map((cell, c) => (c === row.length - 1 ? cell : cell.padEnd(widths[c]))).join("  ");
  return [line(head), line(widths.map((w) => "-".repeat(w))), ...body.map(line)].join("\n");
}

function argsOf(argv) {
  const out = {};
  const names = { "--template": "template", "--save-style": "saveStyle", "--mockup-style": "mockupStyle", "--pairs": "pairs" };
  for (let i = 0; i < argv.length; i += 2) {
    if (!(argv[i] in names)) throw new Error(`unknown option ${argv[i]}`);
    out[names[argv[i]]] = argv[i + 1];
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { rows, problems, considered, notMeasured } = await measure(argsOf(process.argv.slice(2)));
  console.log(table(rows));
  console.log("\nConsidered for the button, not drawn (reported, not gating):");
  for (const c of considered) {
    console.log(`  ${c.fg} on ${c.bg}  ${c.role} min ${c.min}  Lc ${c.lc.toFixed(1)}  ${c.pass ? "would pass" : "would FAIL"}  ${c.why}`);
  }
  console.log("\nNot measured, by declaration:");
  for (const n of notMeasured) console.log(`  ${n.token}${n.as ? ` (${n.as})` : ""}: ${n.why}`);
  const failed = rows.filter((r) => !r.pass);
  for (const p of problems) console.log(`PROBLEM: ${p}`);
  console.log(`\n${rows.length} pairs, ${rows.length - failed.length} pass, ${failed.length} fail; ${problems.length} problem(s).`);
  process.exitCode = failed.length || problems.length ? 1 : 0;
}
