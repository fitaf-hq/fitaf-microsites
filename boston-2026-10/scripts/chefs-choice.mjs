// This week's Chef's Choice on the plan page (SPEC-chefs-choice.md). Two sides:
// - the PAGE's (chefsChoice, for build.mjs): the three slots, PICKS_STYLE (src/chefs-choice/style.css), PICKS_CARD
//   (src/chefs-choice/card.html, its words from data/messages.json) and PICKS_SCRIPT (the page's data as JSON, then
//   src/chefs-choice/chefs-choice.js). ⛔ The build embeds NO week (SPEC-week-content § 7, the ruling on its first open
//   question): `#picks-data` holds `weeks: []`, and the page shows the week the Workers put there from their bucket.
// - the CONTENT's (readPicks, checkPicks, pageData, for scripts/week-content.mjs): every data/picks/<sunday>.json read
//   and checked (§ 1), and one week made into the data the page's script reads, which is the bucket's object.
//
// ⛔ The menus are checked by the LINK TOOL'S OWN RULES, by importing it: each menu, for each size, goes through
// payloadFromArgs (qty 1..MAX_QTY, names distinct and no two sharing a key, the counts making one of the plan's allowed
// totals, SPEC-rung2-fill-c § 8: 4 or 5 on the 4 plan, 14 or 15 on the 14) exactly
// as `npm run handoff:link` takes it, and its link is the tool's handoffLink, whose keys are the one mealKey
// (src/storefront/meal-key.js). No key function and no encoder live here (CC-2).
//
// § 7: each meal is { name, display, qty }. `name` (the store's card name) is the ONLY key: the link tool's --item, the
// tile's cell and the --photos payload read it. `display` (the KMS's name) is what the list shows, as the tool reads a
// name (whitespace collapsed and trimmed), and nothing else: it is not keyed, and nothing is checked between displays.
//
// SPEC-meal-selection § 5: a file is version 1 (`menus` by count, as above) or version 2 (`version: 2`, `lists`, of which
// the page shows `chefs-choice` only: a CART per answer set of data/plans.json's `selection`, through the row's plan, and
// the week's snacks for 7 and 5 days). Either becomes the same thing, carts keyed by the answer set (`or-7d`,
// `and-5d-b`): a version-1 `7` is the cart of or, every day, no breakfast, and its `14` of and, every day, no breakfast.
//
// SPEC-every-menu-and-nutrition § 1: a version-2 file's `lists` may hold more than `chefs-choice`, each checked as it is,
// and ⛔ each NAMED by the page's words (data/messages.json `menus`: what makes a list one the page shows); and an
// optional `meals` map, keyed by a cart's meal's `name`, each meal's nutrition per individual size, its ingredients and
// its Contains. A week of more than one list carries the others in the words' order (`lists`), `chefs-choice` first.
import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import { esc, ROOT, scriptJson, sheetUrl, shownCounts } from "../build.mjs";
import { addDays } from "../src/worker/zoned-time.js";
import { countTable } from "./build-storefront.mjs";
import { asShown, handoffLink, itemsFromArgs, payloadFromArgs } from "./handoff-link.mjs";
import { answerKey, answerWords, checkSelection, daysOf, dayToken, legacyKey, LUNCH_DINNER, soldCounts } from "./selection.mjs";

export const CHEFS_CHOICE_SRC = join(ROOT, "src", "chefs-choice");
/** § 2: delivery Sunday S is open to order from S − 9 (a Friday: the store's switch) through S − 3 (a Thursday). */
export const OPENS_DAYS_BEFORE = 9;
export const CLOSES_DAYS_BEFORE = 3;
/** A picks file is named by its delivery Sunday: 2026-10-04.json. Only `.json` files in the directory are picks. */
const PICKS_FILE = /^(\d{4}-\d{2}-\d{2})\.json$/;
const SUNDAY = 0;
/** § 1 (and § 7.1): the only fields, each required: a file's, and a meal's. Anything else refuses the build. */
const FILE_FIELDS = ["delivery", "menus"];
const MEAL_FIELDS = ["name", "display", "qty"];
/** SPEC-meal-selection § 5: the versions the page reads (a file without `version` is version 1), version 2's fields, a
 *  cart's, and the one list the page shows (⛔ the file carries only the lists the page shows: § 4). */
const VERSIONS = [1, 2];
const V2_FILE_FIELDS = ["delivery", "version", "lists"];
const SHOWN_LIST = "chefs-choice";
/** SPEC-every-menu-and-nutrition § 1 item 2: a version-2 file's optional field, an entry's fields (as amended at 1fb2b19,
 *  each optional: at least one of `nutrition` and `ingredients`, `contains` only beside `ingredients`), and a size's five
 *  numbers (grams, and calories). § 4: the nutrition phrases, and `menus`' own note. Since § 11 (2026-10-22) the phrases
 *  are the rings' (`rings`, a label per number, in FACTS' order, and `grams`, a ring's value of grams) and the panel's two
 *  lines; the line under a meal's name (`line`) has left them. */
