// Choosing the sender (SPEC-rung5-sending.md § 3): RESEND_API_KEY present -> ResendSender wrapped in the
// allowlist; absent (or empty) -> NullSender, rung 4's behaviour. With the key, CONFIRM_TOKEN_KEY is required
// (§ 8, M13): the sender refuses to start without it, as without MAIL_FROM.
// SPEC-save-offer-production.md § 4 item 4: production sends without the allowlist. The ENVIRONMENT decides, by the var
// SEND_WITHOUT_ALLOWLIST, which fitaf-infra sets to "true" for production only (wrangler.jsonc's top level mirrors it);
// any other value, or none (development), keeps the allowlist, and with no allowlist nothing is sent.
import { AllowlistSender } from "./allowlist.js";
import { checkTokenKey } from "./confirm-token.js";
import { ResendSender } from "./resend-sender.js";
import { NullSender } from "./senders.js";

export function chooseSender(env, { fetch } = {}) {
  if (!env.RESEND_API_KEY) return new NullSender();
  checkTokenKey(env.CONFIRM_TOKEN_KEY);
  const resend = new ResendSender({ apiKey: env.RESEND_API_KEY, from: env.MAIL_FROM, ...(fetch ? { fetch } : {}) });
  if (env.SEND_WITHOUT_ALLOWLIST === "true") return resend;
  return new AllowlistSender(resend, env.SEND_ALLOWLIST);
}
