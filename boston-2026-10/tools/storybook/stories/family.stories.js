// The Family tab (SPEC-storybook-microsite.md § 3), since the site's SPEC-ui-and-copy-pass § 2 the first question's Family
// answer: the page at #family, in a frame.
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

// The site's SPEC-ui-and-copy-pass § 2.2: Family's one question answered (*and*: ten family meals a week), its result card
// and Chef's Choice, on the fixture week.
export const FamilyAnd = {
  name: "and · 10 meals",
  args: { date: STATES.familyAnd.date },
  render: (args, context) => showPage({ context, state: STATES.familyAnd, args }),
};
