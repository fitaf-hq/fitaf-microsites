// Shared by the page cases. Not a test file itself. The development page as `npm run build:dev` renders it,
// for the first event, without writing dist-dev/.
import events from "../data/events.json" with { type: "json" };
import saveConfig from "../data/save.json" with { type: "json" };
import zips from "../data/delivery-zips.json" with { type: "json" };
import { devConfig, devSlots, renderPage } from "../build.mjs";
import { loadPlans } from "./helpers.mjs";

export async function devPage({ eventId = events[0].id, menu } = {}) {
  const plans = await loadPlans();
  const siteKey = (await devConfig()).vars.TURNSTILE_SITE_KEY;
  return renderPage(plans, await devSlots(plans, { save: saveConfig, zips, siteKey, eventId, menu }));
}
