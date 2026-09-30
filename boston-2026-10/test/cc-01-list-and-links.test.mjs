// CC-1 (SPEC-chefs-choice § 4): a picks file for the week of --on. The built page carries, for each count with picks,
// the list and one checkout link per size; the plan page opens it from the result card. Both builds carry it (the
// production page and the development page), and the development page's scripts all still run: the Chef's Choice
// script's inlined helpers do not collide with the offer box's own copies of them.
import test from "node:test";
import assert from "node:assert/strict";
import { loadJson, PLANS_PATH } from "../build.mjs";
import { handoffLink } from "../scripts/handoff-link.mjs";
import { mealKey } from "../src/storefront/meal-key.js";
import { simulatePage } from "./page-sim.mjs";
import {
  builtPage,
  CELLS,
  DAYS,
  FIXTURE,
  headingFor,
  mealLine,
  midday,
  mpidsFor,
  ON,
  openedCard,
  picksData,
  S,
  words,
} from "./cc-harness.mjs";

/** The link tool's inputs, as CC-1a compares with them: its plans (the order base) and its key function. */
const PLANS_FOR_LINK = await loadJson(PLANS_PATH);

test("CC-1a: the page built on --on carries the week: for each count, the list and one checkout link per size", async () => {
  const { html } = await builtPage({ on: ON });
  const data = picksData(html);
  assert.ok(data, "the page carries the week's picks (#picks-data)");
  assert.equal(data.zone, "America/New_York", "the enterprise's zone, data/save.json send_time_zone");
  assert.deepEqual(data.weeks.map((w) => w.delivery), [S], "one week: the fixture's");
  const [week] = data.weeks;
  assert.deepEqual(Object.keys(week.counts).sort(), Object.keys(FIXTURE.menus).sort(), "each count with picks");
  for (const [count, menu] of Object.entries(FIXTURE.menus)) {
    const shown = week.counts[count];
    assert.equal(shown.heading, headingFor(count, S), `${count}: the heading`);
    assert.deepEqual(shown.meals, menu.map((m) => mealLine(m)), `${count}: the list, in the file's order`);
    assert.deepEqual(Object.keys(shown.links).map(Number).sort(), [...mpidsFor(count)].sort(), `${count}: one link per size`);
    for (const mpid of mpidsFor(count)) {
      assert.equal(
        shown.links[mpid],
        handoffLink(PLANS_FOR_LINK, { mpid, items: menu.map((m) => ({ ...m, key: mealKey(m.name) })) }),
        `${count}, mpid ${mpid}: the link tool's own link`,
      );
    }
  }
});

test("CC-1b: the plan page opens it from the result card, for every size and count", async () => {
  const { html } = await builtPage({ on: ON });
  assert.ok(picksData(html), "the page carries the week's picks");
  for (const [hash, count, mpid] of CELLS) {
    const { state } = openedCard(html, { hash, now: midday(DAYS["S-5"]) });
    assert.equal(state.result, true, `${hash}: the result card is shown`);
    assert.equal(state.toggle, true, `${hash}: the card offers the week's Chef's Choice`);
    assert.equal(state.expanded, "true", `${hash}: pressed, it is open`);
    assert.equal(state.list, true, `${hash}: the list is shown`);
    assert.equal(state.heading, headingFor(count, S), `${hash}: the heading`);
    assert.deepEqual(state.meals, FIXTURE.menus[count].map((m) => mealLine(m)), `${hash}: the meals`);
    assert.equal(state.checkout, picksData(html).weeks[0].counts[count].links[mpid], `${hash}: Continue to checkout is the size's link`);
  }
});

test("CC-1c: the development page carries the same week, and all its scripts run with it", async () => {
  const prod = picksData((await builtPage({ on: ON })).html);
  const { html } = await builtPage({ target: "dev", on: ON });
  assert.deepEqual(picksData(html), prod, "the same embedded week as the production page");
  assert.ok(words(), "data/messages.json has the phrases");
  // page-sim runs every inline script in ONE context, as a browser does: a second top-level declaration of a helper
  // the offer box already declares would throw here.
  assert.doesNotThrow(() => simulatePage(html, { now: midday(DAYS["S-5"]) }), "no script throws");
});
