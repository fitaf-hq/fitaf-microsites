// S21 (SPEC-rung4 § 2a): the dev page's offer box shows the label of the offer a save made now would get —
// the Worker's own offerForSave on the send time zone's date — before the event offer, inside it, after it.
import test from "node:test";
import assert from "node:assert/strict";
import * as offers from "../src/worker/offers.js";
import * as zonedTime from "../src/worker/zoned-time.js";
import { devPage } from "./dev-page.mjs";
import { assertOfferBoxFollowsWorker, FIXTURE_OFFERS, midday, S21_DATES } from "./offer-box-fixture.mjs";
import { simulatePage } from "./page-sim.mjs";

test("S21: before the event offer, inside it, after it — the box shows what offerForSave gives the Worker", async () => {
  const labels = FIXTURE_OFFERS.offers.map((o) => o.label);
  assert.equal(new Set(labels).size, labels.length, "control: the fixture's labels are distinct");
  assert.deepEqual(
    [S21_DATES.before, S21_DATES.inside, S21_DATES.after].map((d) => offers.offerForSave(d, FIXTURE_OFFERS.offers).id),
    ["general-a-fixture", "event-fixture", "general-a-fixture"],
    "control: the three dates straddle the event offer",
  );
  assertOfferBoxFollowsWorker(await devPage({ offers: FIXTURE_OFFERS }), FIXTURE_OFFERS.offers);
});

test("S21: the page's choice and its date are the Worker's functions, inlined as written", async () => {
  const html = await devPage();
  const used = [
    ["offers.js", offers, ["isLive", "currentGeneral", "offerForSave"]],
    ["zoned-time.js", zonedTime, ["zonedDate", "zonedParts", "formatter", "pad"]],
  ];
  for (const [file, module, names] of used) {
    for (const name of names) {
      assert.equal(typeof module[name], "function", `${file} exports ${name}`);
      assert.ok(html.includes(module[name].toString()), `${file}'s ${name} is in the page verbatim`);
    }
  }
});

test("S21 (§ 2a): when no offer can be chosen, the box shows nothing and the page still works", async () => {
  // Two general offers current on one date: the file breaks its own one-general rule, and currentGeneral throws.
  const broken = structuredClone(FIXTURE_OFFERS);
  broken.offers.find((o) => o.id === "general-b-fixture").valid_from = "2026-09-01";
  assert.throws(() => offers.offerForSave(S21_DATES.before, broken.offers), /expected one current general offer/, "control");
  const page = simulatePage(await devPage({ offers: broken }), { now: midday(S21_DATES.before) });
  assert.equal(page.el("save-offer-label").textContent, "", "nothing in place of a label");
  page.type("save-email", "dummy-s21@example.com");
  page.type("save-zip", "02118");
  page.el("save-form").dispatch("submit");
  await page.settle();
  assert.equal(page.record.fetches.length, 1, "the save still goes");
  assert.equal(page.el("save-done").hidden, false, "SAVED");
});
