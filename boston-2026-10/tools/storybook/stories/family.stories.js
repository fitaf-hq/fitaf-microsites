// The Family tab (SPEC-storybook-microsite.md § 3): the page at #family, in a frame.
import { controls, defaults, showPage } from "./frame.js";
import { STATES } from "./states.js";

export default {
  title: "Microsite/Family",
  args: defaults(STATES.family.date),
  argTypes: controls({ plan: false }),
};

export const Family = {
  name: "Family",
  render: (args, context) => showPage({ context, state: STATES.family, args }),
};
