// Every picked menu, and each meal's nutrition (the site's SPEC-every-menu-and-nutrition.md §§ 2–3): the chooser with
// Chef's Choice selected, the other menu chosen, and a meal's ingredients opened, each the page the site's build writes
// with the two-menu fixture week (invented names) in its #picks-data, in a frame, at 390 and 1280 (the viewport), named so
// a comment can say which. The Date control moves them to another week (where, with one list, there is no chooser).
import { controls, defaults, showPage } from "./frame.js";
import { STATES } from "./states.js";

// Each story's name is written where it is exported: Storybook's index reads a story's name from its source.
const story = (key) => ({
  args: { date: STATES[key].date },
  argTypes: controls({ plan: true, meals: false }),
  render: (args, context) => showPage({ context, state: STATES[key], args }),
});

export default {
  title: "Microsite/Every menu",
  args: defaults("menus"),
};

export const TwoMenus = { ...story("menus"), name: "Two menus" };
export const TwoMenusOtherChosen = { ...story("menusOther"), name: "Two menus · the other chosen" };
export const NutritionOpened = { ...story("nutrition"), name: "Nutrition · a meal opened" };
// The site's SPEC-ui-and-copy-pass § 5 item 3 (BRIDGE, one day): the own chip pressed.
export const OwnChosen = { ...story("ownChosen"), name: "The own chip pressed" };
