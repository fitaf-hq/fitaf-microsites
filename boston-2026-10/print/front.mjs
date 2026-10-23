// SPEC-print-pieces.md § 13: front B's words, read from the JSON file `--front-words` names. Until the words are approved
// the file lives outside this repository (a public one: no unapproved words), and a front made from it is a proof; once
// approved it is data/flyer-front.json, committed, carrying `"approved": true`. Only these keys, each checked; anything
// else is refused, naming the key:
//   headline  one to three lines, each set on its own line (the build never rewraps a line it was given)
//   accent    the index of the headline's line set in the brand's green (optional); and within any line, words
//             between asterisks (*LIKE THIS*) are set in it too
//   size      the headline's size in layout px for this take (optional; FRONT_B_HEAD_PX otherwise)
//   lede      one line of text, the line that says what the headline leaves out, or one to two lines set as given
//             (§ 14 item 1a); words between asterisks are set in the colour `ledeAccent` names (§ 14 item 1)
//   ledeAccent orange, blue or green: the lede's accent colour (optional; orange otherwise)
//   callout   one to three short lines for the one callout over the photo's corner (optional)
//   logo      reversed, reversed-white or plate: the band's logo (§ 15 item 1; optional, reversed otherwise)
//   banner    one short line on a level ribbon above the offer (§ 15 item 2; optional, at most BANNER_MAX_CHARS)
//   approved  true once the Advisor approves the words (optional; anything but true is a proof)
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

/** § 13: the committed home of front B's words, once they are approved. */
export const FRONT_PATH = new URL("../data/flyer-front.json", import.meta.url).pathname;
const KEYS = ["headline", "accent", "lede", "ledeAccent", "callout", "approved", "size", "logo", "banner"];
/** § 14 item 1: the lede's accent colours, by the template's own tokens. */
export const LEDE_ACCENTS = ["orange", "blue", "green"];
/** § 15 item 1: the band's logo treatments, the first the default. */
export const LOGO_TREATMENTS = ["reversed", "reversed-white", "plate"];
/** § 15 item 2: the banner's longest line. */
export const BANNER_MAX_CHARS = 32;
const SIZE_MIN_PX = 24;
const SIZE_MAX_PX = 56;
const MAX_LINES = 3;
const LEDE_MAX_LINES = 2;

const lineList = (v) => Array.isArray(v) && v.length >= 1 && v.length <= MAX_LINES && v.every((s) => typeof s === "string" && s.trim() !== "");

/** Front B's words from `path`, checked; `source` is the file's name, which each word on the front cites. */
export async function readFront(path) {
  return checkFront(JSON.parse(await readFile(path, "utf8")), path);
}

/**
 * Front B's words checked, as readFront reads them. § 17 (the giveaway tout, front B's look) checks its words by the
 * same rules: `keys` are the keys its file may hold and `section` is cited in a refusal.
 */
export function checkFront(raw, path, { keys = KEYS, section = "§ 13" } = {}) {
  const refuse = (why) => {
    throw new Error(`${path}: ${why} (SPEC-print-pieces.md ${section})`);
  };
  for (const key of Object.keys(raw)) if (!keys.includes(key)) refuse(`"${key}" is not one of ${keys.join(", ")}`);
  if (!lineList(raw.headline)) refuse(`"headline" must be one to ${MAX_LINES} lines of text`);
  if (raw.accent !== undefined && !(Number.isInteger(raw.accent) && raw.accent >= 0 && raw.accent < raw.headline.length)) {
    refuse(`"accent" must be the index of one of the headline's ${raw.headline.length} lines`);
  }
  const ledeLines = typeof raw.lede === "string" ? [raw.lede] : raw.lede;
  const ledeOk = Array.isArray(ledeLines) && ledeLines.length >= 1 && ledeLines.length <= LEDE_MAX_LINES;
  if (!ledeOk || !ledeLines.every((s) => typeof s === "string" && s.trim() !== "")) refuse(`"lede" must be a line of text, or one to ${LEDE_MAX_LINES} lines`);
  if (raw.callout !== undefined && !lineList(raw.callout)) refuse(`"callout" must be one to ${MAX_LINES} lines of text`);
  if (raw.approved !== undefined && typeof raw.approved !== "boolean") refuse(`"approved" must be true or false`);
  if (raw.headline.some((line) => (line.match(/\*/g) ?? []).length % 2)) refuse(`"headline": an accent's asterisks come in pairs`);
  if (ledeLines.some((line) => (line.match(/\*/g) ?? []).length % 2)) refuse(`"lede": an accent's asterisks come in pairs`);
  if (raw.ledeAccent !== undefined && !LEDE_ACCENTS.includes(raw.ledeAccent)) refuse(`"ledeAccent" must be one of ${LEDE_ACCENTS.join(", ")}`);
  if (raw.size !== undefined && !(Number.isInteger(raw.size) && raw.size >= SIZE_MIN_PX && raw.size <= SIZE_MAX_PX)) {
    refuse(`"size" must be a whole number of layout px from ${SIZE_MIN_PX} to ${SIZE_MAX_PX}`);
  }
  if (raw.logo !== undefined && !LOGO_TREATMENTS.includes(raw.logo)) refuse(`"logo" must be one of ${LOGO_TREATMENTS.join(", ")}`);
  const bannerOk = typeof raw.banner === "string" && raw.banner.trim() !== "" && raw.banner.trim().length <= BANNER_MAX_CHARS;
  if (raw.banner !== undefined && !bannerOk) refuse(`"banner" must be one line of at most ${BANNER_MAX_CHARS} characters`);
  return {
    source: basename(path),
    headline: raw.headline.map((s) => s.trim()),
    accent: raw.accent ?? null,
    lede: ledeLines.map((s) => s.trim()),
    ledeAccent: raw.ledeAccent ?? "orange",
    callout: raw.callout ? raw.callout.map((s) => s.trim()) : null,
    approved: raw.approved === true,
    size: raw.size ?? null,
    logo: raw.logo ?? LOGO_TREATMENTS[0],
    banner: raw.banner === undefined ? null : raw.banner.trim(),
  };
}