const V2_OPTIONAL_FIELDS = ["meals"];
const ENTRY_FIELDS = [];
const ENTRY_OPTIONAL_FIELDS = ["nutrition", "ingredients", "contains"];
const ENTRY_TEXTS = ["ingredients", "contains"];
const FACTS = ["cal", "protein", "carbs", "fat", "fiber"];
const NUTRITION_PHRASES = { grams: ["{n}"], ingredients: ["{text}"], contains: ["{text}"] };
const RING_LABELS = "rings";
const MENUS_NOTE = "status";
/** The heading's placeholder naming the menu shown (§ 4: `chefs_choice.heading` may carry it). */
const MENU_PLACEHOLDER = "{menu}";
/** Without the words (a caller giving none): the one list the page always shows. */
const ONLY_SHOWN = { menus: [[SHOWN_LIST, null]], heading: null };
const LIST_FIELDS = ["carts", "snacks"];
const CART_FIELDS = ["lunch_dinner", "weekends", "breakfast", "plan", "items"];
/** § 3's phrases in data/messages.json's `chefs_choice` the card shows, and the placeholders each must carry. Since
 *  SPEC-plan-page-refinement § 1–2 the list is always open: `open` (its button) and `note` are kept there, not read.
 *  SPEC-every-menu-and-nutrition § 11 item 1 (2026-10-22): the heading is the menu's name alone (`{menu}`); `{week}` is
 *  still filled when a phrase carries it, and no longer required.
 *  SPEC-meal-selection § 9 item 3: the snack block's heading and its not-carted line. SPEC-every-menu-and-nutrition § 2 (the
 *  Advisor's ruling of 2026-10-21): `menus_label`, the chooser's own name (its aria-label). */
const PHRASES = { heading: [], meal_qty: ["{meal}", "{n}"], checkout: [], own: [], snacks_heading: [], snacks_not_carted: [], updating: [], menus_label: [] };
/** SPEC-week-content § 8 item 1: an UPDATING week's file is exactly { delivery, version: 2, updating: true, lists: {} }
 *  (Fit AF's emitter, `--updating`: the store has switched and this week's carts are not made yet). */
const UPDATING_FILE_FIELDS = [...V2_FILE_FIELDS, "updating"];

/** A path as a person finds it: from the package when it is inside it. */
const shown = (path) => (path.startsWith(ROOT + sep) ? relative(ROOT, path) : path);

/** `{name}` placeholders filled in one pass, so a value is never read again as a placeholder. */
const fill = (phrase, values) => phrase.replace(/\{([a-z]+)\}/g, (whole, key) => (key in values ? String(values[key]) : whole));

/** "YYYY-MM-DD" that is a real calendar date and a Sunday. */
export function isSunday(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || addDays(ymd, 0) !== ymd) return false;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === SUNDAY;
}

/** § 2: the dates a delivery Sunday is open to order, inclusive, in the shape the offer's isLive reads. */
export const windowOf = (delivery) => ({
  valid_from: addDays(delivery, -OPENS_DAYS_BEFORE),
  valid_to: addDays(delivery, -CLOSES_DAYS_BEFORE),
});

/** data/messages.json's `chefs_choice` phrases, checked: a missing phrase or placeholder refuses the build. */
export function chefsChoiceWords(messages) {
  const words = messages.chefs_choice ?? {};
  for (const [key, placeholders] of Object.entries(PHRASES)) {
    if (typeof words[key] !== "string" || !words[key].trim()) throw new Error(`data/messages.json: chefs_choice.${key} is missing`);
    for (const p of placeholders) {
      if (!words[key].includes(p)) throw new Error(`data/messages.json: chefs_choice.${key} has no ${p}`);
    }
  }
  return Object.fromEntries(Object.keys(PHRASES).map((key) => [key, words[key]]));
}

/**
 * SPEC-every-menu-and-nutrition § 4: data/messages.json's `menus` (each list the page shows and its name, in display
 * order, `chefs-choice` first; `status` is its note, not a list) and `nutrition` (since § 11: `rings`, a label for each of
 * the five numbers; `grams`, `ingredients`, `contains`, each with its placeholders), checked: a missing name, label,
 * phrase or placeholder refuses the build. Returns { menus: [[list, name], …], nutrition: { rings: { cal, … }, grams,
 * ingredients, contains } }, each name as the page shows it.
 */
