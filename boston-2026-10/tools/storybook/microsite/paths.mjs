// Where the tool finds the site, and where it writes the pages the site's build makes for it (Node only).
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TOOL = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The site (boston-2026-10/). MICROSITE_SITE overrides it, for a mirror of this package (a mutant) built elsewhere. */
export const SITE = resolve(process.env.MICROSITE_SITE ?? join(TOOL, "..", ".."));

/**
 * The build's output for the stories: outside the site's dist/ and dist-dev/ (§ 2 item 1), git-ignored with the
 * package's install, and rewritten whenever Storybook starts or builds. MICROSITE_PAGES_DIR overrides it, so two builds
 * at once (the cases) never share one directory.
 */
export const PAGES_DIR = resolve(process.env.MICROSITE_PAGES_DIR ?? join(TOOL, "node_modules", ".cache", "fitaf-microsite"));

export const siteFile = (...parts) => join(SITE, ...parts);
export const PICKS_DIR = siteFile("data", "picks");
export const SAVE_PATH = siteFile("data", "save.json");
export const PLANS_PATH = siteFile("data", "plans.json");
export const BUILD_SCRIPT = siteFile("build.mjs");
export const ZONED_TIME = siteFile("src", "worker", "zoned-time.js");
