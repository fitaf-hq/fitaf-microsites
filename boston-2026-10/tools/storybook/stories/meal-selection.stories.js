// The meal selection (SPEC-meal-selection.md § 6 last line, § 9): the goal buttons, the eight answer sets with Q4 answered
// *No snacks*, and snacks chosen (Q4) with the week's snack list and without one, each the page the site's build writes, in a
// frame, at 390 and 1280 (the viewport), named so a comment can say which. The answer sets and the snacks are on the
// fixture week's date (invented names, the picks file's version 2: a cart for every answer set, snacks for every day
// only), so each shows its own cart; the Date control moves them to a real week (where most answer sets fall back).
// While snacks are carted (data/plans.json), *snacks, no list* shows Q4 hidden (stories/states.js, `whileCarted`).
import { controls, defaults, showPage } from "./frame.js";
import { ANSWER_SETS, STATES } from "./states.js";

// Each story's name is written where it is exported: Storybook's index reads a story's name from its source, not by
// running it (individual.stories.js does the same). The states' names (stories/states.js) are the same words.
const story = (key) => ({
  args: { date: STATES[key].date },
  argTypes: controls({ plan: true, meals: false }),
  render: (args, context) => showPage({ context, state: STATES[key], args }),
});

export default {
  title: "Microsite/Meal selection",
  args: defaults("fixture"),
};

export const GoalButtons = { ...story("goals"), name: "Goal buttons" };
export const OrEveryDay = { ...story(ANSWER_SETS[0][0]), name: "or · every day" };
export const OrWeekdays = { ...story(ANSWER_SETS[1][0]), name: "or · weekdays" };
export const AndEveryDay = { ...story(ANSWER_SETS[2][0]), name: "and · every day" };
export const AndWeekdays = { ...story(ANSWER_SETS[3][0]), name: "and · weekdays" };
export const OrEveryDayBreakfast = { ...story(ANSWER_SETS[4][0]), name: "or · every day · breakfast" };
export const OrWeekdaysBreakfast = { ...story(ANSWER_SETS[5][0]), name: "or · weekdays · breakfast" };
export const AndEveryDayBreakfast = { ...story(ANSWER_SETS[6][0]), name: "and · every day · breakfast" };
export const AndWeekdaysBreakfast = { ...story(ANSWER_SETS[7][0]), name: "and · weekdays · breakfast" };
export const AndEveryDayBreakfastSnacks = { ...story("snacks"), name: "and · every day · breakfast · snacks" };
export const OrWeekdaysSnacksNoList = { ...story("snacksNoList"), name: "or · weekdays · snacks, no list" };
