// The checks of RP1–RP4 (SPEC-ui-and-copy-pass.md § 7: the result's price, the week's price alone with its full value
// struck above it; the Advisor, ts=2026-10-27T05:08:30.647Z: "Let's do B2 and drop the meal count please"), as functions
// over a PACKAGE (`root`: this one, or a mirror of it), each returning one line per thing the package gets wrong ([] when
// it is right). The cases run them on this package; the mutant (rp-mutants.test.mjs) runs RP1's on a mirror. Not a test
// file itself. Every expectation is the contract's, worked out here from data/plans.json's cents and selection rows and
// data/offers.json's share, never read back from the code under test.
//
// The pages are the package's own builds with the fixture week in #picks-data (a-harness builtPage): the two that carry
// the save step and so the offer (the development page, and the production page as committed, data/save.json
// `production` true), and the production page with `production` false (S20's, the rollback), which carries no offer.
// Each is run as a browser runs it (cc-harness openPlanPage), its clock at uc-harness NOW (noon in New York on
// 2026-10-24, a day of the Boston offer) or AFTER (noon on 2026-10-30, the day after its valid_to).
import offersFile from "../data/offers.json" with { type: "json" };
import { ROOT } from "../build.mjs";
import { builtPage } from "./a-harness.mjs";
import { FIXTURE_DIR, hiddenInTree, MESSAGES, openPlanPage, pageWithPicks, PLANS, productionFalseSavePath } from "./cc-harness.mjs";
import { NOW } from "./uc-harness.mjs";

/** The day after the offer's last (its valid_to, 2026-10-29), noon in New York. */
export const AFTER = Date.parse("2026-10-30T16:00:00.000Z");
/** The offer See all plans uses while it is current: the one offer, its share `percent_off` (§ 1.2 item 2). */
export const [OFFER] = offersFile.offers;
/** The result's one unit (§ 7 item 1: "with its unit: `$95.00/week`"), data/messages.json's. */
export const UNIT = MESSAGES.plan_page.total_unit;
/** The units § 7 item 4 removes with #result-per-meal and #result-meals, as data/messages.json held them at 6e0d86f
 *  (`plan_page.per_meal_unit`, `plan_page.meals_unit`): their words are what RP3 looks for. */
export const REMOVED_UNITS = ["/meal", "meals/week"];

const PERCENT = 100;
export const dollars = (cents) => `$${Math.floor(cents / 100).toLocaleString("en-US")}.${String(cents % 100).padStart(2, "0")}`;
/** § 7 item 1.1: the total ÷ (1 − the share), rounded to the cent (§ 1.2 item 2's rule). */
export const struckCents = (cents, percent = OFFER.percent_off) => Math.round((cents * PERCENT) / (PERCENT - percent));
const answerKey = (r) => `${r.lunch_dinner}-${r.weekends ? "7d" : "5d"}${r.breakfast ? "-b" : ""}`;
const perMealOf = (plan, count) => plan.counts.find((c) => c.meals_per_week === count).price_per_meal_cents;

/**
 * Every total the result can show (§ 7 item 3), worked out here: each size at every answer set, the meals the answer set
 * comes to at its plan's price a meal (§ 1.2 item 1: five on Lean 4, 5 × $13.00), and each Family answer, its meals at
 * Family's price a meal. `plan` the result's accent, `count` its plan's meals a week, `perMeal` the price a meal.
 */
export const RESULTS = [
  ...PLANS.individual.flatMap((plan) =>
    PLANS.selection.map((row) => ({
      hash: `#${plan.id}-${answerKey(row)}`,
      plan: plan.id,
      key: answerKey(row),
      meals: row.meals,
      count: row.plan,
      perMeal: perMealOf(plan, row.plan),
      cents: perMealOf(plan, row.plan) * row.meals,
    })),
  ),
  ...PLANS.family.selection.map((row) => ({
    hash: `#family-${row.lunch_dinner}`,
    plan: PLANS.family.id,
    key: answerKey(row),
    meals: row.meals,
    count: row.meals,
    perMeal: perMealOf(PLANS.family, row.meals),
    cents: perMealOf(PLANS.family, row.meals) * row.meals,
  })),
];

