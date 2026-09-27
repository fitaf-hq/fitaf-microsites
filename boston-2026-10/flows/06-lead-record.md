# Flow 6 — the lead record, from claim to deletion

**Status: PARTLY BUILT on dev** (the two tables, `export_state` `pending · exported · purged`, the purge
of exported claims; `SPEC-rung3-lead-capture.md` §§ 3–6). This document adds the states the other flows
need and the two ways to deletion that do not exist yet.

## 1. Purpose

Our own record of a claim, which is the system of record until the contact is exported, and which is
**built to forget**. Once a contact is deleted, only the **claim** remains: event, plan, offer code and
dates. Nothing in it identifies a person.

## 2. States of a claim

| state | means | the `contacts` row |
|---|---|---|
| `RECEIVED` | accepted; E1 and/or S1 sent | present |
| `CONFIRMED` | the email is proven (CP4), or a code was texted (S1) | present |
| `EXPORTED` | the marketing-consented channel(s) handed to the conduit, **with the consent evidence** | present until the purge |
| `PURGED` | contact deleted after export | **gone** |
| `LAPSED` | contact deleted without export: never confirmed, or the offer ran out with no marketing consent | **gone** |
| `ERASED` | contact deleted **on request** | **gone** |

`PURGED`, `LAPSED` and `ERASED` are end states. The claim row stays in all three, and the difference
between them is kept (it is how we count, not who).

## 3. Transitions

| # | from | event | to | effect |
|---|---|---|---|---|
| 6.1 | — | a claim is accepted (Flow 2) | `RECEIVED` | claim + contact written; offer code drawn |
| 6.2 | `RECEIVED` | CP4 (Flow 3) or S1 delivered (Flow 4) | `CONFIRMED` | timestamps |
| 6.3 | `RECEIVED` | unconfirmed window passes, no text channel | `LAPSED` | contact deleted |
| 6.4 | `CONFIRMED` | a channel's marketing consent is **confirmed** (CP4 with CP2 · CP5) | `EXPORTED` | ⬜ the export (§ 5) |
| 6.5 | `EXPORTED` | the purge runs | `PURGED` | contact deleted (**built**, `purge.js`) |
| 6.6 | `CONFIRMED` | offer expiry + the retention period, **no** marketing consent | `LAPSED` | contact deleted. ⬜ **not built**: today's purge touches only exported claims |
| 6.7 | any live state | a deletion request | `ERASED` | contact deleted; the request forwarded to any conduit it was exported to |
| 6.8 | any | STOP or unsubscribe arrives while the contact is still ours | unchanged | that channel's consent set `false`, with the time |

⚠ **A claim's state is coarse, but deletion is per channel.** If a claimant gave both, and the text
confirmed the claim (6.2) while the email was never confirmed, the **email field** is deleted when its
window passes, and the rest of the claim carries on. Likewise, only the consented channel is exported
(§ 5), and the other channel's field goes by 6.6.

⚠ **The reminder (Flow 5 § 4) must be sent before 6.5 or 6.6 deletes the contact.** An exported contact
gets it from the conduit (so the code travels with the export, § 5). A non-consenting one gets it from
us, which is why its contact is kept until after expiry.

## 4. Timers

| timer | proposed | the consent draft says |
|---|---|---|
| unconfirmed email window | 7 days, or the offer's expiry if sooner | — (new) |
| unanswered YES window | 7 days | — (new) |
| retention without marketing consent | offer expiry + 30 days | *"until the offer expires plus 30 days"* |
| the purge after export | as soon as the export is confirmed | *"destroyed after export"* |

⬜ **How timers run**: a scheduled Worker (a cron trigger) running the same purge module, or the purge
CLI run by hand on a written schedule. A scheduled one cannot be forgotten, so it is the one that matches
"built to forget". ⛔ Either way, a dry run by default for anything a person runs.

## 5. The export (a later rung)

**Exported**: the consented channel only.

- An email address goes to the email conduit **only** if CP2 and CP4 were both given.
- A number goes to the text conduit **only** if CP3 (and CP5, under Flow 4 § 4) was given.
- A channel without marketing consent is **never** exported. It is deleted by 6.6.

**With each contact**: `event_id`, the plan, the offer code and its expiry (so the conduit can send the
reminder), and the consent evidence: channel, `consent_at`, confirmed-at, `wording_version`. Once the
contact is purged, the conduit holds the only proof of consent, so the proof must travel with it.

⬜ **The conduit-side status** a contact is created with (for example, subscribed with our double-opt-in
evidence, rather than asking the conduit to send its own second confirmation) is read from the conduit's
API documentation when the export rung is written.

## 6. What is never in the record

The IP address · the user agent · location beyond ZIP · the goal's wording · anything about health ·
the text of any reply · the confirmation token in the clear (a hash is enough to match).

## 7. Two databases

Development holds **dummy data only**. Production is **created empty** when the wording is approved.
"Cleared before real use" is true by construction, never by a delete someone has to remember.
