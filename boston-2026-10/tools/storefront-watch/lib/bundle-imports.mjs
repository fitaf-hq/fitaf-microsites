// SPEC-storefront-watch § 2.2 and F1: what a bundle file imports, statically (`import … from"./x.js"`,
// `import"./x.js"`, `export … from"./x.js"`) and dynamically (`import("./x.js")`), as absolute URLs. A reading of
// the minified text, as esbuild writes it; only specifiers that are paths or URLs to a .js file count.

const PATTERNS = [
  /\bfrom\s*(["'])([^"'\n]+)\1/g,
  /\bimport\s*(["'])([^"'\n]+)\1/g,
  /\bimport\s*\(\s*(["'`])([^"'`\n]+)\1\s*\)/g,
];
const PATH_OR_URL = /^(\.{1,2}\/|\/|https?:\/\/)/i;
const JS_FILE = /\.m?js(?:[?#]|$)/;

export function bundleImports(text, fileUrl) {
  const out = new Set();
  for (const re of PATTERNS) {
    for (const m of text.matchAll(re)) {
      const specifier = m[2];
      if (PATH_OR_URL.test(specifier) && JS_FILE.test(specifier)) out.add(new URL(specifier, fileUrl).href);
    }
  }
  return [...out].sort();
}
