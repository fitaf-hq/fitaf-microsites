// SPEC-print-pieces.md § 17: the giveaway tout's words, read from the JSON file `--tout-words` names. The words are not
// approved and stay outside this repository (a public one: § 13 item 3), and a tout made from them is a proof until they
// are. The tout is front B's look, so its words are front B's keys (print/front.mjs, checked by its rules) less the
// callout, which it does not carry, and three of its own; anything else is refused, naming the key:
//   headline, accent, size, lede, ledeAccent, logo   as front B's (the headline set as given, never rewrapped; without
//                                                    `size`, the largest that sets each line on one line, § 17.4 item 1)
//   headlineAccent  green, blue or orange: the colour of the headline's words between asterisks (optional; green otherwise)
// § 17.7 item 1: in the headline's lines and the lede, {blue:…}, {green:…} and {orange:…} set the words between in that
// brand colour; any other name, a brace unclosed, or one inside another, is refused naming the line. *…* keeps its meaning.
//   banner    the line on § 15's ribbon in the foot (required here; at most BANNER_MAX_CHARS)
//   scan      one short line beside the QR code (required)
//   fine      the fine print, one paragraph, set at the type floor (required)
//   approved  true once the Advisor approves the words (optional; anything but true is a proof)
import { readFile } from "node:fs/promises";
import { checkFront } from "./front.mjs";

const KEYS = ["headline", "accent", "headlineAccent", "size", "lede", "ledeAccent", "logo", "banner", "scan", "fine", "approved"];
/** § 17.4 item 1: the headline's accent colours (the words between asterisks), by the template's own tokens; the first the default. */
export const HEADLINE_ACCENTS = ["green", "blue", "orange"];
const SECTION = "§ 17";
/** § 17.7 item 1: the colours a span may name, the brand's (print.css .tout-c-*), and a span's form. */
export const SPAN_COLOURS = ["blue", "green", "orange"];
const SPAN = /\{([a-z]+):([^{}]*)\}/g;
/** A line's spans, checked: the reason it is refused, or null. */
function spanProblem(line) {
  for (const [, name] of line.matchAll(SPAN)) if (!SPAN_COLOURS.includes(name)) return `{${name}:…} is not one of ${SPAN_COLOURS.join(", ")}`;
  return /[{}]/.test(line.replace(SPAN, "")) ? "a brace unclosed, or a span inside another" : null;
}

/** The scan line's longest: it sits beside the code, in the foot. */
export const SCAN_MAX_CHARS = 40;

const oneLine = (v, max = Infinity) => typeof v === "string" && v.trim() !== "" && !/\n/.test(v) && v.trim().length <= max;

/** The tout's words from `path`, checked; `source` is the file's name, which each word on the tout cites. */
export async function readTout(path) {
  const raw = JSON.parse(await readFile(path, "utf8"));
  const refuse = (why) => {
    throw new Error(`${path}: ${why} (SPEC-print-pieces.md ${SECTION})`);
  };
  const words = checkFront(raw, path, { keys: KEYS, section: SECTION });
  // § 17.7 item 1: the colour spans, line by line
  for (const [i, line] of words.headline.entries()) {
    const why = spanProblem(line);
    if (why) refuse(`"headline" line ${i + 1}: ${why}`);
  }
  for (const [i, line] of words.lede.entries()) {
    const why = spanProblem(line);
    if (why) refuse(`"lede"${words.lede.length > 1 ? ` line ${i + 1}` : ""}: ${why}`);
  }
  if (raw.banner === undefined) refuse(`"banner" is required: the line on the foot's ribbon`);
  if (!oneLine(raw.scan, SCAN_MAX_CHARS)) refuse(`"scan" must be one line of at most ${SCAN_MAX_CHARS} characters`);
  if (!oneLine(raw.fine)) refuse(`"fine" must be the fine print, one paragraph of text`);
  if (raw.headlineAccent !== undefined && !HEADLINE_ACCENTS.includes(raw.headlineAccent)) refuse(`"headlineAccent" must be one of ${HEADLINE_ACCENTS.join(", ")}`);
  const [scan, fine] = [raw.scan.trim(), raw.fine.trim()];
  // every line the tout prints, for § 17 item 4's brackets (print/pages.mjs giveawayPlaceholders)
  const texts = [...words.headline, ...words.lede, words.banner, scan, fine];
  return { ...words, headlineAccent: raw.headlineAccent ?? HEADLINE_ACCENTS[0], scan, fine, texts };
}
