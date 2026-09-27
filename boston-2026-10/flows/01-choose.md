# Flow 1 — arrive and choose a plan

**Status: BUILT (rung 1, live).** This document describes the page as it is today, so the later flows
have something fixed to attach to. The only proposals here are the event entry (§ 5) and the hand-off
point to Flow 2 (§ 6).

## 1. Purpose

Someone scans a QR code at an event, answers two questions (*how much* and *how often*), and leaves for
the store's order page for that plan. Nothing is collected in this flow.

## 2. States

The whole state is three values, and all three live in the URL fragment:

| value | domain | fragment |
|---|---|---|
| `tab` | `individual` · `family` | `#family`, or anything else means individual |
| `goal` | `lean` · `signature` · `performance` · none | `#lean` |
| `count` | a shown count (`7` · `14`) · none | `#meals-14` (count without a goal) · `#lean-14` (both) |

Named states, from those values:

| state | when | the page shows |
|---|---|---|
| `START` | individual, no goal, no count | question 1 and question 2, and a hint |
| `GOAL_ONLY` | a goal, no count | the goal pressed; the hint |
| `COUNT_ONLY` | a count, no goal | the count pressed; the hint |
| `CHOSEN` | a goal and a count | **the result card**: plan, meals a week, price per meal, weekly total, **Choose your meals** |
| `FAMILY` | family tab | the family plan, its price, its button |

`See all plans` is a separate open/closed toggle. It is not in the fragment, and in every state it shows
the full 3 × 2 grid.

## 3. Transitions

| # | from | event | to |
|---|---|---|---|
| 1.1 | any individual state | press a goal | same state with that goal |
| 1.2 | any individual state | press a count | same state with that count |
| 1.3 | any individual state | Family tab | `FAMILY` |
| 1.4 | `FAMILY` | Individual tab | the last individual state (kept in memory, not the URL) |
| 1.5 | any | back / forward | whatever the fragment then says (each choice pushes a history entry) |
| 1.6 | `CHOSEN` · `FAMILY` · the grid | **Choose your meals**, a grid cell, or the Family button | ⇥ **leaves the site** for `…/order?mpid=N` |

An unknown fragment reads as `START`. A goal or count missing from the plan table is dropped, not
guessed.

## 4. Data

- **Read**: the plan table (plans, shown counts, `mpid` per cell, price per meal in cents). The build
  computes the weekly totals, and the page script only displays them.
- **Written**: nothing. The fragment is the only memory, and it never leaves the browser.
- **No JavaScript**: the questions are hidden and the grid and Family card are shown, so every link still
  works.

## 5. ⬜ Proposed: the event comes from the entry URL

The plan is **one QR code per event**, swapped on the signage. Today the event is a single fixed value in
the build (`data/claim.json`), so every claim would record the same event.

⇒ Each event gets its own entry path, `/<event-id>/` (for example `/boston-gym-a/`), which serves the same
page with that event id built in. Its QR code encodes that path. Flow 2 sends the event id with a claim.
The event list is already data (`data/events.json`).

- A path rather than a query string, because a path survives being copied from a sign, and it is still
  not personal data.
- ⚠ An event id is public (it is printed on the QR code). It must never name a person.

## 6. Where Flow 2 attaches

Today the claim section appears below the result card once a plan is chosen, so two actions compete:
**Choose your meals** (leave now) and **Claim my offer** (stay and give a contact).

⬜ **Proposed**: in `CHOSEN` and `FAMILY` the card leads with **Claim your offer**, which opens Flow 2.
**Continue to the store** stays on the card as a plain link. ⭐ **The store is always one tap away without
giving anything**, which keeps the offer freely chosen rather than a gate in front of the store. Which of
the two is visually primary is a copy/brand decision; that the second one always exists is not.
