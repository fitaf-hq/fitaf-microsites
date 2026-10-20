// Q27 (SPEC-print-pieces.md § 12.1 item 5): the PDF is what is printed. Every page of every PDF carries its sheet as the
// build measured it: each text run in the page's text, each QR code drawn (qb-checks.mjs pdfCarriesProblems, read with
// poppler). Found 2026-10-20: the flyer's two-sided PDF printed its front without its QR code, address and logo while the
// PNG proof and every measured case, which read the screen, showed them. The mutant "the sheet not contained"
// (qb-mutants.test.mjs) brings that back.
import test from "node:test";
import assert from "node:assert/strict";
import { ROOT } from "../build.mjs";
import { NO_CHROME } from "./print-fixtures.mjs";
import { NO_POPPLER, pdfCarriesProblems } from "./qb-checks.mjs";

test("Q27: built, every PDF page carries its sheet's words and QR code", { skip: NO_CHROME || NO_POPPLER }, async () => {
  assert.deepEqual(await pdfCarriesProblems(ROOT, { fourFlyers: true }), []);
});