export function menuWords(messages) {
  const menus = messages.menus;
  if (!isObject(menus)) throw new Error(`data/messages.json: menus is missing (each list's name, ${SHOWN_LIST} first)`);
  const names = Object.entries(menus).filter(([list]) => list !== MENUS_NOTE);
  if (!names.some(([list]) => list === SHOWN_LIST)) throw new Error(`data/messages.json: menus.${SHOWN_LIST} is missing`);
  if (names[0][0] !== SHOWN_LIST) throw new Error(`data/messages.json: menus must name ${SHOWN_LIST} first (the chooser's order is theirs)`);
  for (const [list, name] of names) {
    if (typeof name !== "string" || !asShown(name)) throw new Error(`data/messages.json: menus.${list} is missing`);
  }
  const words = messages.nutrition ?? {};
  const labels = isObject(words[RING_LABELS]) ? words[RING_LABELS] : {};
  for (const fact of FACTS) {
    if (typeof labels[fact] !== "string" || !labels[fact].trim()) throw new Error(`data/messages.json: nutrition.${RING_LABELS}.${fact} is missing`);
  }
  for (const [key, placeholders] of Object.entries(NUTRITION_PHRASES)) {
    if (typeof words[key] !== "string" || !words[key].trim()) throw new Error(`data/messages.json: nutrition.${key} is missing`);
    for (const p of placeholders) if (!words[key].includes(p)) throw new Error(`data/messages.json: nutrition.${key} has no ${p}`);
  }
  return {
    menus: names.map(([list, name]) => [list, asShown(name)]),
    nutrition: {
      [RING_LABELS]: Object.fromEntries(FACTS.map((fact) => [fact, labels[fact]])),
      ...Object.fromEntries(Object.keys(NUTRITION_PHRASES).map((key) => [key, words[key]])),
    },
  };
}

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** Refuse any field but `allowed` and `optional`, and a missing one of `allowed`. `where` names the object in the message. */
function onlyFields(value, allowed, where, optional = []) {
  if (!isObject(value)) throw new Error(`${where} must be an object`);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key) && !optional.includes(key)) throw new Error(`${where}: unknown field ${JSON.stringify(key)}`);
  }
  for (const key of allowed) if (!(key in value)) throw new Error(`${where}: missing field ${JSON.stringify(key)}`);
}

/** A meal as a refusal names it: its place, and its `name` when it has one as text (§ 7.4: the file and the meal). */
const mealAt = (meal, where) => (isObject(meal) && typeof meal.name === "string" ? `${where} ${JSON.stringify(meal.name)}` : where);

/** One menu's meals, their shape checked; the link tool checks the rest. */
function mealsOf(menu, where) {
  if (!Array.isArray(menu) || !menu.length) throw new Error(`${where} must be a list of meals`);
  return menu.map((meal, i) => {
    const at = mealAt(meal, `${where}[${i}]`);
    onlyFields(meal, MEAL_FIELDS, at);
    if (typeof meal.name !== "string") throw new Error(`${at}: name must be text`);
    if (typeof meal.display !== "string") throw new Error(`${at}: display must be text, got ${JSON.stringify(meal.display)}`);
    if (!asShown(meal.display)) throw new Error(`${at}: display is blank`);
    if (typeof meal.qty !== "number" || !Number.isInteger(meal.qty)) {
      throw new Error(`${at}: qty must be a whole number, got ${JSON.stringify(meal.qty)}`);
    }
    return meal;
  });
}

/**
 * One list of meals for `count` (a plan's meals a week), checked by the link tool at every size: for each size, the
 * tool's own payloadFromArgs (qty 1..MAX_QTY, names distinct and no two sharing a key, the counts making one of the
 * plan's allowed totals: SPEC-rung2-fill-c § 8, its own count or the meals of a `selection` row through it) and its
 * handoffLink. Returns { meals: [{ name, display, qty }], links: { mpid: url } }, `name` as the tool keys it
 * and `display` as the page shows it (§ 7.1); only `name` reaches the tool. `photo` ({ photos, host }) gives each link
 * the week's cells by the tool's own --photos (SPEC-rung2-progress-and-checkout § 17.1). `where` names it in a refusal.
 */
function cartOf(meals, count, where, { plans, totals, photo, date }, snacks = null) {
  const links = {};
  // SPEC-snacks-in-the-cart § 4.2: while snacks are carted, a second link per size, the cart's meals and then the week's
  // snack list for the cart's days as snack items (the tool's own --snack, so its refusals are the block's).
  const snackLinks = snacks ? {} : null;
  let items = null;
  for (const plan of plans.individual) {
    const { mpid } = plan.counts.find((c) => c.meals_per_week === count);
    const argv = ["--mpid", String(mpid), ...meals.flatMap((m) => ["--item", `${m.name}:${m.qty}`])];
    if (photo?.photos?.chefs_choice?.[date]) argv.push("--photos", date, "--host", String(photo.host));
    let payload;
    try {
      payload = payloadFromArgs(argv, totals, photo?.photos);
    } catch (err) {
      throw new Error(`${where}: ${err.message}`);
    }
    links[mpid] = handoffLink(plans, payload);
    if (snacks) {
      try {
        snackLinks[mpid] = handoffLink(plans, payloadFromArgs([...argv, ...snacks.flatMap((m) => ["--snack", `${m.name}:${m.qty}`])], totals, photo?.photos));
      } catch (err) {
        throw new Error(`${where} with its snacks: ${err.message}`);
      }
    }
    // The tool's items are the list's meals in order (one --item each), so each takes its own display.
    items ??= payload.items.map(({ name, qty }, i) => ({ name, display: asShown(meals[i].display), qty }));
  }
  return { meals: items, links, ...(snackLinks ? { snackLinks } : {}) };
}

