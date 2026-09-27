# Flow 2 — claim the offer

**Status: BUILT ON DEV as a single form** (rung 3, dummy data, wording `v0.2-draft`). This document
proposes the streamlined version. Where it departs from what is built, the row says so.

## 1. Purpose

Once a plan is chosen, the visitor gives **one way to reach them** so the offer can be delivered to them
and reopened later. Optionally they also agree to hear from Fit AF by email and/or text.

**Rules this flow must keep** (from `SPEC-rung3-lead-capture.md` and `consent/DRAFT.md`):

- The offer needs **only a contact to deliver it**.
- The marketing boxes are **separate, optional and unticked**.
- The mobile field says a code will be **texted** to it.
- The claim response never carries the code, a stored value or an id.

## 2. ⬜ Proposed shape: one channel at a time

The built form shows every field at once: name, email, mobile, ZIP, two boxes and a long disclosure. The
proposal asks for the channel first, then shows only that channel's field **and that channel's box
beside it**, so each consent sits next to the contact it governs.

```
Claim your offer                                  [plan · meals a week]
Where should we send your code?   ( Email )  ( Text )

  ── after "Email" ──────────────────────────────
  Email  [____________]   we'll email you a link to your code
  ☐ Also email me Fit AF menus and offers. About once a week; unsubscribe anytime.
  + add a mobile number instead / as well

ZIP  [_____]   so we can check we deliver to you
[ Claim my offer ]
Continue to the store without the offer →
```

- **Add the other channel** reveals the second field and its box. Both channels remain possible, as
  today.
- A box cannot be ticked without its field, because it is only shown beside its field. This **removes
  two error states** from the built form (`consent_sms_without_mobile`, `consent_email_without_email`).
- The **Text** option appears only once a text sender exists (Flow 4 § 5). Until then the form offers
  email only, rather than promising a text that cannot be sent.
- **First name is dropped** unless a message needs it: it is optional, and nothing uses it yet.
  *Collect the minimum.*

## 3. States (on the page)

| state | the page shows | leaves by |
|---|---|---|
| `CLOSED` | the result card with **Claim your offer** | 2.1 |
| `CHANNEL` | the two channel buttons | 2.2 |
| `EDITING` | the chosen field(s), their box(es), ZIP, **Claim my offer** | 2.3, 2.4 |
| `CHECKING` | (instant) local validation | 2.5, 2.6 |
| `VERIFYING` | the button disabled; the bot check runs (invisible unless it needs the visitor) | 2.7, 2.8 |
| `SENDING` | the button disabled; the request in flight | 2.9, 2.10, 2.11 |
| `ERROR(kind)` | the form, as filled, with one message | 2.12 |
| `SENT` | **Check your email** / **Check your texts** (Flow 3 / Flow 4 take over), plus **Wrong address? Edit** | 2.13 |

## 4. Transitions

| # | from | event | to | note |
|---|---|---|---|---|
| 2.1 | `CLOSED` | Claim your offer | `CHANNEL` | |
| 2.2 | `CHANNEL` | pick Email or Text | `EDITING` | |
| 2.3 | `EDITING` | add the other channel | `EDITING` | |
| 2.4 | `EDITING` | submit | `CHECKING` | |
| 2.5 | `CHECKING` | a local problem | `ERROR(kind)` | the channel's field is empty or malformed; ZIP is not five digits |
| 2.6 | `CHECKING` | clean | `VERIFYING` | |
| 2.7 | `VERIFYING` | the bot check passes | `SENDING` | |
| 2.8 | `VERIFYING` | the bot check fails | `ERROR(bot)` | |
| 2.9 | `SENDING` | `{ok:true}` | `SENT` | |
| 2.10 | `SENDING` | a named refusal | `ERROR(kind)` | `rate_limited`, a validation code, `turnstile_failed` |
| 2.11 | `SENDING` | network or server failure | `ERROR(retry)` | weak gym wifi is the expected case; **the form keeps what was typed** |
| 2.12 | `ERROR` | edit or resubmit | `EDITING` / `CHECKING` | |
| 2.13 | `SENT` | Edit | `EDITING` | a corrected claim replaces the first (§ 6) |
| 2.x | any | Continue to the store | ⇥ leaves | always available |

## 5. Data sent with a claim

| field | required | note |
|---|---|---|
| `email` and/or `mobile` | **one of them** | mobile is normalised to E.164 by the Worker |
| `zip` | yes | ⚠ see § 7 |
| `consent_email`, `consent_sms` | always sent, explicit `true`/`false` | only `true` if the box was shown **and** ticked |
| `plan`, `meals_per_week` | yes | from the fragment; stored as a **plan**, never as a goal |
| `event_id` | yes | ⬜ from the entry path (Flow 1 § 5) |
| `wording_version` | yes | the exact version of the text the visitor saw |
| bot-check token | yes | checked, then discarded |

Never sent and never stored: the IP address (it is the rate limiter's key only), the user agent, the
goal's wording, anything about health.

## 6. ⬜ Fork: a second claim from the same contact

The build creates a new claim and a new code on every submission. The alternatives:

| | a new claim each time (built) | ⭐ one claim per contact per event |
|---|---|---|
| resubmitting (a resend, a changed plan) | a second code | the same claim: its plan updated, its message sent again (rate-limited) |
| codes used | one per submission | one per person |
| a resend button | needs an id on the page, which the claim response must not carry | **is simply a resubmission**: nothing is echoed |
| what it reveals | nothing | nothing: the response is `{ok:true}` either way |

⭐ **Recommended: one claim per (event, normalised email or mobile).** It makes "Resend" and "Edit" the
same operation as "Claim". If the store accepts a pool of unique codes, it also stops one person drawing
several.

## 7. ⚠ The ZIP promise is not kept yet

The field says *"so we can check we deliver to you"*, but nothing checks it: there is no list of delivered
ZIP codes in this repository. Either:

- **(a)** add the store's delivery ZIP list as an input (it is public: the store answers it for anyone who
  asks) and show *"We don't deliver to 02xxx yet"* in `EDITING`, before the claim is sent; or
- **(b)** change the help text to say why the ZIP is kept (to count where the trip's interest came from),
  or drop the field.

Under (a), whether an out-of-area visitor may still claim is a business question. The page must not
promise a check it does not make.

## 8. Consent points in this flow

| id | the act | what it means | evidence stored |
|---|---|---|---|
| **CP1** | submitting the claim | a request for **this offer**, sent to the contact given, plus **one reminder** before it expires. Service, **not** marketing | the claim itself, time, wording version |
| **CP2** | ticking the email box, then submitting | a request for marketing email: **pending** until confirmed in Flow 3 | `consent_email = true`, time, wording version |
| **CP3** | ticking the text box, then submitting | written consent to marketing texts: the checkbox plus the submit is the signature. See Flow 4 for whether texts also wait for a reply | `consent_sms = true`, time, wording version |

## 9. Without JavaScript

The claim section needs the bot check, which needs JavaScript. Without JavaScript the section is not
shown, and the store links still work (Flow 1 § 4). Accepted: a claim is optional, and the store is not.
