// Shared by the w*.test.mjs files. Not a test file itself.
// A SYNTHETIC store: a few lines of HTML and JS written for these tests, shaped like the real one (an HTML page naming
// a module entry `main-*.js`, content-hashed `chunk-*.js` files importing each other statically and dynamically), and
// carrying the literal strings of ../../../storefront/dependencies.json. None of the store's code is here.
// It is served to the code under test by an injected fetch function: no network.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const ORIGIN = "https://fitafnutrition.com";
export const PAGE = `${ORIGIN}/order?mpid=21`;
export const DEPENDENCIES = JSON.parse(
  readFileSync(new URL("../../../storefront/dependencies.json", import.meta.url), "utf8"),
);
export const LITERALS = DEPENDENCIES.literals.map((d) => d.literal);

/** The literals, spread over two chunks: one reached statically, one only through two dynamic imports. */
const half = Math.ceil(LITERALS.length / 2);

/**
 * The store's files by path (and query). `edit(files)` may change any of them before they are served: a test's
 * release. Each value is the file's text.
 */
export function syntheticStore(edit = () => {}) {
  const files = new Map([
    [
      "/order?mpid=21",
      [
        "<!doctype html>",
        '<html lang="en"><head><meta charset="utf-8"><title>Synthetic store</title>',
        '<link rel="stylesheet" href="https://fonts.example/css">',
        '<script src="runtime-config.js"></script>',
        '<link rel="modulepreload" href="chunk-AAAA0001.js">',
        '<script src="main-SYNTH001.js" type="module"></script>',
        "</head><body><app-root></app-root></body></html>",
        "",
      ].join("\n"),
    ],
    ["/runtime-config.js", "window.__SYNTH__ = { env: \"test\" };\n"],
    [
      "/main-SYNTH001.js",
      'import{a as b}from"./chunk-AAAA0001.js";import"./chunk-BBBB0002.js";var lazy=()=>import("./chunk-CCCC0003.js");\n',
    ],
    ["/chunk-AAAA0001.js", `export const a=1;\n${LITERALS.slice(0, half).map((l) => `x(${l});`).join("\n")}\n`],
    ["/chunk-BBBB0002.js", 'import{a}from"./chunk-AAAA0001.js";export const b=a+1;\n'],
    ["/chunk-CCCC0003.js", 'var more=()=>import("./chunk-DDDD0004.js");export{more};\n'],
    ["/chunk-DDDD0004.js", `export const d=4;\n${LITERALS.slice(half).map((l) => `x(${l});`).join("\n")}\n`],
  ]);
  edit(files);
  return files;
}

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

/**
 * The oracle for W1 and W7: the baseline of the unedited synthetic store, written out by hand (the lists) with each
 * file's SHA-256 computed here. Its key order is the file format's.
 */
export function w1Baseline(files = syntheticStore()) {
  const js = ["chunk-AAAA0001.js", "chunk-BBBB0002.js", "chunk-CCCC0003.js", "chunk-DDDD0004.js", "main-SYNTH001.js"];
  return {
    about:
      "Written by `npm run accept` (tools/storefront-watch; SPEC-storefront-watch.md § 5) from the live store's public files. Do not hand-edit: re-run accept; set expectedFooter with accept --footer.",
    page: PAGE,
    html: ["runtime-config.js", "chunk-AAAA0001.js", "main-SYNTH001.js"],
    entry: "main-SYNTH001.js",
    imports: ["chunk-AAAA0001.js", "chunk-BBBB0002.js", "chunk-CCCC0003.js"],
    files: Object.fromEntries(js.map((name) => [name, sha256(files.get(`/${name}`))])),
    expectedFooter: null,
  };
}

/** The baseline file's exact bytes. */
export const baselineText = (baseline) => `${JSON.stringify(baseline, null, 2)}\n`;

/**
 * A fetch function serving `files` under ORIGIN, recording every URL it is asked for. It answers any other host
 * with a network error, but the record is what the tests read: a request that should never be made is a failure
 * even if it failed.
 */
export function fakeFetch(files) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    const u = new URL(url);
    if (u.origin !== ORIGIN) throw new TypeError(`fetch failed (the test network has no ${u.host})`);
    const key = u.pathname + u.search;
    if (!files.has(key)) return new Response("not found", { status: 404 });
    return new Response(files.get(key), { status: 200, headers: { "content-type": "text/plain" } });
  };
  return { fetchImpl, calls };
}
