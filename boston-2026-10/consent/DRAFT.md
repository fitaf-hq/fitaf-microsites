# Claim your offer — consent wording and contact capture. DRAFT v0.2, for legal review

**Status**: ⛔ **DRAFT — not live.** Written 2026-09-27 for the Owner to route through legal. Nothing
here is on the page until it is approved, and the approved text becomes `v1` with its date.
**The standard it is written to** (the Advisor, 2026-09-27): GDPR's principles as far as possible though
Fit AF is US-based; the pending Massachusetts data privacy act's principles as if enacted; and the US
rules that already apply — the TCPA for marketing texts, CAN-SPAM for marketing email.

---

## 1. What the visitor sees

After choosing a plan, below the plan card:

> ### Claim your Boston offer
> **[The offer, e.g. "3 free meals on your first order of $X or more"]** — reserved for you until
> **[date]**. Tell us where to send it.
>
> **First name** (optional)
> **Email** — *we'll email you a unique code*
> **Mobile number** — *enter your number so we can text you a unique code*
> *(one is enough)*
> **Delivery ZIP code** — *so we can confirm we deliver to you*
>
> **How should we stay in touch?** *(optional — your offer doesn't depend on it)*
>
> ☐ **Email me** Fit AF menus, offers and news. About once a week; unsubscribe anytime.
>
> ☐ **Text me** Fit AF menus and offers at the number above. By checking this box, I agree to receive
> recurring automated marketing text messages from Fit AF Nutrition at this number. Consent is not a
> condition of any purchase. Message frequency varies (about 4 a month). Message and data rates may
> apply. Reply STOP to cancel, HELP for help.
>
> **[ Claim my offer ]**
>
> We'll use your details to send your offer, remind you once before it expires, and — only if you
> ticked a box above — keep in touch that way. We save the plan you picked so your link opens it again.
> We don't sell your information. [Privacy notice]

Both boxes start **unticked**. Neither is required to claim the offer.

## 2. What happens after "Claim my offer"

| they gave | we send | it is |
|---|---|---|
| an email | **one** email with the offer code and a link back to their plan · **one** reminder before it expires | the service they asked for — **not** marketing consent |
| a mobile number | **one** text with the offer code and the link · ⚠ the reminder: see F3 | the service they asked for — the field's own label says a code will be texted (F3, ruled) |
| a ticked box | ongoing marketing on **that channel only** | their consent, recorded (§ 3) |

## 3. What we store, and why — the minimum

| field | why it is needed |
|---|---|
| email and/or mobile | to deliver the offer they asked for |
| first name (optional) | to address them; nothing breaks without it |
| delivery ZIP | to tell them straight away if we don't deliver there |
| the plan they picked | so the offer link reopens it — they can see it on screen |
| the event (e.g. `boston-2026-10`) | which event the offer belongs to; how we count the trip's results |
| **for each ticked box**: the channel, the date and time, and **the exact wording version** (`v1`) they saw | proof of consent — the TCPA requires a written, signed agreement for marketing texts, and a checkbox plus submit counts as an electronic signature |

**Not collected**: date of birth, gender, address beyond ZIP, anything about health or diet. (Health and
diet goals are sensitive data under both Massachusetts bills; "Lean / Signature / Performance" is a
**portion size**, and it is stored as a plan, not as a goal.)

**Kept for**: the offer data until the offer expires plus 30 days if they ticked nothing; for as long as
they stay subscribed if they did. Deleted on request.

## 4. The privacy notice (linked from the form)

> **Who we are.** Fit AF Nutrition, 10 Enterprise, Carbondale, PA 18407. Contact: [email].
> **What we collect and why.** Your email and/or mobile number and ZIP code to send the offer you
> claimed and one reminder; the plan you picked, to reopen it for you; and, only if you ticked a box,
> your permission to send menus and offers by email or text.
> **What we don't do.** We don't sell or share your information for others' advertising. We don't collect
> health information.
> **Your choices.** Unsubscribe from any email, or reply STOP to any text, at any time — it's as easy as
> signing up. Ask us to see, correct or delete what we hold by emailing [email]; we'll answer within
> [30] days.
> **How long we keep it.** Until your offer expires plus 30 days, unless you asked to stay in touch —
> then until you unsubscribe.
> **Where it's kept.** In Fit AF's own records; our email and text providers ([Mailchimp] and [SMS
> provider]) receive only what they need to send the messages, on our behalf.

## 5. The forks — answered 2026-09-27 except where marked

**F1 ✅** only a contact to deliver it · **F2** yes, UX and data processing to be thought through · **F3 ✅** the phone field's label says a code will be texted — ⚠ whether the **reminder** text is covered by that expectation is still for legal · **F4 ✅** leads go to **our own record first** (a spreadsheet or database in an account Fit AF owns); Mailchimp and the SMS provider are **output conduits only** · **F5** the Owner · **F6 ✅** 10 Enterprise, Carbondale, PA 18407

The original table, kept for the reasoning:

| | question | recommendation | why |
|---|---|---|---|
| **F1** | Is the offer **conditional** on marketing consent, or only on a contact to deliver it? | ⭐ **Only on a contact.** Marketing boxes are separate and optional | GDPR and both MA bills: consent must be **freely given** and not bundled; the Senate bill bars bundling outright. ⭐ And the multi-touch still happens: the offer delivery and **one reminder before it expires** are the service they asked for, so every claimant gets two touches in the window; ongoing marketing needs the box |
| **F2** | Double opt-in for email? | ⭐ **Yes** — the confirmation email **carries the code** | the code arriving only after they confirm is what "claim" means; it also proves the address is real and theirs (stronger evidence of consent; a cleaner list) |
| **F3** | Can we text **the offer and one reminder** to someone who gave a number but did **not** tick "Text me"? | ⚠ **Legal to decide.** Conservative option: if they don't tick, send the offer to their **email** only, and ask for a number only alongside the "Text me" box | the TCPA's written-consent rule covers **marketing** texts; an offer code the person just requested is arguably not marketing, but a reminder to use it may be. This is the one line where the draft could be wrong |
| **F4** | Where do leads live? | ⭐ **Fit AF's Mailchimp** (the storefront already uses it) as the record for email; the SMS provider for texts. ⛔ **Not** a database on the Advisor's personal Cloudflare account | customer contact data belongs in an account the enterprise owns; a separate record store can come with the CRM work |
| **F5** | Is the frequency right? "About once a week" email, "about 4 a month" texts | the Owner sets it; the wording must match what is actually sent | a stated frequency the practice exceeds is a misleading statement — which the House bill excludes from valid consent |
| **F6** | Is Fit AF's postal address public, and which address goes in emails? | the Owner | CAN-SPAM requires a physical postal address in every marketing email |

## 6. Where these lines come from

Each read 2026-09-27; ⛔ this draft is the checking we could do, and legal review is what makes it right.

- **Texts** — [47 CFR § 64.1200](https://www.law.cornell.edu/cfr/text/47/64.1200): (f)(9) prior express
  written consent, not a condition of purchase, electronic signature; (a)(10) opt-out by any reasonable
  means within ten business days; (a)(12) one confirmation text. The 2023 "one-to-one" amendment was
  [vacated and removed in 2025](https://www.federalregister.gov/documents/2025/08/29/2025-16641/delete-delete-delete-targeting-and-eliminating-unlawful-text-messages-rules-and-regulations);
  the draft names one seller anyway.
- **Email** — [FTC CAN-SPAM guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business):
  a postal address, a clear opt-out honoured within 10 business days. It does not require consent before
  sending; this draft asks for it anyway.
- **Massachusetts** — ⚠ **not law yet** (conference committee since 2026-06-11); compared in
  [Foley Hoag, June 2026](https://foleyhoag.com/news-and-insights/blogs/state-ag-insights/2026/june/one-step-closer-to-a-massachusetts-data-privacy-law-comparing-the-current-house-and-senate-bills/):
  consent must be *"clear, freely given, specific, informed, and unambiguous"*; no dark patterns or
  bundled terms (Senate). ⚠ The bill text itself was read through that comparison, not directly.
- **Mailchimp** — [consent with GDPR forms](https://mailchimp.com/help/collect-consent-with-gdpr-forms/),
  [double opt-in](https://mailchimp.com/help/single-opt-in-vs-double-opt-in/).
