// The scheduled Worker (SPEC-rung4 § 6): send what is due, then the lapse, then the purge. Counts only.
import events from "../../data/events.json" with { type: "json" };
import saveConfig from "../../data/save.json" with { type: "json" };
import { tokenMinter } from "./confirm-token.js";
import { d1Adapter } from "./d1-adapter.js";
import { lapse } from "./lapse.js";
import { OFFERS } from "./offers.js";
import { purge } from "./purge.js";
import { sendDue } from "./send-due.js";
import { DAYS, daysBetween, zonedDate } from "./zoned-time.js";

/** The lapse's plain inputs at `nowMs`: which offers are 30 days past their end, and the two cut-offs. */
export function lapseInputs(nowMs, offers = OFFERS, cfg = saveConfig) {
  const today = zonedDate(nowMs, cfg.send_time_zone);
  return {
    now: new Date(nowMs).toISOString(),
    lapsedOfferIds: offers.filter((o) => daysBetween(o.valid_to, today) > cfg.lapse_after_offer_days).map((o) => o.id),
    expansionCreatedBefore: new Date(nowMs - cfg.unconfirmed_expansion_days * DAYS).toISOString(),
    expansionConfirmedBefore: new Date(nowMs - cfg.expansion_retention_days * DAYS).toISOString(),
  };
}

export async function runSchedule(env, { nowMs, sender, redemptions }) {
  const now = new Date(nowMs).toISOString();
  const context = {
    offers: OFFERS,
    events,
    siteUrl: env.SITE_URL,
    unconfirmedDays: saveConfig.unconfirmed_expansion_days,
    // SPEC-rung5 § 8: the derived /confirm token. Without the key only a Sender that sends nothing can run.
    mintToken: env.CONFIRM_TOKEN_KEY ? tokenMinter(env.CONFIRM_TOKEN_KEY) : undefined,
  };
  return {
    send: await sendDue(env.DB, { now, sender, redemptions, context }),
    lapse: await lapse(d1Adapter(env.DB), lapseInputs(nowMs), { dryRun: false }),
    purge: await purge(d1Adapter(env.DB), { dryRun: false, now }),
  };
}
