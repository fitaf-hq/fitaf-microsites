# Flow 5 — come back, and use the code at the store

**Status: rung 1's links are BUILT; the rest is PROPOSED.** The pre-filled cart is
`SPEC-rung2-cart-handoff.md` (planned; it waits on the store's tag-container setting).

## 1. Purpose

**A lead may convert in 0 minutes or 3 weeks, and the offer holds either way.** This flow is every route
back to the plan, and the step onto the store with the code in hand.

## 2. The ways back

| from | lands on | carries |
|---|---|---|
| the code page (Flow 3, `REVEALED`) | the code page itself; **Continue to your plan** | the plan |
| a text (S1, S2) | the microsite at `#<plan>-<count>` | the plan only; the code is in the text |
| the reminder email (§ 4) | the code page (`/c/<token>`) | the plan and the code |
| the same QR code, scanned again | Flow 1 `START` | nothing: the visitor chooses again |

⭐ **The plan comes back; the meals are this week's.** When Chef's Choice exists, a returning visitor sees
**the current week's picks** for their plan, not the week they claimed in: the menu rotates, and last
week's meals may not be orderable.

## 3. Onto the store

| rung | **Continue to your plan** goes to | the code |
|---|---|---|
| **1 (now)** | `…/order?mpid=N` | shown with a **Copy** button; the visitor enters it at checkout |
| **2 (planned)** | `…/order?mpid=N#fitaf=<payload>` | carried in the payload; the store-side tag enters it through the store's own coupon field (rung 2 § 2) |

Rung 2's rule carries over: **without the tag, the link is exactly rung 1**, so this flow never depends on
it.

⚠ In rung 2 the fragment carries the offer code, and a fragment stays in the browser's history. That is
acceptable (the code is the holder's own, and the tag removes the fragment once read), but the payload
must carry **nothing else personal**: no name, no contact, no token.

## 4. The reminder — one, before expiry

| to | by | when |
|---|---|---|
| every **confirmed** email claimant (CP4) | email, **E3**: *"Your offer ends [date]"* → the code page | ⬜ a fixed time before expiry (e.g. 3 days) |
| a text claimant | S2 (Flow 4), under the F3 caveat | the same |
| an **unconfirmed** email | ⛔ nothing: an address never proven to be theirs gets no second message | — |

The reminder is part of what CP1 asked for. ⛔ **It is one message**, and anything beyond it needs CP2,
CP3 or CP5.

## 5. Redemption, and what it tells us

- The store records the code on the order. **We do not see the order.** The success metrics (new
  customers, their lifetime value) come from the store's order reports **by code**, and the code maps to
  its event.
- ⭐ **The code is the only link from an order back to the event**, and it is the one thing kept after the
  contact is deleted (Flow 6). So it must be **unique per claim** (a pool of codes the store accepts) for
  the trip's results to be countable per event. Whether the store accepts such a pool is being confirmed.
- ⬜ **Not decided here**: whether the offer is tied to the plan claimed (the build records the plan; the
  offer's terms are the Owner's).

## 6. After the offer

`EXPIRED` (Flow 3) shows "This offer has ended" and the store link. A **new** offer for a lead who did not
convert (re-expressed later) is a **new message on a channel they consented to**. ⛔ It never reuses the
expired page and never goes to someone who ticked nothing.