/** The pages of the package at `root`, built once per root: the two carrying the offer, and S20's page. */
const BUILT = new Map();
export function pagesAt(root = ROOT) {
  if (!BUILT.has(root)) {
    BUILT.set(
      root,
      (async () => ({
        offer: {
          development: await builtPage({ root, target: "dev", week: true }),
          production: await builtPage({ root, target: "prod", week: true }),
        },
        productionFalse: (await pageWithPicks({ root, picks: FIXTURE_DIR, savePath: await productionFalseSavePath() })).html,
      }))(),
    );
  }
  return BUILT.get(root);
}

const words = (n) => n.textContent.replace(/\s+/g, " ").trim();

/**
 * What a visitor reads of the result's price (`#result .price`), line by line in the document's order: each shown child's
 * words, whitespace collapsed; `struck`, the whole line struck through (an `<s>`, the browser's line-through, as the
 * grid's); `lead`, the line holding the weekly total (#result-total). null when the card is not shown.
 */
export function priceLines(page) {
  const result = page.document.getElementById("result");
  const price = result?.querySelector(".price");
  if (!result || hiddenInTree(result) || !price) return null;
  return [...price.children]
    .filter((n) => !hiddenInTree(n))
    .map((n) => ({
      text: words(n),
      struck: n.localName === "s" || (words(n) !== "" && [...n.querySelectorAll("s")].map(words).join(" ") === words(n)),
      lead: Boolean(n.querySelector("#result-total")),
    }));
}

/** The price at `hash` on `html`, its clock at `now`. */
export const priceAt = (html, hash, now) => priceLines(openPlanPage(html, { hash, now }));

const show = (v) => JSON.stringify(v);

/** One line per difference between the price read and `want` (its lines, in order). */
function linesProblems(at, got, want) {
  if (got === null) return [`${at}: the result card is not shown`];
  if (got.length !== want.length) return [`${at}: ${got.length} line(s) shown, not ${want.length}: ${show(got)}`];
  return want.flatMap((w, i) => (show(got[i]) === show(w) ? [] : [`${at}: line ${i + 1} reads ${show(got[i])}, not ${show(w)}`]));
}

/** § 7 item 1, while the offer is current: the struck `$X/week`, then the lead `$Y/week`. */
export const offerLines = (r) => [
  { text: `${dollars(struckCents(r.cents))}${UNIT}`, struck: true, lead: false },
  { text: `${dollars(r.cents)}${UNIT}`, struck: false, lead: true },
];
/** § 7 item 1, with no such offer current: the lead alone. */
export const leadLine = (r) => [{ text: `${dollars(r.cents)}${UNIT}`, struck: false, lead: true }];

/** RP1: on both pages carrying the offer, its clock inside its dates, every result shows exactly the struck `$X/week`
 *  then `$Y/week`, `Y` the store's total and `X` = round(`Y` ÷ (1 − the share)). */
export async function rp1Problems(root = ROOT) {
  const { offer } = await pagesAt(root);
  const problems = [];
  for (const [build, html] of Object.entries(offer)) {
    for (const r of RESULTS) problems.push(...linesProblems(`${build}, ${r.hash}`, priceAt(html, r.hash, NOW), offerLines(r)));
  }
  return problems;
}

/** RP2: after the offer's valid_to (both pages carrying it), and on the page with no offer at all (production false),
 *  every result shows `$Y/week` alone. */
export async function rp2Problems(root = ROOT) {
  const { offer, productionFalse } = await pagesAt(root);
  const problems = [];
  for (const [build, html] of Object.entries(offer)) {
    for (const r of RESULTS) problems.push(...linesProblems(`${build}, after the offer, ${r.hash}`, priceAt(html, r.hash, AFTER), leadLine(r)));
  }
  for (const r of RESULTS) problems.push(...linesProblems(`production false, ${r.hash}`, priceAt(productionFalse, r.hash, NOW), leadLine(r)));
  return problems;
}

