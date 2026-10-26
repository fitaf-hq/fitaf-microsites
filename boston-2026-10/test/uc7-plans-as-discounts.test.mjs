// UC7 (SPEC-ui-and-copy-pass.md § 1 item 7, as § 1.2 item 2 corrects it, the Advisor 2026-10-23: "The HMP storefront
// *effectively* has the discount applied. The microsite shows the un-discounted price struck through. It is currently
// *impossible* to pay the non-discounted price."): while an offer is current, See all plans (#all) shows each plan's
// weekly price as the store charges it, and beside it, struck through, that price ÷ (1 − the offer's share), rounded to
// the cent (Lean 7: struck $116.67, $87.50). The share is the offer's `percent_off` (data/offers.json), never a literal,
// and the build refuses an offer whose words name another percentage. No price below the list: the price beside is the
// store's, the struck one above it. After the offer, for an offer without `percent_off`, and on the production page with
// `production` false (it has no offer), the grid as built. Worked out here from data/plans.json's cents and the offer.
// ⭐ Mutant (a mirror of the package, the build's one line computing the struck price taken from the wrong side, the list
// × 0.75: § 1.1's build of the old default): UC7 fails, by its own assertion; the unchanged mirror is its control.
import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import offersFile from "../data/offers.json" with { type: "json" };
import plans from "../data/plans.json" with { type: "json" };
import { renderPage, ROOT } from "../build.mjs";
import { mirror, openPlanPage } from "./cc-harness.mjs";
import { devPage } from "./dev-page.mjs";
import { loadPlans } from "./helpers.mjs";
import { FIXTURE_OFFERS } from "./offer-box-fixture.mjs";
import { saveData } from "./sp-production.mjs";
import { approvedWeekPage, NOW, weekPage } from "./uc-harness.mjs";

const AFTER_OFFER_MS = Date.parse("2026-10-30T16:00:00.000Z"); // noon in New York, the day after the offer's last
const dollars = (cents) => `$${Math.floor(cents / 100).toLocaleString("en-US")}.${String(cents % 100).padStart(2, "0")}`;
const [offer] = offersFile.offers;
/** The build's one line computing a cell's struck price, and that line from the wrong side (the mutant's). */
const STRUCK_SITE = "money(Math.round((c.total_cents * PERCENT) / (PERCENT - p)))";
const WRONG_SIDE = "money(Math.round((c.total_cents * (PERCENT - p)) / PERCENT))";

/** Every cell of the grid (each plan at each shown count), by its data-cell: the weekly total as the store charges it,
 *  and that total ÷ (1 − percent/100), to the cent, from data/plans.json's cents. */
function expectedCells(percent) {
  const counts = plans.shown_counts.map((c) => c.meals_per_week);
  const out = {};
  for (const plan of plans.individual) {
    for (const cell of plan.counts.filter((c) => counts.includes(c.meals_per_week))) {
      const total = cell.meals_per_week * cell.price_per_meal_cents;
      out[`${plan.id}-${cell.meals_per_week}`] = {
        cents: total,
        list: `${dollars(total)}/wk`,
        struck: percent === null ? null : `${dollars(Math.round((total * 100) / (100 - percent)))}/wk`,
      };
    }
  }
  return out;
}

/** The grid as a visitor's page shows it: per cell, its struck price, the price beside it, and its text. */
function gridAt(html, now) {
  const page = openPlanPage(html, { hash: "#lean-7", now });
  const out = {};
  for (const cell of page.document.querySelectorAll("#all [data-cell]")) {
    const small = cell.querySelector("small");
    out[cell.getAttribute("data-cell")] = {
      struck: small.querySelector("s")?.textContent ?? null,
      now: small.querySelector(".cell-now")?.textContent ?? null,
      text: small.textContent.replace(/\s+/g, " ").trim(),
    };
  }
  assert.equal(page.el("all").hasAttribute("open"), false, "control: the dialog is closed (its cells are drawn when opened)");
  return out;
}

/** UC7's rule on any page carrying the offer: each cell the store's price, beside it the struck price above it. */
function assertMarkedDown(html, where) {
  const cells = expectedCells(offer.percent_off);
  const grid = gridAt(html, NOW);
  assert.deepEqual(Object.keys(grid).sort(), Object.keys(cells).sort(), `${where}: control: the grid's cells, every plan at every shown count`);
  for (const [id, cell] of Object.entries(grid)) {
    assert.equal(cell.now, cells[id].list, `${where}, ${id}: the price beside is the store's, ${cells[id].list}`);
    assert.equal(cell.struck, cells[id].struck, `${where}, ${id}: struck through, ${cells[id].list} ÷ (1 − ${offer.percent_off}%) = ${cells[id].struck}`);
    assert.equal(cell.text, `${cells[id].struck} ${cells[id].list}`, `${where}, ${id}: the struck price, then the store's`);
  }
}

test("UC7: the offer carries its share, the one its words name", () => {
  assert.equal(offer.percent_off, 25, "percent_off, a whole number");
  assert.ok(!("savings_percent" in offer), "the old field went");
  for (const words of [offer.label, offer.headline]) assert.ok(words.includes(`${offer.percent_off}%`), `control: "${words}" says ${offer.percent_off}%`);
});

