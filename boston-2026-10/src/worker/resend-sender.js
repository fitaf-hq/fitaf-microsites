// The real Sender (SPEC-rung5-sending.md § 1), through Resend's API. Read from Resend's documentation
// on 2026-09-27: https://resend.com/docs/api-reference/emails/send-email (request, `{ id }` response,
// the Idempotency-Key header), https://resend.com/docs/api-reference/errors (the codes) and
// https://resend.com/docs/api-reference/introduction (a User-Agent header is required).
//
// Outcomes: accepted -> { outcome: "sent", providerMessageId }; a permanent refusal (a 4xx other than
// 429) -> "failed"; temporary (429, 5xx, a network error or timeout) -> "retry".
// ⚠ One 4xx is temporary: 409 `concurrent_idempotent_requests` ("another request … with the same
// idempotency key is in progress … try again later"). Resend documents the error NAMES but not the
// error body's shape; the name is read from a `name` field, and any 409 without it stays permanent.
// 409 `invalid_idempotent_request` (the key reused with a different body) is `failed`: since the token is
// derived (SPEC-rung5 § 8), every attempt's body is identical, so it can only mean a defect.
//
// ⛔ Nothing here logs, and nothing it returns carries the address, the body, the key or Resend's error text.

export const RESEND_URL = "https://api.resend.com/emails";
export const RESEND_TIMEOUT_MS = 10_000;
export const USER_AGENT = "fitaf-microsites-boston-2026-10";
const RETRYABLE_409 = "concurrent_idempotent_requests";

/** `<save_id>:<message kind>`: the same message, retried, carries the same key. */
export const idempotencyKey = (message) => `${message.saveId}:${message.template}`;

async function errorName(response) {
  try {
    const body = await response.json();
    return typeof body?.name === "string" ? body.name : null;
  } catch {
    return null;
  }
}

export class ResendSender {
  /** `fetch` is injectable for tests; by default the runtime's own, looked up at call time. */
  constructor({ apiKey, from, fetch: fetchImpl = (...args) => fetch(...args), timeoutMs = RESEND_TIMEOUT_MS }) {
    if (!apiKey) throw new Error("ResendSender needs an API key");
    if (!from) throw new Error("ResendSender needs MAIL_FROM");
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new Error("ResendSender needs a positive timeout");
    this.apiKey = apiKey;
    this.from = from;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  request(message) {
    if (!message.saveId || !message.template) throw new Error("a message needs saveId and template");
    return {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey(message),
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    };
  }

  async send(message) {
    const init = this.request(message);
    let response;
    try {
      response = await this.fetch(RESEND_URL, init);
    } catch {
      return "retry"; // a network error or the timeout; its text is not kept
    }
    if (response.ok) {
      let id = null;
      try {
        const body = await response.json();
        if (typeof body?.id === "string") id = body.id;
      } catch {
        // accepted without a readable id: still sent (retrying would risk a second copy)
      }
      return { outcome: "sent", providerMessageId: id };
    }
    if (response.status === 429 || response.status >= 500) return "retry";
    if (response.status === 409 && (await errorName(response)) === RETRYABLE_409) return "retry";
    return "failed";
  }
}
