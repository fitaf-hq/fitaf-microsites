// The checks of MS-1, MS-2, MS-5 and MS-11 (SPEC-meal-selection.md § 6, § 8.1) as functions over a built page, each
// returning one line per thing the page gets wrong ([] when it is right), so the cases run them on the real build and
// MS-10's mutants run THE SAME checks on a mirror's build (test/ms-10-mutants.test.mjs). Not a test file itself.
// Every expectation is the contract's (ms-harness TABLE, the fixtures' own carts), never data/plans.json's.
import { expectedFragment, FIXTURE as V1, mealLine, MESSAGES, readWithFillB } from "./cc-harness.mjs";
import { assertCheckedOut, LOG_PREFIX } from "./r2-harness.mjs";
import { cardOf, centsOf, dollars, fragmentOf, GOALS, mpidOf, open, resultOf, TABLE, V2_CARTS } from "./ms-harness.mjs";

export const ORDER = "https://fitafnutrition.com/order";
const fill = (phrase, values) => phrase.replace(/\{([a-z]+)\}/g, (whole, k) => (k in values ? String(values[k]) : whole));

/** MS-1: each answer set's card, at every size, shows its plan's meals, price and weekly total, and the rounded line. */
export function rowProblems(html) {
  const problems = [];
  for (const goal of GOALS) {
    for (const row of TABLE) {
      const hash = fragmentOf(goal, row);
      const r = resultOf(open(html, hash));
      const want = {
        shown: true,
        selection: row.key,
        meals: String(row.plan),
        perMeal: dollars(centsOf(goal, row.plan)),
        total: dollars(row.plan * centsOf(goal, row.plan)),
        rounded: row.plan < row.meals ? fill(MESSAGES.plan_page.rounded, { meals: row.meals, plan: row.plan }) : null,
        cta: `${ORDER}?mpid=${mpidOf(goal, row.plan)}`,
      };
      for (const [k, v] of Object.entries(want)) if (r[k] !== v) problems.push(`${hash}: ${k} ${JSON.stringify(r[k])}, not ${JSON.stringify(v)}`);
    }
  }
  return problems;
}

/** MS-2: with the version-2 fixture open, each answer set's link at every size is its cart's, at its row's plan's mpid,
 *  and (`decode`) the shipped reader presses every meal its count and reads that mpid. */
export async function linkProblems(html, { decode = true } = {}) {
  const problems = [];
  for (const goal of GOALS) {
    for (const row of TABLE) {
      const hash = fragmentOf(goal, row);
      const cart = V2_CARTS[row.key];
      const s = cardOf(open(html, hash));
      if (!s.list || !s.checkout) {
        problems.push(`${hash}: no Chef's Choice link`);
        continue;
      }
      const mpid = mpidOf(goal, row.plan);
      const want = `${ORDER}?mpid=${mpid}${expectedFragment(cart.items)}`;
      if (s.checkout !== want) problems.push(`${hash}: ${s.checkout}, not ${want}`);
      if (!decode) continue;
      const { page, h, path } = await readWithFillB(s.checkout, cart.items.map((m) => m.name));
      const pressed = Object.fromEntries([...page.presses].map(([name, list]) => [name, list.length]));
      const wanted = Object.fromEntries(cart.items.map((m) => [m.name, m.qty]));
      if (JSON.stringify(pressed) !== JSON.stringify(wanted)) problems.push(`${hash}: fill C pressed ${JSON.stringify(pressed)}`);
      if (!h.info.includes(`${LOG_PREFIX} fill C, mpid ${mpid}`)) problems.push(`${hash}: fill C did not read mpid ${mpid}: ${JSON.stringify(h.info)}`);
      try {
        assertCheckedOut(h, page, path);
      } catch (err) {
        problems.push(`${hash}: not checked out: ${err.message}`);
      }
    }
  }
  return problems;
}

/** MS-5: with the version-1 fixture open, its `7` is the cart of *or*, every day, no breakfast and its `14` of *and*, every
 *  day, no breakfast (§ 5), at every size; every other answer set falls back to Choose your meals alone (§ 4). */
export function v1Problems(html) {
  const problems = [];
  const under = { "or-7d": "7", "and-7d": "14" };
  for (const goal of GOALS) {
    for (const row of TABLE) {
      const hash = fragmentOf(goal, row);
      const s = cardOf(open(html, hash));
      const count = under[row.key];
      if (!count) {
        if (s.list || s.own || !s.choose) problems.push(`${hash}: not the fallback (list ${s.list}, own ${s.own}, Choose your meals ${s.choose})`);
        if (s.chooseHref !== `${ORDER}?mpid=${mpidOf(goal, row.plan)}`) problems.push(`${hash}: Choose your meals ${s.chooseHref}`);
        continue;
      }
      const menu = V1.menus[count];
      const want = `${ORDER}?mpid=${mpidOf(goal, Number(count))}${expectedFragment(menu)}`;
      if (!s.list) problems.push(`${hash}: the version-1 ${count} is not shown`);
      if (s.checkout !== want) problems.push(`${hash}: ${s.checkout}, not the version-1 ${count}'s ${want}`);
      if (JSON.stringify(s.meals) !== JSON.stringify(menu.map((m) => mealLine(m)))) problems.push(`${hash}: the lines are not the version-1 ${count}'s`);
    }
  }
  return problems;
}

/** MS-11: the three answer sets on the 14-meal plan each show their OWN cart (lines and link), at every size. */
export const ON_14 = TABLE.filter((r) => r.plan === 14).map((r) => r.key);
export function threeCartsProblems(html) {
  const problems = [];
  for (const goal of GOALS) {
    for (const key of ON_14) {
      const hash = `#${goal}-${key}`;
      const cart = V2_CARTS[key];
      const s = cardOf(open(html, hash));
      const lines = cart.items.map((m) => mealLine(m));
      if (JSON.stringify(s.meals) !== JSON.stringify(lines)) problems.push(`${hash}: shows ${JSON.stringify(s.meals)}, not its cart's`);
      const want = `${ORDER}?mpid=${mpidOf(goal, 14)}${expectedFragment(cart.items)}`;
      if (s.checkout !== want) problems.push(`${hash}: ${s.checkout}, not its cart's ${want}`);
    }
  }
  return problems;
}
