# Save your offer — consent wording and contact capture. v1

**Status**: ✅ **v1, approved 2026-10-25** by the Advisor (*"yes please ship it"*, `ts=2026-10-25T14:13:18.692Z`):
v0.3's text as the copy pass left it, unchanged. v0.3 was written 2026-09-27 for the Owner to route through legal; it
replaced v0.2 (git history) after the flows were inverted (`../flows/`). ⚠ § 7's two questions for legal are still
open, and his tweaks to come are a later version, released the same way. **Email only** — texting is off for October.
**The standard it is written to**: GDPR's principles as far as possible though Fit AF is US-based; the pending
Massachusetts data privacy act's principles as if enacted; CAN-SPAM for email.

Placeholders in `[brackets]` are the Owner's (the offer, its dates, the contact address) and show literally
on the development page.

---

## 1. What the visitor sees — the offer, first

> ### Your Boston offer
> **[The offer, e.g. "N free meals on your first order of $X or more"]**
>
> Not ready today? Save it — tomorrow morning we'll email you a link back here, with today's pricing held until [date]. We'll send it once.
>
> **Email** — *we'll send your link here tomorrow*
> **Delivery ZIP code** — *so we can check we deliver to you*
>
> ☐ **Also email me** Fit AF menus and offers. Weekly; unsubscribe anytime. We'll ask you to confirm.
>
> **[ Save my offer ]**
>
> We'll use your email to send this once, tomorrow. Only if you tick the box and then confirm it will we
> send you anything else. We delete your details 30 days after the offer ends unless you've confirmed. We
> don't sell your information. [Privacy notice]

Below the form, without saving anything: **Build my plan →** (and **See this week's menu →** once a menu is
published). The box starts **unticked** and is not required.

