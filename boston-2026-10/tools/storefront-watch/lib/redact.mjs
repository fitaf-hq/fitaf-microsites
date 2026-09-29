// SPEC-storefront-watch § 7 item 2: text the watch quotes from the page (its console lines, its buttons, its dialogs)
// goes into a PUBLIC repository's issues, so anything that looks like a key or token is replaced by [REDACTED], and each
// console line is cut to 200 characters AFTER that, so a key across the cut is never half shown.

export const LINE_CHARS = 200;
export const REDACTED = "[REDACTED]";

/** A Google API key's form (AIza, then 35 characters; 10 or more is enough to count). */
const GOOGLE_KEY = /AIza[0-9A-Za-z_-]{10,}/g;
/** The storefront's public key's form (sk_…), and any other key of that shape. */
const SK_KEY = /\bsk_[A-Za-z0-9_-]+/g;
/** A long base64 (or base64url) run: 32 characters or more, holding a digit and a letter, as a token does. */
const BASE64_RUN = /[A-Za-z0-9+/_-]{32,}={0,2}/g;
const looksLikeToken = (run) => /\d/.test(run) && /[A-Za-z]/.test(run);

export function redact(text) {
  return String(text)
    .replace(GOOGLE_KEY, REDACTED)
    .replace(SK_KEY, REDACTED)
    .replace(BASE64_RUN, (run) => (looksLikeToken(run) ? REDACTED : run));
}

/** Redacted, then cut to LINE_CHARS characters (the last one "…" when it was cut). */
export function cutLine(text, chars = LINE_CHARS) {
  const line = redact(text);
  return line.length > chars ? `${line.slice(0, chars - 1)}…` : line;
}
