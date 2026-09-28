// Choosing the sender (SPEC-rung5-sending.md § 3): RESEND_API_KEY present -> ResendSender wrapped in the
// allowlist; absent (or empty) -> NullSender, rung 4's behaviour.
import { AllowlistSender } from "./allowlist.js";
import { ResendSender } from "./resend-sender.js";
import { NullSender } from "./senders.js";

export function chooseSender(env, { fetch } = {}) {
  if (!env.RESEND_API_KEY) return new NullSender();
  const resend = new ResendSender({ apiKey: env.RESEND_API_KEY, from: env.MAIL_FROM, ...(fetch ? { fetch } : {}) });
  return new AllowlistSender(resend, env.SEND_ALLOWLIST);
}
