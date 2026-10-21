// EM4 (SPEC-every-menu-and-nutrition.md § 4, § 6): the words. The menus' names (`menus`, Chef's Choice first) and the
// nutrition's three phrases (`nutrition`: line, ingredients, contains) are data/messages.json's, placeholders for the
// Advisor's review, and the build refuses a missing name, phrase or placeholder. By the letterless-marker rule CC-7b
// uses: with every phrase, every menu's name and every text of the week a marker with no letters (placeholders kept),
// the card with the chooser shown, each menu chosen in turn, its nutrition lines and its panels, shows no letter but
// the week's dates. So no word was typed into the markup, the script or the content. Copies only; no file in the
// repository is written.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, ROOT } from "../build.mjs";
import { MESSAGES, weekOf } from "./cc-harness.mjs";
import { chooserOf, chooseMenu, FIXTURE_LIST, fixtureWords, menusPage, messagesFile, MENUS, MENUS_WEEK, openMenus, picksCopy } from "./em-harness.mjs";

const LETTER = /\p{L}/u;
const SENTINEL = /⟦\d+⟧/g;
const NUTRITION = { line: ["{cal}", "{protein}", "{carbs}", "{fat}"], ingredients: ["{text}"], contains: ["{text}"] };
/** The card's phrases a visitor reads with snacks carted (data/plans.json as committed): the not-carted line is not on
 *  the page then (SPEC-snacks-in-the-cart § 4.3), nor `updating` on a week that is not updating. */
const CARD = { heading: ["{menu}", "{week}"], meal_qty: ["{meal}", "{n}"], checkout: [], own: [], snacks_heading: [] };
const PARTS = ["cc-list", "cc-own"];
const HASH = "#lean-or-7d-s"; // both lists have a cart for it, and a snack list for every day

test("EM4a: data/messages.json names the menus, Chef's Choice first, and has nutrition's three phrases with their placeholders, each marked a placeholder", () => {
  const { menus, nutrition } = MESSAGES;
  assert.ok(menus && typeof menus === "object", "data/messages.json has `menus`");
  assert.equal(menus.status, "placeholder", "menus.status");
  const lists = Object.keys(menus).filter((k) => k !== "status");
  assert.equal(lists[0], "chefs-choice", "Chef's Choice first");
  assert.deepEqual(lists, ["chefs-choice"], "no list but chefs-choice is named in this repository (§ 4)");
  assert.ok(typeof menus["chefs-choice"] === "string" && menus["chefs-choice"].trim(), "chefs-choice's name");
  assert.ok(nutrition && typeof nutrition === "object", "data/messages.json has `nutrition`");
  assert.equal(nutrition.status, "placeholder", "nutrition.status");
  for (const [key, placeholders] of Object.entries(NUTRITION)) {
    assert.equal(typeof nutrition[key], "string", `nutrition.${key}`);
    for (const p of placeholders) assert.ok(nutrition[key].includes(p), `nutrition.${key} has ${p}`);
  }
  assert.ok(!nutrition.line.includes("{fiber}"), "the line names four numbers (fiber is carried, not shown)");
});

test("EM4b: no nutrition phrase is written in the page's sources", async () => {
  assert.ok(MESSAGES.nutrition, "data/messages.json has `nutrition`");
  const sources = ["src/template.html", "src/app.js", "src/chefs-choice/card.html", "src/chefs-choice/chefs-choice.js", "src/chefs-choice/style.css", "build.mjs", "scripts/chefs-choice.mjs", "scripts/week-content.mjs"];
  for (const file of sources) {
    const text = await readFile(join(ROOT, file), "utf8");
    for (const key of Object.keys(NUTRITION)) {
      for (const part of MESSAGES.nutrition[key].split(/\{[a-z]+\}/).map((s) => s.trim()).filter((s) => s.length >= 6)) {
        assert.ok(!text.includes(part), `${file} carries a phrase of nutrition.${key}: ${JSON.stringify(part)}`);
      }
    }
  }
});

/** The fixture's words and week with every phrase, menu name and text a marker; the markers the card must show. */
function marked() {
  const markers = [];
  const mark = (...keep) => {
    const m = `⟦${markers.length}⟧`;
    markers.push(m);
    return [m, ...keep].join(" ");
  };
  const messages = fixtureWords();
  const shown = [];
  const must = (text) => (shown.push(text.split(" ")[0]), text);
  for (const [key, placeholders] of Object.entries(CARD)) messages.chefs_choice[key] = must(mark(...placeholders));
  for (const key of Object.keys(messages.chefs_choice)) if (!(key in CARD) && key !== "status") messages.chefs_choice[key] = mark();
  for (const list of Object.keys(messages.menus)) if (list !== "status") messages.menus[list] = must(mark());
  for (const [key, placeholders] of Object.entries(NUTRITION)) messages.nutrition[key] = must(mark(...placeholders));
  const week = structuredClone(MENUS);
  const names = new Map();
  const markName = (item) => {
    if (!names.has(item.name)) names.set(item.name, mark());
    item.display = names.get(item.name);
  };
  for (const list of Object.values(week.lists)) {
    for (const cart of list.carts) cart.items.forEach(markName);
    for (const snacks of Object.values(list.snacks ?? {})) snacks.forEach(markName);
  }
  for (const entry of Object.values(week.meals)) {
    entry.ingredients = mark();
    if (entry.contains !== undefined) entry.contains = mark();
  }
  return { messages, week, shown };
}

