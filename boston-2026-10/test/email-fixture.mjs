// Shared by the email-branding cases (M14–M20, SPEC-rung5 § 9). Not a test file itself.
// The three messages are rendered from FIXED sample inputs, so a case depends on messages.js alone and not
// on the placeholder data files (which the Owner will fill in).
import { readFile } from "node:fs/promises";
import { DEFAULTS, tokensOf } from "../scripts/contrast.mjs";
import { e1, ex } from "../src/worker/messages.js";

const RENDERERS = { e1, ex };

export const SAMPLE = {
  siteUrl: "https://email-sample.example.test",
  to: "delivered@resend.dev",
  code: "SAMPLE23",
  token: "SAMPLE-TOKEN-SAMPLE-TOKEN-SAMPLE-TOKEN-SAMPL",
  offer: { valid_to: "2026-11-30" },
  // SPEC-save-offer-production § 10: an offer without a code, whose E1 says the date its pricing is held until.
  heldOffer: { valid_to: "2026-10-29", code_mode: "none" },
  event: { name: "the sample event" },
  zip: "01602",
  unconfirmedDays: 7,
  // SPEC-ui-and-copy-pass § 8 item 2: E1's photo row is the photo manifest's `email_slideshow` (data/photo-sheets.json,
  // Fit AF's emitter's). Each sample names its own manifest, so no case depends on what the emitter has committed: none
  // (every photograph removed, README's rule), or a fixture entry naming a GIF no case ever loads.
  noPhotos: { base: null },
  photos: {
    base: "assets/photo-sheets/",
    email_slideshow: { file: "email-slideshow.gif", width: 600, height: 400, frames: 5, frame_ms: 2500 },
  },
};

/** E1 with the box ticked, E1 without it, the same two for an offer without a code (SPEC-save-offer-production § 10), and
 *  E-X, as messages.js renders them. Since SPEC-ui-and-copy-pass § 8 also E1 sent after its offer's last day (§ 8 item 4)
 *  and E1 with the slideshow (item 2); every other E1 has no photo row. `fns` are the renderers (another tree's, for the
 *  recorder, test/el-record.mjs). */
export function sampleMessages(s = SAMPLE, { e1, ex } = RENDERERS) {
  const offerInputs = { to: s.to, code: s.code, offer: s.offer, event: s.event, siteUrl: s.siteUrl, photos: s.noPhotos };
  const heldInputs = { ...offerInputs, offer: s.heldOffer };
  return {
    e1_ticked: e1({ ...offerInputs, token: s.token }),
    e1_unticked: e1({ ...offerInputs, token: null }),
    e1_held_ticked: e1({ ...heldInputs, token: s.token }),
    e1_held_unticked: e1({ ...heldInputs, token: null }),
    e1_held_ended: e1({ ...heldInputs, token: null, ended: true }),
    e1_held_slideshow: e1({ ...heldInputs, token: null, photos: s.photos }),
    ex: ex({ to: s.to, zip: s.zip, siteUrl: s.siteUrl, token: s.token, unconfirmedDays: s.unconfirmedDays }),
  };
}

/** The E1 samples alone. */
export const sampleE1s = (s = SAMPLE, fns = RENDERERS) =>
  Object.fromEntries(Object.entries(sampleMessages(s, fns)).filter(([name]) => name.startsWith("e1_")));

/**
 * The page's tokens, read here from src/template.html's own :root — independently of the email's copy
 * (email-tokens.json) and of the script that writes it — so a case compares the email with the page itself.
 * `colours` by contrast.mjs's parser (the one `npm run contrast` measures with); `all` as written.
 */
export async function pageTokens() {
  const html = await readFile(DEFAULTS.template, "utf8");
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  const root = /:root\s*\{([^{}]*)\}/.exec(css)[1];
  const all = Object.fromEntries([...root.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  return { colours: tokensOf(css), all };
}

/** A font stack as it must appear inside style="…": the page's token with its double quotes made single. */
export const inlineStack = (value) => value.replaceAll('"', "'");
