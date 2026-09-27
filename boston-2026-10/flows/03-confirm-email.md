# Flow 3 — confirm the email, and reveal the code (double opt-in)

**Status: PROPOSED, not built.** The build has no email sender, so "check your email" is not yet true.

## 1. Purpose

A claimant who gave an email gets **one email**. Opening its link does three things at once:

1. it proves the address is theirs;
2. it confirms the marketing box, if they ticked it (the second "opt-in" of double opt-in);
3. it shows them their code, their plan, and the way on to the store.

⭐ **The click that confirms is the same click that continues.** So a visitor in the gym who wants to order
now reads the email on the same phone, taps once, and is on a page with the code and a **Continue to your
plan** button. The code is never shown on the claim page itself (the claim response carries nothing), so
it reaches only whoever holds the inbox.

## 2. The message

**E1 — "Your Fit AF offer: confirm to see your code"**

- One button: **See my code** → `https://<site>/c/<token>`.
- One line on what they asked for (the plan) and, if they ticked the box, that confirming also signs them
  up for the stated email frequency.
- The postal address and the reason they are getting it ("you claimed an offer at …").
- ⛔ **Not the code** — the code arriving only after the click is what makes this a *claim*.
- ⛔ **No marketing content**: until the click, this is a reply to their request and nothing more.

`<token>` is random and unguessable, is used only for this, and expires with the offer. It is **not** the
offer code.

## 3. States (the confirmation page, `/c/<token>`)

| state | when | the page shows |
|---|---|---|
| `LANDING` | a GET on a live, unconfirmed token | **Show my code** (a button, not an automatic reveal: § 5) |
| `REVEALED` | after the button, or any later visit to a confirmed token | the code (with **Copy**), the plan, **Continue to your plan**, the expiry date |
| `EXPIRED` | the offer has expired | "This offer has ended", with the store link. ⬜ Later: an evolved offer arrives as a **new** message, not on this page |
| `GONE` | unknown token, or the record has been purged | "This link is no longer active", with the store link. **Identical** to an unknown token, so the page reveals nothing about whether an address ever claimed |

## 4. Transitions

| # | from | event | to | server effect |
|---|---|---|---|---|
| 3.1 | (Flow 2 `SENT`) | the Worker accepts a claim with an email | E1 sent | claim `RECEIVED` (Flow 6) |
| 3.2 | E1 | open the link | `LANDING` / `REVEALED` / `EXPIRED` / `GONE` | none: a GET changes nothing |
| 3.3 | `LANDING` | **Show my code** (a POST) | `REVEALED` | the address is marked **confirmed**; if the email box was ticked, marketing consent is marked **confirmed** (CP4) |
| 3.4 | `REVEALED` | revisit | `REVEALED` | none: the page is the saved offer |
| 3.5 | `REVEALED` | **Continue to your plan** | ⇥ Flow 5 | none |
| 3.6 | (no click) | the unconfirmed window passes (⬜ proposed: 7 days, or the offer's expiry if sooner) | — | the contact is deleted (Flow 6 `LAPSED`); **no reminder is sent to an unconfirmed address** |
| 3.7 | Flow 2 | the same contact claims again | E1 sent again | one claim per contact (Flow 2 § 6); rate-limited |

## 5. ⭐ Why confirmation needs a button, not just the link

Many mail systems (workplace filters especially) **open every link in an incoming email** to scan it. If
opening the link confirmed the address, a scanner would confirm it, and a confirmation would prove
nothing. So the GET only shows the page, and the confirmation is a POST that a person makes.

## 6. Security of the page

- The token is in the path, so the Worker sees it. ⛔ It must never be logged, and Worker request
  logging stays off for `/c/*`.
- `Referrer-Policy: no-referrer` on the page, so the token cannot travel to the store in a Referer header
  when the visitor continues.
- `Cache-Control: no-store`; `noindex`.
- Rate-limit token lookups per IP, so tokens cannot be guessed by volume (they are unguessable anyway).

## 7. Consent points

| id | the act | means | evidence stored |
|---|---|---|---|
| **CP4** | pressing **Show my code** | the address is theirs; **if** CP2 was given, marketing email is now confirmed (double opt-in) | `email_confirmed_at`; with CP2, `consent_email_confirmed_at` |
| **CP-W1** | the unsubscribe link in any later marketing email | marketing email withdrawn, as easily as it was given | handled where the email was sent (the email conduit); if our record still exists, `consent_email = false` and the time |

## 8. Data

- **New fields on the claim**: `confirm_token` (or a hash of it; the lookup only needs a match),
  `email_confirmed_at`, `consent_email_confirmed_at`.
- **The sender** receives the address, the token link and the plan's name. Nothing else.
- ⬜ **Which sender** sends E1 (a transactional email service, or the marketing platform's own
  transactional product) is open; see [`README.md`](README.md) § 5. Whichever it is, it is an **output
  conduit**, never the record.

## 9. Both channels given

When a claimant gave an email and a mobile number, the text (Flow 4) delivers the code at once, and E1
still goes out: it confirms the address and CP2. The code page is the same page.
