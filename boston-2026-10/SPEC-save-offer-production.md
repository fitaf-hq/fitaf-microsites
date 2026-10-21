# Save the offer, in production: the step's two tweaks, then the production page, Worker and emails. CONTRACT, before any code

**Written 2026-10-21, before any code.** The Advisor's rulings (Fit AF's decision record `2026-10-17-…` § 7q items 1
and 2, `AskUserQuestion` 2026-10-21): the save-my-offer step and its emails **to production before Monday 2026-10-26**,
and **the two tweaks on record, then a render** for his pass. The step, its states, its request, its tables and its
emails are `SPEC-rung4-save-offer.md` (§ 2b: at the end of the process) and `SPEC-rung5-sending.md`; they run on the
development Worker only, with dummy data, Turnstile's test keys and mail to an allowlist. This contract takes them to
production and changes nothing else about them. `fitaf-infra`'s part (the production database, keys and cron) is its
own amendment; the names in § 4 are the interface between the two.

## 1. The two tweaks (both builds; Fit AF's decision record § 7e, the builder's two points of 2026-10-18)

1. **"Save it" beside the offer it refers to.** At the end of the process, the step opens with **the offer's line**
   (the same slot the offer box at the top shows, `offerForSave`'s label, § 2a of `SPEC-rung4-save-offer.md`) directly
   above *"Not ready today? Save it …"*, so the step names its offer where it asks. The offer box at the top stays as it
   is; the step stays at the end (§ 2b's ruling: *"the "save your offer" call to action now should appear at the end of
   the process"*). ⚠ **The orchestrator's reading** of *"beside the offer line"*, put to the Advisor with the render: if
   he meant the step itself moved up to the offer box, that reverses § 2b and is his to say.
2. **One orange button.** The store's button (*Continue to checkout* / *Choose your meals*) stays the page's one
   `--cta` button; *Save my offer* and *Tell me when you deliver here* become the page's quieter button (the style
   *Choose my own meals* or *See all plans* already use, or an outline in `--cta` on the page's ground: whichever the
   contrast pairs pass; the build names it).
3. ⛔ **No word changes** (`consent/DRAFT.md`), no state, no request, no table. S18 still reads every paragraph.

## 2. The render for his pass (before anything of §§ 3–5 is released)

`npm run build:dev`, then PNGs (local, git-ignored, never committed) of: the end of the process with a plan chosen, at
390 and 1280 px, the step open (its offer line and form), then out of area, then saved; and both emails
(`npm run preview:emails`, E1 ticked and E-X) at 600 px. ⛔ **A render shows no photograph**: render with no week (no
picks, so no tiles) or crop to the step. The orchestrator shows them to the Advisor.

## 3. The production page

1. **`data/save.json` gains `production`** (`false` now). **False: the production build is byte-identical to the base's**
   (S20's golden as it stands, no Flow 1, no Turnstile, today's T5): this contract can merge before the Owner's inputs
   arrive, and every other release goes on unaffected.
2. **True: the production page carries Flow 1 at the end**, exactly as the development build does (§ 2b's places, §
   1's tweaks, `#from-email`), saving to its own origin's `/api/save` with the production site key (§ 4), **and the build
   refuses** (naming each) until every input it needs is approved:
   - the wording is approved: `wording_version` names a version that is not a draft (`v1`, with its date, in
     `consent/DRAFT.md`'s status line and `known_wording_versions`), and **no `[bracketed]` placeholder is left** in
     the parts the page and the emails print (the contact address, the postal address, the response days, the export
     provider);
   - `data/offers.json` is `"status": "approved"`: its labels and dates the Owner's, and its codes real (no
     `PLACEHOLDER`), giving 25% as its label says on every cart (Fit AF's decision record § 7p item 6);
   - `data/delivery-zips.json` is `"status": "official"` (the rule already stated in `data/README.md`);
   - the sender (`MAIL_FROM`) is not the placeholder.
   ⛔ The page's **draft tag** (*"DRAFT — not for use"*) is never in a production build.
3. **T5, amended for production, once and by name**: the production page may load exactly one third-party script,
   Turnstile's (`TURNSTILE_SCRIPT_URL`), and only when `production` is true. Every other T5 rule stands (no other
   origin, no other script, the analytics beacon unchanged).
4. The page stays under `SPEC.md` § 1's gzip budget.

## 4. The production Worker

1. **With `production` false, `src/worker/site.js` is byte-identical in behaviour** (CC-8b's golden unchanged).
2. **True: the production Worker serves rung 4's routes and its cron as the development Worker does**: `POST /api/save`,
   `/confirm/<token>`, `/o/<code>`, and the scheduled handler (send what is due, lapse, purge), with the same modules
   (imported, not copied). `SPEC-week-content.md` § 4 item 1's *"no D1, no rate limiters, no cron"* for production is
   amended by this item, and its content and analytics behaviours are unchanged.
3. **The interface with `fitaf-infra`** (production's names; development's are unchanged): the D1 binding `DB` to
   `fitaf-leads-prod`; the rate-limit bindings as development's; the cron (every 5 minutes, as development); vars
   `SITE_URL` (`https://eatfitaf.com`), `MAIL_FROM`, `TURNSTILE_SITE_KEY`; secrets `RESEND_API_KEY`, `CONFIRM_TOKEN_KEY`,
   `TURNSTILE_SECRET_KEY`. `wrangler.jsonc` mirrors them for production (nothing is deployed from here).
4. **Sending in production is not allowlisted**: the environment decides (a var set by `fitaf-infra`, production only);
   development keeps the allowlist and, with none set, still sends nothing (`SPEC-rung5-sending.md` § 2, a case).
5. **The erase CLI reaches production** (`scripts/erase.mjs --env prod`, a dry run unless `--apply`), because the
   privacy notice promises a deletion on request; it is run by the operator with the `d1` token, never by the page.
6. ⛔ Nothing logs an address, a token, a code or a key (rung 5 § 1, unchanged). Redemptions stay the null
   implementation (no suppression by an order yet), and the export to an email provider is not built: both are said in
   the release note, not changed.

## 5. Cases (written first, each run red before its code)

- **SP1** (both builds): the step's offer line directly above the save lead, its text `offerForSave`'s label; the offer
  box at the top unchanged. **SP2**: the store's button the one `--cta`; the two save buttons the quieter style; every
  new pair in `src/contrast-pairs.json` and passing.
- **SP3** `production: false`: S20, CC-8b and the production T5 as the base's, byte for byte.
- **SP4** `production: true` with each input unapproved in turn (a draft wording, a bracket left, offers placeholder,
  ZIPs mock, the placeholder sender): the build refuses, naming it. With all approved (fixtures): the production page
  carries Flow 1 at the end, no draft tag, the production site key, its form posting to `/api/save`.
- **SP5** T5 for production: with `production` true, exactly one third-party script, Turnstile's; with false, none.
- **SP6** the production Worker with `production` true (Miniflare, as S1–S17 for development): S1–S17's cases run
  against it; with false, `/api/save` is not served.
- **SP7** sending: production with no allowlist sends (a recording sender); development with none sends nothing.
- **SP8** erase: `--env prod` dry run counts only; `--apply` as S16; any other database name refused.
- **Mutants**: the build's input check that always passes (SP4 red); production sending through the allowlist (SP7 red);
  the draft tag kept in production (SP4 red).
- The site suite, contrast, Storybook and the storefront watch: green, or each failure the base's own by a control run.

## 6. Release

1. §§ 1–2 first: the tweaks on the dev line and a dev pin, the render to the Advisor.
2. §§ 3–5 merged with `production: false` (production unchanged, shown by S20).
3. When the Advisor's wording pass and the Owner's inputs are in: the inputs committed (approved), `fitaf-infra`'s
   amendment applied (the database, keys, cron), `production: true`, the production pin, **on his word**, after Fit AF's
   Friday 2026-10-23 switch. Then one save made by a person on eatfitaf.com to an address the Advisor names, its E1
   received the next morning at 09:00 Eastern.

## 7. Not here

The words (the Advisor's and the Owner's); the redemption source; the export to an email provider; texting; analytics
for the step.

## 8. Built (to be filled by the build)
