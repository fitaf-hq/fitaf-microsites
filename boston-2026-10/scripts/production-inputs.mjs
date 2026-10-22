// SPEC-save-offer-production.md § 3 item 2: with data/save.json's `production` true, the production build refuses,
// naming each, until every input the save step needs is approved. One pure function over the inputs as read (build.mjs
// reads them and renders the parts the page and the emails print); it returns the refusals, [] when there is none.
// Each refusal names its input by its committed name, whatever path a case gave the build.
//
//   - the wording: `wording_version` not a draft, in `known_wording_versions`, and consent/DRAFT.md's status line naming
//     it with its date and no longer saying DRAFT; and no Owner placeholder left in DRAFT.md §§ 1-6 (what the page, the
//     emails, /confirm and the privacy notice print: § 6's contact address, response days and export provider). A
//     button `[ … ]`, the slots the code fills ([ZIP], [event], [date], § 1's offer line) and the notice's link
//     ([Privacy notice]) are not placeholders;
//   - and nothing printed with a bracket: the production page as built (the ZIP slot apart), and E1 and E-X as the
//     Worker would render them from these inputs;
//   - ⛔ the draft tag ("DRAFT — not for use") never in the production page;
//   - data/offers.json "status": "approved", no placeholder label, no placeholder code;
//   - data/delivery-zips.json "status": "official" (data/README.md's rule);
//   - the sender (vars.MAIL_FROM) set and not the placeholder; the production site key (vars.TURNSTILE_SITE_KEY) set and
//     not one of Cloudflare's published test keys (SPEC § 8: chosen where the contract is silent); vars.SITE_URL set.
// What cannot be read off a file is not claimed here: that the offers give 25% on every cart is the Owner's, approved
// with the file's status.

/** SPEC-rung5-sending.md § 0: the sender address the dev vars carry until the Owner names one. */
export const SENDER_PLACEHOLDER = "Fit AF <offers@eatfitaf.com>";
/** Cloudflare's published Turnstile test site keys: 1x… always passes, 2x… always blocks, 3x… forces a challenge. */
export const TEST_SITE_KEY = /^[123]x0{20}[A-Z]{2}$/;
/** In DRAFT.md: a button is written `[ Label ]`; these are filled by the code or link the notice. */
const BUTTON = /^\[ .+ \]$/;
const NOT_PLACEHOLDERS = ["[ZIP]", "[event]", "[date]", "[Privacy notice]"];
const OFFER_SLOT = /^\[The offer\b/;
/** The DRAFT.md sections a production page, its emails, /confirm and the privacy notice print. */
const PRINTED_SECTIONS = /^## ([1-6])\. /;
const DRAFT_NAME = "consent/DRAFT.md";

const brackets = (text) => [...new Set(text.match(/\[[^\]\n]*\]/g) ?? [])];

/** DRAFT.md's §§ 1-6, as [number, text]. */
function printedSections(draftText) {
  const out = [];
  let current = null;
  for (const line of draftText.split("\n")) {
    if (line.startsWith("## ")) {
      const m = PRINTED_SECTIONS.exec(line);
      current = m ? [m[1], ""] : null;
      if (current) out.push(current);
    } else if (current) current[1] += `${line}\n`;
  }
  return out;
}

function wordingRefusals(save, draftText) {
  const out = [];
  const version = String(save.wording_version ?? "");
  if (!version || /draft/i.test(version)) out.push(`data/save.json: wording_version ${version || "(none)"} is a draft`);
  if (!(save.known_wording_versions ?? []).includes(version)) out.push(`data/save.json: known_wording_versions does not hold ${version}`);
  const status = /^\*\*Status\*\*:.*$/m.exec(draftText)?.[0] ?? "";
  const names = new RegExp(`(^|[^\\w.-])${version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\w.-]|$)`).test(status);
  if (!status || /DRAFT/.test(status) || !names || !/\b\d{4}-\d{2}-\d{2}\b/.test(status)) {
    out.push(`${DRAFT_NAME}: its status line does not approve ${version} with a date`);
  }
  for (const [n, text] of printedSections(draftText)) {
    for (const b of brackets(text)) {
      if (BUTTON.test(b) || NOT_PLACEHOLDERS.includes(b) || OFFER_SLOT.test(b)) continue;
      out.push(`${DRAFT_NAME} § ${n} holds a placeholder: ${b}`);
    }
  }
  return out;
}

function offerRefusals(offers) {
  const out = [];
  if (offers.status !== "approved") out.push(`data/offers.json: status is ${offers.status}, not approved`);
  for (const o of offers.offers ?? []) {
    if (/\[|placeholder/i.test(o.label ?? "[]")) out.push(`data/offers.json: offer ${o.id}'s label is a placeholder: ${o.label}`);
    if (o.code_mode === "shared" && (!o.shared_code || /placeholder/i.test(o.shared_code))) {
      out.push(`data/offers.json: offer ${o.id}'s shared_code is a placeholder`);
    }
  }
  return out;
}

function varRefusals(vars) {
  const out = [];
  const set = (name) => typeof vars[name] === "string" && vars[name].trim() !== "";
  for (const name of ["SITE_URL", "MAIL_FROM", "TURNSTILE_SITE_KEY"]) if (!set(name)) out.push(`wrangler.jsonc vars.${name} is not set`);
  if (vars.MAIL_FROM === SENDER_PLACEHOLDER) out.push(`wrangler.jsonc vars.MAIL_FROM is the placeholder ${SENDER_PLACEHOLDER}`);
  else if (set("MAIL_FROM") && /\[/.test(vars.MAIL_FROM)) out.push(`wrangler.jsonc vars.MAIL_FROM is a placeholder`);
  if (set("TURNSTILE_SITE_KEY") && TEST_SITE_KEY.test(vars.TURNSTILE_SITE_KEY)) {
    out.push("wrangler.jsonc vars.TURNSTILE_SITE_KEY is one of Cloudflare's test keys");
  }
  return out;
}

/** `printed`: [{ where, text }], the words the page and the emails print (build.mjs renders them). */
function printedRefusals(printed) {
  const out = [];
  for (const { where, text } of printed) {
    if (/DRAFT — not for use/.test(text)) out.push(`${where} carries the draft tag (DRAFT — not for use)`);
    for (const b of brackets(text)) out.push(`${where} prints a placeholder: ${b}`);
  }
  return out;
}

export function productionRefusals(inputs) {
  const { save, offers, zips, draftText, vars, printed } = inputs;
  return [
    ...wordingRefusals(save, draftText),
    ...printedRefusals(printed),
    ...offerRefusals(offers),
    ...(zips.status === "official" ? [] : [`data/delivery-zips.json: status is ${zips.status}, not official`]),
    ...varRefusals(vars),
  ];
}
