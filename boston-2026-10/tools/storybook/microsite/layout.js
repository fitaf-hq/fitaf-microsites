// What the stories and the page build share (SPEC-storybook-microsite.md §§ 2–3): the two builds, the three dates, the
// two widths, and where each page is served. Plain ESM with no Node or browser API, so the stories (in the browser) and
// microsite/pages.mjs (in Node) read the same names. No word of the page is here: only the tool's own.

/** The Build control (§ 3): the deploy's two builds, each as `node build.mjs` runs it (`env` is its --env, or none). */
export const BUILDS = [
  { id: "production", label: "production (eatfitaf.com)", env: null },
  { id: "development", label: "development (the test address)", env: "dev" },
];

/** The Date control (§ 2 item 4). `today` is the real clock and adds no script; the other two fix the frame's clock. */
export const DATES = [
  { id: "today", label: "today (the real clock)" },
  { id: "week", label: "a week with picks" },
  { id: "none", label: "no picks" },
];

/** The two widths (§ 3), the storefront smoke's: 390 the default. */
export const VIEWPORTS = {
  w390: { name: "390 × 844 (phone)", width: 390, height: 844, type: "mobile" },
  w1280: { name: "1280 × 900 (laptop)", width: 1280, height: 900, type: "desktop" },
};
export const DEFAULT_VIEWPORT = "w390";

/** Where Storybook serves the built pages, and the root-relative directories the development page asks for. */
export const PAGES_ROUTE = "microsite";
export const ROOT_STATIC = ["fonts", "assets"];

/** Where one build's page for one date is written, under the pages' directory; and the URL a story's frame loads it at,
 *  relative to Storybook's own iframe. */
export const pagePath = (build, date) => `${build}/${date}/index.html`;
export const pageUrl = (build, date) => `${PAGES_ROUTE}/${pagePath(build, date)}`;

/** The file every story reads its dates and choices from, written beside the pages. */
export const MANIFEST = "pages.json";