/** RP3: no price a meal and no meal count in `.price`, on every page, inside the offer and after it: neither removed
 *  element in the markup, neither removed unit, neither figure, and every line shown is a weekly price, `$N.NN/week`. */
export async function rp3Problems(root = ROOT) {
  const { offer, productionFalse } = await pagesAt(root);
  const problems = [];
  const weekly = new RegExp(`^\\$[\\d,]+\\.\\d{2}${UNIT.replace(/[/]/g, "\\/")}$`);
  for (const [build, html] of Object.entries({ ...offer, "production false": productionFalse })) {
    for (const id of ["result-per-meal", "result-meals"]) if (html.includes(`id="${id}"`)) problems.push(`${build}: the page still carries #${id}`);
    for (const [when, now] of [["inside the offer", NOW], ["after it", AFTER]]) {
      for (const r of RESULTS) {
        const at = `${build}, ${when}, ${r.hash}`;
        const lines = priceAt(html, r.hash, now);
        if (lines === null) {
          problems.push(`${at}: the result card is not shown`);
          continue;
        }
        const text = lines.map((l) => l.text).join(" ");
        const tokens = text.split(/[\s/]+/);
        for (const unit of REMOVED_UNITS) if (text.includes(unit)) problems.push(`${at}: "${unit}" in the price: ${show(text)}`);
        if (tokens.includes(dollars(r.perMeal))) problems.push(`${at}: the price a meal, ${dollars(r.perMeal)}, in the price: ${show(text)}`);
        if (tokens.includes(String(r.meals))) problems.push(`${at}: the meal count, ${r.meals}, in the price: ${show(text)}`);
        for (const l of lines) if (!weekly.test(l.text)) problems.push(`${at}: a line that is not a weekly price: ${show(l.text)}`);
      }
    }
  }
  return problems;
}

/** The grid's cell `plan-count` as See all plans draws it (plan-prices.js): its struck price and the price beside it, as
 *  money ("$116.67" of "$116.67/wk"). */
function gridCell(page, cell) {
  const small = page.document.querySelector(`#all [data-cell="${cell}"] small`);
  const money = (s) => /^\$[\d,]+\.\d{2}/.exec(s ?? "")?.[0] ?? null;
  return { struck: money(small?.querySelector("s")?.textContent), now: money(small?.querySelector(".cell-now")?.textContent) };
}

/** RP4: the result's struck figure equals the grid's for the same plan and count (each plan at each count the grid shows,
 *  at every answer set that comes to that count on that plan), and its lead the price beside it; both pages carrying the
 *  offer, inside its dates. The grid's unit is its own (`/wk`), so the figures are compared as money. */
export async function rp4Problems(root = ROOT) {
  const { offer } = await pagesAt(root);
  const problems = [];
  const shownCounts = PLANS.shown_counts.map((c) => c.meals_per_week);
  for (const [build, html] of Object.entries(offer)) {
    for (const r of RESULTS.filter((x) => x.plan !== PLANS.family.id && x.meals === x.count && shownCounts.includes(x.count))) {
      const at = `${build}, ${r.hash}`;
      const page = openPlanPage(html, { hash: r.hash, now: NOW });
      const grid = gridCell(page, `${r.plan}-${r.count}`);
      const lines = priceLines(page);
      const struck = lines?.find((l) => l.struck)?.text.replace(UNIT, "") ?? null;
      const lead = lines?.find((l) => l.lead)?.text.replace(UNIT, "") ?? null;
      if (grid.struck === null) problems.push(`${at}: control: See all plans draws no struck price for ${r.plan}-${r.count}`);
      if (struck !== grid.struck) problems.push(`${at}: the result's struck figure ${show(struck)}, See all plans' ${show(grid.struck)} (${r.plan}-${r.count})`);
      if (lead !== grid.now) problems.push(`${at}: the result's lead ${show(lead)}, See all plans' price beside it ${show(grid.now)} (${r.plan}-${r.count})`);
    }
  }
  return problems;
}
