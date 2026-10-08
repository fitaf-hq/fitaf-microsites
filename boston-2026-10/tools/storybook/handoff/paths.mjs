// Where the Hand-off stories find the site's block and the watch's fixture, and where the store's files are written
// (Node only). Everything is read from the site (microsite/paths.mjs's SITE, which a mirror moves with MICROSITE_SITE).
import { join, resolve } from "node:path";
import { siteFile, TOOL } from "../microsite/paths.mjs";

/**
 * The store's files for the stories: git-ignored with the package's install, rewritten whenever Storybook starts or
 * builds. STOREFRONT_PAGES_DIR overrides it, so two builds at once (the cases) never share one directory.
 */
export const STORE_DIR = resolve(process.env.STOREFRONT_PAGES_DIR ?? join(TOOL, "node_modules", ".cache", "fitaf-storefront"));

/** The watch's synthetic store (SPEC-storybook-microsite § 8.1 item 2): imported by path, never copied. */
export const FIXTURE = siteFile("tools", "storefront-watch", "test", "browser-store.mjs");
/** The block's build (§ 8.1 item 1), the link tool (item 3), the plan table, and the page's tokens (item 4). */
export const BUILD_STOREFRONT = siteFile("scripts", "build-storefront.mjs");
export const HANDOFF_LINK = siteFile("scripts", "handoff-link.mjs");
export const SITE_BUILD = siteFile("build.mjs");
export const FLOW_THEME = siteFile("scripts", "flow-theme.mjs");
