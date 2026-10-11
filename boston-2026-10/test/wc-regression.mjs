// WC-9's shared definitions (SPEC-week-content.md § 5): the one difference the contract allows between the week as the
// production build of 409b805 embedded it and the week as content (§ 1: "every photo-sheet URL in it pointing at
// /week/<file>.jpg"), and the fragments and instant the served page is compared at. Used by the case and by its recorder
// (test/wc-09-record.mjs). Not a test file itself.
import { TABLE } from "./ms-harness.mjs";
import { SHEET_1018 } from "./wc-harness.mjs";

/** The week's sheet as the build addresses it: relative in a tile's style ("assets/…"), from the root in a link's photo
 *  part ("/assets/…"). Both become /week/<file>. */
const BUILD_SHEET_URL = new RegExp(`/?assets/photo-sheets/${SHEET_1018.replace(/[.]/g, "\\.")}`, "g");
export const WEEK_SHEET_URL = `/week/${SHEET_1018}`;

/** `text` with the week's sheet URL as the content carries it; the number of URLs rewritten is `count(text)`. */
export const asWeekUrls = (text) => text.replace(BUILD_SHEET_URL, WEEK_SHEET_URL);
export const sheetUrlCount = (text) => (text.match(BUILD_SHEET_URL) ?? []).length;

/** The served page is compared at: none, the Family tab, today's two fragments, and every answer set at one size,
 *  without and with snacks (the week delivered 2026-10-18 carts them). */
export const REGRESSION_HASHES = ["", "#family", "#lean-7", "#signature-14", ...TABLE.flatMap((r) => [`#lean-${r.key}`, `#lean-${r.key}-s`])];
/** Noon in New York on 2026-10-11, inside the week's window (2026-10-09 to 2026-10-15), as the old page needs. */
export const REGRESSION_NOW = Date.parse("2026-10-11T16:00:00Z");
