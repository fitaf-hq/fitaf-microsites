// The /confirm token, DERIVED (SPEC-rung5-sending.md § 8): base64url(HMAC-SHA-256(CONFIRM_TOKEN_KEY,
// "<save_id>:confirm")), through Web Crypto (the same in Workers and in Node's tests). Every attempt for one
// message therefore carries the same token, the same body, and Resend's idempotency key replays.
// Only the token's SHA-256 is stored (token.js), as before; whether a token still works is decided by the
// database (state, expiry), never by the token.
//
// The key is used as the UTF-8 bytes of the secret's text (the infrastructure code generates it: 44 random
// characters; until 2026-09-28 a retired script set 32 random bytes, base64). ⛔ Never logged. ⛔ Self-contained (no imports): M12 imports a mutated COPY.
export const MIN_TOKEN_KEY_LENGTH = 32;

export function checkTokenKey(key) {
  if (typeof key !== "string" || key.length < MIN_TOKEN_KEY_LENGTH) {
    throw new Error(`CONFIRM_TOKEN_KEY is not set, or shorter than ${MIN_TOKEN_KEY_LENGTH} characters`);
  }
}

const base64url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function confirmToken(key, saveId) {
  checkTokenKey(key);
  const utf8 = new TextEncoder();
  const hmacKey = await crypto.subtle.importKey("raw", utf8.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", hmacKey, utf8.encode(`${saveId}:confirm`));
  return base64url(new Uint8Array(mac));
}

/** A `saveId -> token` function for send-due; refuses at once if the key is missing or short. */
export function tokenMinter(key) {
  checkTokenKey(key);
  return (saveId) => confirmToken(key, saveId);
}
