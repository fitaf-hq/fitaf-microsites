// Shared by the em-*.test.mjs files (SPEC-every-menu-and-nutrition.md: every picked menu on the plan card, and each meal's
// nutrition) and by Storybook's Chrome cases of the same contract (tools/storybook/test/em-chrome.test.mjs, which imports
// it by path). Not a test file itself. A page is made as every case makes one (cc-harness pageWithPicks: the build, which
// embeds no week, then the content of the week put into #picks-data as the Workers put the bucket's), with the FIXTURE's
// words (test/fixtures/menus-words.mjs: data/messages.json with an invented list's name), written to a temporary file.
// The page is read as a visitor reads it, over linkedom (cc-harness openPlanPage); the chooser is pressed as a browser
// would report it (the radio checked, then its `change`, which bubbles).
//
// ⭐ The expectations are the CONTRACT's, worked out here from the fixture file and the words, never read back from the
// content or the page's data.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { hiddenInTree, MESSAGES, openPlanPage, pageWithPicks, PLANS, readWithFillB, weekOf } from "./cc-harness.mjs";
import { FIXTURE_LIST, menusMessages } from "./fixtures/menus-words.mjs";
import { LOG_PREFIX } from "./r2-harness.mjs";

export { mpidOf } from "./ms-harness.mjs";
export { weekOf };

export { FIXTURE_LIST, FIXTURE_LIST_NAME, menusMessages } from "./fixtures/menus-words.mjs";

/** The fixture week: two lists (`chefs-choice`, the v2 fixture's own, and the invented one) and `meals`. */
export const MENUS_DIR = join(ROOT, "test", "fixtures", "picks-menus");
export const MENUS_WEEK = "2026-10-04";
export const MENUS_FILE = join(MENUS_DIR, `${MENUS_WEEK}.json`);
export const MENUS = JSON.parse(await readFile(MENUS_FILE, "utf8"));
export const SHOWN_LIST = "chefs-choice";

/** The individual sizes (data/plans.json `individual[].id`), the keys of a meal's `nutrition`. */
export const SIZES = PLANS.individual.map((p) => p.id);
/** The five numbers of a size (§ 1 item 2), and the four the line shows (§ 3 item 1: fiber is carried, not shown). */
export const FACTS = ["cal", "protein", "carbs", "fat", "fiber"];

/** A cart's answer key, from its own fields (SPEC-meal-selection § 3): `or-7d`, `and-5d-b`. */
export const keyOfCart = (c) => `${c.lunch_dinner}-${c.weekends ? "7d" : "5d"}${c.breakfast ? "-b" : ""}`;
/** The fixture's carts of `list`, by answer key. */
export const cartsOf = (list, week = MENUS) => Object.fromEntries(week.lists[list].carts.map((c) => [keyOfCart(c), c]));
/** The answer keys every list of the fixture has a cart for, and those only Chef's Choice has. */
export const BOTH = Object.keys(cartsOf(FIXTURE_LIST)).filter((k) => k in cartsOf(SHOWN_LIST));
export const CC_ONLY = Object.keys(cartsOf(SHOWN_LIST)).filter((k) => !(k in cartsOf(FIXTURE_LIST)));

/** A name as the page shows it (the link tool's reading: whitespace collapsed and trimmed). */
export const shownText = (s) => s.replace(/\s+/g, " ").trim();
const fill = (phrase, values) => phrase.replace(/\{([a-z]+)\}/g, (whole, k) => (k in values ? String(values[k]) : whole));

/** The data/messages.json of the fixture's words (or of `messages`, another copy), parsed. */
export const fixtureWords = (messages = MESSAGES) => menusMessages(messages);

/** `messages` written to a temporary file: its path, and a remover. */
export async function messagesFile(messages) {
  const dir = await mkdtemp(join(tmpdir(), "boston-em-words-"));
  const path = join(dir, "messages.json");
  await writeFile(path, JSON.stringify(messages, null, 2));
  return { path, done: () => rm(dir, { recursive: true, force: true }) };
}

