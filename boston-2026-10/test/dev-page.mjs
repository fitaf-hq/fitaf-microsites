// Shared by the page cases. Not a test file itself. The development page as `npm run build:dev` renders it,
// for the first event, without writing dist-dev/. `offers` replaces data/offers.json (a fixture, S21-S26); `plans`
// replaces data/plans.json (a case's own data, as ms-harness's withSnacks makes it: MS-14).
import { readFile } from "node:fs/promises";
import events from "../data/events.json" with { type: "json" };
import offersFile from "../data/offers.json" with { type: "json" };
import saveConfig from "../data/save.json" with { type: "json" };
import zips from "../data/delivery-zips.json" with { type: "json" };
import { devConfig, devSlots, renderPage } from "../build.mjs";
import { loadPlans } from "./helpers.mjs";

// `card` (SPEC-week-content § 2.1, § 7): the page with the Chef's Choice card holding NO week, as every build now writes
// it (the scripts/chefs-choice.mjs slots); without it, the page with no card, as the build wrote it before
// (renderPage's NO_PICKS), which the page cases read.
export async function devPage({ eventId = events[0].id, menu, offers = offersFile, plans: given, card = false } = {}) {
  const plans = given ?? (await loadPlans());
  const siteKey = (await devConfig()).vars.TURNSTILE_SITE_KEY;
  const slots = await devSlots(plans, { save: saveConfig, zips, siteKey, eventId, menu, offers });
  if (!card) return renderPage(plans, slots);
  const { chefsChoice } = await import("../scripts/chefs-choice.mjs");
  const messages = JSON.parse(await readFile(new URL("../data/messages.json", import.meta.url), "utf8"));
  const picks = await chefsChoice({ plans, messages, zone: saveConfig.send_time_zone });
  return renderPage(plans, slots, messages, picks.slots);
}
