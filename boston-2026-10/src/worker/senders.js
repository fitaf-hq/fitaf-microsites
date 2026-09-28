// The two interfaces of SPEC-rung4 § 6, with their NULL implementations. The real Sender is
// `resend-sender.js` (rung 5), chosen by `choose-sender.js`.
//
//   Sender.send(message)        -> "deferred" | "held" | "retry" | "failed" | { outcome: "sent", providerMessageId }
//                                  (a bare "sent" is also accepted, as rung 4's test senders answer)
//   Redemptions.redeemed(codes) -> the subset of `codes` already used at the store
//
// ⛔ NullSender sends nothing and says "deferred", so the message stays `scheduled`. NullRedemptions knows
// of no redemption (the order source is open), so nothing is suppressed.
export class NullSender {
  async send() {
    return "deferred";
  }
}

export class NullRedemptions {
  async redeemed() {
    return [];
  }
}
