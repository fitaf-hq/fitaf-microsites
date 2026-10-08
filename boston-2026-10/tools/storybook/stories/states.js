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
  start: { name: "Start", fragment: () => "", date: "today", waits: "#panel-individual" },
  chosen: { name: "Chosen", fragment: chosen, date: "today", waits: RESULT },
  // SPEC-plan-page-refinement § 4: the list is always open, so *closed* and *open* are one story; the grid is a modal.
  cc: { name: "Chef's Choice", fragment: chosen, date: "week", waits: RESULT, needs: "#cc-list" },
  noPicks: { name: "No picks this week", fragment: chosen, date: "none", waits: RESULT, lacks: "#cc-list" },
  allPlans: { name: "All plans", fragment: chosen, date: "today", waits: RESULT, press: "#all-link", opens: "#all" },
  family: { name: "Family", fragment: () => "#family", date: "today", waits: "#panel-family" },
  // SPEC-meal-selection § 9 item 1: the goal buttons, a size chosen (its facts one block each), Q1 waiting.
  goals: { name: "Goal buttons", fragment: (args) => `#${args.goal}`, date: "today", waits: "#panel-individual", scrollTo: "#q-goal" },
  ...Object.fromEntries(ANSWER_SETS.map(([part, name]) => [part, answerSet(part, name)])),
  // § 9 item 3: snacks chosen (Q4) with the week's snack list (every day), and with none (weekdays: the fixture has no list for 5).
  snacks: answerSet("and-7d-b-s", "and · every day · breakfast · snacks", { needs: "#cc-snack-list", scrollTo: "#cc-snacks" }),
  snacksNoList: answerSet("or-5d-s", "or · weekdays · snacks, no list", { needs: "#cc-snacks-note", lacks: "#cc-snack-list", scrollTo: "#cc-snacks" }),
};

/** Why each state cannot be shown, in the tool's words, for its caption. */
export const WHY = {
  waits: (sel) => `the page's script did not show ${sel}`,
  needs: (sel) => `${sel} is not on this page on this date: this state needs a week with picks (the Date control)`,
  lacks: (sel) => `${sel} is on this page on this date: this state needs a date with no picks (the Date control)`,
  press: (sel) => `${sel} is not on this page to press`,
  opens: (sel) => `pressing did not show ${sel}`,
};
