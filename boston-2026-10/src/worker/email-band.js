// E1's band (SPEC-ui-and-copy-pass § 8 item 1, approved): the printed flyer front's headline and lede, READ from
// data/flyer-front.json, the one source (never copied: a word changed there changes E1, EL6), as lines of segments for
// messages.js. Words between asterisks are the flyer's accents, drawn in its colours (print/print.css): the headline's
// in --signature, the lede's by the file's `ledeAccent`. The file's other keys (size, logo, banner, callout) are the
// printed piece's and the email draws none of them. A Worker reads no file at run time, so this is a JSON import.
import front from "../../data/flyer-front.json" with { type: "json" };

export const FLYER_FRONT = front;

/** The flyer's accent tokens, as print/print.css draws them (.fb-accent; .fb-lede[data-lede-accent] .fb-lede-accent). */
export const HEADLINE_ACCENT = "--signature";
export const LEDE_ACCENTS = { orange: "--orange", blue: "--lean", green: "--signature" };
/** print/front.mjs's default when the file names no ledeAccent. */
const DEFAULT_LEDE_ACCENT = "orange";

/** The lede's accent token for a front's words. */
export function ledeAccentOf(words = FLYER_FRONT) {
  const token = LEDE_ACCENTS[words.ledeAccent ?? DEFAULT_LEDE_ACCENT];
  if (!token) throw new Error(`data/flyer-front.json: ledeAccent ${words.ledeAccent} is not one of ${Object.keys(LEDE_ACCENTS).join(", ")}`);
  return token;
}

/** "FOR *PEOPLE WHO*" -> ["FOR ", { accent, text: "PEOPLE WHO" }]: the words between asterisks are the accent's. */
function segments(line, accent) {
  if ((line.match(/\*/g) ?? []).length % 2) throw new Error(`data/flyer-front.json: an accent's asterisks come in pairs: ${line}`);
  return line
    .trim()
    .split("*")
    .map((part, i) => (i % 2 ? { accent, text: part } : part))
    .filter((s) => s !== "");
}

/** The band's lines: the headline's, a line each, and the lede's (one, or the two the file sets). */
export function bandLines(words = FLYER_FRONT) {
  const lede = typeof words.lede === "string" ? [words.lede] : words.lede;
  return {
    headline: words.headline.map((line) => segments(line, HEADLINE_ACCENT)),
    lede: lede.map((line) => segments(line, ledeAccentOf(words))),
  };
}
