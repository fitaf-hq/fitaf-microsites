// This week's Chef's Choice on the plan page (SPEC-chefs-choice.md), the build's side. build.mjs imports this module only
// when data/picks/ exists. It reads every data/picks/<sunday>.json, checks each (§ 1), and turns the weeks still open on
// the build's date (§ 2) into the page's three slots: PICKS_STYLE (src/chefs-choice/style.css), PICKS_CARD
// (src/chefs-choice/card.html, its words from data/messages.json) and PICKS_SCRIPT (the week's data as JSON, then the
// offer's zoned-date helpers inlined as the offer box inlines them, then src/chefs-choice/chefs-choice.js).
//
// ⛔ The menus are checked by the LINK TOOL'S OWN RULES, by importing it: each menu, for each size, goes through
// payloadFromArgs (qty 1..MAX_QTY, names distinct and no two sharing a key, the counts making the plan's count) exactly
// as `npm run handoff:link` takes it, and its link is the tool's handoffLink, whose keys are the one mealKey
// (src/storefront/meal-key.js). No key function and no encoder live here (CC-2).
//
// § 7: each meal is { name, display, qty }. `name` (the store's card name) is the ONLY key: the link tool's --item, the
// tile's cell and the --photos payload read it. `display` (the KMS's name) is what the list shows, as the tool reads a
// name (whitespace collapsed and trimmed), and nothing else: it is not keyed, and nothing is checked between displays.
import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import { declaration, esc, NO_PICKS, ROOT, scriptJson, sheetUrl, shownCounts, ZONED_DATE_HELPERS } from "../build.mjs";
import { isLive } from "../src/worker/offers.js";
import { addDays, daysBetween } from "../src/worker/zoned-time.js";
import { countTable } from "./build-storefront.mjs";
import { asShown, handoffLink, payloadFromArgs } from "./handoff-link.mjs";

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
/** § 3's phrases in data/messages.json's `chefs_choice` the card shows, and the placeholders each must carry. Since
 *  SPEC-plan-page-refinement § 1–2 the list is always open: `open` (its button) and `note` are kept there, not read. */
const PHRASES = { heading: ["{week}"], meal_qty: ["{meal}", "{n}"], checkout: [], own: [] };

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

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** Refuse any field but `allowed`, and a missing one. `where` names the object in the message. */
function onlyFields(value, allowed, where) {
  if (!isObject(value)) throw new Error(`${where} must be an object`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`${where}: unknown field ${JSON.stringify(key)}`);
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
 * One picks file (already parsed), checked against § 1: the file's name is its delivery Sunday; the fields are exactly
 * `delivery` and `menus`; each menu is for a count the page shows, and for each size of that count the link tool takes
 * it. Returns { delivery, menus: { count: { meals: [{ name, display, qty }], links: { mpid: url } } } }, `name` as the
 * tool keys it and `display` as the page shows it (each with whitespace collapsed and trimmed: § 7.1); only `name`
 * reaches the tool. `photo` ({ photos, host }: the photo sheets' manifest and
 * the code of the host the page is served from) gives each link the week's cells, by the tool's own --photos
 * (SPEC-rung2-progress-and-checkout § 17.1); without it, or with no sheet for the week, the links are today's.
 */
export function checkPicks(json, fileName, plans, photo = null) {
  const date = PICKS_FILE.exec(fileName)?.[1];
  if (!date || !isSunday(date)) throw new Error(`the file name is not a Sunday's date (YYYY-MM-DD.json)`);
  onlyFields(json, FILE_FIELDS, "the file");
  if (json.delivery !== date) throw new Error(`delivery ${JSON.stringify(json.delivery)} is not the file's date (${date})`);
  if (!isObject(json.menus)) throw new Error(`menus must be an object, a list of meals per count`);
  if (!Object.keys(json.menus).length) throw new Error(`no menu: "menus" names no count`);
  const counts = shownCounts(plans).map(String);
  const needs = new Map(Object.entries(countTable(plans)).map(([mpid, n]) => [Number(mpid), n]));
  const menus = {};
  for (const [count, menu] of Object.entries(json.menus)) {
    if (!counts.includes(count)) throw new Error(`count ${JSON.stringify(count)} is not a count the page shows (${counts.join(", ")})`);
    const meals = mealsOf(menu, `menus.${count}`);
    const links = {};
    let items = null;
    for (const plan of plans.individual) {
      const { mpid } = plan.counts.find((c) => c.meals_per_week === Number(count));
      const argv = ["--mpid", String(mpid), ...meals.flatMap((m) => ["--item", `${m.name}:${m.qty}`])];
      if (photo?.photos?.chefs_choice?.[date]) argv.push("--photos", date, "--host", String(photo.host));
      let payload;
      try {
        payload = payloadFromArgs(argv, needs, photo?.photos);
      } catch (err) {
        throw new Error(`menus.${count}: ${err.message}`);
      }
      links[mpid] = handoffLink(plans, payload);
      // The tool's items are the menu's meals in order (one --item each), so each takes its own display.
      items ??= payload.items.map(({ name, qty }, i) => ({ name, display: asShown(meals[i].display), qty }));
    }
    menus[count] = { meals: items, links };
  }
  return { delivery: date, menus };
}

/** Every picks file in `dir`, each checked; a file breaking a rule throws, naming it. Sorted by delivery. */
export async function readPicks(dir, plans, photo = null) {
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
      weeks.push(checkPicks(json, basename(path), plans, photo));
    } catch (err) {
      throw new Error(`${shown(path)}: ${err.message}`);
    }
  }
  return weeks;
}