/** Version 1 (§ 1): `menus` by a count the page shows; each menu the cart of that count's answer set (SPEC-meal-selection
 *  § 5: 7 is or, every day, no breakfast; 14 is and, every day, no breakfast). */
function v1Carts(json, rows, ctx) {
  if (!isObject(json.menus)) throw new Error(`menus must be an object, a list of meals per count`);
  if (!Object.keys(json.menus).length) throw new Error(`no menu: "menus" names no count`);
  const counts = shownCounts(ctx.plans).map(String);
  const carts = {};
  for (const [count, menu] of Object.entries(json.menus)) {
    if (!counts.includes(count)) throw new Error(`count ${JSON.stringify(count)} is not a count the page shows (${counts.join(", ")})`);
    const key = legacyKey(rows, Number(count));
    if (!key) throw new Error(`menus.${count}: no answer set of data/plans.json's selection is ${count} meals every day without breakfast`);
    carts[key] = cartOf(mealsOf(menu, `menus.${count}`), Number(count), `menus.${count}`, ctx);
  }
  return { carts, snacks: {} };
}

/** A cart's answer set, if it is one data/plans.json's selection has: Q1 "or"/"and", the two others true or false. */
function rowOfCart(cart, rows) {
  const valid = LUNCH_DINNER.includes(cart.lunch_dinner) && typeof cart.weekends === "boolean" && typeof cart.breakfast === "boolean";
  return valid ? rows.get(answerKey(cart)) : undefined;
}

/** Version 2's snack lists (SPEC-meal-selection § 5): by days, "7" or "5", each the link tool's item checks, their qty
 *  making the days (one snack a day); no mpid. Keyed as the fragment names the days: "7d", "5d". */
function snackLists(snacks, at) {
  const out = {};
  if (snacks === undefined) return out;
  if (!isObject(snacks)) throw new Error(`${at} must be an object, a list of snacks per number of days`);
  const days = [true, false].map((weekends) => String(daysOf(weekends)));
  for (const [d, list] of Object.entries(snacks)) {
    if (!days.includes(d)) throw new Error(`${at}: ${JSON.stringify(d)} is not ${days.join(" or ")} days`);
    const where = `${at}.${d}`;
    const meals = mealsOf(list, where);
    let items;
    try {
      items = itemsFromArgs(meals.map((m) => `${m.name}:${m.qty}`));
    } catch (err) {
      throw new Error(`${where}: ${err.message}`);
    }
    const total = items.reduce((sum, it) => sum + it.qty, 0);
    if (total !== Number(d)) throw new Error(`${where}: the snacks for ${d} days are ${d}; the list has ${total}`);
    out[dayToken(Number(d) === daysOf(true))] = items.map(({ name, qty }, i) => ({ name, display: asShown(meals[i].display), qty }));
  }
  return out;
}

/** Version 2 (SPEC-meal-selection § 5): the `chefs-choice` list's carts and snacks; and (SPEC-every-menu-and-nutrition
 *  § 1) every other list the words name, checked as it is, in the words' order (`lists`, only when there are others),
 *  and the `meals` map, if any (`meals`). ⛔ A list the words do not name is refused: the page does not show it. */
function v2Carts(json, rows, ctx) {
  const lists = json.lists;
  if (!isObject(lists)) throw new Error("lists must be an object, the lists by name");
  for (const name of Object.keys(lists)) {
    if (!ctx.names.includes(name)) throw new Error(`lists: ${JSON.stringify(name)} is not a list the page shows (${ctx.names.join(", ")}): data/messages.json's menus has no name for it`);
  }
  if (!(SHOWN_LIST in lists)) throw new Error(`lists: no ${JSON.stringify(SHOWN_LIST)}`);
  const checked = ctx.names.filter((name) => name in lists).map((name) => ({ list: name, ...listCarts(lists[name], `lists.${name}`, rows, ctx) }));
  if (checked.length > 1 && ctx.heading !== null && !ctx.heading.includes(MENU_PLACEHOLDER)) {
    throw new Error(`${checked.length} lists, and data/messages.json's chefs_choice.heading has no ${MENU_PLACEHOLDER} to name the menu shown`);
  }
  const meals = json.meals === undefined ? null : mealEntries(json.meals, checked, ctx.plans);
  const [shown] = checked; // chefs-choice: the words name it first
  // § 1 item 2, amended: `"meals": {}` is accepted, and with no entry the week is what it is without `meals` (§ 1 item 3).
  const entries = meals && Object.keys(meals).length ? { meals } : {};
  return { carts: shown.carts, snacks: shown.snacks, ...(checked.length > 1 ? { lists: checked } : {}), ...entries };
}

