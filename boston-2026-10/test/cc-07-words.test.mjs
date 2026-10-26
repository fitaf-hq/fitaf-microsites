// CC-7 (SPEC-chefs-choice § 3, § 4): words. Every phrase of § 3 comes from data/messages.json (its `chefs_choice` key),
// by the letterless-marker rule the mock-ups' P2 uses: with every phrase replaced by a marker that has no letters (its
// placeholders kept) and every meal's shown name (`display`, § 7.2) by another, the card, opened, shows no letter but the
// delivery date as the offer writes it. So no word was typed into the template, the card's markup or the script. The copies are made in a
// temporary directory; no file in the repository is edited.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import {
  builtPage,
  FIXTURE,
  MESSAGES,
  midday,
  DAYS,
  openPlanPage,
  pageWithPicks,
  picksData,
  picksDir,
  PLANS,
  S,
  weekOf,
} from "./cc-harness.mjs";

const LETTER = /\p{L}/u;
const SENTINEL = /⟦\d+⟧/g;
/** The phrases of § 3 in data/messages.json the card shows, and the placeholders each must keep. Since
 *  SPEC-plan-page-refinement §§ 1–2 the list is always open: `open` (its button) and `note` are no longer shown. */
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 5 items 1 and 3 (2026-10-26): the card's heading (`explore`) and the note over the
// week's full list (`own_note`, BRIDGE) are the card's words too.
const PHRASES = { heading: ["{week}"], meal_qty: ["{meal}", "{n}"], checkout: [], own: [], explore: [], own_note: [] }; // heading: § 8 item 6
/** Since SPEC-meal-selection § 12 item 3 the snack block is INSIDE the list (`cc-list`), so its two phrases are the card's
 *  words too: CC-7b marks them. CC-7a's source check keeps PHRASES alone ("Snacks" is also part of the script's own
 *  function name, renderSnacks, not a phrase typed into it). */
const SNACK_PHRASES = { snacks_heading: [], snacks_not_carted: [] };
/** The card's parts a visitor reads (always open). ⚠ AMENDED by SPEC-ui-and-copy-pass § 5 item 1: *Choose my own meals*
 *  is a chip inside the list; Continue to checkout follows the price, after the list. */
const PARTS = ["cc-list", "cc-checkout"];

/** The card's words at `hash`, as one string. */
function cardText(html, hash) {
  const page = openPlanPage(html, { hash, now: midday(DAYS["S-5"]) });
  assert.ok(page.has("cc-list"), "the card offers the week's Chef's Choice");
  return PARTS.map((id) => page.el(id).textContent).join(" ");
}

/** The page with `messages` and `picks` in copies. Its data/plans.json is a copy too, with snacks shown and not carted
 *  (SPEC-meal-selection § 11: a case asserting about snacks sets its own flags), so both of the snack block's phrases are
 *  in the card's list (§ 12 item 3), whatever the committed flags. */
async function withCopies(messages, picks, fn) {
  const dir = await mkdtemp(join(tmpdir(), "boston-cc-07-"));
  const picksPath = await picksDir({ [`${S}.json`]: picks });
  try {
    const messagesPath = join(dir, "messages.json");
    await writeFile(messagesPath, JSON.stringify(messages, null, 2));
    const plansPath = join(dir, "plans.json");
    await writeFile(plansPath, JSON.stringify({ ...PLANS, snacks: { shown: true, carted: false } }, null, 2));
    return await fn((await pageWithPicks({ picks: picksPath, messagesPath, plansPath })).html);
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(picksPath, { recursive: true, force: true });
  }
}

test("CC-7a: data/messages.json has each phrase of § 3, each with its placeholders; none is in the source", async () => {
  const words = MESSAGES.chefs_choice;
  assert.ok(words, "data/messages.json has a chefs_choice key");
  // SPEC-every-menu-and-nutrition § 11 item 1 (2026-10-22): the committed heading is the menu's name alone, `{menu}`;
  // `{week}` is a placeholder the build still accepts (CC-7b and CC-7c use it) and these words no longer carry.
  for (const [key, placeholders] of Object.entries({ ...PHRASES, heading: ["{menu}"] })) {
    assert.equal(typeof words[key], "string", `chefs_choice.${key}`);
    for (const p of placeholders) assert.ok(words[key].includes(p), `chefs_choice.${key} has ${p}`);
  }
  assert.ok(!words.heading.includes("{week}"), "chefs_choice.heading shows no range (§ 11 item 1)");
  const sources = [
    "src/template.html",
    "src/app.js",
    "src/chefs-choice/card.html",
    "src/chefs-choice/checkout.html",
    "src/chefs-choice/chefs-choice.js",
    "src/chefs-choice/style.css",
    "build.mjs",
    "scripts/chefs-choice.mjs",
  ];
  for (const file of sources) {
    const text = await readFile(join(ROOT, file), "utf8");
    for (const key of Object.keys(PHRASES)) {
      for (const part of words[key].split(/\{[a-z]+\}/).map((s) => s.trim()).filter((s) => s.length >= 6)) {
        assert.ok(!text.includes(part), `${file} carries a phrase of chefs_choice.${key}: ${JSON.stringify(part)}`);
      }
    }
  }
});

