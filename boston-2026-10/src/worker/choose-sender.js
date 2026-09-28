// Choosing the sender (SPEC-rung5-sending.md § 3): RESEND_API_KEY present -> ResendSender wrapped in the
// allowlist; absent (or empty) -> NullSender, rung 4's behaviour. With the key, CONFIRM_TOKEN_KEY is required
// (§ 8, M13): the sender refuses to start without it, as without MAIL_FROM.
import { AllowlistSender } from "./allowlist.js";
import { checkTokenKey } from "./confirm-token.js";
import { ResendSender } from "./resend-sender.js";
import { NullSender } from "./senders.js";

export function chooseSender(env, { fetch } = {}) {
  if (!env.RESEND_API_KEY) return new NullSender();
  checkTokenKey(env.CONFIRM_TOKEN_KEY);
  const resend = new ResendSender({ apiKey: env.RESEND_API_KEY, from: env.MAIL_FROM, ...(fetch ? { fetch } : {}) });
  return new AllowlistSender(resend, env.SEND_ALLOWLIST);
}