/** One version-2 list (SPEC-meal-selection § 5): its carts, each a row of the selection through that row's plan, at most
 *  one per row (a row without one falls back, § 4), and its snacks. `at` names it in a refusal. */
function listCarts(list, at, rows, ctx) {
  if (!isObject(list)) throw new Error(`${at} must be an object`);
  for (const key of Object.keys(list)) if (!LIST_FIELDS.includes(key)) throw new Error(`${at}: unknown field ${JSON.stringify(key)}`);
  if (!Array.isArray(list.carts)) throw new Error(`${at}.carts must be a list of carts`);
  const sold = soldCounts(ctx.plans);
  const carts = {};
  const first = {};
  const snacks = snackLists(list.snacks, `${at}.snacks`);
  // SPEC-snacks-in-the-cart § 4.2: while carted, a cart's snack links carry the list for its days (7 or 5), if any.
  const carted = ctx.plans.snacks?.shown && ctx.plans.snacks?.carted;
  list.carts.forEach((cart, i) => {
    const place = `${at}.carts[${i}]`;
    onlyFields(cart, CART_FIELDS, place);
    const row = rowOfCart(cart, rows);
    if (!row) {
      const answers = ["lunch_dinner", "weekends", "breakfast"].map((k) => `${k} ${JSON.stringify(cart[k])}`).join(", ");
      throw new Error(`${place}: ${answers} is not a row of data/plans.json's selection`);
    }
    const key = answerKey(cart);
    const where = `${place} (${answerWords(cart)})`;
    if (key in first) throw new Error(`${where}: a second cart for ${key} (the first is carts[${first[key]}])`);
    first[key] = i;
    if (!sold.includes(cart.plan)) throw new Error(`${where}: plan ${JSON.stringify(cart.plan)} is not a plan the store sells (${sold.join(", ")})`);
    if (cart.plan !== row.plan) throw new Error(`${where}: plan ${cart.plan} is not its row's plan (${row.plan})`);
    carts[key] = cartOf(mealsOf(cart.items, `${where}.items`), cart.plan, where, ctx, (carted && snacks[dayToken(cart.weekends)]) || null);
  });
  return { carts, snacks };
}

/**
 * SPEC-every-menu-and-nutrition § 1 item 2: the `meals` map, checked. Each key is a meal's `name` in a cart of the file
 * (as the link tool reads a name: whitespace collapsed and trimmed; a snack is not a cart's meal); each entry carries, as
 * amended at 1fb2b19, at least one of `nutrition` (any of data/plans.json's individual sizes, each with all five numbers,
 * whole and 0 or more; one holding no size gives no numbers) and `ingredients` (text, not blank), and `contains` (text,
 * not blank) only beside `ingredients`; nothing else. Returns the entries by the name as the tool reads it, their texts as
 * the page shows them, each field only when the file gives it. `{}` is accepted and is no entry at all.
 */
function mealEntries(meals, lists, plans) {
  if (!isObject(meals)) throw new Error("meals must be an object, an entry per meal by its name");
  const named = new Set(lists.flatMap(({ carts }) => Object.values(carts).flatMap((cart) => cart.meals.map((m) => m.name))));
  const sizes = plans.individual.map((p) => p.id);
  const out = {};
  for (const [name, entry] of Object.entries(meals)) {
    const at = `meals ${JSON.stringify(name)}`;
    const key = asShown(name);
    if (!named.has(key)) throw new Error(`${at}: no meal of the file's carts has this name`);
    if (key in out) throw new Error(`${at}: named twice (as the store's names are read, whitespace collapsed)`);
    onlyFields(entry, ENTRY_FIELDS, at, ENTRY_OPTIONAL_FIELDS);
    if ("nutrition" in entry && !isObject(entry.nutrition)) throw new Error(`${at}.nutrition must be an object, the numbers per size`);
    const numbers = "nutrition" in entry && Object.keys(entry.nutrition).length > 0;
    if (!numbers && !("ingredients" in entry)) throw new Error(`${at}: carries neither nutrition nor ingredients`);
    if ("contains" in entry && !("ingredients" in entry)) throw new Error(`${at}: contains without ingredients`);
    for (const [size, facts] of Object.entries(entry.nutrition ?? {})) {
      if (!sizes.includes(size)) throw new Error(`${at}.nutrition: unknown field ${JSON.stringify(size)} (the sizes are ${sizes.join(", ")})`);
      onlyFields(facts, FACTS, `${at}.nutrition.${size}`);
      for (const fact of FACTS) {
        const n = facts[fact];
        if (!Number.isInteger(n) || n < 0) throw new Error(`${at}.nutrition.${size}.${fact} must be a whole number, 0 or more; got ${JSON.stringify(n)}`);
      }
    }
    for (const field of ENTRY_TEXTS.filter((f) => f in entry)) {
      if (typeof entry[field] !== "string") throw new Error(`${at}: ${field} must be text, got ${JSON.stringify(entry[field])}`);
      if (!asShown(entry[field])) throw new Error(`${at}: ${field} is blank`);
    }
    out[key] = {
      ...(numbers ? { nutrition: entry.nutrition } : {}),
      ...(entry.ingredients !== undefined ? { ingredients: asShown(entry.ingredients) } : {}),
      ...(entry.contains !== undefined ? { contains: asShown(entry.contains) } : {}),
    };
  }
  return out;
}