/** A temporary picks directory holding `week` (by default the fixture) under its own date: its path, and a remover. */
export async function picksCopy(week = MENUS) {
  const dir = await mkdtemp(join(tmpdir(), "boston-em-picks-"));
  await writeFile(join(dir, `${week.delivery}.json`), JSON.stringify(week, null, 2));
  return { dir, done: () => rm(dir, { recursive: true, force: true }) };
}

/**
 * The page of the package at `root` (this one, or a mirror) with the fixture week in it, made with `messages` (by default
 * the fixture's words over data/messages.json) and `picks` (by default the fixture's directory). `plansPath` replaces
 * data/plans.json.
 */
export async function menusPage({ root = ROOT, target = "prod", picks = MENUS_DIR, messages = fixtureWords(), plansPath } = {}) {
  const words = await messagesFile(messages);
  try {
    return (await pageWithPicks({ root, target, picks, week: MENUS_WEEK, messagesPath: words.path, ...(plansPath ? { plansPath } : {}) })).html;
  } finally {
    await words.done();
  }
}

/** The plan page at `hash` (cc-harness openPlanPage; no date decides the week). */
export const openMenus = (html, hash) => openPlanPage(html, { hash });

/** What the chooser shows: whether it is shown, its menus' radios' names (their labels), values, and which is checked.
 *  ⚠ AMENDED by SPEC-ui-and-copy-pass § 5 items 1 and 3 (2026-10-26): *Choose my own meals* is the chips' last radio (its
 *  value `own`, BRIDGE), not a menu: it is read apart, as `own` (its name, and whether it is checked), or null. */
export function chooserOf(page) {
  const group = page.document.getElementById("cc-menus");
  const all = group ? [...group.querySelectorAll('input[type="radio"]')] : [];
  const own = all.find((r) => r.value === "own") ?? null;
  const radios = all.filter((r) => r !== own);
  return {
    exists: Boolean(group),
    shown: Boolean(group) && !hiddenInTree(group),
    names: radios.map((r) => shownText(r.parentElement.textContent)),
    values: radios.map((r) => r.value),
    checked: radios.filter((r) => r.checked).map((r) => r.value),
    own: own && { name: shownText(own.parentElement.textContent), checked: own.checked },
  };
}

/** Choose the menu `list` as a visitor would: its radio checked, then the radio's `change`, which bubbles. */
export function chooseMenu(page, list) {
  const radio = page.document.querySelector(`#cc-menus input[type="radio"][value="${list}"]`);
  if (!radio) throw new Error(`the chooser has no ${list}`);
  for (const r of page.document.querySelectorAll('#cc-menus input[type="radio"]')) r.checked = r === radio;
  radio.dispatchEvent(new page.document.defaultView.Event("change", { bubbles: true }));
}

/** Each meal of the card's list as a visitor reads it: its name, its nutrition line (or null: since § 11 item 2 there is
 *  none), whether it is a disclosure control (a button) with its aria-expanded and the panel it controls, that panel's
 *  lines (its ingredients and Contains) and its rings' words (each ring's value and label), and whether it is shown. */
export function mealsOf(page) {
  const ul = page.document.getElementById("cc-meals");
  return [...(ul?.children ?? [])].filter((el) => el.tagName === "LI").map((li) => {
    const button = li.querySelector("button");
    const panelId = button?.getAttribute("aria-controls") ?? null;
    const panel = panelId ? page.document.getElementById(panelId) : null;
    const line = li.querySelector(".cc-line");
    return {
      name: shownText(li.querySelector(".cc-name")?.textContent ?? ""),
      line: line && !hiddenInTree(line) ? shownText(line.textContent) : null,
      control: Boolean(button),
      expanded: button?.getAttribute("aria-expanded") ?? null,
      panelInside: Boolean(panel) && li.contains(panel),
      open: Boolean(panel) && !hiddenInTree(panel),
      more: panel ? [...panel.querySelectorAll("p")].map((p) => shownText(p.textContent)) : null,
      rings: panel ? [...panel.querySelectorAll(".cc-ring")].map((r) => shownText(r.textContent)) : null,
    };
  });
}