test("UC7: while the offer is current, each weekly price as the store charges it, the higher one struck through beside it", async () => {
  for (const [name, html] of [["the development page", await weekPage()], ["the production page (production true)", (await approvedWeekPage()).html]]) {
    assertMarkedDown(html, name);
    const cells = expectedCells(offer.percent_off);
    assert.deepEqual(
      saveData(html).offers[0].struck,
      Object.fromEntries(Object.entries(cells).map(([id, c]) => [id, c.struck])),
      `${name}: the struck prices are the build's (save-data), by the grid's cell`,
    );
  }
  assert.equal(gridAt(await weekPage(), NOW)["lean-7"].struck, "$116.67/wk", "the Advisor's example: Lean 7, struck $116.67");
});

test("UC7: no price below the list — every struck price is above the price paid", () => {
  for (const [id, cell] of Object.entries(expectedCells(offer.percent_off))) {
    const struck = Math.round((cell.cents * 100) / (100 - offer.percent_off));
    assert.ok(struck > cell.cents, `${id}: ${struck} above ${cell.cents}`);
  }
});

test("UC7: after the offer, with an offer that carries no share, and on the production page (production false): the grid as built", async () => {
  const cells = expectedCells(null);
  const asBuilt = (grid, where) => {
    for (const [id, cell] of Object.entries(grid)) {
      assert.deepEqual({ struck: cell.struck, now: cell.now, text: cell.text }, { struck: null, now: null, text: cells[id].list }, `${where}, ${id}`);
    }
  };
  asBuilt(gridAt(await weekPage(), AFTER_OFFER_MS), "after the offer");
  assert.ok(FIXTURE_OFFERS.offers.every((o) => !("percent_off" in o)), "control: the fixture's offers carry no share");
  asBuilt(gridAt(await weekPage({ offers: FIXTURE_OFFERS }), Date.parse("2026-10-15T17:00:00Z")), "an offer without a share");
  asBuilt(gridAt(await renderPage(await loadPlans()), NOW), "the production page, production false");
});

test("UC7: the build refuses a share that is not a whole number from 1 to 99, or one the offer's words disagree with", async () => {
  for (const bad of [0, 100, 12.5, "25", -5]) {
    const offers = structuredClone(offersFile);
    offers.offers[0].percent_off = bad;
    await assert.rejects(devPage({ offers }), new RegExp(`data/offers\\.json: offer ${offer.id}'s percent_off must be a whole number from 1 to 99`), `${JSON.stringify(bad)} refused`);
  }
  for (const field of ["label", "headline"]) {
    const offers = structuredClone(offersFile);
    offers.offers[0].percent_off = 30;
    if (field === "headline") offers.offers[0].label = "Sign up today to save 30%";
    await assert.rejects(
      devPage({ offers }),
      new RegExp(`data/offers\\.json: offer ${offer.id}'s ${field} names 25%, its percent_off is 30`),
      `the ${field} disagreeing with percent_off refused`,
    );
  }
  const words = structuredClone(offersFile);
  words.offers[0].percent_off = 30;
  words.offers[0].label = "Sign up today";
  words.offers[0].headline = "Today only";
  await assert.doesNotReject(devPage({ offers: words }), "control: words that name no percentage disagree with nothing");
});

test("UC7: mutant — the struck price from the wrong side (the list × 0.75) -> UC7 fails; the unchanged mirror passes", async () => {
  const pageOf = async (dir) => {
    const out = await mkdtemp(join(tmpdir(), "boston-uc7-mirror-out-"));
    try {
      const { build } = await import(pathToFileURL(join(dir, "build.mjs")).href);
      await build({ target: "dev", outDir: out });
      return await readFile(join(out, "index.html"), "utf8");
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  };
  // The development build reads its site key from wrangler.jsonc (devConfig), which cc-harness's mirror does not carry.
  const withConfig = (dir) => copyFile(join(ROOT, "wrangler.jsonc"), join(dir, "wrangler.jsonc"));
  const control = await mirror(withConfig);
  const mutant = await mirror(async (dir) => {
    await withConfig(dir);
    const path = join(dir, "build.mjs");
    const source = await readFile(path, "utf8");
    assert.equal(source.split(STRUCK_SITE).length - 1, 1, "the mutation site occurs exactly once in the mirror's build.mjs");
    await writeFile(path, source.replace(STRUCK_SITE, WRONG_SIDE));
  });
  try {
    assertMarkedDown(await pageOf(control), "the unchanged mirror");
    const mutantPage = await pageOf(mutant);
    assert.throws(
      () => assertMarkedDown(mutantPage, "the mutant"),
      (err) => err instanceof assert.AssertionError && /the mutant, lean-7: struck through/.test(err.message),
      "UC7 must fail on the mutant, by its own assertion",
    );
  } finally {
    await rm(control, { recursive: true, force: true });
    await rm(mutant, { recursive: true, force: true });
  }
});
