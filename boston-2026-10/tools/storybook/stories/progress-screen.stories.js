// The deep-carting progress screen (SPEC-storybook.md § 4), rendered by its OWN module, the one the build inlines into
// the Footer block (rung 2 § 14): imported, never copied. The words and the page's colours come from the build's own
// readers (see .storybook/main.js). The screen is a manual popover over the whole viewport, so the controls are
// Storybook's (its panel), never buttons on the canvas; what a story returns is only a caption, seen once the screen
// has gone.
import { progressScreen } from "../../../src/storefront/progress-screen.js";
import { tokens, words } from "virtual:fitaf-screen-inputs";
import { durations, PROFILES } from "./timeline-data.js";
import { standInCards } from "./stand-ins.js";

/** One screen at a time, and every timer of the story that made it: cleared before the next story, or its next render. */
const live = { timers: [], screen: null };
function cleanup() {
  for (const t of live.timers) clearTimeout(t);
  live.timers = [];
  live.screen?.remove();
  live.screen = null;
  document.getElementById("fitaf-screen")?.remove();
}
const later = (s, fn) => live.timers.push(setTimeout(fn, s * 1000));

/** fill B's press order: every meal's first press before any second (a link names each meal once here). */
const PRESS_MS = 210;

function caption(lines) {
  const el = document.createElement("div");
  el.style.cssText = "font: 14px/1.5 system-ui, sans-serif; padding: 24px; max-width: 60ch";
  for (const line of lines) el.appendChild(Object.assign(document.createElement("p"), { textContent: line }));
  return el;
}

const PROFILE_OPTIONS = Object.keys(PROFILES);
const PHOTO_OPTIONS = ["none", "some", "all"];

export default {
  title: "Deep carting/Progress screen",
  tags: ["autodocs"],
  loaders: [async ({ args }) => ({ cards: await standInCards(args.t ?? args.meals ?? 7, args.photos ?? "some", tokens) })],
  beforeEach: () => cleanup,
  parameters: {
    docs: {
      description: {
        component:
          "The screen fill B shows while it fills the cart on the store's order page (SPEC-rung2-progress-and-checkout " +
          "§ 2), from src/storefront/progress-screen.js, the module the Footer block inlines. Stand-in meal cards with " +
          "generated placeholder photos; the words and the colours are the block's own.",
      },
    },
  },
};

/**
 * The screen through the three waits measured on the live store (rung 2 § 13a): A, the screen up with no meal yet; B,
 * the meals added 0.21 s apart; C, CHECKOUT to the checkout; then the page ready and the screen removed. Remount (or
 * change a control) to replay; `loop` replays on its own.
 */
export const Timeline = {
  args: { profile: "fast-1280", meals: 7, photos: "some", loop: false },
  argTypes: {
    profile: { control: "select", options: PROFILE_OPTIONS, labels: Object.fromEntries(PROFILE_OPTIONS.map((k) => [k, PROFILES[k].label])) },
    meals: { control: { type: "range", min: 1, max: 21, step: 1 } },
    photos: { control: "inline-radio", options: PHOTO_OPTIONS },
    loop: { control: "boolean" },
  },
  render: (args, { loaded }) => {
    cleanup();
    const p = PROFILES[args.profile];
    const d = durations(p);
    const cards = loaded.cards.slice(0, args.meals);
    const play = () => {
      live.screen = progressScreen(document, words, tokens);
      const pressAt = (i) => d.a + (i * PRESS_MS) / 1000;
      cards.forEach(({ name, card }, i) => later(pressAt(i), () => live.screen?.added(name, card, i + 1, cards.length)));
      const checkoutAt = pressAt(cards.length - 1) + d.gap;
      later(checkoutAt, () => live.screen?.last());
      later(checkoutAt + d.c, () => {
        live.screen?.remove();
        live.screen = null;
        if (args.loop) later(1.5, play);
      });
    };
    play();
    return caption([
      `${p.label}: A ${d.a} s, B ${d.b} s for 7 meals (here ${cards.length}, ${PRESS_MS} ms apart), C ${d.c} s; then the page ready ${d.ready} s later.`,
      `Source: ${p.source}.`,
      "The screen has gone: remount the story, or set loop, to play it again.",
    ]);
  },
};

/** The screen held at one moment, for review: A (made, no meal yet), B at meal k of t, or C (after CHECKOUT). */
export const Stage = {
  args: { stage: "B", k: 3, t: 7, photos: "some" },
  argTypes: {
    stage: { control: "inline-radio", options: ["A", "B", "C"] },
    k: { control: { type: "range", min: 1, max: 21, step: 1 } },
    t: { control: { type: "range", min: 1, max: 21, step: 1 } },
    photos: { control: "inline-radio", options: PHOTO_OPTIONS },
  },
  render: (args, { loaded }) => {
    cleanup();
    const cards = loaded.cards.slice(0, args.t);
    const k = args.stage === "A" ? 0 : args.stage === "C" ? cards.length : Math.min(args.k, cards.length);
    live.screen = progressScreen(document, words, tokens);
    cards.slice(0, k).forEach(({ name, card }, i) => live.screen.added(name, card, i + 1, cards.length));
    if (args.stage === "C") live.screen.last();
    return caption([`Stage ${args.stage}: ${k} of ${cards.length} meals added${args.stage === "C" ? ", then CHECKOUT" : ""}.`]);
  },
};

/**
 * With prefers-reduced-motion nothing inside the screen slides or cycles: the newest meal is shown (rung 2 § 2). A story
 * cannot set that media feature, so this is a note, not a control.
 */
export const ReducedMotion = {
  name: "Reduced motion",
  render: () =>
    caption([
      "To see the screen as a visitor who asks for reduced motion sees it: open the browser's developer tools, then " +
        "Rendering, then Emulate CSS media feature prefers-reduced-motion, and choose reduce.",
      "Then open Timeline or Stage: the slides no longer slide in, the carousel no longer cycles once every meal is " +
        "added, and the bar no longer eases; the screen's own 90 s clock, which moves nothing, runs on.",
    ]),
};
