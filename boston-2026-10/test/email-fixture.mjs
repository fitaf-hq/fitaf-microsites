// Shared by the email-branding cases (M14–M20, SPEC-rung5 § 9). Not a test file itself.
// The three messages are rendered from FIXED sample inputs, so a case depends on messages.js alone and not
// on the placeholder data files (which the Owner will fill in).
import { readFile } from "node:fs/promises";
import { DEFAULTS, tokensOf } from "../scripts/contrast.mjs";
import { e1, ex } from "../src/worker/messages.js";

export const SAMPLE = {
  siteUrl: "https://email-sample.example.test",
  to: "delivered@resend.dev",
  code: "SAMPLE23",
  token: "SAMPLE-TOKEN-SAMPLE-TOKEN-SAMPLE-TOKEN-SAMPL",
  offer: { valid_to: "2026-11-30" },
  event: { name: "the sample event" },
  zip: "01602",
  unconfirmedDays: 7,
};

/** E1 with the box ticked, E1 without it, and E-X, as messages.js renders them. */
export function sampleMessages(s = SAMPLE) {
  const offerInputs = { to: s.to, code: s.code, offer: s.offer, event: s.event, siteUrl: s.siteUrl };
  return {
    e1_ticked: e1({ ...offerInputs, token: s.token }),
    e1_unticked: e1({ ...offerInputs, token: null }),
    ex: ex({ to: s.to, zip: s.zip, siteUrl: s.siteUrl, token: s.token, unconfirmedDays: s.unconfirmedDays }),
  };
}

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