/**
 * § 11 item 4.1 (the Advisor's review of 2026-10-22): the store's own rings, as Fit AF's Shopify theme copies them from
 * the live order page's meal dialog (fitaf scripts/commerce/theme/snippets/fitaf-ring.liquid, assets/fitaf.css
 * `.fam-macros`), written here from the contract: one per number, in this order, each arc its value over a daily amount
 * (the store catalogue's recommended_daily_intake; calories the live dialog's 2,000) clamped to RING_SHARE, in the store's
 * colour, on a track; the circle radius 17 in a 40 viewBox, its stroke 2.5; the value `g` after all but calories.
 */
export const RINGS = [
  { fact: "cal", daily: 2000, colour: "#888888", grams: false },
  { fact: "protein", daily: 50, colour: "#ffad0d", grams: true },
  { fact: "carbs", daily: 275, colour: "#3ed3a3", grams: true },
  { fact: "fat", daily: 77, colour: "#ff5d5d", grams: true },
  { fact: "fiber", daily: 28, colour: "#303030", grams: true },
];
export const RING_TRACK = "#eceef0";
export const RING_SHARE = { least: 0.06, most: 1 };
export const RING_GEOMETRY = { viewBox: 40, radius: 17, stroke: 2.5 };
/** About 56 CSS px each (§ 11 item 4.1). */
export const RING_PX = 56;

/** The rings § 11 item 4 shows for a meal's `entry` at `size`, by the words: [{ label, value, share, colour }] in order,
 *  or null when the meal has no numbers for that size (§ 11 item 4.2: no rings, never another size's). */
export function ringsOf(entry, size, messages = fixtureWords()) {
  const numbers = entry?.nutrition?.[size];
  if (!numbers) return null;
  return RINGS.map(({ fact, daily, colour, grams }) => ({
    label: messages.nutrition.rings?.[fact] ?? null,
    value: grams ? fill(messages.nutrition.grams ?? "", { n: numbers[fact] }) : String(numbers[fact]),
    share: Math.min(RING_SHARE.most, Math.max(RING_SHARE.least, numbers[fact] / daily)),
    colour,
  }));
}
/** The panel's lines for a meal's entry: its ingredients, and its Contains when it has one (§ 3 item 2). */
export const moreOf = (entry, messages = fixtureWords()) => [
  fill(messages.nutrition.ingredients, { text: shownText(entry.ingredients) }),
  ...(entry.contains !== undefined ? [fill(messages.nutrition.contains, { text: shownText(entry.contains) })] : []),
];
/** The heading § 2 item 2 shows for the menu `list` of the fixture's words: the menu's name and the week. */
export const headingOf = (list, messages = fixtureWords()) =>
  fill(messages.chefs_choice.heading, { menu: messages.menus[list], week: weekOf(MENUS_WEEK) });

/**
 * A checkout link read by the SHIPPED reader of `#fitaf=` (cc-harness readWithFillB, as CC-2 and MS-2 read one: fill B's
 * text on the synthetic order page, its cards the cart's names, each pressed its count): { pressed: { name: n }, mpid },
 * the mpid as fill C logs it from the link's own `?mpid=`.
 */
export async function decodedLink(href, items) {
  const { page, h } = await readWithFillB(href, items.map((m) => m.name));
  const pressed = Object.fromEntries([...page.presses].map(([name, list]) => [name, list.length]));
  const logged = h.info.map(String).find((l) => l.startsWith(`${LOG_PREFIX} fill C, mpid `));
  return { pressed, mpid: logged ? Number(logged.slice(`${LOG_PREFIX} fill C, mpid `.length)) : null };
}
/** A cart's items as fill C must press them: { name: qty }, by the store's name. */
export const pressesOf = (items) => Object.fromEntries(items.map((m) => [m.name, m.qty]));

/** One meal's line as the list shows it: its `display`, with its count above 1 (chefs_choice.meal_qty). */
export const displayOf = ({ display, qty }, messages = fixtureWords()) =>
  qty > 1 ? fill(messages.chefs_choice.meal_qty, { meal: shownText(display), n: qty }) : shownText(display);
