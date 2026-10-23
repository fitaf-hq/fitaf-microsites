// UC7 (SPEC-ui-and-copy-pass.md § 1 item 7, the Advisor's note f-meal-count: "the See All Plans modal should show this
// all as discounts"; the contract's default until he says what he meant): while an offer is current, each plan's weekly
// price in See all plans (#all) shows struck through, with its price after the offer's percentage beside it: the
// percentage read from the offer (data/offers.json `savings_percent`), never a literal; each total rounded to the cent.
// After the offer, with an offer that carries no percentage, and on the production page with `production` false (it has
// no offer), the grid is as built. Worked out here from data/plans.json's cents and the offer's percentage, on their own.
import test from "node:test";
import assert from "node:assert/strict";
import offersFile from "../data/offers.json" with { type: "json" };
import plans from "../data/plans.json" with { type: "json" };
import { renderPage } from "../build.mjs";
import { openPlanPage } from "./cc-harness.mjs";
import { devPage } from "./dev-page.mjs";
import { loadPlans } from "./helpers.mjs";
import { FIXTURE_OFFERS } from "./offer-box-fixture.mjs";
import { saveData } from "./sp-production.mjs";
import { approvedWeekPage, NOW, weekPage } from "./uc-harness.mjs";

const AFTER_OFFER_MS = Date.parse("2026-10-30T16:00:00.000Z"); // noon in New York, the day after the offer's last
const dollars = (cents) => `$${Math.floor(cents / 100).toLocaleString("en-US")}.${String(cents % 100).padStart(2, "0")}`;
const [offer] = offersFile.offers;

/** Every cell of the grid (each plan at each shown count), by its data-cell: its weekly total as the build writes it, and
 *  after `percent`, from data/plans.json's cents. */
function expectedCells(percent) {
  const counts = plans.shown_counts.map((c) => c.meals_per_week);
  const out = {};
  for (const plan of plans.individual) {
    for (const cell of plan.counts.filter((c) => counts.includes(c.meals_per_week))) {
      const total = cell.meals_per_week * cell.price_per_meal_cents;
      out[`${plan.id}-${cell.meals_per_week}`] = {
        before: `${dollars(total)}/wk`,
        after: percent === null ? null : `${dollars(Math.round((total * (100 - percent)) / 100))}/wk`,
      };
    }
  }
  return { counts, cells: out };
}

/** The grid as a visitor's page shows it: per cell, its struck price, its price after the offer, and its text. */
function gridAt(html, now) {
  const page = openPlanPage(html, { hash: "#lean-7", now });
  const out = {};
  for (const cell of page.document.querySelectorAll("#all [data-cell]")) {
    const small = cell.querySelector("small");
    out[cell.getAttribute("data-cell")] = {
      struck: small.querySelector("s")?.textContent ?? null,
      after: small.querySelector(".cell-after")?.textContent ?? null,
      text: small.textContent.replace(/\s+/g, " ").trim(),
      label: cell.getAttribute("aria-label"),
    };
  }
  assert.equal(page.el("all").hasAttribute("open"), false, "control: the dialog is closed (its cells are drawn when opened)");
  return out;
}

test("UC7: the offer carries its percentage, the one its words say", () => {
  assert.equal(offer.savings_percent, 25, "savings_percent, a whole number");
  for (const words of [offer.label, offer.headline]) assert.ok(words.includes(`${offer.savings_percent}%`), `control: "${words}" says ${offer.savings_percent}%`);
});

test("UC7: while the offer is current, each weekly price struck through, its price after the offer beside it, to the cent", async () => {
  const { cells } = expectedCells(offer.savings_percent);
  for (const [name, html] of [["the development page", await weekPage()], ["the production page (production true)", (await approvedWeekPage()).html]]) {
    const grid = gridAt(html, NOW);
    assert.deepEqual(Object.keys(grid).sort(), Object.keys(cells).sort(), `${name}: control: the grid's cells, every plan at every shown count`);
    for (const [id, cell] of Object.entries(grid)) {
      assert.deepEqual(
        { struck: cell.struck, after: cell.after },
        { struck: cells[id].before, after: cells[id].after },
        `${name}, ${id}: ${cells[id].before} struck, ${cells[id].after} beside it`,
      );
      assert.equal(cell.text, `${cells[id].before} ${cells[id].after}`, `${name}, ${id}: the two prices side by side`);
    }
    assert.deepEqual(
      saveData(html).offers[0].after,
      Object.fromEntries(Object.keys(grid).map((id) => [id, cells[id].after])),
      `${name}: the prices after the offer are the build's (save-data), by the grid's cell`,
    );
  }
});

test("UC7: a total that does not divide evenly is rounded to the cent", () => {
  const { cells } = expectedCells(offer.savings_percent);
  const odd = Object.entries(cells).find(([id]) => {
    const [plan, count] = id.split("-");
    const cents = plans.individual.find((p) => p.id === plan).counts.find((c) => c.meals_per_week === Number(count));
    return ((cents.meals_per_week * cents.price_per_meal_cents * (100 - offer.savings_percent)) % 100) !== 0;
  });
  assert.ok(odd, "control: one of the grid's totals does not divide evenly at this percentage");
  assert.match(odd[1].after, /^\$\d{1,3}(,\d{3})*\.\d{2}\/wk$/, `${odd[0]}: ${odd[1].after}`);
});

test("UC7: after the offer, with an offer that carries no percentage, and on the production page (production false): the grid as built", async () => {
  const { cells } = expectedCells(null);
  const asBuilt = (grid, where) => {
    for (const [id, cell] of Object.entries(grid)) {
      assert.deepEqual({ struck: cell.struck, after: cell.after, text: cell.text }, { struck: null, after: null, text: cells[id].before }, `${where}, ${id}`);
    }
  };
  asBuilt(gridAt(await weekPage(), AFTER_OFFER_MS), "after the offer");
  assert.ok(FIXTURE_OFFERS.offers.every((o) => !("savings_percent" in o)), "control: the fixture's offers carry no percentage");
  asBuilt(gridAt(await weekPage({ offers: FIXTURE_OFFERS }), Date.parse("2026-10-15T17:00:00Z")), "an offer without a percentage");
  asBuilt(gridAt(await renderPage(await loadPlans()), NOW), "the production page, production false");
});

test("UC7: the build refuses a percentage that is not a whole number from 1 to 99, naming the offer", async () => {
  for (const bad of [0, 100, 12.5, "25", -5]) {
    const offers = structuredClone(offersFile);
    offers.offers[0].savings_percent = bad;
    await assert.rejects(devPage({ offers }), new RegExp(`data/offers\\.json: offer ${offer.id}'s savings_percent must be a whole number from 1 to 99`), `${JSON.stringify(bad)} refused`);
  }
});
