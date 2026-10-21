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

**Built 2026-10-21** on `boston/save-offer-production` from `63275a8`. Every case was run one file at a time at `nice -n 15`
(another team's heavy gate was running on the machine). The whole site suite, Storybook and the storefront watch were not
run here: the orchestrator runs them.

### 8.1 Commits

| commit | what |
|---|---|
| `2f917f6` | SP1 and SP2 written first, red: 9 of 9 failing (`test/sp-fixture.mjs`) |
| `1305f62` | § 1, the two tweaks, and the contrast pairs |
| `18ac41f` | U4's golden re-recorded from `1305f62`; README |
| `1949361` | SP3–SP8, the three mutants and SP1/SP2's production half written first, red (`test/sp-production.mjs`, `test/sp-sending.mjs`; `worker-harness.mjs` gains `worker: "production"`) |
| `73aecc2` | §§ 3–4, the code (and the cases' own fixes found at the build: § 8.4) |
| the next commit | CC-8b's map re-recorded; these notes; README and `data/README.md`; dated pointers in `SPEC.md` (T5) and `SPEC-week-content.md` § 4 item 1 |

### 8.2 Cases, before and after (`nice -n 15 node --test <file>`)

| case | red | green (`73aecc2`) |
|---|---|---|
| SP1 | 0/5 at `2f917f6`; production half 5/6 at `1949361` | 6/6 |
| SP2 | 0/4 at `2f917f6`; production half 4/5 at `1949361` | 5/5 |
| SP3 | 3/5: the flag absent; CC-8b's map not moving. S20, the production T5 and the Worker's behaviour against `63275a8` already passed, and stay as guards | 5/5 |
| SP4 | 1/5 | 5/5 |
| SP5 | 2/3 | 3/3 |
| SP6 | 0/4 | 4/4. Its child run: S1–S17 (18 files, 38 cases), all against the production Worker, 38 of 38. The same files on development: 38 of 38 |
| SP7 | 1/4 | 4/4 |
| SP8 | the file did not load (no `databaseFor`, `eraseArgs`, `wranglerD1Args`) | 6/6 |
| mutants | 0/3 | 3/3, each on its own case's assertion. (1) The input check always passes: SP4 fails at "the build refuses". (2) Production sending through the allowlist: SP7 fails at "production sends: one request". (3) The draft tag kept: the build's own draft-tag guard refuses ("the page carries the draft tag"), so SP4's approved page fails |

Other cases run on the code, as single files:
- WC-1–WC-12, A1, A3, A's mutants, CC-8, T5, U4, S18 and S20: 64 of 64.
- M1–M21, S18–S31 and SP1–SP8 with the mutants: 108 of 109. The one failure is **S22**, which fails the same way, with the same message, on `63275a8`'s own tree (control run from `git archive`): it reads `why/index.html` as a page that has an offer box.

`npm run contrast`: 72 of 72.

Builds compared:
- The development build is byte-identical to `18ac41f`'s, 15 of 15 files (`build:dev` from both trees).
- The production build with `production` false is byte-identical to `63275a8`'s and to S20's golden, 18 of 18 files (SP3).

### 8.3 Goldens: every changed line

- **S20: not moved.**
- **WC-9, M14 and MS: not moved.**
- **U4** (`test/u-04-golden.json`, from `1305f62`; the recorder): `recorded_at` `f02807e` → `1305f62`. For each development entry, its `page` and its visible page at the six answered fragments. The three production entries, all six contents and `(no fragment)` are unchanged.
  - The v1 fixture's dev entry:
    - `page`: 66252 `1b411c4b…` → 66887 `7195fee4…`
    - `#lean-7` and `#lean-or-7d`: `b47d9c38…` → `ceb931b6…`
    - `#lean-or-5d-s`: `f9c24981…` → `5158b804…`
    - `#signature-and-5d-b-s`: `e76af1cf…` → `9bd27c83…`
    - `#performance-and-7d-b`: `9f9a148a…` → `26d2f35c…`
    - `#family`: `7d7ce837…` → `3c9a1c26…`
  - The v2 fixture's dev entry:
    - `page`: 72226 `1d1b91a9…` → 72861 `4f35fcdd…`
    - `#lean-7` and `#lean-or-7d`: `0beb65fe…` → `f955bdf9…`
    - `#lean-or-5d-s`: `52a12619…` → `f05c2b4e…`
    - `#signature-and-5d-b-s`: `488d99e6…` → `6ad22886…`
    - `#performance-and-7d-b`: `77e2ea60…` → `54da486e…`
    - `#family`: `7d7ce837…` → `3c9a1c26…`
  - The committed week's dev entry:
    - `page`: 95978 `bb3c301f…` → 96613 `4a4ae97c…`
    - `#lean-7` and `#lean-or-7d`: `cf159851…` → `d8a0f3ee…`
    - `#lean-or-5d-s`: `6caceec7…` → `8209d8a1…`
    - `#signature-and-5d-b-s`: `a8301da9…` → `cbdb0276…`
    - `#performance-and-7d-b`: `98f90b23…` → `f8bc202b…`
    - `#family`: `7d7ce837…` → `3c9a1c26…`

  The development page's whole diff is 7 added lines and 2 changed lines, the same on `demo/`, `boston/` and `seminar/`:
  - added: the offer line, its CSS rule and comment, the buttons' two-line comment, and `flow1.js`'s render line;
  - changed: each save button's class, `cta` → `skip`.
- **CC-8b's map** (`test/cc-08-unchanged-golden.json`): four entries moved, and none was added or removed. The Footer's text and `watch_expected_footer` are unchanged.
  - `data/save.json`: `d3a69064…` → `d048bcfe…`
  - `src/worker/choose-sender.js`: `32161308…` → `fe140f66…`
  - `src/worker/pages.js`: `99a876b5…` → `9128c1fa…`
  - `src/worker/site.js`: `e606bb44…` → `8a07b89d…`

### 8.4 Chosen where the contract is silent, or read

1. **§ 4 item 1's "CC-8b's golden unchanged" cannot hold byte for byte, and SP3 checks the behaviour instead.** CC-8b hashes every file the *development* Worker reaches. That includes `data/save.json`, where § 3 item 1 puts the flag, and `site.js`, production's entry, which § 4 item 2 makes serve the routes. So the map moves for exactly the four files above. SP3 holds the rest:
   - every other file is byte-identical to `63275a8`'s;
   - with `production` false, the production Worker answers ten requests exactly as `63275a8`'s `site.js` does (status, headers and body) and has no scheduled handler.

   The production bundle now carries rung 4's modules even when they are unused.
2. **The quieter button is See all plans' style**: navy, Poppins 16px/600, underlined. It is the step's own `.skip`, which already draws its collapsed *Save my offer*. SP2 compares its colour, font, background, border and underline with `.all-link`'s. The orange outline was not chosen: `--cta` on white is Lc 63.8, which passes only as large text, and it would still be orange.
3. **On the development page the step's DRAFT tag stays above the offer line**, so the line sits directly above the lead. A production build has no tag, so there the step opens with the line.
4. **SP1 and SP2's production half** runs on the page built from the approved fixtures (`sp-production.mjs`). Each fixture is a committed input with only its unapproved parts fixed.
5. ⚠ **The privacy notice is an input the contract did not name.** The page prints DRAFT § 1's `[Privacy notice]` as a placeholder, since no page carries § 6. A production build therefore refuses on it, and with no input to give it, no production build could ever pass. `data/save.json` gains `privacy_notice_url`:
   - `null` (committed) keeps the placeholder, so the development page's bytes do not change;
   - an address prints a link.

   Publishing § 6 itself (its `[email]`, `[30]` and `[Mailchimp]` are refused in DRAFT.md until filled) is not built here. **A fork for the Advisor**: where the notice lives.
6. ⚠ **The one production page saves as the first event, `demo`**, as the development build's `/` does. A visitor from `?e=boston` would therefore get E1 saying *"at the Fit AF demo event"*. Reading `?e=` (as the analytics does) is not built. **A fork for the Advisor before the pin.**
7. **The refusals beyond the contract's list:**
   - production's `TURNSTILE_SITE_KEY` empty, or one of Cloudflare's published test keys (`[123]x0…`);
   - `SITE_URL` unset;
   - the draft tag in the page (a guard on § 3 item 2);
   - a bracket printed by E1 or E-X, rendered for every offer and every event.

   The placeholder sender is the string `Fit AF <offers@eatfitaf.com>` (rung 5 § 0). If the Owner chose exactly that address, `SENDER_PLACEHOLDER` would have to go with that commit. "25% on every cart" cannot be read off a file; it is approved with `offers.json`'s status.
8. **DRAFT.md's placeholders are checked over §§ 1–6.** § 6 points at § 5, so § 5 is checked too. These are not placeholders: a button `[ … ]`, the slots the code fills (`[ZIP]`, `[event]`, `[date]`, § 1's offer line) and the notice's link `[Privacy notice]`. The status line approves a version when it names it with a `YYYY-MM-DD` date and no longer says `DRAFT`. No word of DRAFT.md was changed.
9. **The interface with fitaf-infra**, in `wrangler.jsonc`'s top level:
   - `DB` bound to `fitaf-leads-prod`, with no id (the id is fitaf-infra's);
   - the two rate limiters as development's (5 per 60 s), on their own namespaces `2001` and `2002`, so production's counts are not development's;
   - the cron `*/5 * * * *`;
   - vars: `SITE_URL` `https://eatfitaf.com`, `MAIL_FROM` (the placeholder), `TURNSTILE_SITE_KEY` `""` (fitaf-infra's widget), and **`SEND_WITHOUT_ALLOWLIST` `"true"`**, the § 4 item 4 var. Only that exact string bypasses the allowlist;
   - `observability` off, as development's (rung 4 § 7).

   The secrets are not in the file. `main` stays `src/worker/site.js`.
10. **The Worker pages (`/confirm`, `/o`) print their DRAFT line while `wording_version` names a draft.** Both Workers share `pages.js` and `data/save.json`, so the rule is the wording, not the environment. While the wording is a draft every page is as before; a production build refuses a draft wording anyway.
11. **Production's Flow 2 stays production's** (*"What's your goal?"*, no share panel). Only Flow 1 and the offer box are added, as § 3 item 2 names.
12. **The erase CLI defaults to `--env dev` and to `--local`**, as before. `npm run erase:prod` passes `--env prod --remote`, and it is a dry run unless `--apply` is given.
13. **Found at the build, in the cases:** `site.js` also exports named strings (`WEEK_OBJECT`, `PAGE_CACHE_CONTROL`, …). Bundled as an entry on its own, workerd refuses them as entrypoints (*"Incorrect type for map entry 'PAGE_CACHE_CONTROL'"*). `worker-harness.mjs` now bundles a Worker's default alone, as `wc-harness.mjs`'s wrapper already did. Production has run `site.js` since 2026-10-11, so fitaf-infra's deploy evidently tolerates or wraps it. ⚠ That is worth confirming before the pin.

### 8.5 For the release note (§ 4 item 6, not changed here)

- Redemptions stay the null implementation: no suppression by an order yet.
- The export to an email provider is not built.
- Nothing logs an address, a token, a code or a key (M7 unchanged; the cron reports counts only).
