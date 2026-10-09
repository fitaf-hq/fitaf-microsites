// SPEC-storefront-watch § 12, F6: the week's menu against the baseline's. The menu is what one visit read from the
// page's own catalog response (lib/visit.mjs): the `all-meals` products' names, each with its key by the hand-off's own
// function (src/storefront/meal-key.js, imported by the visit, never re-implemented), so a name the store re-tags
// ("🟠NEW: …") is the same meal. This module imports nothing of the site's: it is judged from the record alone.
//   a switch (flagged)      fewer than half of the baseline's keys still listed: a new week (item 3)
//   a smaller change        reported (new names, gone keys), not flagged: a meal added or renamed mid-week
//   unread (flagged)        no catalog response seen, or none of its products in `all-meals`: never read as a switch
//   informational           the baseline has no menu yet (before the first `accept --menu`), as F3 before a paste
import { MENU_CATEGORY } from "./catalog-response.mjs";

/** [{ name, key }] in the page's order -> one per key (the first name a key is listed under). */
export function menuOf(meals) {
  const seen = new Set();
  return meals.filter(({ key }) => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The keys a baseline keeps for a menu: one each, sorted, so a re-accepted week rewrites nothing. */
export const menuKeys = (live) => [...new Set(live.map((m) => m.key))].sort();

function unread(why, responses) {
  return { flag: true, unread: true, informational: false, responses, live: [], baseline: null, kept: null, added: [], removed: [], summary: `could not read the menu: ${why}` };
}

/**
 * `menu`: the visit's record, `{ responses: [{ at, params, error? }], products, meals: [{ name, key }] }`, or null
 * when the page's catalog response was not seen. `baselineKeys`: the baseline's `menu`, or undefined before the first
 * accept --menu.
 */
export function menuVerdict(menu, baselineKeys) {
  const responses = menu?.responses ?? [];
  if (!responses.length) return unread("the page's /catalog/products response was not seen", responses);
  const live = menuOf(menu.meals ?? []);
  if (!live.length) {
    const errors = responses.filter((r) => r.error).map((r) => r.error);
    const why = `no product in the ${MENU_CATEGORY} category (${menu.products ?? 0} products in ${responses.length} response(s)${errors.length ? `; ${errors.join("; ")}` : ""})`;
    return unread(why, responses);
  }
  if (!baselineKeys?.length) {
    const summary = `informational, no menu accepted yet (the baseline has no menu; accept --menu writes it): the page lists ${live.length} meals`;
    return { flag: false, unread: false, informational: true, responses, live, baseline: null, kept: null, added: [], removed: [], summary };
  }
  const base = new Set(baselineKeys);
  const liveKeys = new Set(live.map((m) => m.key));
  const kept = [...base].filter((k) => liveKeys.has(k)).length;
  const added = live.filter((m) => !base.has(m.key));
  const removed = [...base].filter((k) => !liveKeys.has(k)).sort();
  // § 12 item 3: a new week is FEWER THAN HALF of the baseline's keys still in the page's menu.
  const switched = kept * 2 < base.size;
  const change = added.length || removed.length ? `${added.length} new, ${removed.length} gone` : "unchanged";
  const summary = switched
    ? `the menu switched: ${kept} of the baseline's ${base.size} keys still listed (fewer than half); ${added.length} of the page's ${live.length} keys new`
    : `the accepted week: ${kept} of the baseline's ${base.size} keys still listed (${change}; a switch is fewer than half)`;
  return { flag: switched, unread: false, informational: false, responses, live, baseline: base.size, kept, added, removed, summary };
}
