// The site's own code the smoke uses, IMPORTED, never re-implemented (SPEC-storefront-watch § 4): the payload and
// link code `npm run handoff:link` uses (payload version 2, and its meal-key function, SPEC-rung2 § 11), the plan
// table, and the storefront build (for a fill-B console file when the live page has no block of ours). See lib/site-deps-hook.mjs for how it resolves with this package's install.
import { register } from "node:module";

register("./site-deps-hook.mjs", import.meta.url);

export async function siteCode() {
  const [link, storefront, build] = await Promise.all([
    import("../../../scripts/handoff-link.mjs"),
    import("../../../scripts/build-storefront.mjs"),
    import("../../../build.mjs"),
  ]);
  const plans = await build.loadJson(build.PLANS_PATH);
  // SPEC-rung2-fill-c § 8: `counts` is the link tool's own argument, mpid -> the plan's ALLOWED TOTALS (countTable: its
  // count, and the meals of each `selection` row through it, 5 on the 4 plan); `planCounts` is mpid -> the plan's own
  // count, the store's "at least N meals" (the meals a run without --link chooses, and the probes' plan).
  const counts = new Map(Object.entries(storefront.countTable(plans)).map(([mpid, totals]) => [Number(mpid), totals]));
  const planCounts = new Map(Object.entries(storefront.planCounts(plans)).map(([mpid, n]) => [Number(mpid), n]));
  return {
    plans,
    counts,
    planCounts,
    payloadFromArgs: link.payloadFromArgs,
    handoffLink: link.handoffLink,
    mealKey: link.mealKey,
    photoHosts: link.PHOTO_HOSTS ?? [],
    buildStorefront: storefront.buildStorefront,
  };
}