/** SPEC-week-content § 8 item 1: an updating file's `updating` is exactly true and its `lists` empty (any list, the shown
 *  one included, is refused, naming it). The week has no carts and no snacks: the page shows the updating card. */
function updatingWeek(json) {
  if (json.updating !== true) throw new Error(`updating must be true, got ${JSON.stringify(json.updating)}`);
  if (!isObject(json.lists)) throw new Error("lists must be an object, empty in an updating week");
  const names = Object.keys(json.lists);
  if (names.length) throw new Error(`an updating week carries no list; lists has ${names.map((n) => JSON.stringify(n)).join(", ")}`);
  return { updating: true, carts: {}, snacks: {} };
}

/**
 * One picks file (already parsed), checked against § 1 and SPEC-meal-selection § 5: the file's name is its delivery
 * Sunday; a version-1 file's fields are exactly `delivery` and `menus`, a version-2 file's `delivery`, `version` and
 * `lists`, and an updating week's (SPEC-week-content § 8) those and `updating`, true, its `lists` empty. Returns
 * { delivery, carts: { answerKey: { meals, links } }, snacks: { "7d"|"5d": meals } }, an updating week's with
 * `updating: true` and no cart and no snack; a version-2 week of more than one list also `lists` ([{ list, carts,
 * snacks }], in the words' order, `chefs-choice` first), and one with `meals` its entries by name. `words` ({ menus:
 * [[list, name], …], heading }: menuWords' menus and chefs_choice.heading) names the lists the page shows; without it,
 * `chefs-choice` alone. `photo`
 * ({ photos, host }: the photo sheets' manifest and the code of the host the page is served from) gives each link the
 * week's cells, by the tool's own --photos; without it, or with no sheet for the week, the links are today's.
 */
export function checkPicks(json, fileName, plans, photo = null, words = ONLY_SHOWN) {
  const date = PICKS_FILE.exec(fileName)?.[1];
  if (!date || !isSunday(date)) throw new Error(`the file name is not a Sunday's date (YYYY-MM-DD.json)`);
  if (!isObject(json)) throw new Error("the file must be an object");
  const version = json.version ?? 1;
  if (!VERSIONS.includes(version)) throw new Error(`version ${JSON.stringify(json.version)} is not one the page reads (${VERSIONS.join(", ")})`);
  const updating = version === 2 && "updating" in json;
  onlyFields(
    json,
    version === 1 ? [...FILE_FIELDS, ...("version" in json ? ["version"] : [])] : updating ? UPDATING_FILE_FIELDS : V2_FILE_FIELDS,
    "the file",
    version === 2 && !updating ? V2_OPTIONAL_FIELDS : [],
  );
  if (json.delivery !== date) throw new Error(`delivery ${JSON.stringify(json.delivery)} is not the file's date (${date})`);
  const { rows } = checkSelection(plans);
  if (updating) return { delivery: date, ...updatingWeek(json) };
  // SPEC-rung2-fill-c § 8: mpid -> the plan's allowed totals, the link tool's (and the block's) own table.
  const totals = new Map(Object.entries(countTable(plans)).map(([mpid, allowed]) => [Number(mpid), allowed]));
  // SPEC-every-menu-and-nutrition § 1 item 1: the lists the words name, in their order; § 2 item 2: the heading.
  const ctx = { plans, totals, photo, date, names: words.menus.map(([list]) => list), heading: words.heading };
  return { delivery: date, ...(version === 1 ? v1Carts(json, rows, ctx) : v2Carts(json, rows, ctx)) };
}

/** Every picks file in `dir`, each checked; a file breaking a rule throws, naming it. Sorted by delivery. */
export async function readPicks(dir, plans, photo = null, words = ONLY_SHOWN) {
  const names = (await readdir(dir)).filter((name) => name.endsWith(".json")).sort();
  const weeks = [];
  for (const name of names) {
    const path = join(dir, name);
    try {
      let json;
      try {
        json = JSON.parse(await readFile(path, "utf8"));
      } catch (err) {
        throw new Error(`not JSON: ${err.message}`);
      }
      weeks.push(checkPicks(json, basename(path), plans, photo, words));
    } catch (err) {
      throw new Error(`${shown(path)}: ${err.message}`);
    }
  }
  return weeks;
}

/** SPEC-plan-page-refinement § 8 item 6: the week a delivery Sunday's meals are for, Monday to Sunday after it, as the
 *  heading's {week}: "October 5–11"; across a month "September 28 – October 4" (no year: a week is always this one). */
