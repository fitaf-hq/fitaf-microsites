// What the stories and the page build share (SPEC-storybook-microsite.md §§ 2–3): the two builds, the three dates, the
// two widths, and where each page is served. Plain ESM with no Node or browser API, so the stories (in the browser) and
// microsite/pages.mjs (in Node) read the same names. No word of the page is here: only the tool's own.

/** The Build control (§ 3): the deploy's two builds, each as `node build.mjs` runs it (`env` is its --env, or none). */
export const BUILDS = [
  { id: "production", label: "production (eatfitaf.com)", env: null },
  { id: "development", label: "development (the test address)", env: "dev" },
];

/** The Date control (§ 2 item 4). `today` is the real clock and adds no script; the others fix the frame's clock.
 *  SPEC-meal-selection § 9: `fixture` is the site's fixture week of invented names in the picks file's version 2 (a cart
 *  per answer set, and snacks), built from test/fixtures/picks-v2/ (the build's --picks) and seen inside its window.
 *  SPEC-every-menu-and-nutrition: `menus` is the site's fixture week of two menus (Chef's Choice and an invented list)
 *  with each meal's nutrition, test/fixtures/picks-menus/, made with the fixture's own words. */
export const DATES = [
  { id: "today", label: "today (the real clock)" },
  { id: "week", label: "a week with picks" },
  { id: "none", label: "no picks" },
  { id: "fixture", label: "the fixture week (invented names, version 2)" },
  { id: "menus", label: "the fixture week of two menus, with nutrition (invented names)" },
];
/** Where the fixture week's picks directory is, from the site (the content command's --picks, resolved in the site). */
export const FIXTURE_PICKS = "test/fixtures/picks-v2";
/** SPEC-every-menu-and-nutrition: the two-menu fixture week's picks directory, and the site's module of its own words
 *  (an invented list's name, the heading with {menu}), laid over data/messages.json for the content's --messages. */
export const FIXTURE_MENUS = "test/fixtures/picks-menus";
export const FIXTURE_MENUS_WORDS = "test/fixtures/menus-words.mjs";

/** The two widths (§ 3), the storefront smoke's: 390 the default. */
export const VIEWPORTS = {
  w390: { name: "390 × 844 (phone)", width: 390, height: 844, type: "mobile" },
  w1280: { name: "1280 × 900 (laptop)", width: 1280, height: 900, type: "desktop" },
};
export const DEFAULT_VIEWPORT = "w390";

/** Where Storybook serves the built pages, and the root-relative directories the development page asks for. */
export const PAGES_ROUTE = "microsite";
export const ROOT_STATIC = ["fonts", "assets", "why"];

/** Where one build's page for one date is written, under the pages' directory; and the URL a story's frame loads it at,
 *  relative to Storybook's own iframe. */
export const pagePath = (build, date) => `${build}/${date}/index.html`;
export const pageUrl = (build, date) => `${PAGES_ROUTE}/${pagePath(build, date)}`;

/** The file every story reads its dates and choices from, written beside the pages. */
export const MANIFEST = "pages.json";
