// SPEC-print-pieces.md § 17: the giveaway tout's words, read from the JSON file `--tout-words` names. The words are not
// approved and stay outside this repository (a public one: § 13 item 3), and a tout made from them is a proof until they
// are. The tout is front B's look, so its words are front B's keys (print/front.mjs, checked by its rules) less the
// callout, which it does not carry, and three of its own; anything else is refused, naming the key:
//   headline, accent, size, lede, ledeAccent, logo   as front B's (the headline set as given, never rewrapped)
//   banner    the line on § 15's ribbon in the foot (required here; at most BANNER_MAX_CHARS)
//   scan      one short line beside the QR code (required)
//   fine      the fine print, one paragraph, set at the type floor (required)
//   approved  true once the Advisor approves the words (optional; anything but true is a proof)
import { readFile } from "node:fs/promises";
import { checkFront } from "./front.mjs";

const KEYS = ["headline", "accent", "size", "lede", "ledeAccent", "logo", "banner", "scan", "fine", "approved"];
const SECTION = "§ 17";
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
  if (raw.banner === undefined) refuse(`"banner" is required: the line on the foot's ribbon`);
  if (!oneLine(raw.scan, SCAN_MAX_CHARS)) refuse(`"scan" must be one line of at most ${SCAN_MAX_CHARS} characters`);
  if (!oneLine(raw.fine)) refuse(`"fine" must be the fine print, one paragraph of text`);
  const [scan, fine] = [raw.scan.trim(), raw.fine.trim()];
  // every line the tout prints, for § 17 item 4's brackets (print/pages.mjs giveawayPlaceholders)
  const texts = [...words.headline, ...words.lede, words.banner, scan, fine];
  return { ...words, scan, fine, texts };
}