*[date]* in the lead is the date the pricing is held until, as the page knows it (`SPEC-save-offer-production.md` § 10.9:
the offer's last day, or the next day on that day); the page fills it.

⚠ **Layout note, not wording** (`SPEC-rung4-save-offer.md` § 2b, 2026-10-18): on the page, the heading and the offer line are the offer box at the top; the lines from *"Not ready today?"* to the privacy line, the form and § 2 sit at the end, directly after *Choose your meals*, once a plan is chosen; **Build my plan →** is not shown there.

⚠ **Layout note, not wording** (`SPEC-ui-and-copy-pass.md` § 1 items 1–3, 2026-10-23): the box at the top draws no heading: *"Your Boston offer"* is its accessible name, and its one line is the offer's headline (`data/offers.json` `headline`, else its label); the step's own line above *"Not ready today?"* keeps the label. The step is shown only while the plan card's *Continue to checkout* is; after a save, only its *"Saved — …"* line stays. An error about the email or the ZIP code shows under that field; any other, directly above the button that was pressed; out of area, § 2 takes the place of the box, the button and this fine print, under the two fields.

### After the offer ends

`SPEC-ui-and-copy-pass.md` § 1.2 item 3 (2026-10-23): after the last offer's last day the step still saves, with no offer
and nothing sent: no offer line, no date held; the ZIP code's field and the box as above, the email's help line its own
(no link is sent tomorrow). The lead and the button are the Advisor's words; the email's help line, the fine print and
the saved line are proposed. A draft, as all of this file.

> Not ready today? Save your plan, and we'll email you when our next offer opens.
>
> **Email** — *we'll email you here when our next offer opens*
>
> **[ Save my plan ]**
>
> We'll keep your email and ZIP code for 30 days, or until we email you about our next offer, whichever comes first,
> and then delete them unless you've confirmed. Only if you tick the box and then confirm it will we send you anything
> else. We don't sell your information. [Privacy notice]
>
> Saved — we'll email you at *(their email)* when our next offer opens.

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
> *(an offer without a code)* Your pricing is held until **[date]**
> *(an offer with a code)* **Your code: XXXX-XXXX** · held until **[date]**
> *(sent after the offer's last day)* This offer has ended
> **[ See my offer ]**
> *(only if the box was ticked)* You asked to hear about Fit AF menus and offers. **[ Yes, keep me posted ]**
> Already ordered? Enjoy your meals!
> You're getting this one email because you saved an offer. Fit AF Nutrition, 10 Enterprise, Carbondale, PA 18407.

Since `SPEC-save-offer-production.md` § 10 (2026-10-22) the Boston offer is a price promise with no code
(`code_mode: "none"`): its E1 has the first of the marked lines, *[date]* the offer's last day. The second is for an
offer that carries a code. Since § 10.7 an E1 that goes after its offer's last day (a save made on that day) has the third.

**E-X — at once, to an out-of-area request.** Subject: *Confirm: we'll tell you when Fit AF delivers near you*

> You asked us to tell you when Fit AF delivers near **[ZIP]**. **[ Yes, tell me ]**
> If this wasn't you, ignore this email — we'll delete your details within 7 days.
> Fit AF Nutrition, 10 Enterprise, Carbondale, PA 18407.

## 4. The confirmation page (`/confirm/…`)

> **Keep hearing from Fit AF?**
> Menus and offers by email, weekly. Unsubscribe from any email, anytime.
> **[ Yes, keep me posted ]**   **[ No thanks ]**

For an out-of-area request: *"We'll email you when Fit AF delivers near [ZIP] — nothing else. **[ Yes, tell
me ]** **[ No thanks ]**"*. After **Yes**: *"You're on the list."* After **No thanks**: *"No problem — you won't
hear from us again."*

## 5. What we store, and why — the minimum

| field | why |
|---|---|
| email | to send the saved offer, or the expansion news, they asked for |
| delivery ZIP | to check delivery; for an out-of-area request, the whole purpose |
| the event (e.g. `boston-2026-10`) | which event the offer belongs to; how the trip's results are counted |
| for each consent: whether given, **when confirmed**, and **the exact wording version** | proof of consent |

**Not collected**: name, phone, plan choice, date of birth, address beyond ZIP, anything about health or diet.
A daily protein or calorie target typed into the plan calculator **never leaves the browser**.

**Kept for**: 30 days after the offer ends, unless marketing was confirmed; a plan saved after an offer has ended,
30 days from the save or until we email about our next offer, whichever comes first, unless marketing was confirmed;
an out-of-area request 7 days if unconfirmed, up to 12 months if confirmed. After export to the email service,
deleted from our records. The saved offer and its event are kept without any contact details. Deleted on request at
any time.

## 6. The privacy notice (linked from the form)

> **Who we are.** Fit AF Nutrition, 10 Enterprise, Carbondale, PA 18407. Contact: privacy@eatfitaf.com.
> **What we collect and why.** Your email and ZIP code, to send the offer you saved (once) and to check we
> deliver to you — or, if we don't yet, to tell you when we do. Only if you tick the box and confirm, your
> permission to send menus and offers by email.
> **Our Boston drawing.** If you entered our drawing at a Boston event (October 26–29, 2026), we keep only the email
> on your card — nothing else from a business card — to draw the winner on October 30, tell them, and email you about
> our meals and offers, as the card says. Photos of the cards are deleted once the winner has accepted, and the cards
> are shredded. Unsubscribe from any email at any time, or ask us to delete your entry: privacy@eatfitaf.com.
> **What we don't do.** We don't sell or share your information for others' advertising. We don't collect
> health information.
> **Your choices.** Unsubscribe from any email at any time — it's as easy as signing up. Ask us to see,
> correct or delete what we hold by emailing privacy@eatfitaf.com; we'll answer within 30 days.
> **How long we keep it.** 30 days after the offer ends, unless marketing was confirmed; a plan saved after an offer
> has ended, 30 days from the save or until we email about our next offer, whichever comes first, unless marketing was
> confirmed; an out-of-area request 7 days if unconfirmed, up to 12 months if confirmed. After export to the email
> service, deleted from our records. The saved offer and its event are kept without any contact details. Deleted on
> request at any time.
> **Where it's kept.** In Fit AF's own records; our email provider (Resend, to send) receives only what it needs, on
> our behalf.

## 7. Open for legal and the Owner

- **The 12-month limit** for an out-of-area request.
- **E1 as a service message**: it is the one email the person asked for, with one optional confirmation link
  inside it. Legal to confirm that is not a marketing email.
- **F5**: the stated email frequency must match what is sent (the Owner). ✅ Answered 2026-10-22 (the Advisor): the menus
  email is **weekly**, as §§ 1 and 4 now say (`SPEC-save-offer-production.md` § 10.9).
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
