# Save your offer — consent wording and contact capture. DRAFT v0.3, for legal review

**Status**: ⛔ **DRAFT — not live.** v0.3 written 2026-09-27 for the Owner to route through legal; it replaces
v0.2 (git history) after the flows were inverted (`../flows/`). Nothing here is on the public page until it
is approved; the approved text becomes `v1` with its date. **Email only** — texting is off for October.
**The standard it is written to**: GDPR's principles as far as possible though Fit AF is US-based; the pending
Massachusetts data privacy act's principles as if enacted; CAN-SPAM for email.

Placeholders in `[brackets]` are the Owner's (the offer, its dates, the contact address) and show literally
on the development page.

---

## 1. What the visitor sees — the offer, first

> ### Your Boston offer
> **[The offer, e.g. "N free meals on your first order of $X or more"]**
>
> Not ready today? Save it — we'll email your code tomorrow morning, with a link back here. We'll send it once.
>
> **Email** — *we'll send your code here tomorrow*
> **Delivery ZIP code** — *so we can check we deliver to you*
>
> ☐ **Also email me** Fit AF menus and offers. About once a week; unsubscribe anytime. We'll ask you to confirm.
>
> **[ Save my offer ]**
>
> We'll use your email to send this code once, tomorrow. Only if you tick the box and then confirm it will we
> send you anything else. We delete your details 30 days after the offer ends unless you've confirmed. We
> don't sell your information. [Privacy notice]

Below the form, without saving anything: **Build my plan →** (and **See this week's menu →** once a menu is
published). The box starts **unticked** and is not required.

## 2. Out of area

> We don't deliver to **[ZIP]** yet.
>
> **[ Tell me when you deliver here ]**
>
> We'll email you once to confirm. After that, we'll only email you about delivery reaching your area. We keep
> your email and ZIP for up to 12 months for this, then delete them.

No offer code is issued for an out-of-area ZIP. ⬜ The 12 months is proposed.

## 3. The emails

**E1 — the next morning, to a saved offer.** Subject: *Your Fit AF offer, as promised*

> You saved this offer at **[event]** yesterday — here it is.
> **Your code: XXXX-XXXX** · good until **[date]**
> **[ See my offer ]**
> *(only if the box was ticked)* You asked to hear about Fit AF menus and offers. **[ Yes, keep me posted ]**
> Already ordered? Enjoy your meals!
> You're getting this one email because you saved an offer. Fit AF Nutrition, 10 Enterprise, Carbondale, PA 18407.

**E-X — at once, to an out-of-area request.** Subject: *Confirm: we'll tell you when Fit AF delivers near you*

> You asked us to tell you when Fit AF delivers near **[ZIP]**. **[ Yes, tell me ]**
> If this wasn't you, ignore this email — we'll delete your details within 7 days.
> Fit AF Nutrition, 10 Enterprise, Carbondale, PA 18407.

## 4. The confirmation page (`/confirm/…`)

> **Keep hearing from Fit AF?**
> Menus and offers by email, about once a week. Unsubscribe from any email, anytime.
> **[ Yes, keep me posted ]**   **[ No thanks ]**

For an out-of-area request: *"We'll email you when Fit AF delivers near [ZIP] — nothing else. **[ Yes, tell
me ]** **[ No thanks ]**"*. After **Yes**: *"You're on the list."* After **No thanks**: *"No problem — you won't
hear from us again."*

## 5. What we store, and why — the minimum

| field | why |
|---|---|
| email | to send the code, or the expansion news, they asked for |
| delivery ZIP | to check delivery; for an out-of-area request, the whole purpose |
| the event (e.g. `boston-2026-10`) | which event the offer belongs to; how the trip's results are counted |
| for each consent: whether given, **when confirmed**, and **the exact wording version** | proof of consent |

**Not collected**: name, phone, plan choice, date of birth, address beyond ZIP, anything about health or diet.
A daily protein or calorie target typed into the plan calculator **never leaves the browser**.

**Kept for**: 30 days after the offer ends, unless marketing was confirmed; an out-of-area request 7 days if
unconfirmed, up to 12 months if confirmed. After export to the email service, deleted from our records. The
offer code and its event are kept without any contact details. Deleted on request at any time.

## 6. The privacy notice (linked from the form)

> **Who we are.** Fit AF Nutrition, 10 Enterprise, Carbondale, PA 18407. Contact: [email].
> **What we collect and why.** Your email and ZIP code, to send the offer you saved (once) and to check we
> deliver to you — or, if we don't yet, to tell you when we do. Only if you tick the box and confirm, your
> permission to send menus and offers by email.
> **What we don't do.** We don't sell or share your information for others' advertising. We don't collect
> health information.
> **Your choices.** Unsubscribe from any email at any time — it's as easy as signing up. Ask us to see,
> correct or delete what we hold by emailing [email]; we'll answer within [30] days.
> **How long we keep it.** As in § 5.
> **Where it's kept.** In Fit AF's own records; our email providers (Resend, to send; [Mailchimp], for those
> who confirmed) receive only what they need, on our behalf.

## 7. Open for legal and the Owner

- **The 12-month limit** for an out-of-area request.
- **E1 as a service message**: it is the one email the person asked for, with one optional confirmation link
  inside it. Legal to confirm that is not a marketing email.
- **F5**: the stated email frequency must match what is sent (the Owner).
- The texting forks of v0.2 (F3) are parked with texting.

## 8. Where these lines come from

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
