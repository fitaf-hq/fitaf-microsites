# data/

The committed INPUTS of the page and the Worker. All are public. Change these, then `npm run build`; never edit `dist/`.

- **`plans.json`**: the plan table of SPEC § 2, read by a person off `read_from` on `read_on`. Every
  plan × count carries `mpid`, `meals_per_week` and `price_per_meal_cents` (integer cents). No totals are
  stored. `order_base_url` is the one place the doors point; re-point it for a future store.
  ⚠ `mpid`s are HMP configuration and are **not in order** (Signature 14 is `29`, 21 is `28`). Re-read
  them from the store; never infer one from its neighbours.
- **`save.json`** (rung 4): the save endpoint, the wording version the page sends (`v0.3-draft`) and the
  versions the Worker accepts, the send zone and hour (09:00 America/New_York), and the lapse periods
  (30 days after an offer ends; 7 days for an unconfirmed expansion request; `expansion_retention_days`, 365,
  ⬜ proposed). When the wording is approved, add `v1` to `known_wording_versions` and point
  `wording_version` at it.
- **`offers.json`** (rung 4): ⛔ **placeholders** (`"status": "placeholder"`; every `label` is `[The offer]`,
  every `shared_code` `PLACEHOLDER`) until the Owner's offers are approved. Dates are calendar dates in New
  York, inclusive. A save gets the live `event` offer, else the current `general` one; **exactly one
  `general` offer is current on every date** (test S11b). The past offer exists so the expired paths can be
  exercised in development.
- **`events.json`**: one entry per QR code, `{ "id", "name", "url" }`; `id` names `dist/qr/<id>.png` and
  `.svg`, and (rung 4, dev) `dist-dev/<id>/index.html`, whose saves carry that `event_id`; `name` is the
  event as E1 names it. ⚠ An event id and name are public; neither may name a person.
  The `demo` URL is `https://eatfitaf.com/` (the vanity domain, attached 2026-09-27). QR codes printed before
  that point at the old `workers.dev` address, which still serves the same page.
- **`delivery-zips.json`**: ⛔ **a MOCK** (`"status": "mock"`) of greater Boston by three-digit ZIP prefix,
  so the ZIP check of `flows/01-save-offer.md` § 5 can be built. It is **not** the store's delivery area.
  Replace it with the official list (five-digit ZIPs, `"match": "exact"`, `"status": "official"`); a
  production build must refuse a `mock` list. Its `near_ring` (equally a mock) lists the areas just outside that reach,
  so an out-of-area expansion request is classed `near` or `far` (`flows/01-save-offer.md` § 5).