/** § 2: the weeks whose window has not ended on `on` (the build's date). A page built early carries next week's. */
export const openOn = (weeks, on) => weeks.filter((w) => daysBetween(on, windowOf(w.delivery).valid_to) >= 0);

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

/** What the page's script reads: the zone, and per open week its window and, per count, the heading, the list (with each
 *  meal's tile style, or null), and one checkout link per size (by mpid). Every word is a phrase of data/messages.json
 *  filled here. `photos` is the photo sheets' manifest; every URL in it is built from its `base` (sheetUrl). § 7.2: each
 *  line shows the meal's `display`; its tile is the cell of its `name`, the key. */
export function pageData(weeks, { words, zone, photos = null, assetPrefix = "" }) {
  return {
    zone,
    weeks: weeks.map((w) => ({
      delivery: w.delivery,
      ...windowOf(w.delivery),
      counts: Object.fromEntries(
        Object.entries(w.menus).map(([count, menu]) => {
          const sheet = photos?.chefs_choice?.[w.delivery];
          const url = sheetUrl(photos, sheet, assetPrefix);
          return [
            count,
            {
              heading: fill(words.heading, { week: weekRange(w.delivery) }),
              meals: menu.meals.map((m) => (m.qty > 1 ? fill(words.meal_qty, { meal: m.display, n: m.qty }) : m.display)),
              thumbs: menu.meals.map((m) => thumbStyle(url, sheet, m.name)),
              links: menu.links,
            },
          ];
        }),
      ),
    })),
  };
}

/** The card's markup (src/chefs-choice/card.html) with its words; a `{{…}}` left over refuses the build. */
function cardHtml(template, words) {
  const values = { CHECKOUT: words.checkout, OWN: words.own };
  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (whole, key) => {
    if (!(key in values)) throw new Error(`src/chefs-choice/card.html: ${whole} has no value`);
    return esc(values[key]);
  });
  if (/\{\{|\}\}/.test(html)) throw new Error("src/chefs-choice/card.html: a {{…}} is not a valid slot name");
  return html;
}

/**
 * The page's slots for the weeks open on `on`, or none (the page as before: CC-4). The script is one function scope, so
 * its copies of the helpers never meet the offer box's (the development page declares the same names at the top level).
 */
export async function chefsChoice({ plans, messages, dir, on, zone, photos = null, assetPrefix = "", photoHost = 0 }) {
  const all = await readPicks(dir, plans, { photos, host: photoHost });
  const weeks = openOn(all, on);
  const summary = weeks.map((w) => ({ delivery: w.delivery, ...windowOf(w.delivery), counts: Object.keys(w.menus) }));
  if (!weeks.length) return { slots: NO_PICKS, weeks: summary };
  const words = chefsChoiceWords(messages);
  const read = (name) => readFile(join(CHEFS_CHOICE_SRC, name), "utf8");
  const helpers = ["const FORMATTERS = new Map();", ...[...ZONED_DATE_HELPERS, isLive].map(declaration)].join("\n");
  return {
    slots: {
      PICKS_STYLE: "\n" + (await read("style.css")).trim(),
      PICKS_CARD: "\n" + cardHtml(await read("card.html"), words).trimEnd(),
      PICKS_SCRIPT:
        `\n<script type="application/json" id="picks-data">${scriptJson(pageData(weeks, { words, zone, photos, assetPrefix }))}</script>` +
        `\n<script>\n(function () {\n"use strict";\n${helpers}\n${(await read("chefs-choice.js")).trim()}\n})();\n</script>`,
    },
    weeks: summary,
  };
}
