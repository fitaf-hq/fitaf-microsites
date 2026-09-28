// The /confirm token (SPEC-rung4 § 5): 32 random bytes, base64url. Only its SHA-256 is stored; the token
// itself exists in the message and the visitor's inbox, and is never logged.
export const TOKEN_BYTES = 32;
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function tokenHash(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