test("CC-7b: with every phrase and every meal name a letterless marker, the opened card shows no letter but the date", async () => {
  assert.ok(MESSAGES.chefs_choice, "data/messages.json has a chefs_choice key");
  const markers = [];
  const mark = (...keep) => {
    const m = `⟦${markers.length}⟧`;
    markers.push(m);
    return [m, ...keep].join(" ");
  };
  const messages = structuredClone(MESSAGES);
  for (const [key, placeholders] of Object.entries({ ...PHRASES, ...SNACK_PHRASES })) messages.chefs_choice[key] = mark(...placeholders);
  // § 7.2: the list shows each meal's `display`, so the marker goes there; `name` (the key, the store's spelling) keeps
  // its letters, so a line showing `name` would be caught here too.
  const picks = structuredClone(FIXTURE);
  const names = new Map();
  for (const menu of Object.values(picks.menus)) {
    for (const meal of menu) {
      if (!names.has(meal.name)) names.set(meal.name, mark());
      meal.display = names.get(meal.name);
    }
  }
  await withCopies(messages, picks, async (html) => {
    assert.ok(picksData(html), "the marked week reaches the page");
    const seen = new Set();
    for (const hash of ["#lean-7", "#lean-14"]) {
      const text = cardText(html, hash);
      for (const m of text.match(SENTINEL) ?? []) seen.add(m);
      // ⚠ AMENDED by SPEC-ui-and-copy-pass § 5 item 1 (2026-10-26): a week of one list names its one chip by its heading,
      // so the heading (and its date) is read twice.
      const left = text.replace(SENTINEL, "").replaceAll(weekOf(S), "");
      assert.doesNotMatch(left, LETTER, `${hash}: letters not from data/: ${JSON.stringify(left.match(/\S*\p{L}\S*/gu))}`);
    }
    assert.deepEqual([...seen].sort(), [...markers].sort(), "every phrase and every name is shown");
  });
});

test("CC-7b (control): a word typed into the card is caught", async () => {
  const messages = structuredClone(MESSAGES);
  assert.ok(messages.chefs_choice, "data/messages.json has a chefs_choice key");
  for (const key of Object.keys(PHRASES)) messages.chefs_choice[key] = `⟦0⟧ ${PHRASES[key].join(" ")}`;
  await withCopies(messages, FIXTURE, async (html) => {
    const tampered = html.replace('id="cc-explore">', 'id="cc-explore">Now open! '); // § 5 item 1: the card's heading
    assert.notEqual(tampered, html, "the mutation anchor is present");
    assert.match(cardText(tampered, "#lean-7").replace(SENTINEL, ""), /Now open!/, "the typed words are seen");
  });
});

test("CC-7c: a phrase changed in a copy of data/messages.json changes the card; the committed one shows its own", async () => {
  assert.ok(MESSAGES.chefs_choice, "data/messages.json has a chefs_choice key");
  const shipped = cardText((await builtPage()).html, "#lean-7");
  for (const key of ["checkout", "own"]) {
    assert.ok(shipped.includes(MESSAGES.chefs_choice[key]), `the card shows chefs_choice.${key} as committed`);
  }
  const messages = structuredClone(MESSAGES);
  messages.chefs_choice.own = "CC-7 ONE PLACE";
  messages.chefs_choice.heading = "CC-7 HEADING {week}";
  await withCopies(messages, FIXTURE, async (html) => {
    const text = cardText(html, "#lean-7");
    assert.ok(text.includes("CC-7 ONE PLACE"), "the changed phrase is shown");
    assert.ok(text.includes(`CC-7 HEADING ${weekOf(S)}`), "the changed heading, filled");
    assert.ok(!text.includes(MESSAGES.chefs_choice.own), "and the old one is gone");
  });
});

test("CC-7d: the card's style writes no word (CSS content)", async () => {
  const path = join(ROOT, "src", "chefs-choice", "style.css");
  assert.ok(existsSync(path), "the card has its own stylesheet");
  const css = await readFile(path, "utf8");
  const contents = [...css.matchAll(/content:\s*("[^"]*"|'[^']*')/g)].map((m) => m[1]);
  for (const value of contents) {
    const drawn = value.slice(1, -1).replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
    assert.doesNotMatch(drawn, LETTER, `CSS content ${value}`);
  }
});
