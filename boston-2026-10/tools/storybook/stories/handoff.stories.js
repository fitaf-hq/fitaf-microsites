// The hand-off's two faces (SPEC-storybook-microsite.md § 8): the progress screen and the three-step checkout, as the
// shipped Footer block draws them over the watch's synthetic store, each story a frame of the viewport's size. A
// story's caption names it by its group and name, as feedback names it.
import store from "virtual:handoff-store";
import { showHandoff } from "./handoff-frame.js";
import { HANDOFF } from "./handoff-states.js";

const story = (key) => ({ render: (args, context) => showHandoff({ context, state: HANDOFF[key], args }) });

export default {
  title: "Microsite/Hand-off",
};

export const ScreenA = { ...story("screenA"), name: "Screen · A" };
/** Screen · B's controls: k, the meal just added, and t, the link's meals (a count the microsite links to). */
export const ScreenB = {
  ...story("screenB"),
  name: "Screen · B",
  args: { k: 2, t: String(store.defaultCount) },
  argTypes: {
    k: { name: "k (the meal just added)", control: { type: "range", min: 1, max: Math.max(...store.counts), step: 1 } },
    t: { name: "t (the link's meals)", options: store.counts.map(String), control: { type: "inline-radio" } },
  },
};
export const ScreenC = { ...story("screenC"), name: "Screen · C" };
export const CheckoutYourMeals = { ...story("checkout1"), name: "Checkout · 1 Your meals" };
export const CheckoutDelivery = { ...story("checkout2"), name: "Checkout · 2 Delivery" };
export const CheckoutPayment = { ...story("checkout3"), name: "Checkout · 3 Payment" };
export const CheckoutOrdinaryVisit = { ...story("ordinary"), name: "Checkout · ordinary visit" };
