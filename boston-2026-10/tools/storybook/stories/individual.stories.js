// The Individual tab's states (SPEC-storybook-microsite.md § 3): each the page the site's build writes, in a frame. A
// story's caption names it by its group and name, as feedback names it.
import { controls, defaults, showPage } from "./frame.js";
import { STATES } from "./states.js";

const story = (key, { plan = true } = {}) => ({
  args: { date: STATES[key].date },
  argTypes: controls({ plan }),
  render: (args, context) => showPage({ context, state: STATES[key], args }),
});

export default {
  title: "Microsite/Individual",
  args: defaults("today"),
};

export const Start = { ...story("start", { plan: false }), name: "Start" };
export const Chosen = { ...story("chosen"), name: "Chosen" };
export const ChefsChoiceClosed = { ...story("ccClosed"), name: "Chef's Choice · closed" };
export const ChefsChoiceOpen = { ...story("ccOpen"), name: "Chef's Choice · open" };
export const NoPicksThisWeek = { ...story("noPicks"), name: "No picks this week" };
export const AllPlans = { ...story("allPlans"), name: "All plans" };
