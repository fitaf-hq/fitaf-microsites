// Which meals the plan covers (SPEC-meal-selection.md § 2): data/plans.json's `selection` (one row per answer set of the
// first three questions), `selection_defaults` and `snacks`, checked; and an answer set's key, the fragment's answer part
// (§ 3, § 8 item 3), which keys the page's data, the picks file's carts and the Chef's Choice card.
//
//   <or|and>-<7d|5d>[-b]      the answer set (Q1, Q2, Q3): a row of `selection`, a cart of the picks file
//   …[-s]                     and snacks (Q4), in the fragment and on the result card, never in a cart's key
//
// Plain ESM with no import of build.mjs, so build.mjs and scripts/chefs-choice.mjs both import it without a cycle.

/** Q1's two answers, in the page's order. */
export const LUNCH_DINNER = ["or", "and"];
/** Meals a day for Q1's answer, and the one breakfast adds (§ 2's table; § 8 item 7). */
export const MEALS_A_DAY = { or: 1, and: 2 };
export const BREAKFAST_MEALS_A_DAY = 1;
/** Days a week for Q2's answer: every day (weekends included), or weekdays. Snacks are one a day (§ 2: 7 or 5). */
export const DAYS_EVERY_DAY = 7;
export const DAYS_WEEKDAYS = 5;
export const daysOf = (weekends) => (weekends ? DAYS_EVERY_DAY : DAYS_WEEKDAYS);
/** Q2 in the fragment (§ 3): `7d` or `5d`. */
export const dayToken = (weekends) => `${daysOf(weekends)}d`;
/** Q3 and Q4 in the fragment (§ 3). */
export const BREAKFAST_MARK = "-b";
export const SNACKS_MARK = "-s";

/** The answer set's key: `or-7d`, `and-5d-b`. The fragment's answer part without its snacks mark. */
export const answerKey = ({ lunch_dinner, weekends, breakfast }) =>
  `${lunch_dinner}-${dayToken(weekends)}${breakfast ? BREAKFAST_MARK : ""}`;

/** The answer set as the contract's table words it, for a refusal: "or, weekdays, no breakfast". */
export const answerWords = ({ lunch_dinner, weekends, breakfast }) =>
  `${lunch_dinner}, ${weekends ? "every day" : "weekdays"}, ${breakfast ? "breakfast" : "no breakfast"}`;

/** Every answer set the three questions make, in the contract's table order (§ 2). */
export const ANSWER_SETS = [false, true].flatMap((breakfast) =>
  LUNCH_DINNER.flatMap((lunch_dinner) => [true, false].map((weekends) => ({ lunch_dinner, weekends, breakfast }))),
);

/** What the answers come to: meals a day × days (§ 2's `meals`). */
export const mealsOf = ({ lunch_dinner, weekends, breakfast }) =>
  (MEALS_A_DAY[lunch_dinner] + (breakfast ? BREAKFAST_MEALS_A_DAY : 0)) * daysOf(weekends);

const ROW_FIELDS = ["lunch_dinner", "weekends", "breakfast", "meals", "plan"];
const DEFAULT_FIELDS = ["weekends", "breakfast", "snacks"];
const SNACK_FIELDS = ["shown", "carted"];
const WHERE = "data/plans.json";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const fail = (what) => {
  throw new Error(`${WHERE}: ${what}`);
};

/** Exactly `fields`, each present: an unknown field or a missing one refuses. */
function exactly(value, fields, where) {
  if (!isObject(value)) fail(`${where} must be an object`);
  for (const key of Object.keys(value)) if (!fields.includes(key)) fail(`${where}: unknown field ${JSON.stringify(key)}`);
  for (const key of fields) if (!(key in value)) fail(`${where}: missing field ${JSON.stringify(key)}`);
}

/** The counts every individual plan sells: a cart can go through only a plan the store has at every size. */
export function soldCounts(plans) {
  const each = plans.individual.map((p) => new Set(p.counts.map((c) => c.meals_per_week)));
  return [...each[0]].filter((n) => each.every((set) => set.has(n))).sort((a, b) => a - b);
}

/** One row of `selection`, checked (§ 2): its answers, its meals, and its plan sold at every size, at or below its meals. */
function checkRow(row, i, sold) {
  const at = `selection[${i}]`;
  exactly(row, ROW_FIELDS, at);
  if (!LUNCH_DINNER.includes(row.lunch_dinner)) fail(`${at}: lunch_dinner must be "or" or "and", got ${JSON.stringify(row.lunch_dinner)}`);
  for (const key of ["weekends", "breakfast"]) {
    if (typeof row[key] !== "boolean") fail(`${at}: ${key} must be true or false, got ${JSON.stringify(row[key])}`);
  }
  const where = `${at} (${answerWords(row)})`;
  if (row.meals !== mealsOf(row)) fail(`${where}: meals ${JSON.stringify(row.meals)} is not what the answers come to (${mealsOf(row)})`);
  if (!Number.isInteger(row.plan) || !sold.includes(row.plan)) {
    fail(`${where}: plan ${JSON.stringify(row.plan)} is not a count every individual plan sells (${sold.join(", ")})`);
  }
  if (row.plan > row.meals) fail(`${where}: plan ${row.plan} is above its meals (${row.meals}); a plan rounds down, never up`);
  return row;
}

/**
 * data/plans.json's meal selection, checked (§ 2, § 4, § 9 item 3); a broken one throws, naming the file. Returns
 * { rows: Map(answerKey -> row), defaults, snacks }. Every answer set has exactly one row.
 */
export function checkSelection(plans) {
  if (!Array.isArray(plans.selection)) fail("selection must be a list of rows, one per answer set");
  const sold = soldCounts(plans);
  const rows = new Map();
  plans.selection.forEach((row, i) => {
    checkRow(row, i, sold);
    const key = answerKey(row);
    if (rows.has(key)) fail(`selection: two rows for ${key} (${answerWords(row)})`);
    rows.set(key, row);
  });
  for (const set of ANSWER_SETS) {
    if (!rows.has(answerKey(set))) fail(`selection: no row for ${answerKey(set)} (${answerWords(set)})`);
  }
  exactly(plans.selection_defaults, DEFAULT_FIELDS, "selection_defaults");
  for (const key of DEFAULT_FIELDS) {
    if (typeof plans.selection_defaults[key] !== "boolean") fail(`selection_defaults.${key} must be true or false`);
  }
  exactly(plans.snacks, SNACK_FIELDS, "snacks");
  for (const key of SNACK_FIELDS) if (typeof plans.snacks[key] !== "boolean") fail(`snacks.${key} must be true or false`);
  // SPEC-snacks-in-the-cart § 4.1: `carted` is allowed now that a link carries snacks (§ 2) and the block presses them
  // (§ 3); this build's own refusal of it (SPEC-meal-selection § 10 item 1, MS-6) is gone. Carting what the page does not
  // offer is refused: with Q4 hidden, nothing could reach a link.
  if (plans.snacks.carted && !plans.snacks.shown) fail("snacks.carted is true while snacks are not shown");
  if (plans.selection_defaults.snacks && !plans.snacks.shown) fail("selection_defaults.snacks is true while snacks are not shown");
  return { rows, defaults: plans.selection_defaults, snacks: plans.snacks };
}

/**
 * The answer set today's fragment `#<size>-<n>` and a version-1 picks menu `n` stand for (§ 3, § 5): every day, no
 * breakfast, whichever Q1 makes `n` meals (7: or; 14: and). null when no such row.
 */
export function legacyKey(rows, n) {
  for (const [key, row] of rows) if (row.weekends && !row.breakfast && row.meals === n) return key;
  return null;
}