export function weekRange(delivery) {
  const [from, to] = [addDays(delivery, 1), addDays(delivery, 7)];
  const month = (ymd) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long" }).format(new Date(`${ymd}T00:00:00Z`));
  const day = (ymd) => Number(ymd.slice(8));
  return month(from) === month(to) ? `${month(from)} ${day(from)}–${day(to)}` : `${month(from)} ${day(from)} – ${month(to)} ${day(to)}`;
}

/** A percentage for an inline style, without float noise. */
const pct = (n) => `${Number(n.toFixed(4))}%`;

/** One meal's tile style (SPEC-plan-page-refinement § 2 item 5): its cell of the week's sheet, sized by percentages so the
 *  stylesheet alone sets the tile's size; null (a plain tile) when the sheet has no cell for its store name. */
function thumbStyle(url, sheet, name) {
  const c = url && sheet.cells[name];
  if (!c) return null;
  const position = (offset, size, whole) => (whole === size ? "0%" : pct((offset / (whole - size)) * 100));
  return (
    `background-image:url("${url}");background-size:${pct((sheet.width / c.w) * 100)} ${pct((sheet.height / c.h) * 100)};` +
    `background-position:${position(c.x, c.w, sheet.width)} ${position(c.y, c.h, sheet.height)}`
  );
}

/**
 * SPEC-every-menu-and-nutrition § 3: a week's `meals` as the page shows them, or null without: `list`, one entry per meal
 * ({ nutrition?: { size: { cal, protein, carbs, fat, fiber } }, ingredients?, contains? }, each only when the meal has it:
 * § 3 item 3, no data, no claim), and `at`, a meal's place in it by its name as the link tool reads it. Since § 11
 * (2026-10-22) a size's five numbers go to the page as the file gives them, for its rings (the page draws each arc from
 * its number), in FACTS' order; the ingredients and Contains are their phrases filled here, as before. `rings` is the
 * rings' words (nutrition.rings and nutrition.grams), for a week one of whose meals has numbers, else null.
 */
function factsOf(meals, phrases) {
  if (!meals) return null;
  const numbers = (facts) => Object.fromEntries(FACTS.map((fact) => [fact, facts[fact]]));
  const list = Object.values(meals).map((entry) => ({
    ...(entry.nutrition ? { nutrition: Object.fromEntries(Object.entries(entry.nutrition).map(([size, facts]) => [size, numbers(facts)])) } : {}),
    ...(entry.ingredients !== undefined ? { ingredients: fill(phrases.ingredients, { text: entry.ingredients }) } : {}),
    ...(entry.contains !== undefined ? { contains: fill(phrases.contains, { text: entry.contains }) } : {}),
  }));
  const rings = list.some((entry) => entry.nutrition) ? { labels: phrases[RING_LABELS], grams: phrases.grams } : null;
  return { list, at: new Map(Object.keys(meals).map((name, i) => [name, i])), rings };
}

/**
 * What the page's script reads: the zone, and per open week its window and, per answer set with a cart
 * (SPEC-meal-selection § 8 item 2: `or-5d`, `and-5d-b`), the heading, the list (with each meal's tile style, or null),
 * and one checkout link per size (by mpid); with `snacks` (data/plans.json's `snacks.shown`), the week's snack lists by
 * days (`7d`, `5d`), shown and never linked (§ 9 item 3). Every word is a phrase of data/messages.json filled here.
 * `photos` is the photo sheets' manifest; every URL in it is built from its `base` (sheetUrl). § 7.2: each line shows
 * the meal's `display`; its tile is the cell of its `name`, the key.
 *
 * SPEC-every-menu-and-nutrition (`words` carries menuWords' `menus` and `nutrition`): each heading names its menu (§ 4's
 * `{menu}`, when the phrase carries it). A week of more than one list adds `menus`, the lists in the words' order, each
 * { list, name }, and each but the first (`chefs-choice`, whose carts and snacks are the week's own) its `carts` and
 * `snacks` (§ 2). A week with `meals` adds `facts`, an entry per meal (factsOf), and each cart holding a meal with one
 * its own `facts`, per meal the entry's place in the week's, or null (§ 3); and, since § 11, when a meal has numbers,
 * `rings`, the rings' words ({ labels: { cal, … }, grams }). A week without them is byte for byte what it was (§ 1
 * item 3).
 */
