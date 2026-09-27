// Server-side Turnstile check. In development the secret is Cloudflare's published always-pass key.
export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** The visitor's IP is deliberately NOT sent (siteverify's `remoteip` is optional). */
export async function turnstilePasses(secret, token) {
  if (typeof token !== "string" || token === "") return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  const res = await fetch(SITEVERIFY_URL, { method: "POST", body: form });
  if (!res.ok) return false;
  const outcome = await res.json();
  return outcome.success === true;
}
