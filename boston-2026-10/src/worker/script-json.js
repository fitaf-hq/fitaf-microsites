// JSON inside <script>: neutralise "<" so no "</script>" can close the element. ONE function for the page's #picks-data:
// the build embeds a week with it (build.mjs re-exports it), and the Worker (site.js) writes the bucket's week into the
// same element with it, so the two are escaped exactly alike (SPEC-week-content § 4.2).
export const scriptJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
