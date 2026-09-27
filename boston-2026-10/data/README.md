# data/

The committed INPUTS of the page. Both are public. Change these, then `npm run build`; never edit `dist/`.

- **`plans.json`**: the plan table of SPEC § 2, read by a person off `read_from` on `read_on`. Every
  plan × count carries `mpid`, `meals_per_week` and `price_per_meal_cents` (integer cents). No totals are
  stored. `order_base_url` is the one place the doors point; re-point it for a future store.
  ⚠ `mpid`s are HMP configuration and are **not in order** (Signature 14 is `29`, 21 is `28`). Re-read
  them from the store; never infer one from its neighbours.
- **`claim.json`** (rung 3): the event id the Worker stamps on a claim, the claim endpoint, the wording
  version the page sends (`v0.2-draft`) and the versions the Worker accepts. When the wording is approved,
  add `v1` to `known_wording_versions` and point `wording_version` at it.
- **`events.json`**: one entry per QR code, `{ "id", "url" }`; `id` names `dist/qr/<id>.png` and `.svg`.
  ⏳ The `demo` URL is the deployed default, `https://fitaf-microsites.fitaf-microsite-boston-2026-10.workers.dev/` (Cloudflare
  now serves a Pages project as a static-assets Worker, so the default address is `workers.dev`, not
  `pages.dev`), because `eatfitaf.com` is not bought yet. **When the domain is live, replace the URL and
  rebuild**: every QR code printed before that points at the `workers.dev` address.
- **`delivery-zips.json`**: ⛔ **a MOCK** (`"status": "mock"`) of greater Boston by three-digit ZIP prefix,
  so the ZIP check of `flows/01-save-offer.md` § 6 can be built. It is **not** the store's delivery area.
  Replace it with the official list (five-digit ZIPs, `"match": "exact"`, `"status": "official"`); a
  production build must refuse a `mock` list.
