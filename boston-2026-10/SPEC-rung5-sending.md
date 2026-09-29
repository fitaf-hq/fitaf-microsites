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

## 9. Amendment, 2026-09-29 — the two emails in Fit AF's look (presentation only)

**Asked (orchestrator)**: E1 and E-X went out as HTML with browser defaults. They now carry the page's look.
⛔ **The wording does not change, not a word**: the plain-text part stays byte-identical, and the HTML shows
exactly the text part's wording (DRAFT § 3 is a draft for legal review; this amendment changes only how it looks).

- **Email-safe**: one centred layout table, 600 px wide at most; **inline `style` attributes only** — no
  `<style>`, no `<link>`, no web font, no script, no form. The font stacks are the page's own (`--head`,
  `--body`), whose system fallbacks carry the email where Poppins and Open Sans are not installed.
- **The logo**: an `<img>` at `SITE_URL/assets/fitaf-logo.png` — the file the build already copies into both
  Workers' assets — at the page's 88×56, alt "Fit AF". It is not a link (a link would add one the text part
  does not have).
- **Colours are the page's tokens**, and nothing that exists as a token is written in the renderer. The Worker
  cannot read `src/template.html` at run time, so `npm run email:tokens` copies the template's `:root` into
  `src/worker/email-tokens.json` (a JSON import, as `data/offers.json` already is). The file is DERIVED: M17
  fails when it differs from the template's `:root`, so a token change reaches the email through a
  regeneration, never by hand.
- **Buttons**: every link of the draft (its `[ … ]`) is the page's button — `--cta` with the `--on-cta`
  label, 19px/700 uppercase, as on the page — built as a bulletproof table-cell button.
- **Footer**: the message's last line, muted 13px under a hairline — E1's *"You're getting this one email
  because you saved an offer."* with the postal address (one line in the draft), E-X's postal address.
  ⚠ The draft has **no unsubscribe line** in either email, and none is added.
- **No preheader**: the draft supplies none, and hidden text would be wording the text part does not have.
- **Contrast**: every text/background pair the email draws is in `src/contrast-pairs.json` with
  `"build": "email"`, measured by `npm run contrast`.
- **Previews for a screen share**: `npm run preview:emails` writes `dist-dev/email-preview/e1.html` (the box
  ticked, so every line shows) and `ex.html` (git-ignored), from the data files as they stand (placeholders
  included), a sample code and token, and the dev `SITE_URL`. `npm run build:dev` empties `dist-dev/`, so run
  the preview after it.

Cases (`node --test`, no network; E1 ticked, E1 unticked and E-X each):

| | case | expect |
|---|---|---|
| M14 | the text part | byte-identical to `test/m14-text-golden.json`, recorded from `4ddd5c4` (before this amendment) |
| M15 | email-safe | no `<script>`, `<style>`, `<link>`, `@import`, `@font-face` or `url(`; no form control; every element that draws is styled inline |
| M16 | links | every `href` and `src` is absolute on `SITE_URL`; the `href`s are the text part's links, in order; the logo is the file the build copies into the Worker's assets |
| M17 | colours | every colour in the HTML is a `:root` token value of `src/template.html`; `email-tokens.json` equals that `:root`; the renderer's source holds no colour and no font name; the check refuses a colour that is not a token (mutant, on a copy of the HTML) |
| M18 | wording | the HTML's visible text, tags stripped, equals the text part's wording (each link's `: URL` removed), line for line and as a whole |
| M19 | layout | one centred table at most 600 px, nothing wider; each link a bulletproof button on `--cta`; the font stacks are `--head` and `--body` |
| M20 | contrast | every text/background pair the renderer's styles draw is declared (`"build": "email"`) and passes |
