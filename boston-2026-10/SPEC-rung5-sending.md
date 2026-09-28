# boston-2026-10 — rung 5: sending through Resend, dev first, to an allowlist. CONTRACT

**Written 2026-09-27, before any code.** Rung 4 built the schedule with a `NullSender`. This rung adds the
real sender, **on the development Worker only**, and **only to addresses on an allowlist**. The dev
database holds dummy addresses (`@example.com`) that must never be sent to: a message to an address that
accepts no mail **bounces**, and bounces damage a new sending domain's reputation before it has any.

## 0. After this lands, what regenerates it, and from what?

| | what | where | set by |
|---|---|---|---|
| the Resend API key | ⛔ SECRET, never committed | Worker secret `RESEND_API_KEY` (dev) | the Advisor: `npm run secret:resend:dev` |
| the dev allowlist | ⛔ SECRET (it may name a real address) | Worker secret `SEND_ALLOWLIST` (dev) | the Advisor: `npm run secret:allowlist:dev` |
| the sender address | config, public | `vars.MAIL_FROM` in the `dev` env | ⬜ placeholder `Fit AF <offers@eatfitaf.com>` until the Owner names one |
| the schema | INPUT | `migrations/0004_sending.sql` | `db:migrate:dev` (the orchestrator) |

## 1. `ResendSender` — the `Sender` of rung 4 § 6, for real

- `POST https://api.resend.com/emails`, `Authorization: Bearer <RESEND_API_KEY>`, JSON `{ from, to: [email],
  subject, html, text }`. **Both an HTML and a plain-text part**, from the same wording (DRAFT § 3).
- ⭐ **Confirm the API from Resend's own documentation before coding** (request shape, response shape, error
  codes, and whether an `Idempotency-Key` header is supported). If it is, send one: `<save_id>:<message kind>`,
  so a retried cron run cannot send twice. Report what the documentation said, with its URL.
- **Outcomes**: accepted → `sent`, store Resend's message id (`provider_message_id`). A **permanent**
  refusal (a 4xx other than 429) → `failed` at once. **Temporary** (429, 5xx, a network error) → stays
  `scheduled`, `send_attempts + 1`; at **5** attempts → `failed`. ⛔ A failed message is never re-sent to a
  different address.
- The confirmation token (rung 4: minted at send, hash stored only if accepted) is unchanged.
- ⛔ **Nothing logs an address, a token, a code or the key.** The scheduled handler still reports counts
  only: `sent · held · suppressed · failed · retrying`.

## 2. ⭐ The allowlist (dev)

`SEND_ALLOWLIST` is a comma-separated list of exact addresses and `@domain` suffixes. A message whose
recipient is **not** on it is **held**: it stays `scheduled`, and it is neither sent nor failed. **Unset or
empty means nothing is sent.** The allowlist applies whenever it is set. Production (a later rung) will
decide whether it runs with one.

⚠ Resend publishes test recipient addresses (a delivered one and a bounced one) for exactly this. **Read
them from its documentation**, and use them in the manual check, never an address guessed here.

## 3. Choosing the sender

`RESEND_API_KEY` present → `ResendSender` wrapped in the allowlist; absent → `NullSender` (rung 4 behaviour).
`NullRedemptions` is unchanged: the order source is still open.

## 4. Schema — `migrations/0004_sending.sql`

`saves` gains `send_attempts INTEGER NOT NULL DEFAULT 0` and `provider_message_id TEXT`. Nothing personal.

## 5. Scripts

`secret:resend:dev` → `wrangler secret put RESEND_API_KEY --env dev`; `secret:allowlist:dev` → `wrangler
secret put SEND_ALLOWLIST --env dev`. Both are interactive and are **run by the Advisor**, so no key passes
through anyone else.

## 6. Cases — `node --test`, no network (`fetch` to Resend is stubbed)

| | case | expect |
|---|---|---|
| M1 | accepted | `sent`, `provider_message_id` stored; the request had `from`, `to`, `subject`, `html`, `text`, the Bearer header (and the idempotency key, if supported) |
| M2 | 422 | `failed` at once; no retry |
| M3 | 429 · 500 · network error | stays `scheduled`, attempts +1; the fifth → `failed` |
| M4 | recipient not on the allowlist · allowlist unset | **held**: no request made, stays `scheduled` |
| M5 | ⭐ mutant: the allowlist check skipped | M4 fails |
| M6 | no key | `NullSender` is used; nothing requested |
| M7 | logs and the handler's return | counts only: no address, token, code or key in any line |
| M8 | E1 and E-X bodies (HTML and text) | DRAFT § 3 as written, placeholders filled; the `/o/` and `/confirm/` links use `SITE_URL` |
| M9 | a cron run while a previous run's send is in flight (the same message twice) | one request (idempotency key, or a state guard if the key is unsupported) |

Everything in rungs 1–4 stays green; the production build stays byte-identical to S20's reference.

## 7. Not in this rung

Production sending · bounce and complaint webhooks (so a bounce marks the save; next rung) · the
Mailchimp export · the redemption source.

## 8. Amendment, 2026-09-27 (after the build) — retries must send an IDENTICAL body

**Found by the builder**: each attempt minted a new `/confirm` token, so a retry's body differed from the first
attempt's, and Resend answers a reused `Idempotency-Key` with a different body with 409
`invalid_idempotent_request` instead of replaying the first response. A lost database write after an accepted
send would then end `failed` with a dead link, and a transient error could burn the attempts early.

**Ruled (orchestrator)**: the token is **derived, not drawn**: `base64url(HMAC-SHA-256(CONFIRM_TOKEN_KEY,
"<save_id>:confirm"))`, where `CONFIRM_TOKEN_KEY` is a Worker secret (dev: set by `npm run secret:token-key:dev`,
which pipes 32 random bytes straight into `wrangler secret put`, so no person or agent ever sees the value). Its
hash is stored as before; **validity is still decided by the database** (state, expiry), not by the token. Every
attempt for a message now carries a byte-identical body, so the fixed key `<save_id>:<kind>` replays correctly
within Resend's 24-hour window, and a 409 `invalid_idempotent_request` can only mean a real defect: it is
`failed` and counted. The `send_lease_until` claim stays as the guard between overlapping runs.

Cases: **M10** two attempts for one message produce byte-identical request bodies and the same key · **M11** an
accepted send whose database write is lost, then a retry → the replayed response marks it `sent` (stubbed
replay) · **M12** mutant: a random token per attempt → M10 fails · **M13** no `CONFIRM_TOKEN_KEY` → the sender
refuses to start (like a missing `MAIL_FROM`).
