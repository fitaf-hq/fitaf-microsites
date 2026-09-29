// The watch's fixed settings (SPEC-storefront-watch.md). The store and the page are data a test may override;
// everything the CLI reads from disk is located from this file.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The only origin any of the watch's own requests may go to (§ 2). */
export const STORE_ORIGIN = "https://fitafnutrition.com";
/** Lean, 7 meals a week: the page every check visits (§ 2, § 4). */
export const MPID = 21;
export const STORE_PAGE = `${STORE_ORIGIN}/order?mpid=${MPID}`;
/** Every line the hand-off logs starts with this. */
export const LOG_PREFIX = "[fitaf-handoff]";
/** The Footer block's first line starts with this (scripts/build-storefront.mjs, versionLine). */
export const VERSION_PREFIX = "/* fitaf-handoff ";

export const TOOL_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
/** boston-2026-10/, the site package this tool sits inside but is not part of. */
export const SITE_DIR = join(TOOL_DIR, "..", "..");
export const BASELINE_PATH = join(SITE_DIR, "storefront", "watch-baseline.json");
export const DEPENDENCIES_PATH = join(SITE_DIR, "storefront", "dependencies.json");

/** § 4: the two widths, each in a fresh profile. */
export const VIEWPORTS = {
  1280: { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  390: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};
export const WIDTHS = [1280, 390];
