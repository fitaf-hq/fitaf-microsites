// Shared by S21-S26 (SPEC-rung4 § 2a: the offer box reads data/offers.json). Not a test file itself.
// What the development page's offer box shows at an instant, and what the Worker's own offerForSave gives
// for that instant's calendar date in the send time zone.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import saveConfig from "../data/save.json" with { type: "json" };
import { offerForSave } from "../src/worker/offers.js";
import { zonedDate } from "../src/worker/zoned-time.js";
import { simulatePage } from "./page-sim.mjs";

export const ZONE = saveConfig.send_time_zone;

/**
 * Shaped like data/offers.json, with every label DISTINCT, so a wrong choice is visible. A general offer is
 * listed BEFORE the event offer, so "the first live offer of any kind" (S25's mutant) and the Worker's rule
 * disagree while the event offer is live. The past offer carries a shared code for S23 to look for.
 */
export const FIXTURE_OFFERS = {
  status: "fixture",
  offers: [
    {
      id: "event-past-fixture",
      label: "Fixture: a past event offer",
      applies_to: "event",
      valid_from: "2026-01-01",
      valid_to: "2026-06-30",
      code_mode: "shared",
      shared_code: "S23FIXTURESHAREDCODE",
    },
    {
      id: "general-a-fixture",
      label: "Fixture: general offer A",
      applies_to: "general",
      valid_from: "2000-01-01",
      valid_to: "2026-12-31",
      code_mode: "unique",
    },
    {
      id: "event-fixture",
      label: "Fixture: the event offer",
      applies_to: "event",
      valid_from: "2026-10-01",
      valid_to: "2026-11-30",
      code_mode: "unique",
    },
    {
      id: "general-b-fixture",
      label: "Fixture: general offer B",
      applies_to: "general",
      valid_from: "2027-01-01",
      valid_to: "9999-12-31",
      code_mode: "unique",
    },
  ],
};

/** S21's dates: before the event offer, inside it, after it — and its first and last days (inclusive). */
export const S21_DATES = {
  before: "2026-09-15",
  first_day: "2026-10-01",
  inside: "2026-10-15",
  last_day: "2026-11-30",
  after: "2026-12-15",
};

/** 17:00 UTC on `ymd`: 13:00 or 12:00 in New York, the same date in either zone. */
export const midday = (ymd) => Date.parse(`${ymd}T17:00:00Z`);

/** What the page's offer box shows when the browser's clock reads `instant`. */
export function offerBoxAt(html, instant) {
  return simulatePage(html, { now: instant }).el("save-offer-label").textContent;
}

/** S21's assertion, callable on any page so S25 can run it against a mutant. */
export function assertOfferBoxFollowsWorker(html, offers, dates = S21_DATES) {
  for (const [name, ymd] of Object.entries(dates)) {
    const instant = midday(ymd);
    assert.equal(zonedDate(instant, ZONE), ymd, `control: the instant is ${ymd} in ${ZONE}`);
    assert.equal(
      offerBoxAt(html, instant),
      offerForSave(ymd, offers).label,
      `${name} (${ymd}): the box shows the label offerForSave gives the Worker`,
    );
  }
}

/** Every file under `dir`, by path relative to it: its SHA-256. */
export async function hashTree(dir, root = dir) {
  const out = {};
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(out, await hashTree(path, root));
    else out[relative(root, path)] = createHash("sha256").update(await readFile(path)).digest("hex");
  }
  return out;
}
