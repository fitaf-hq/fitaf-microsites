// UF3 (SPEC-ui-and-copy-pass.md § 2.2 items 3 and 5): Family's menu choice exactly as the individual's. Chef's Choice is
// the week's picks, N of them, chosen as the individual 5- and 10-meal carts choose theirs: *or* takes the cart of lunch
// or dinner on weekdays (or-5d) and *and* the cart of lunch and dinner on weekdays (and-5d), each when it holds the
// family count; its checkout link carries those meals to the store's Family order page (mpid 35), read by the SHIPPED
// fill (cc-harness readWithFillB); *Choose my own meals* is that page, rung 1's door. A cart that does not hold the
// family count (a week's or-5d made before the extra meal, 4 meals on the 4 plan) makes no Family link, and Family shows
// *Choose your meals* alone, as the individual card does with no cart. Family has no goal and no macro targets: a meal's
// panel on Family shows no rings (a size's numbers are an individual size's), its ingredients as before. The content: a
// Family link (links["35"]) on exactly those carts, never a snack link. Both builds.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PICKS_DIR } from "../build.mjs";
import { weekData } from "../scripts/week-content.mjs";
import { card, hiddenInTree, PLANS } from "./cc-harness.mjs";
import { decodedLink, fixtureWords, MENUS_DIR, menusPage, mealsOf as menuMealsOf, messagesFile, openMenus, pressesOf } from "./em-harness.mjs";
import { open, V2_CARTS, V2_DIR } from "./ms-harness.mjs";
import { FAMILY_CART, FAMILY_MEALS, FAMILY_MPID } from "./uf-harness.mjs";
import { pages } from "./uq-harness.mjs";

const { production, development } = await pages();
const BUILDS = { production, development };
const DOOR = `${PLANS.order_base_url}?mpid=${FAMILY_MPID}`;
/** The committed week whose weekday carts hold 5 and 10 (data/picks/2026-11-01.json, five menus). */
const WEEK = "2026-11-01";
const total = (items) => items.reduce((sum, m) => sum + m.qty, 0);
/** A picks file, parsed; and one of its lists' carts by answer set (the key the content and the card use). */
const picksFile = async (dir, week) => JSON.parse(await readFile(join(dir, `${week}.json`), "utf8"));
const cartsByKey = (file, list) =>
  Object.fromEntries(file.lists[list].carts.map((c) => [`${c.lunch_dinner}-${c.weekends ? "7d" : "5d"}${c.breakfast ? "-b" : ""}`, c]));

test("UF3: Family *and* on the fixture week: and-5d's ten meals, the checkout link carrying them to mpid 35; Choose my own meals the Family order page", async () => {
  const cart = V2_CARTS[FAMILY_CART.and];
  assert.equal(total(cart.items), FAMILY_MEALS.and, "control: the fixture's and-5d holds 10");
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html, "#family-and");
    const shown = card(page);
    assert.deepEqual([shown.result, shown.list, shown.choose], [true, true, false], `${build}: the list, not Choose your meals`);
    assert.deepEqual(shown.meals, card(open(html, "#lean-and-5d")).meals, `${build}: the individual and-5d card's meals`);
    assert.equal(shown.ownHref, DOOR, `${build}: Choose my own meals, the Family order page`);
    const link = await decodedLink(shown.checkout, cart.items);
    assert.deepEqual(link, { pressed: pressesOf(cart.items), mpid: FAMILY_MPID }, `${build}: the checkout carries the ten to mpid 35`);
  }
});

test("UF3: a cart that does not hold the family count makes no Family link: the fixture's or-5d (4 meals) gives Choose your meals alone", () => {
  assert.equal(total(V2_CARTS[FAMILY_CART.or].items), 4, "control: the fixture's or-5d holds 4 (made before the extra meal)");
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html, "#family-or");
    const shown = card(page);
    assert.deepEqual([shown.result, shown.list, shown.choose, shown.chooseHref], [true, false, true, DOOR], `${build}: Choose your meals to the Family order page`);
  }
});