/** The card's words at HASH with each menu chosen in turn: one string per menu, and the chooser as first shown. */
async function cardTexts(messages, week) {
  const picks = await picksCopy(week);
  try {
    const html = await menusPage({ messages, picks: picks.dir });
    const page = openMenus(html, HASH);
    const chooser = chooserOf(page);
    const texts = [];
    for (const list of chooser.values) {
      chooseMenu(page, list);
      texts.push(PARTS.map((id) => page.document.getElementById(id)?.textContent ?? "").join(" "));
    }
    return { chooser, texts };
  } finally {
    await picks.done();
  }
}

test("EM4c: with every phrase, menu name and text a letterless marker, the card with two menus shows no letter but the week", async () => {
  const { messages, week, shown } = marked();
  const { chooser, texts } = await cardTexts(messages, week);
  assert.deepEqual(chooser.values, ["chefs-choice", FIXTURE_LIST], "the chooser shows both menus, in the words' order");
  const seen = new Set();
  texts.forEach((text, i) => {
    for (const m of text.match(SENTINEL) ?? []) seen.add(m);
    const left = text.replace(SENTINEL, "").replaceAll(weekOf(MENUS_WEEK), "");
    assert.doesNotMatch(left, LETTER, `${chooser.values[i]}: letters not from data: ${JSON.stringify(left.match(/\S*\p{L}\S*/gu))}`);
  });
  const missing = shown.filter((m) => !seen.has(m));
  assert.deepEqual(missing, [], "every phrase of the card, both menus' names and the three nutrition phrases are shown");
});

test("EM4c (control): a menu's name left with its letters is caught", async () => {
  const { messages, week } = marked();
  messages.menus[FIXTURE_LIST] = "Left With Letters";
  const { texts } = await cardTexts(messages, week);
  assert.ok(texts.some((t) => t.replace(SENTINEL, "").includes("Left With Letters")), "the name with letters is seen");
});

/** The build with `messages`: the error, or null. */
async function buildWith(messages) {
  const words = await messagesFile(messages);
  const outDir = await mkdtemp(join(tmpdir(), "boston-em-04-"));
  try {
    await build({ target: "prod", outDir, messagesPath: words.path });
    return null;
  } catch (err) {
    return err;
  } finally {
    await words.done();
    await rm(outDir, { recursive: true, force: true });
  }
}

const without = (change) => {
  const m = structuredClone(MESSAGES);
  change(m);
  return m;
};

test("EM4d: the build refuses a missing menus name, a menus without Chef's Choice first, a missing nutrition phrase or placeholder", async () => {
  assert.equal(await buildWith(MESSAGES), null, "control: the committed words build");
  const cases = [
    ["no menus", without((m) => delete m.menus), /data\/messages\.json: menus/],
    ["no name for chefs-choice", without((m) => delete m.menus["chefs-choice"]), /data\/messages\.json: menus/],
    ["a blank name", without((m) => (m.menus["chefs-choice"] = " ")), /data\/messages\.json: menus\.chefs-choice is missing/],
    ["another list first", without((m) => (m.menus = { status: "placeholder", "fixture-first": "First", "chefs-choice": m.menus["chefs-choice"] })), /data\/messages\.json: menus must name chefs-choice first/],
    ["no nutrition", without((m) => delete m.nutrition), /data\/messages\.json: nutrition\.line is missing/],
    ["no ingredients phrase", without((m) => delete m.nutrition.ingredients), /data\/messages\.json: nutrition\.ingredients is missing/],
    ["the line without {fat}", without((m) => (m.nutrition.line = m.nutrition.line.replace("{fat}", "9"))), /data\/messages\.json: nutrition\.line has no \{fat\}/],
    ["contains without {text}", without((m) => (m.nutrition.contains = "Contains")), /data\/messages\.json: nutrition\.contains has no \{text\}/],
  ];
  for (const [label, messages, refusal] of cases) {
    const err = await buildWith(messages);
    assert.ok(err, `${label}: refused`);
    assert.match(err.message, refusal, label);
  }
});
