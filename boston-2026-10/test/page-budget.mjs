// The page's budget, SPEC.md § 1's "Total transfer under 60 KB before images", as the orchestrator ruled it on
// 2026-10-18 (SPEC.md § 1's note of that day): "transfer" is what crosses the network, so the budget is the page
// gzip-compressed (Node's zlib.gzipSync at its default level, conservative against the brotli the edge may use) under
// 60 × 1024 bytes, on every page the production and development builds write. The raw size is printed, never asserted
// (the raw-byte assertion it replaces was a stricter stand-in). Its ONE definition: T5, S18's dev T5 and A1 read the
// budget through assertPageBudget, and page-budget.test.mjs shows a page over it compressed failing it. Not a test file.
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";

/** SPEC.md § 1: 60 KB. */
export const PAGE_BUDGET_BYTES = 60 * 1024;

/** The page's transfer size: its UTF-8 bytes through gzip at Node's default level. */
export const transferBytes = (html) => gzipSync(Buffer.from(html, "utf8")).length;

/** The page's two sizes, as one line. */
export const pageSizes = (html) => `${Buffer.byteLength(html, "utf8")} bytes raw, ${transferBytes(html)} bytes gzip`;

/** The budget's one assertion: `html` gzip-compressed under PAGE_BUDGET_BYTES. Prints `where` and both sizes first (the
 *  test's diagnostic when `t` is given, else stdout); nothing is asserted on the raw size. */
export function assertPageBudget(html, where, t) {
  const line = `${where}: ${pageSizes(html)} (budget: under ${PAGE_BUDGET_BYTES} gzip)`;
  if (t?.diagnostic) t.diagnostic(line);
  else console.log(`# ${line}`);
  const gzip = transferBytes(html);
  assert.ok(gzip < PAGE_BUDGET_BYTES, `${where}: under the 60 KB budget, gzip-compressed (${gzip} bytes gzip; ${Buffer.byteLength(html, "utf8")} raw)`);
}