export function pageData(weeks, { words, zone, photos = null, assetPrefix = "", snacks = false, carted = false }) {
  const names = new Map(words.menus ?? []);
  return {
    zone,
    // SPEC-snacks-in-the-cart § 4: while carted, the card takes an answer set's snack link and hides Q4 where the week
    // has no snack list for the days.
    ...(snacks && carted ? { carted: true } : {}),
    weeks: weeks.map((w) => {
      const sheet = photos?.chefs_choice?.[w.delivery];
      const url = sheetUrl(photos, sheet, assetPrefix);
      const lines = (meals) => meals.map((m) => (m.qty > 1 ? fill(words.meal_qty, { meal: m.display, n: m.qty }) : m.display));
      const thumbs = (meals) => meals.map((m) => thumbStyle(url, sheet, m.name));
      const facts = factsOf(w.meals, words.nutrition);
      const cartsOf = (carts, list) =>
        Object.fromEntries(
          Object.entries(carts).map(([key, cart]) => [
            key,
            {
              heading: fill(words.heading, { week: weekRange(w.delivery), menu: names.get(list) ?? "" }),
              meals: lines(cart.meals),
              thumbs: thumbs(cart.meals),
              links: cart.links,
              ...(snacks && cart.snackLinks ? { snack_links: cart.snackLinks } : {}),
              ...(facts && cart.meals.some((m) => facts.at.has(m.name)) ? { facts: cart.meals.map((m) => facts.at.get(m.name) ?? null) } : {}),
            },
          ]),
        );
      const snacksOf = (lists) => Object.fromEntries(Object.entries(lists).map(([d, meals]) => [d, { meals: lines(meals), thumbs: thumbs(meals) }]));
      return {
        delivery: w.delivery,
        ...windowOf(w.delivery),
        // SPEC-week-content § 8 item 2: an updating week says so, its carts an empty object (the shape the Workers' check
        // reads, so they serve it); a week without `updating` is byte for byte what it was.
        ...(w.updating ? { updating: true } : {}),
        carts: cartsOf(w.carts, SHOWN_LIST),
        ...(snacks ? { snacks: snacksOf(w.snacks) } : {}),
        ...(w.lists
          ? {
              menus: w.lists.map(({ list, carts, snacks: lists }, i) => ({
                list,
                name: names.get(list),
                ...(i ? { carts: cartsOf(carts, list), ...(snacks ? { snacks: snacksOf(lists) } : {}) } : {}),
              })),
            }
          : {}),
        ...(facts ? { facts: facts.list } : {}),
        ...(facts?.rings ? { rings: facts.rings } : {}),
      };
    }),
  };
}

/** A piece of the card's markup (src/chefs-choice/<file>) with its words; a `{{…}}` left over refuses the build. `markup`
 *  fills slots with markup already made (SPEC-meal-selection § 12 item 3: the snack block, inside the list), unescaped. */
function cardHtml(template, words, file = "card.html", markup = {}) {
  const values = {
    CHECKOUT: words.checkout,
    OWN: words.own,
    SNACKS_HEADING: words.snacks_heading,
    SNACKS_NOT_CARTED: words.snacks_not_carted,
    UPDATING: words.updating, // SPEC-week-content § 8 item 3: the updating card, hidden until a week says `updating`
    MENUS_LABEL: words.menus_label, // SPEC-every-menu-and-nutrition § 2: the chooser's own name
  };
  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (whole, key) => {
    if (key in markup) return markup[key];
    if (!(key in values)) throw new Error(`src/chefs-choice/${file}: ${whole} has no value`);
    return esc(values[key]);
  });
  if (/\{\{|\}\}/.test(html)) throw new Error(`src/chefs-choice/${file}: a {{…}} is not a valid slot name`);
  return html;
}

/**
 * The page's three slots (SPEC-week-content § 2.1): always carried, `#picks-data` holding NO week. The script is one
 * function scope, so its names never meet the development page's top-level ones.
 */
export async function chefsChoice({ plans, messages, zone }) {
  const weeks = []; // ⛔ SPEC-week-content § 7's ruling: no build embeds a week; the bucket is the only source of one.
  const words = chefsChoiceWords(messages);
  menuWords(messages); // SPEC-every-menu-and-nutrition § 4: the menus' names and the nutrition phrases, refused when missing
  const read = (name) => readFile(join(CHEFS_CHOICE_SRC, name), "utf8");
  // SPEC-meal-selection § 9 item 3: the snack block only while Q4 is on the page. SPEC-snacks-in-the-cart § 4.3: while
  // snacks are carted, without the not-carted line (the list keeps its heading). § 12 item 3: the block is INSIDE the
  // card's one list, after the meals and before the list's checkout link (card.html's {{SNACKS}}), not a box of its own.
  const { shown: snacks, carted } = checkSelection(plans).snacks;
  const snackHtml = (await read("snacks.html")).replace(carted ? /\n[^\n]*id="cc-snacks-note"[^\n]*/ : /(?!)/, "");
  const snackBlock = snacks ? "\n" + cardHtml(snackHtml, words, "snacks.html").trimEnd() : "";
  return {
    slots: {
      PICKS_STYLE: "\n" + (await read("style.css")).trim(),
      PICKS_CARD: "\n" + cardHtml(await read("card.html"), words, "card.html", { SNACKS: snackBlock }).trimEnd(),
      PICKS_SCRIPT:
        `\n<script type="application/json" id="picks-data">${scriptJson(pageData(weeks, { words, zone, snacks, carted }))}</script>` +
        `\n<script>\n(function () {\n"use strict";\n${(await read("chefs-choice.js")).trim()}\n})();\n</script>`,
    },
  };
}
