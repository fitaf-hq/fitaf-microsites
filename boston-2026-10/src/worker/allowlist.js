// The dev allowlist (SPEC-rung5-sending.md § 2). SEND_ALLOWLIST is a comma-separated list of exact
// addresses and `@domain` suffixes. A message whose recipient is not on it is HELD: the inner Sender is
// never asked, and the message stays `scheduled`. Unset or empty allows nothing.
//
// ⛔ Self-contained (no imports): test M5 imports a mutated COPY of this file.

/** "a@example.org, @resend.dev" -> ["a@example.org", "@resend.dev"], lower-cased; blanks dropped. */
export function parseAllowlist(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/** An exact address, or `@domain` matching that domain exactly (not its subdomains). */
export function allowlistAllows(entries, address) {
  const to = String(address ?? "").trim().toLowerCase();
  const at = to.lastIndexOf("@");
  if (at < 1) return false;
  const domain = to.slice(at);
  return entries.some((entry) => (entry.startsWith("@") ? entry === domain : entry === to));
}

export class AllowlistSender {
  constructor(inner, allowlist) {
    this.inner = inner;
    this.entries = parseAllowlist(allowlist);
  }

  async send(message) {
    if (!allowlistAllows(this.entries, message.to)) return "held";
    return this.inner.send(message);
  }
}
