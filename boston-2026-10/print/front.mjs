// SPEC-print-pieces.md § 13: front B's words, read from the JSON file `--front-words` names. Until the words are approved
// the file lives outside this repository (a public one: no unapproved words), and a front made from it is a proof; once
// approved it is data/flyer-front.json, committed, carrying `"approved": true`. Only these keys, each checked; anything
// else is refused, naming the key:
//   headline  one to three lines, each set on its own line (the build never rewraps a line it was given)
//   accent    the index of the headline's line set in the brand's green (optional); and within any line, words
//             between asterisks (*PEOPLE WHO*) are set in it too
//   size      the headline's size in layout px for this take (optional; FRONT_B_HEAD_PX otherwise)
//   lede      one line of text, the line that says what the headline leaves out
//   callout   one to three short lines for the one callout over the photo's corner (optional)
//   approved  true once the Advisor approves the words (optional; anything but true is a proof)
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

/** § 13: the committed home of front B's words, once they are approved. */
export const FRONT_PATH = new URL("../data/flyer-front.json", import.meta.url).pathname;
const KEYS = ["headline", "accent", "lede", "callout", "approved", "size"];
const SIZE_MIN_PX = 24;
const SIZE_MAX_PX = 56;
const MAX_LINES = 3;

const lineList = (v) => Array.isArray(v) && v.length >= 1 && v.length <= MAX_LINES && v.every((s) => typeof s === "string" && s.trim() !== "");

/** Front B's words from `path`, checked; `source` is the file's name, which each word on the front cites. */
export async function readFront(path) {
  const raw = JSON.parse(await readFile(path, "utf8"));
  const refuse = (why) => {
    throw new Error(`${path}: ${why} (SPEC-print-pieces.md § 13)`);
  };
  for (const key of Object.keys(raw)) if (!KEYS.includes(key)) refuse(`"${key}" is not one of ${KEYS.join(", ")}`);
  if (!lineList(raw.headline)) refuse(`"headline" must be one to ${MAX_LINES} lines of text`);
  if (raw.accent !== undefined && !(Number.isInteger(raw.accent) && raw.accent >= 0 && raw.accent < raw.headline.length)) {
    refuse(`"accent" must be the index of one of the headline's ${raw.headline.length} lines`);
  }
  if (typeof raw.lede !== "string" || raw.lede.trim() === "") refuse(`"lede" must be a line of text`);
  if (raw.callout !== undefined && !lineList(raw.callout)) refuse(`"callout" must be one to ${MAX_LINES} lines of text`);
  if (raw.approved !== undefined && typeof raw.approved !== "boolean") refuse(`"approved" must be true or false`);
  if (raw.headline.some((line) => (line.match(/\*/g) ?? []).length % 2)) refuse(`"headline": an accent's asterisks come in pairs`);
  if (raw.size !== undefined && !(Number.isInteger(raw.size) && raw.size >= SIZE_MIN_PX && raw.size <= SIZE_MAX_PX)) {
    refuse(`"size" must be a whole number of layout px from ${SIZE_MIN_PX} to ${SIZE_MAX_PX}`);
  }
  return {
    source: basename(path),
    headline: raw.headline.map((s) => s.trim()),
    accent: raw.accent ?? null,
    lede: raw.lede.trim(),
    callout: raw.callout ? raw.callout.map((s) => s.trim()) : null,
    approved: raw.approved === true,
    size: raw.size ?? null,
  };
}