test(`UF3: the week delivered ${WEEK}: Family *or* takes or-5d's five and *and* and-5d's ten, each carried to mpid 35`, async () => {
  const [week] = (await weekData({ week: WEEK, target: "prod" })).data.weeks;
  const carts = cartsByKey(await picksFile(PICKS_DIR, WEEK), "chefs-choice");
  for (const [ld, key] of Object.entries(FAMILY_CART)) {
    const { items } = carts[key];
    assert.equal(total(items), FAMILY_MEALS[ld], `control: ${key} holds ${FAMILY_MEALS[ld]}`);
    const link = week.carts[key]?.links?.[FAMILY_MPID];
    assert.ok(link, `${key}: a Family link in the content`);
    assert.deepEqual(await decodedLink(link, items), { pressed: pressesOf(items), mpid: FAMILY_MPID }, `${key}: its meals to mpid 35`);
  }
});

test("UF3: the content's Family links are on exactly the carts Family takes that hold its count, in every list; never a snack link", async () => {
  // The two-menu fixture's second list is named by its own words (test/fixtures/menus-words.mjs), as EM's cases read it.
  const words = await messagesFile(fixtureWords());
  try {
    for (const [label, dir, week, messagesPath] of [["the fixture week", V2_DIR, "2026-10-04"], ["the two-menu fixture", MENUS_DIR, "2026-10-04", words.path], [`the week delivered ${WEEK}`, PICKS_DIR, WEEK]]) {
      await familyLinksAre(label, dir, week, messagesPath);
    }
  } finally {
    await words.done();
  }
});

/** UF3's content check over one week: a Family link exactly on the carts Family takes that hold its count. */
async function familyLinksAre(label, dir, week, messagesPath) {
  const file = await picksFile(dir, week);
  const [w] = (await weekData({ picksDir: dir, week, target: "prod", ...(messagesPath ? { messagesPath } : {}) })).data.weeks;
  const lists = [{ list: "chefs-choice", carts: w.carts }, ...(w.menus ?? []).filter((m) => m.carts)];
  assert.equal(lists.length, Object.keys(file.lists).length, `${label}: control: every list read`);
  for (const { list, carts } of lists) {
    const picked = cartsByKey(file, list);
    for (const [key, cart] of Object.entries(carts)) {
      const family = Object.keys(FAMILY_CART).find((ld) => FAMILY_CART[ld] === key);
      const holds = Boolean(family) && total(picked[key].items) === FAMILY_MEALS[family];
      const link = cart.links[FAMILY_MPID];
      assert.equal(Boolean(link), holds, `${label}, ${list}, ${key}: a Family link only on a cart Family takes that holds its count`);
      if (link) assert.ok(link.startsWith(`${DOOR}#fitaf=`), `${label}, ${list}, ${key}: to the Family order page`);
      assert.equal(Object.hasOwn(cart.snack_links ?? {}, String(FAMILY_MPID)), false, `${label}, ${list}, ${key}: no Family snack link`);
    }
  }
}

test("UF3: no goal and no macro targets on Family: a meal's panel shows no rings, its ingredients as on the individual card", async () => {
  const html = await menusPage();
  const individual = menuMealsOf(openMenus(html, "#lean-and-5d"));
  const family = menuMealsOf(openMenus(html, "#family-and"));
  assert.ok(individual.some((m) => m.rings?.length), "control: the individual card's meals show rings for the size");
  assert.equal(family.length, individual.length, "the same meals");
  for (const [i, m] of family.entries()) {
    assert.deepEqual(m.rings ?? [], [], `${m.name}: no rings on Family`);
    const theirs = individual[i].more?.filter((line) => line);
    if (theirs?.length) assert.deepEqual(m.more, individual[i].more, `${m.name}: its ingredients and Contains as the individual card's`);
  }
  assert.equal(hiddenInTree(openMenus(html, "#family-and").el("result")), false, "control: the Family result shown");
});
