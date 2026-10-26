// The page's states of SPEC-storybook-microsite.md § 3, as a story reaches them: the fragment it opens the page at (the
// page's own way of reopening a choice, SPEC.md § 1 item 7), what it waits for (the page's own script having rendered),
// what must or must not be shown, and the page's own control it presses, as a visitor would. The selectors are the
// page's element ids; no markup, style or word of the page is here.

/** The fragment of the Goal and Meals controls: the result card. */
const chosen = (args) => `#${args.goal}-${args.meals}`;
const RESULT = "#result";

/** SPEC-meal-selection § 6 and § 9: an answer set's fragment (§ 3) at the Goal control's size. */
const answers = (part) => (args) => `#${args.goal}-${part}`;

/** SPEC-meal-selection § 9's stories, in the Meal selection group: the eight answer sets with *No snacks* (the answer
 *  part of the fragment, § 3, named as the contract's table words it), and snacks chosen (Q4) with a snack list and without. */
export const ANSWER_SETS = [
  ["or-7d", "or · every day"],
  ["or-5d", "or · weekdays"],
  ["and-7d", "and · every day"],
  ["and-5d", "and · weekdays"],
  ["or-7d-b", "or · every day · breakfast"],
  ["or-5d-b", "or · weekdays · breakfast"],
  ["and-7d-b", "and · every day · breakfast"],
  ["and-5d-b", "and · weekdays · breakfast"],
];
const answerSet = (part, name, more = {}) => ({
  name,
  fragment: answers(part),
  date: "fixture",
  waits: RESULT,
  needs: "#cc-list",
  scrollTo: "#q-lunch_dinner",
  answers: part,
  ...more,
});

export const STATES = {
  // The site's SPEC-ui-and-copy-pass § 4.2 item 1 (2026-10-26): the start is the first question alone, no panel drawn.
  start: { name: "Start", fragment: () => "", date: "today", waits: "#who" },
  // The site's SPEC-ui-and-copy-pass § 4 A (2026-10-26, the questions revealed one by one): Just me (since its § 4.2,
  // #individual, its panel's first step shown), then the first meal question's first answer pressed, as a visitor presses
  // it: the next question drawn, with no answer pressed.
  oneAnswered: { name: "One answered", fragment: () => "#individual", date: "today", waits: "#panel-individual", press: '#panel-individual [data-q="lunch_dinner"]', opens: "#q-weekends" },
  // § 4 B: the result card's Not ready? pressed (a week with the answers' cart: the card's checkout, so Not ready?): the
  // save step in its dialog.
  notReady: { name: "Not ready?", fragment: chosen, date: "today", waits: RESULT, needs: "#not-ready", press: "#not-ready", opens: "#save-dialog[open]" },
  chosen: { name: "Chosen", fragment: chosen, date: "today", waits: RESULT },
  // SPEC-plan-page-refinement § 4: the list is always open, so *closed* and *open* are one story; the grid is a modal.
  cc: { name: "Chef's Choice", fragment: chosen, date: "week", waits: RESULT, needs: "#cc-list" },
  noPicks: { name: "No picks this week", fragment: chosen, date: "none", waits: RESULT, lacks: "#cc-list" },
  allPlans: { name: "All plans", fragment: chosen, date: "today", waits: RESULT, press: "#all-link", opens: "#all" },
  family: { name: "Family", fragment: () => "#family", date: "today", waits: "#panel-family" },
  // The site's SPEC-ui-and-copy-pass § 2.2 (Family's own question, 2026-10-25): Family's *and* answered, on the fixture
  // week (its and-5d cart holds ten): the result card with Family's ten meals, scrolled to Family's question.
  familyAnd: { name: "and · 10 meals", fragment: () => "#family-and", date: "fixture", waits: RESULT, needs: "#cc-list", scrollTo: "#family-question" },
  // SPEC-meal-selection § 9 item 1: the goal buttons, a size chosen (its facts one block each), Q1 waiting.
  goals: { name: "Goal buttons", fragment: (args) => `#${args.goal}`, date: "today", waits: "#panel-individual", scrollTo: "#q-goal" },
  ...Object.fromEntries(ANSWER_SETS.map(([part, name]) => [part, answerSet(part, name)])),
  // § 9 item 3: snacks chosen (Q4) with the week's snack list (every day), and with none (weekdays: the fixture has no list for 5).
  // `whileCarted` is the state while data/plans.json's `snacks.carted` is true (the pages' manifest): SPEC-snacks-in-the-cart
  // § 3a items 9 and 11, the page hides Q4 for days the week has no list for, and the not-carted line is not on the page,
  // so the story without a list shows Q4 hidden, at the questions. Not carted, it shows the not-carted line alone.
  snacks: answerSet("and-7d-b-s", "and · every day · breakfast · snacks", { needs: "#cc-snack-list", scrollTo: "#cc-snacks" }),
  snacksNoList: answerSet("or-5d-s", "or · weekdays · snacks, no list", {
    needs: "#cc-snacks-note",
    lacks: "#cc-snack-list",
    scrollTo: "#cc-snacks",
    whileCarted: { needs: "#cc-list", lacks: "#q-snacks", scrollTo: "#q-lunch_dinner" },
  }),
  // SPEC-every-menu-and-nutrition §§ 2–3, on the two-menu fixture week (invented names), at or · every day, where both
  // menus have a cart: the chooser with Chef's Choice selected; the other menu chosen (the group's last radio pressed,
  // as a visitor presses its name); and a meal's nutrition opened (the list's first meal button pressed).
  menus: { name: "Two menus", fragment: answers("or-7d"), date: "menus", waits: RESULT, needs: "#cc-menus", scrollTo: "#cc-list" },
  menusOther: {
    name: "Two menus · the other chosen",
    fragment: answers("or-7d"),
    date: "menus",
    waits: RESULT,
    needs: "#cc-menus",
    // The site's SPEC-ui-and-copy-pass § 5 item 1: the own chip is now the last chip, so the other menu is the one
    // before it.
    press: "#cc-menus label:nth-last-child(2) input",
    opens: "#cc-menus label:nth-last-child(2) input:checked",
  },
  // The site's SPEC-ui-and-copy-pass § 5 item 3 (BRIDGE, one day): the own chip pressed, the last chip, on the
  // two-menu fixture week: the week's full list under its note, the checkout to the store's plan page.
  ownChosen: {
    name: "The own chip pressed",
    fragment: answers("or-7d"),
    date: "menus",
    waits: RESULT,
    needs: "#cc-menus",
    press: "#cc-menus label:last-child input",
    opens: "#cc-own-note",
  },
  nutrition: {
    name: "Nutrition · a meal opened",
    fragment: answers("or-7d"),
    date: "menus",
    waits: RESULT,
    needs: "#cc-meals button",
    press: "#cc-meals button",
    opens: '#cc-meals button[aria-expanded="true"]',
  },
};

/** Why each state cannot be shown, in the tool's words, for its caption. */
export const WHY = {
  waits: (sel) => `the page's script did not show ${sel}`,
  needs: (sel) => `${sel} is not on this page on this date: this state needs a week with picks (the Date control)`,
  lacks: (sel) => `${sel} is on this page on this date: this state needs a date with no picks (the Date control)`,
  press: (sel) => `${sel} is not on this page to press`,
  opens: (sel) => `pressing did not show ${sel}`,
};
