// The Hand-off stories' states (SPEC-storybook-microsite.md § 8.3), as a story reaches them: the store it opens (one
// set of the watch fixture's own options, handoff/store.mjs), at which of the store's paths and with which link, what it
// waits for, and the block's own control it presses. The selectors are the block's element ids and the store's class
// names, as the block itself reads them; no rule or word of the block is here (SM-4), and what each state shows is said
// in the tool's own words.
import { screenBStore, STORE } from "../handoff/layout.js";

export const SCREEN = "#fitaf-screen";
export const SLIDES = "#fitaf-screen .c > *";
export const BAR = "#fitaf-screen .b i";
export const STEP_BAR = "#fitaf-bar";
export const CONTINUE = "#fitaf-go";
export const CARDS = "app-product-card";
export const LINES = "app-checkout .summary__item";
/** The block's step: a class on <html> (SPEC-rung2-progress-and-checkout § 25.1). */
export const stepClass = (n) => `fitaf-step-${n}`;

/** The bar's width, in %, after meal k of t: the block's presses of the plan's t + 1, the last being its CHECKOUT. */
export const barPercent = (k, t) => (k / (t + 1)) * 100;

/**
 * Step 2's required fields of the synthetic checkout, each with an invented entry, typed as a customer types them: the
 * block refuses Continue from step 2 while one is invalid (the store's own `ng-invalid`, § 25.3).
 */
export const ENTRIES = [
  ["email", "visitor@example.com"],
  ["phone", "6175550100"],
  ["firstName", "Test"],
  ["lastName", "Visitor"],
  ["address", "1 Main St"],
];

const HELD_90_S = "The screen still goes 90 s after it came up, by its own clock: reload the story to see it again.";
const SCREEN_PHOTOS = "A slide shows its card's image, here a generated tile (a page colour, the meal's initial): a link's photo sheet comes only from the block's two hosts, which no story reaches.";
const CHECKOUT_PHOTOS = "The order lines' images are the store's own, here generated tiles (a page colour, the meal's initial).";
/** § 8.2's limit, in one plain sentence, on every checkout story. */
export const CHECKOUT_LIMIT =
  "This checkout is the watch's synthetic stand-in, with the store's names but not its look: the store's own fonts, colours and spacing are only on the live store, so a tweak to how the store's own parts look is still checked there.";

const checkout = (step, what, held) => ({ kind: "checkout", step, store: () => STORE.checkout, link: true, what: () => what, held: () => held, limit: CHECKOUT_LIMIT, notes: [CHECKOUT_PHOTOS] });

export const HANDOFF = {
  screenA: {
    kind: "screen-a",
    store: () => STORE.screenA,
    link: true,
    what: () => "The progress screen as it comes up, before the block's first press: no meal on it yet.",
    held: () => `Held by the synthetic store's planted hang at its start (hangAtStart): the block's first poll is its last. ${HELD_90_S}`,
    notes: [SCREEN_PHOTOS],
  },
  screenB: {
    kind: "screen-b",
    store: ({ k, t }) => screenBStore(k, t),
    link: true,
    what: ({ k, t }) => `The progress screen once meal ${k} of ${t} is added (the link's ${t} of the fixture's own meals, in the order the block presses them).`,
    held: ({ k }) => `Held by the synthetic store's planted hang (hangAfter ${k}): the block's next poll never comes. ${HELD_90_S}`,
    notes: [SCREEN_PHOTOS],
  },
  screenC: {
    kind: "screen-c",
    store: () => STORE.screenC,
    link: true,
    what: () => "Every meal added and the store's CHECKOUT pressed; the store has not yet gone to /checkout.",
    held: () =>
      "Held by the synthetic store (routeHeld) until you press Release, which lets it route and the block finish on the checkout. Unreleased, the block stops after its own 30 s wait for /checkout, as on a store that never gets there, and the screen goes; a release after that shows the store's whole checkout.",
    notes: [SCREEN_PHOTOS],
  },
  checkout1: checkout(1, "The deep-carted checkout at step 1, after the whole hand-off, nothing pressed.", "Reached by the hand-off on the synthetic store, as a visitor's link runs it."),
  checkout2: checkout(2, "The deep-carted checkout at step 2.", "The block's own Continue pressed once."),
  checkout3: checkout(
    3,
    "The deep-carted checkout at step 3.",
    "The block's own Continue pressed twice; before the second, step 2's required fields given invented entries, as a customer types them (the block refuses Continue while one is empty, as on the live store). Nothing presses the pay button.",
  ),
  ordinary: {
    kind: "ordinary",
    store: () => STORE.ordinary,
    link: false,
    what: () => "The checkout reached without the hand-off: /checkout opened with no link, the store's own checkout, whole.",
    held: () => "The synthetic store places no Footer block on a /checkout it opens itself; with no link the block does nothing in any case (its first line).",
    limit: CHECKOUT_LIMIT,
    notes: [CHECKOUT_PHOTOS],
  },
};

/** Why a state cannot be shown, in the tool's words, for its caption. */
export const WHY = {
  k: (k, t) => `k is ${k}, above t (${t}): choose k from 1 to t`,
  screen: () => `the block's screen (${SCREEN}) did not come up`,
  cards: () => `the store's meal cards (${CARDS}) were not drawn`,
  pressed: (n) => `the block added ${n} meal(s): the hold before the first press did not hold`,
  bar: (k, t, w) => `the screen's bar is at ${w}, not meal ${k} of ${t}`,
  movedOn: (k) => `the block went on past meal ${k}: the hold did not hold`,
  held: () => "the store's CHECKOUT was not pressed, or the store did not hold its route (window.__fixtureRoute)",
  step: (n) => `the checkout did not show step ${n} (html.${stepClass(n)})`,
  noContinue: (n) => `the block's Continue (${CONTINUE}) is not on the checkout at step ${n}`,
  field: (name) => `the synthetic checkout has no field named ${name} to type into`,
  lines: () => `the store's order lines (${LINES}) were not drawn`,
  stepBar: () => `the block's step bar (${STEP_BAR}) is on a checkout reached without the hand-off`,
};
