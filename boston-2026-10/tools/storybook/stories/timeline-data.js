// The live store's timings, ONE data object (SPEC-storybook.md § 5, SB-5): SPEC-rung2-progress-and-checkout.md § 13a,
// "the live link on Chrome's 4G network profiles", measured 2026-09-30 07:03–07:05 PDT (the CPU was a Mac's, so a phone
// is slower), and § 13's unthrottled live smoke. Times are seconds from opening the link, exactly as the table has them;
// a new measurement changes this file, and SB-5 reads the table from the contract and compares.
//   screen     A starts: the screen appears (fill B's checks passed; no meal card on the page yet)
//   firstCard  the first meal card exists
//   meals      B: the first and the last of the meals added (fill B's presses, 0.21 s apart)
//   checkout   C: CHECKOUT pressed, and /checkout arriving (done; the screen goes)
//   total      the checkout's Total appears (the page ready)
export const PROFILES = {
  unthrottled: {
    label: "Unthrottled",
    source: "§ 13: the live smoke after ace775b was placed, CHECKOUT to /checkout in 4.1–4.5 s; A and B not measured",
    checkoutRange: [4.1, 4.5],
    // Not measured: the story shows A as 0 s and B as § 13a's 1.3 s, which is the same on every profile.
    assumed: { a: 0, b: 1.3, gap: 0.2 },
  },
  "fast-1280": { label: "Fast 4G · 1280", source: "§ 13a", screen: 2.4, firstCard: 3.5, meals: [3.5, 4.8], checkout: [5.1, 10.2], total: 11.0 },
  "fast-390": { label: "Fast 4G · 390", source: "§ 13a", screen: 1.6, firstCard: 2.8, meals: [2.9, 4.2], checkout: [4.4, 9.5], total: 10.2 },
  "slow-1280": { label: "Slow 4G · 1280", source: "§ 13a", screen: 6.0, firstCard: 11.4, meals: [11.5, 12.7], checkout: [12.9, 21.5], total: 22.2 },
  "slow-390": { label: "Slow 4G · 390", source: "§ 13a", screen: 6.0, firstCard: 11.5, meals: [11.6, 12.9], checkout: [13.1, 20.0], total: 20.8 },
};

const tenth = (x) => Math.round(x * 10) / 10;

/**
 * A profile's three waits, in seconds: a (the screen up, no meal yet), b (the meals), gap (the last meal to CHECKOUT),
 * c (CHECKOUT to /checkout), ready (/checkout to the Total).
 */
export function durations(p) {
  if (!p.meals) {
    const [lo, hi] = p.checkoutRange;
    return { a: p.assumed.a, b: p.assumed.b, gap: p.assumed.gap, c: tenth((lo + hi) / 2), ready: 0 };
  }
  return {
    a: tenth(p.meals[0] - p.screen),
    b: tenth(p.meals[1] - p.meals[0]),
    gap: tenth(p.checkout[0] - p.meals[1]),
    c: tenth(p.checkout[1] - p.checkout[0]),
    ready: tenth(p.total - p.checkout[1]),
  };
}
