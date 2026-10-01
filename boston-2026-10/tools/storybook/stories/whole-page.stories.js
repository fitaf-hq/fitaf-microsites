// The whole page (SPEC-storybook-microsite.md § 3): the page at the chosen state (the State control: any state of the
// other stories), the frame as tall as the page, so the whole length is seen without an inner scroll.
import { controls, defaults, showPage } from "./frame.js";
import { STATES } from "./states.js";

export default {
  title: "Microsite/Whole page",
  args: { ...defaults("today"), state: "chosen" },
  argTypes: {
    state: {
      name: "State",
      options: Object.keys(STATES),
      control: { type: "select", labels: Object.fromEntries(Object.entries(STATES).map(([key, s]) => [key, s.name])) },
    },
    ...controls({ plan: true }),
  },
};

export const Scroll = {
  name: "Scroll",
  render: (args, context) => showPage({ context, state: STATES[args.state] ?? STATES.chosen, args, whole: true }),
};
