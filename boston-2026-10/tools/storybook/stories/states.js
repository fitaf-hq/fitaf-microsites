// The page's states of SPEC-storybook-microsite.md § 3, as a story reaches them: the fragment it opens the page at (the
// page's own way of reopening a choice, SPEC.md § 1 item 7), what it waits for (the page's own script having rendered),
// what must or must not be shown, and the page's own control it presses, as a visitor would. The selectors are the
// page's element ids; no markup, style or word of the page is here.

/** The fragment of the Goal and Meals controls: the result card. */
const chosen = (args) => `#${args.goal}-${args.meals}`;
const RESULT = "#result";

export const STATES = {
  start: { name: "Start", fragment: () => "", date: "today", waits: "#panel-individual" },
  chosen: { name: "Chosen", fragment: chosen, date: "today", waits: RESULT },
  ccClosed: { name: "Chef's Choice · closed", fragment: chosen, date: "week", waits: RESULT, needs: "#cc-toggle" },
  ccOpen: { name: "Chef's Choice · open", fragment: chosen, date: "week", waits: RESULT, needs: "#cc-toggle", press: "#cc-toggle", opens: "#cc-list" },
  noPicks: { name: "No picks this week", fragment: chosen, date: "none", waits: RESULT, lacks: "#cc-toggle" },
  allPlans: { name: "All plans", fragment: chosen, date: "today", waits: RESULT, press: "#all-toggle", opens: "#all" },
  family: { name: "Family", fragment: () => "#family", date: "today", waits: "#panel-family" },
};

/** Why each state cannot be shown, in the tool's words, for its caption. */
export const WHY = {
  waits: (sel) => `the page's script did not show ${sel}`,
  needs: (sel) => `${sel} is not on this page on this date: this state needs a week with picks (the Date control)`,
  lacks: (sel) => `${sel} is on this page on this date: this state needs a date with no picks (the Date control)`,
  press: (sel) => `${sel} is not on this page to press`,
  opens: (sel) => `pressing did not show ${sel}`,
};
