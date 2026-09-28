// The two interfaces this rung cannot yet implement (SPEC-rung4 § 6), with their NULL implementations.
//
//   Sender.send(message)        -> "sent" | "failed" | "deferred"
//   Redemptions.redeemed(codes) -> the subset of `codes` already used at the store
//
// ⛔ NullSender sends nothing and says "deferred", so the message stays `scheduled` (Resend is being set
// up). NullRedemptions knows of no redemption (the order source is open), so nothing is suppressed.
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
