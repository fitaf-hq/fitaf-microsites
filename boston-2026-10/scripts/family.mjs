// Family's own question (SPEC-ui-and-copy-pass.md § 2.2, the Advisor 2026-10-25: "for Family, the goal does *not* apply …
// Family *is* effectively a goal size … just "lunch OR dinner"/"lunch AND dinner" and menu choice"; "Let's do 5 or 10
// meal a week please"): data/plans.json's `family.selection`, checked. One row per answer to Q1, shaped as `selection`'s
// rows are (scripts/selection.mjs): its answers name the individual answer set whose cart Family takes (lunch or dinner,
// or both, on weekdays, no breakfast: the individual 5- and 10-meal carts) and `meals` what they come to, one of
// `family.counts`, the store's one Family product. ⛔ Family is a size, four portions: no goal, no macro targets, no
// weekends, breakfast or snacks question; its numbers are none of an individual size's.
// Plain ESM importing selection.mjs alone (which the Worker reaches; this file it does not), so build.mjs and
// scripts/chefs-choice.mjs both import it without a cycle.
import { answerKey, answerWords, LUNCH_DINNER, mealsOf } from "./selection.mjs";

const ROW_FIELDS = ["lunch_dinner", "weekends", "breakfast", "meals"];
const WHERE = "data/plans.json";
const fail = (what) => {
  throw new Error(`${WHERE}: ${what}`);
};
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * data/plans.json's `family.selection`, checked against `family.counts`; a broken one throws, naming the file. Returns a
 * Map, in Q1's order: answer ("or", "and") -> { key (the answer set whose cart Family takes: "or-5d"), meals, mpid, cents }.
 */
export function checkFamily(plans) {
  const family = plans.family;
  const rows = family?.selection;
  if (!Array.isArray(rows)) fail("family.selection must be a list of rows, one per answer to Q1");
  const counts = (family.counts ?? []).map((c) => c.meals_per_week);
  const out = new Map();
  rows.forEach((row, i) => {
    const at = `family.selection[${i}]`;
    if (!isObject(row)) fail(`${at} must be an object`);
    for (const key of Object.keys(row)) if (!ROW_FIELDS.includes(key)) fail(`${at}: unknown field ${JSON.stringify(key)}`);
    for (const key of ROW_FIELDS) if (!(key in row)) fail(`${at}: missing field ${JSON.stringify(key)}`);
    if (!LUNCH_DINNER.includes(row.lunch_dinner)) fail(`${at}: lunch_dinner must be "or" or "and", got ${JSON.stringify(row.lunch_dinner)}`);
    for (const key of ["weekends", "breakfast"]) if (typeof row[key] !== "boolean") fail(`${at}: ${key} must be true or false, got ${JSON.stringify(row[key])}`);
    const where = `${at} (${answerWords(row)})`;
    if (row.meals !== mealsOf(row)) fail(`${where}: meals ${JSON.stringify(row.meals)} is not what the answers come to (${mealsOf(row)})`);
    const cell = family.counts.find((c) => c.meals_per_week === row.meals);
    if (!cell) fail(`${where}: ${row.meals} meals is not one of family.counts (${counts.join(", ")})`);
    if (out.has(row.lunch_dinner)) fail(`family.selection: two rows for ${row.lunch_dinner}`);
    out.set(row.lunch_dinner, { key: answerKey(row), meals: row.meals, mpid: cell.mpid, cents: cell.price_per_meal_cents });
  });
  for (const ld of LUNCH_DINNER) if (!out.has(ld)) fail(`family.selection: no row for ${ld}`);
  for (const n of counts) if (![...out.values()].some((r) => r.meals === n)) fail(`family.counts: ${n} meals a week is no row of family.selection`);
  return new Map(LUNCH_DINNER.map((ld) => [ld, out.get(ld)]));
}

/** The family rows by the answer set whose cart each takes ("or-5d" -> { meals, mpid }): what the content's carts read. */
export const familyByCart = (plans) => new Map([...checkFamily(plans).values()].map((r) => [r.key, r]));
