// S26 (SPEC-rung4 § 2a): the page chooses on the send time zone's date, not the browser's. 23:30 Eastern on
// the day before the event offer starts, seen from a browser whose clock is in UTC (already the next day):
// the box shows the general offer, as the Worker would give it.
process.env.TZ = "UTC"; // the browser's zone. This file runs in its own process (node --test).

import test from "node:test";
import assert from "node:assert/strict";
import { offerForSave } from "../src/worker/offers.js";
import { zonedDate, zonedParts } from "../src/worker/zoned-time.js";
import { devPage } from "./dev-page.mjs";
import { FIXTURE_OFFERS, offerBoxAt, ZONE } from "./offer-box-fixture.mjs";

const INSTANT = Date.parse("2026-10-01T03:30:00Z");

test("S26: 23:30 Eastern the day before the event offer, from a browser in UTC — the general offer, as the Worker gives it", async () => {
  const event = FIXTURE_OFFERS.offers.find((o) => o.id === "event-fixture");
  const p = zonedParts(INSTANT, ZONE);
  assert.deepEqual([p.year, p.month, p.day, p.hour, p.minute], [2026, 9, 30, 23, 30], "control: 23:30 Eastern on September 30");
  assert.equal(event.valid_from, "2026-10-01", "control: the event offer starts the next day");
  assert.equal(Intl.DateTimeFormat().resolvedOptions().timeZone, "UTC", "control: the browser's zone is UTC");
  assert.deepEqual([new Date(INSTANT).getMonth() + 1, new Date(INSTANT).getDate()], [10, 1], "control: the browser's own date is already October 1");

  const worker = offerForSave(zonedDate(INSTANT, ZONE), FIXTURE_OFFERS.offers);
  assert.equal(worker.applies_to, "general", "the Worker gives the general offer at this instant");
  const html = await devPage({ offers: FIXTURE_OFFERS });
  assert.equal(offerBoxAt(html, INSTANT), worker.label, "the box shows the Worker's general offer");
  assert.notEqual(offerBoxAt(html, INSTANT), event.label);
});

test("S26 (control): a COPY of the page taking the browser's own date shows the event offer at this instant", async () => {
  const event = FIXTURE_OFFERS.offers.find((o) => o.id === "event-fixture");
  const html = await devPage({ offers: FIXTURE_OFFERS });
  const site = "zonedDate(Date.now(), cfg.send_time_zone)";
  assert.equal(html.split(site).length - 1, 1, "the page's date is the Worker's zonedDate in the send zone");
  const browsersDate = html.split(site).join("new Date().toISOString().slice(0, 10)");
  assert.equal(offerBoxAt(browsersDate, INSTANT), event.label, "so S26's instant separates the two dates");
});
