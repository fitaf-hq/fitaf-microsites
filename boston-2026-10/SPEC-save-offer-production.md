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

## 9. Amendment, 2026-10-21: the privacy notice's page, and the event a save names. CONTRACT, before any code

**Why.** § 8.4's two forks, put to the Advisor (Fit AF's decision record § 7q item 6, `AskUserQuestion`
2026-10-21): ***"A /privacy/ page on eatfitaf.com"*** and ***"From ?e=, else "eatfitaf.com""***.

1. **`/privacy/`**: one static page built from `consent/DRAFT.md` § 6 (the privacy notice), in the template's fonts and
   colours, no script, served as `/why/` is (`build.mjs`'s static pages). ⛔ **Its words are the draft's and it is
   public only when they are approved**: the development build always carries it, marked as the step is (*"DRAFT — not
   for use"* while the wording is a draft); the production build carries it **only with `production: true`**, under the
   § 3 item 2 refusals (a bracket left in § 6 refuses). `save.json`'s `privacy_notice_url` (§ 8.4) is `"/privacy/"`, so
   the form's *Privacy notice* is a link to it in both builds.
2. **The event a save names**: the page sends as `event_id` the `?e=` code it was opened with when that code names an
   entry of `data/events.json` (read by the same function the analytics beacon reads it with: one reading, never two),
   and the first event otherwise, in both builds. `data/events.json`'s names become what an email says after *"You
   saved this offer at"*: **`demo` → *"eatfitaf.com"***, **`boston` → *"Fit AF's Boston event"*** (the Advisor's
   option's words); `seminar` unchanged (it is not used: the Owner does not do the seminar). The ids, the URLs and the
   QR codes do not change. Say every other place the build shows an event's name, and what it shows there now.
3. **Cases**: **SP9** `/privacy/` in the development build with the draft marking; absent from the production build
   with `production: false`; present with `production: true` and approved fixtures, its every paragraph § 6's; the form's
   link resolves to it in both. **SP10** a save from `?e=boston` sends `event_id: "boston"`; from no code, and from
   `?e=` naming no event, the first event's; E1 for each (a recording sender) reads *"at Fit AF's Boston event"* and
   *"at eatfitaf.com"*. **Mutant**: the page sends the first event whatever the code (SP10 red). Every golden that moves
   is re-recorded once with its changed lines listed (E1's text golden M14 will, for the names).

### 9.1 Built (2026-10-21)

Built on `boston/save-offer-production` from `2c726d1`. Every case was run as single files at `nice -n 15`; the whole
suites were not run here.

**Commits**

| commit | what |
|---|---|
| `9a3f310` | SP9, SP10 and mutant 4, run red; S18 and QE12 amended by § 9, run red with them |
| `e11f775` | the code |
| the next commit | S20, U4 and CC-8b re-recorded; SP3 and U4 amended; these notes; README and `data/README.md` |

**Cases** (red at `9a3f310`, green at `e11f775` with the goldens of the next commit)

| case | red | green |
|---|---|---|
| SP9 | 1/5. The production build with `production` false already had no `/privacy/`, a guard | 5/5 |
| SP10 | 0/6 | 6/6 |
| mutant 4 | red (its site not in the page) | rejects on "`?e=boston` sends boston"; mutants 1–3 still 3/3 |
| S18 | 7/8 | 8/8 |
| QE12 | 2/3 | 3/3 |

After the goldens, 101 files touching the page, the Worker, the emails and the goldens (M1–M21, S1–S31, SP1–SP10 and the mutants, WC-1–WC-12, A1–A11 with A-QR and A's mutants, CC-8, U4, T5, QE12–QE15, W1, W4, MS-14 and B2) gave **269 of 270**. The one failure is **S22**, the base's own (§ 8.2). SP6's S1–S17 still pass 38 of 38 against the production Worker. `npm run contrast`: 76 of 76.

**What § 9 built**

1. **`/privacy/`**: `build.mjs` `privacyPage()` makes it from DRAFT § 6.
   - **Content:** § 6's six paragraphs, each starting at a bold heading, escaped, with the draft's `**…**` as `<strong>`; then the logo and a heading, *Privacy notice*. No script.
   - **Look:** the template's `:root` and `@font-face` rules (the fonts from `/fonts/`, as `/why/`), then `src/privacy/style.css`. That file is tokens only, `npm run contrast` reads it, and its four pairs are tagged `"build": "privacy"`.
   - **Where it is written:** `privacy/index.html`, beside the plan pages and listed with the copied files, not the pages, so the analytics' page checks (A1, A-QR) do not read it.
   - **Development build:** always carries it, with the step's line *"DRAFT — not for use · wording v0.3-draft"*. It shows the draft's own `[email]`, `[30]` and `[Mailchimp]`.
   - **Production build:** carries it only with `production` true, unmarked. Its printed words join the refusals (*"the privacy page prints a placeholder: [email]"*).
   - **Link:** `data/save.json` `privacy_notice_url` is `"/privacy/"`, so the form's *Privacy notice* is `<a class="save-privacy" href="/privacy/">` in both builds. It resolves from `/` and from each `/<event-id>/` page (SP9).
2. **The event a save names.** `src/qr-event.js` `qrEvent(search, ids)` is the page's one reading of `?e=`, and `analyticsSlot` inlines it at the head of the analytics script. `src/analytics.js`'s `QR_IDS` moves out of its IIFE, as one list global to the page, and its `open` reads `qrEvent(w.location.search, QR_IDS)`. `flow1.js` sends `qrEvent(location.search, QR_IDS) || cfg.event_id`. In the page, the `?e=` pattern appears once, `function qrEvent(` once, and `qrEvent(` three times (SP10).
3. **`data/events.json`**: `demo` → *"eatfitaf.com"*, `boston` → *"Fit AF's Boston event"*. `seminar`, the ids, the URLs and the QR codes are unchanged.

**Every other place the build shows an event's name.** There is none besides E1 (`src/worker/messages.js`: *"You saved this offer at **<name>** yesterday — here it is."*), which now reads *"at eatfitaf.com"* and *"at Fit AF's Boston event"* (SP10, through the Worker and a recording sender). `npm run preview:emails` renders E1 for the first event, so its preview now says *"at eatfitaf.com"*; its report's `event` says the same.

None of these shows `events.json`'s `name`:
- the plan pages and `/privacy/`;
- the `/confirm` and `/o` pages;
- E-X;
- the QR codes;
- the mock-ups and the printed pieces. Their header bar is `data/messages.json`'s `event_line`, *"Fit AF in Boston · October 2026"*, unchanged, and they print each event's URL host.

**Chosen where § 9 is silent, or read**

1. ⚠ **"One reading" moves production with `production` false.** The beacon's reading is in the analytics script that every page carries, so making it the save step's too changes the production page. S20 is re-recorded once. SP3 now holds the production build to the base's with exactly these lines changed (`withSection9Reading`), and every other file byte for byte. The Worker's behaviour is still the base's, byte for byte. The lines changed in `index.html` (42,074 → 42,137 bytes):
   - 4 lines added: `qrEvent`'s declaration;
   - `var QR_IDS = ["demo","boston","seminar"];` moved from inside the IIFE to before it;
   - `var x = w.innerWidth || 0, qr = /(?:^|[?&])e=([^&#]*)/.exec(w.location.search || "");` → `var x = w.innerWidth || 0;`
   - `qr: qr && QR_IDS.indexOf(qr[1]) >= 0 ? qr[1] : ""` → `qr: qrEvent(w.location.search, QR_IDS)`.

   One list, not two: a second copy of the ids in `save-data` would also break QE15's "the ids exactly once".
2. **"The first event otherwise" is read as the page's own event.** On `/` and on production's one page that is the first event, `demo`. A development `/<event-id>/` page keeps its own id when no code names one (SP10's third case), as rung 4 built those pages.
3. **On the development build, `/privacy/` is marked as the step is**: always, with the wording version.
4. **The case mirrors copy `consent/`** (`cc-harness` `mirror()`, `qe-checks` `printMirror()`), since every build now reads DRAFT.md.
5. **M14 did not move.** Its E1 is rendered from its own sample event (*"the sample event"*, `test/email-fixture.mjs`), not from `data/events.json`. SP10 checks the new names in E1.
6. **A finding for the wording pass:** § 6's *"How long we keep it. As in § 5."* now prints on a public page whose § 5 is not on it.
7. ⚠ **A finding before the pin, not in § 9:** the `/o/<code>` page's *Build my plan →* links to `/<event_id>/#from-email` (`src/worker/redeem.js`). Production serves only `/`, so on eatfitaf.com that link is a 404 for every save, `demo` and `boston` alike. This was already true before § 9, since every production save would have been `demo`. A one-line fix (`/?e=<event_id>#from-email`, or `/#from-email`) needs a ruling and a case.

**Goldens, every changed line**

- **S20** (`index.html` only): `f1f0e04f…` → `6093af72…`. The lines are those in item 1 above.
- **U4** (`recorded_at` `1305f62` → `e11f775`):
  - The three production pages moved: v1 42620 `d13822b4…` → 42683 `3f69f52c…`; v2 48594 `c56b6803…` → 48657 `7358dacd…`; the committed week 72346 `f5a898cf…` → 72409 `512964b4…`.
  - The three development pages moved: v1 66887 `7195fee4…` → 67257 `fe7c748a…`; v2 72861 `4f35fcdd…` → 73231 `f0749e99…`; the committed week 96613 `4a4ae97c…` → 96983 `a5f3e67d…`.
  - The development pages' visible page moved at the six answered fragments. On the v1 fixture:
    - `#lean-7` and `#lean-or-7d`: `ceb931b6…` → `b909ef73…`
    - `#lean-or-5d-s`: `5158b804…` → `2ba782bc…`
    - `#signature-and-5d-b-s`: `9bd27c83…` → `41d8273b…`
    - `#performance-and-7d-b`: `26d2f35c…` → `b89f79e4…`
    - `#family`: `3c9a1c26…` → `efd029e9…`
  - On the v2 fixture:
    - `#lean-7` and `#lean-or-7d`: `f955bdf9…` → `ef53db26…`
    - `#lean-or-5d-s`: `f05c2b4e…` → `562c7007…`
    - `#signature-and-5d-b-s`: `6ad22886…` → `2b9401c6…`
    - `#performance-and-7d-b`: `54da486e…` → `4691c9ff…`
    - `#family`: `3c9a1c26…` → `efd029e9…`
  - On the committed week:
    - `#lean-7` and `#lean-or-7d`: `d8a0f3ee…` → `1b6544cb…`
    - `#lean-or-5d-s`: `8209d8a1…` → `e7db8526…`
    - `#signature-and-5d-b-s`: `cbdb0276…` → `31d82cb5…`
    - `#performance-and-7d-b`: `f8bc202b…` → `e8bdb23f…`
    - `#family`: `3c9a1c26…` → `efd029e9…`
  - Unchanged: all six contents, the production pages' visible pages, and `(no fragment)`.

  The development page's whole diff against `18ac41f`'s (the same on `demo/`, `boston/` and `seminar/`):
  - the analytics lines of item 1;
  - `<span class="placeholder">[Privacy notice]</span>` → `<a class="save-privacy" href="/privacy/">Privacy notice</a>`;
  - `flow1.js`'s `var eventId = …` with its two-line comment, and `event_id: cfg.event_id` → `event_id: eventId`.

  `privacy/index.html` is added.
- **CC-8b** (two entries; none added or removed):
  - `data/events.json`: `c06fb47b…` → `99676fc9…`
  - `data/save.json`: `d048bcfe…` → `490a65db…`
- **Not moved:** M14, WC-9 and MS.

**`site.js`'s named exports** (production's entry), the same at `63275a8` and at this HEAD:
- **Strings, 4:** `WEEK_OBJECT` (`"week/picks-data.json"`), `SHEETS_PATH` (`"/week/"`), `PAGE_CACHE_CONTROL` (`"no-cache"`), `SHEET_CACHE_CONTROL` (`"no-cache"`).
- **Functions, 5:** `sheetKey`, `isWeek`, `servePage`, `serveSheet`, `serveSite`.
- **`default`:** an object. At `63275a8` it is `{ fetch: serveSite }`. At HEAD it is the same while `production` is false, and `{ fetch, scheduled }` (index.js's handler) while it is true.

workerd's local runtime (Miniflare 5.20260926.1-alpha) refused a bundle that kept these exports: *"Incorrect type for map entry 'PAGE_CACHE_CONTROL': the provided value is not of type 'function or ExportedHandler'"*. That is the string exports. The functions were not reported, since workerd stopped at the first string. `src/worker/index.js` (development's entry) exports `default` alone.

### 9.2 Ruling, 2026-10-21 (the orchestrator; engineering, within the Advisor's § 9 ruling on `?e=`): every link back to the page

**Found at the build (§ 9.1, finding 7).** `/o/<code>`'s *Build my plan →* linked to `/<event_id>/#from-email`. Production
serves the page at `/` alone, so on eatfitaf.com that link was a 404 for every save.

**Ruled.** `/o/<code>`'s *Build my plan →*, and any other Worker-rendered link back to the page that points at
`/<event_id>/`, becomes **`/?e=<event_id>#from-email`**. That one form works:
- on production, which serves only `/`;
- on development, where `/` with `?e=` takes the event through `qrEvent`.

The case comes first:
- **SP11:** on a production-Worker `/o` page the link resolves to a page that same Worker serves with 200, carrying `?e=<id>` and `#from-email`; the same on development.
- The same case confirms that E1's *See my offer* and the confirm page's links resolve with 200 on the production Worker.

The audit found one such link, in `src/worker/redeem.js`:
- `/confirm`'s only link is `/o/<code>`, and its form posts to its own address;
- E1's and E-X's links are `/o/<code>` and `/confirm/<token>`;
- `/o`'s current-offer page links `/`.

**Built (2026-10-21).**

| commit | what |
|---|---|
| `578ead1` | the ruling above; SP11 written first, red (0/2, on both Workers at "/o's Build my plan", `/boston/#from-email`); S11 amended by it, red (3/4) |
| the next commit | the fix: `src/worker/redeem.js` gives `/?e=${row.event_id}#from-email` |
| the commit after it | CC-8b re-recorded; SP3's list of moved Worker files; this note |

**SP11, after the fix: 2/2.** For each Worker, run with its own build's pages as its assets (production: the approved fixtures' `/` and `/privacy/` only; development: `/`, each `/<event-id>/` and `/privacy/`), each link below answered **200**:

| link | resolves to | status |
|---|---|---|
| E1's *See my offer* | `/o/<code>` | 200 |
| `/o`'s *Build my plan →* | `/?e=boston#from-email`: the plan page with the save step. Opened there, Flow 1 is collapsed to its one line, and a save from it names `boston` | 200 |
| `/o`'s current-offer page's link | `/` | 200 |
| E1's *Yes, keep me posted* | `/confirm/<token>`, whose form posts to its own address | 200 |
| that form's *Yes* | the confirmed page | 200 |
| the confirmed page's *See my offer* | `/o/<code>` | 200 |
| E-X's *Yes, tell me* | `/confirm/<token>` | 200 |

S11 4/4. 44 files (S1–S17, SP1–SP11 with SP6's S1–S17 against production, the mutants, CC-8 and M1–M13): 112 of 112.

**Goldens.** Only CC-8b moved: `src/worker/redeem.js`, `d2689a2b…` → `d1c45d59…`; none added or removed. The pages, S20, U4, M14 and WC-9 did not move, because the link is the Worker's, not the build's.

## 10. Amendment, 2026-10-22: the offer as the Advisor's brief states it. CONTRACT, before any code

**Why.** The Advisor, 2026-10-22: *"As written, production requires "real codes giving 25% on every cart" … It should not
have been written that way – we need up to update the contract to reflect the actual brief please"*. **The brief**, in
his words (Fit AF's decision record `2026-10-17-…`): the Boston offer is *"Lock in your exclusive pricing now; Estimated
value: {~120-160% of current list price}; Your value: {current list price}"*, which *"moves the "offer" into the realm of
marketing and a promise (to lock in rates)"* (his note of 2026-10-13, § 7r item 5); the secondary offer, *"If you do not
want to checkout right now, you can save this offer to lock in this pricing … (i.e., the email loop we built)"* (§ 7a);
*"this was a marketing exercise … we're showing marked down prices on the site"*, *"we already picked an end date to
coincide with the end of the Boston event"*, answered *"Yes, Thursday 10-29"*; *"We already decided on
offers@eatfitaf.com as the sender"*; *"Privacy is privacy@eatfitaf.com … 30 days is fine"*; *"The menu email is weekly"*
(§ 7r item 5). **§ 3 item 2's** *"its codes real (no `PLACEHOLDER`), giving 25% as its label says on every cart"* was
the orchestrator's misreading of an offer as a store discount, and is struck by this section.

1. **The offer is a price promise, not a discount code.** A customer pays the store's list price; the page already
   shows the value beside it (the plan card's offer line, *"Sign up today to save 25%"*, approved 2026-10-21). **No
   code is issued, shown, or needed at the store.** `data/offers.json` gains `code_mode: "none"`: an offer with it
   carries no `shared_code` and the save issues no code. The Boston event's offer: its label the approved one, its
   `valid_to` **2026-10-29**, `code_mode: "none"`.
2. **What a save promises, and until when**: the pricing the visitor saw, **held until the offer's `valid_to`**
   (2026-10-29 for Boston), whatever day the save is made. (§ 7d's *"the saved offer holds 14 days"* of 2026-10-18 is
   superseded by the Advisor's ruling of 2026-10-22.) After that date, as today, the lapse path.
3. **The email (E1) and the saved offer's page (`/o/…`)** say the promise, not a code: no *"Your code"* line, no code in
   any visible text; *"Your pricing is held until {date}"* (its words in `consent/DRAFT.md`, for the Advisor's v1 pass),
   the plan as saved, and the button back to the page. The link's identifier stays an unguessable opaque token in the
   path (as today's code is), never shown or named as a code. The erase and lapse paths unchanged.
4. **The production gate** (`scripts/production-inputs.mjs`, § 3 item 2): `offers.json` approved means `"status":
   "approved"`, each label approved, its dates, and either `code_mode: "none"` with no code field or a real code; the
   comment's *"25% on every cart"* goes. ⭐ **The sender `Fit AF <offers@eatfitaf.com>` is the decided sender, not a
   placeholder**: the gate refuses only an empty sender or one outside `eatfitaf.com`.
5. **The inputs, as decided**, committed with this section's build: `data/delivery-zips.json` the store's Boston zone
   (316 five-digit codes, Fit AF's `responses/2026-10-22-boston-delivery-zips/boston-zips.json`, `"match": "exact"`,
   `"status": "official"`; the `near_ring` stays a mock and is said so); the privacy notice's contact
   **privacy@eatfitaf.com** and **30 days** in place of their `[brackets]`; the menus email's frequency **weekly**. ⛔
   `data/save.json`'s `production` stays **false**: the switch-on is § 6 item 3's, on the Advisor's word, after his
   wording pass (`v1`) and `fitaf-infra`'s amendment.
6. **Cases (written first, run red)**: E1 and the `/o` page for a `code_mode: "none"` offer carry no code text and say
   the date held (2026-10-29), at every save date before it; a save after `valid_to` takes the lapse path; the gate
   accepts `code_mode: "none"` without a code, refuses one carrying a code, accepts `Fit AF <offers@eatfitaf.com>`,
   refuses an empty sender and one at another domain; the ZIP check with the official list (a Boston code inside, a
   Pennsylvania code outside). Mutants: E1 printing the token as a code; the gate still refusing the decided sender.
   Every golden that moves, re-recorded once.
7. **Not here**: the wording's v1 (the Advisor's pass on the dev site); `fitaf-infra`'s production database, keys and
   cron (Amendment 1.10, his two bootstrap runs); the production switch.

### 10.1 Built (2026-10-22)

Built on `boston/save-offer-brief` from `5f1e9f8`. Every case was run as a single file at `nice -n 15`; the whole site
suite once, at `e80ea09`. `data/save.json`'s `production` is still **false** and its wording still `v0.3-draft`.

**Commits**

| commit | what |
|---|---|
| `600b2a6` | the cases first, run red on `5f1e9f8`'s code and data: SP12–SP14, mutants 5 and 6, and the cases § 10 amends |
| `a593811` | the code and the inputs as decided; S9's and SP9's fixes found running the cases (below) |
| `e80ea09` | the goldens it moves (M14, CC-8b, U4), each re-recorded once from `a593811`'s own tree |
| the next commit | these notes; README and `data/README.md` |

**Cases** (red at `600b2a6`, green at `a593811` with the goldens of `e80ea09`)

| case | red | green |
|---|---|---|
| SP12, the price promise (`sp12-price-promise.test.mjs`) | 0/5 | 5/5 |
| SP13, the gate's offers and sender (`sp13-gate-offer-and-sender.test.mjs`) | 1/3 (the fixture's sender control) | 3/3 |
| SP14, the official ZIP list (`sp14-official-zips.test.mjs`) | 1/4 (the Worker's in and out, a guard) | 4/4 |
| SP mutants (`sp-mutants.test.mjs`) | 5/6 (mutant 5's site not yet in `messages.js`) | 6/6 |
| SP4 | 1/5 | 5/5 |
| SP3 (its list of moved Worker files) | 4/5 | 5/5 |
| M14 (two new keys) | 0/1 | 1/1 |
| SP1, SP2, SP5, SP9, SP10, SP11 | 5/6, 4/5, 2/3, 3/5, 4/6, 1/2: the approved page refused, the base gate refusing the decided sender | 6/6, 5/5, 3/3, 5/5, 6/6, 2/2 |

- **SP12**:
  - the Boston offer is `code_mode: "none"`, with no code field and `valid_to` 2026-10-29;
  - E1 for an offer without a code says DRAFT § 3's *"Your pricing is held until October 29, 2026"* and shows no code;
  - a save on every date from 2026-10-01 to 2026-10-28 (28 dates, the cron's own step, a recording sender): its E1, and
    its `/o` page on the next morning and on the 29th, say the date held, with no code text. The token appears only in
    `/o/`'s path;
  - after `valid_to`, the lapse path: `/o` says the offer ended, the `/confirm` link answers 404, and the contact is kept
    at 30 days and lapsed at 31;
  - an ended offer whose current offer has no code shows that offer and *"Good until"*, and nothing is reissued.
- **SP13**: `code_mode: "none"` without a code is accepted; with a code, or with an unknown `code_mode`, it is refused,
  naming the offer. `Fit AF <offers@eatfitaf.com>` and `offers@eatfitaf.com` are accepted. An empty sender is refused,
  and so is one at `example.com`, `eatfitaf.com.example.net`, `noteatfitaf.com` or a bracket.
- **SP14**: the file holds 316 five-digit codes, exact and sorted, and says its near ring is a mock. 02118 is in;
  01602 (Worcester, on the list) is in; 18407 (Carbondale, PA) is far; 03101 is near. Every code under the listed prefixes
  is in exactly when it is listed. The same holds through the Worker's `/api/save` and the development page.
- **Mutants**: 5, E1 printing the token as a code, fails SP12 at *"no "code" in any visible text"*. 6, the gate still
  refusing the decided sender, fails SP13 at *"the approved set with the decided sender: nothing refused"*.
- **Amended, green before and after** (they read E1's second line in the form the offer's `code_mode` names, because a
  save the Worker makes today gets the Boston offer until 10-29 and the general offer after): S11 4/4, S13 1/1, M8 1/1, M1
  1/1, M21 3/3 and M15–M20 13/13. S5 is 3/3 with the harness's `NEAR_ZIP` now 03101.
- ⚠ **Two fixes in `a593811`, missed at `600b2a6`:**
  - **S9** read its expansion ZIP as a literal 01602 while its save used `NEAR_ZIP`, so `600b2a6` broke it (0/1 there, and
    SP6's run of it). It now reads `NEAR_ZIP`, and passes on `600b2a6`'s tree too.
  - **SP9** pinned DRAFT § 6's `[email]` and the fixture's contact. On `600b2a6`'s tree, `a593811`'s SP9 is 3/5, its two
    contact cases red; it is 5/5 at `a593811`.

**The whole site suite** (`npm test` at `e80ea09`): **1013 of 1014**. The one failure is **S22**, with *"the page has no
element #save-offer-label"*; it fails the same way on `5f1e9f8`'s own tree (a control run from `git archive`).
`npm run contrast`: 83 of 83. The rung-4 and rung-5 Chrome files and Storybook were not run: nothing they pin moved.

**Goldens, every changed line** (each re-recorded from `a593811`'s tree extracted by `git archive`)

- **M14** (`recorded_held_from` `a593811`):
  - the three texts recorded from `4ddd5c4` were checked byte for byte before writing, and are unchanged;
  - two keys added, `e1_held_ticked` and `e1_held_unticked`: E1 with *"Your pricing is held until October 29, 2026"* in
    place of the code line, from `inputs.heldOffer`. This is a wording change, § 10 item 3's sentence.
- **CC-8b**: exactly the five files SP3 names moved, and none was added or removed. The Footer's text and
  `watch_expected_footer` are unchanged; MS-9 reads the same golden.
  - `data/delivery-zips.json`: `2b1cef0f…` → `973cdcc4…`
  - `data/offers.json`: `b1fc0171…` → `82b49dd5…`
  - `src/worker/messages.js`: `f65e8ca2…` → `45d57b1e…`
  - `src/worker/redeem.js`: `d1c45d59…` → `2d5e1010…`
  - `src/worker/zip-class.js`: `29e3d59c…` → `2fc7da26…`
- **U4** (`node test/u-04-record.mjs --commit a593811`; `recorded_at` `773e597` → `a593811`):
  - only the three development pages moved, +4,929 bytes each:
    - the v1 fixture: 84746 `6a3826dc…` → 89675 `bef4158c…`
    - the v2 fixture: 90618 `e2f65700…` → 95547 `2709de98…`
    - the committed week: 114362 `dc256760…` → 119291 `899beea3…`
  - all six contents, production's three entries and every visible page are unchanged.
  - Proof: `build:dev` of `5f1e9f8`'s and `a593811`'s trees differ in `index.html`, `demo/`, `boston/` and `seminar/` by
    `save-data` alone (the official list's 316 codes for the mock's eight prefixes; the Boston offer's `valid_to`) and
    `classifyZip`'s lines. `privacy/index.html` differs by § 6's two filled placeholders. Everything else is identical.
- **Not moved**: S20 (SP3: the production build is the golden's, byte for byte), WC-9, MS's golden, W4 and QE15.

**Chosen where § 10 is silent, or read**

1. ⚠ **"The plan as saved" (item 3) is not built.** No plan is sent or stored:
   - `flows/01-save-offer.md` § 4: *"No plan is sent"*;
   - `flows/01-save-offer.md` § 6: the email does not remember the plan;
   - `consent/DRAFT.md` § 5: *"Not collected: … plan choice"*;
   - `SPEC-rung4-save-offer.md` § 4: *"⛔ No … plan"*.

   Saving the plan would change the request, the schema and the consent wording. **An open question** for the
   orchestrator. E1 and `/o` say the date held and keep their button and link back.
2. ⚠ **The Boston offer's label stays `[The offer]` here.** The approved label, *"Sign up today to save 25%"*
   (`label_approved` 2026-10-21), is `boston/print-final`'s (`28e951a`), and that branch carries its print cases.
   Committing it here would duplicate that change, so it arrives with that merge. The `/o` render shows the placeholder.
3. **The token.** A save still draws the 8-symbol token into `saves.offer_code`; the column keeps its name and needs no
   migration. It is the `/o/` link's identifier and is never printed or named as a code.
4. **DRAFT § 3 carries both forms of E1's second line, each marked.** The code form stays for an offer that carries a code
   (today's general and past placeholders). A short note under the message says which form the Boston offer takes.
5. **"Weekly" has no bracket.** §§ 1 and 4 already say *"about once a week"*, so it is recorded as F5's answer in DRAFT § 7,
   which is not printed. No printed word changed but § 6's contact and days, and the status line is as it was.
6. **The sender rule.** The gate reads the address of `Name <address>` (or a bare address) and accepts `eatfitaf.com` or a
   subdomain of it. Its refusal names no value. An unknown `code_mode` is refused too.
7. **The near ring is read by prefix whatever the list's `match`.** Beside an exact list it would otherwise never match.
   The official list holds codes under 014–016 and 027–029, which the mock ring's prefixes also name: a listed code is
   `in`, an unlisted one there is `near`. 01602 is on the list, so the near-ring ZIP of the harness, the dummy saves and
   the email preview is now 03101.
8. **`/o` after `valid_to`** shows the current general offer, a placeholder that still has a code (`unique`), with a
   reissued code. A current offer without a code would show *"Good until"* and nothing reissued (SP12). **An open
   question:** what the Boston saves' `/o` should show from 10-30.
9. `delivery-zips.json`'s `region` is now *"the store's Boston delivery zone"*. The zone reaches beyond Massachusetts.

**For the wording pass (not changed):** DRAFT § 1 still promises a code on the page (*"we'll email your code tomorrow
morning"*, *"we'll send your code here tomorrow"*, *"to send this code once"*), and § 5 speaks of *"the code"* and
*"The offer code and its event"*.

**Renders** (`dist-dev/renders/`, git-ignored; the development build at `e80ea09`):
- `e1-ticked-600.png` and `e1-unticked-600.png`: E1 for the Boston event's offer, saved at noon New York on 2026-10-24
  from `?e=boston`, with the logo read from the local build;
- `o-page-390.png` and `o-page-1280.png`: `/o/<token>` on 2026-10-25, the Worker's own handler over a fake row.

### 10.2 Rulings, 2026-10-22 (the orchestrator, on § 10.1's open questions). CONTRACT, before any code

**"The plan as saved" is struck from item 3.** It was the contract's defect: it contradicts `flows/01-save-offer.md` § 4
(*"No plan is sent"*), `consent/DRAFT.md` § 5 (*"Not collected: … plan choice"*) and `SPEC-rung4-save-offer.md` § 4
(*"⛔ No … plan"*). No plan is sent or stored. E1 and the `/o` page say the pricing is held until the date, and link back
to the page, as § 10.1 built them; nothing further is built for this ruling.

**The Boston event offer's label is *"Sign up today to save 25%"***, approved 2026-10-21 (Fit AF's decision record
2026-10-17 § 7p item 7). This branch's `data/offers.json` carries it with the same `label` and `label_approved` fields and
values as `boston/print-final`'s (`28e951a`) for that offer, so that branch's later merge is a no-op on them; this
branch's `code_mode: "none"` and `valid_to` 2026-10-29 stay. The file's `status` stays `placeholder` (the general and past
offers are still placeholders). **Cases first**: S11b holds the Boston offer to that label and `label_approved`, and every
other offer to `[The offer]`; every golden this moves is re-recorded once, with its proof.

**Left open, for the Advisor:**
- what a Boston save's `/o` page shows from 2026-10-30, and the general offers (placeholders that still carry codes)
  behind it (§ 10.1 item 8);
- DRAFT §§ 1 and 5's *"code"* wording for the page and the record (§ 10.1, for the wording pass).

**Built (2026-10-22).**

| commit | what |
|---|---|
| `9828ace` | § 10.2 and its case first: S11b holds the Boston label, red 3/4 on that tree; Q6 reads what remains from the committed label (6/6 before and after) |
| `8f3baf0` | `data/offers.json`: the label and `label_approved` lines as `boston/print-final`'s, its status note; S11 4/4 |
| `8140395` | the goldens it moves, re-recorded once from `8f3baf0`'s tree |
| the next commit | this note; `data/README.md` |

- **Merging `boston/print-final`'s `offers.json` over this one** (`git merge-file`, the base `cff49c0`): the offer's lines
  merge clean. The one conflict is the `status_note` line, which both branches rewrote (this one since `a593811`).
- **Q6** (the print pieces' proofs, not one of this contract's files): this line's print build still lists the offer while
  the file's status is `placeholder`, so what remains is now the approved label. Q6 reads it from the file;
  `boston/print-final` rewrote Q6 and `print/pages.mjs` for `label_approved`, so that merge conflicts in Q6.
- **Goldens:**
  - **CC-8b**: `data/offers.json` alone, `82b49dd5…` → `c03385b3…`. MS-9 and PR-10 read the same golden.
  - **U4** (`recorded_at` `a593811` → `8f3baf0`): the three development pages, +14 bytes each.
    - the v1 fixture: 89675 `bef4158c…` → 89689 `84f36aa2…`
    - the v2 fixture: 95547 `2709de98…` → 95561 `c5170393…`
    - the committed week: 119291 `899beea3…` → 119305 `59787b79…`
  - Proof for U4: `build:dev` of both trees differs by one `save-data` line per page, the Boston label. The production
    builds are identical.
  - Not moved: S20, M14, WC-9, MS.
- **Gates at `8140395`:** the whole site suite **1013 of 1014**, S22 alone, as before; `npm run contrast` 83 of 83.
- **The four renders** were re-made from that tree (`dist-dev/renders/`); `/o` now shows the approved label.

### 10.3 Amendment, 2026-10-22: the Worker's pages in the site's look. CONTRACT, before any code

Found by the orchestrator reading § 10's renders: the saved offer's page (`/o/…`), and with it every page
`src/worker/pages.js` `page()` draws (the confirmation, the lapse and the erase pages), shows the browser's default
fonts and a bare blue link, while `/privacy/` already wears the template's fonts and colours. A customer reaches `/o/…`
from E1's orange button, so it must look like the site it came from.

1. **`page()` draws in the site's look**, as `build.mjs`'s `privacyPage` does: the template's `:root` tokens and
   `@font-face` rules (the fonts served from the site's own `/fonts/`), Fit AF's logo at the top linking to `/`, the
   content in one column (max 680 px, 16 px side gutter at 390 px), headings in the template's heading font.
2. **The one action on `/o/…` is a button** (*"Build my plan"*), styled as the plan card's store button (orange, at
   least 64 CSS px tall: the page's one action, as the store button is on the plan page); a lapse page's link back is
   the quieter style.
3. **Contrast**: every text and colour pair these pages draw is in `src/contrast-pairs.json` (`"build": "worker"`) and
   passes `npm run contrast`.
4. **Cases**: the `/o` page at 390 and 1280 px (Chrome, a local Worker with a fake D1, as the existing rung-4 Chrome
   cases do): the template's body font in use, the logo present, the button's box at least 64 px tall; the confirmation
   and lapse pages carry the same head. ⛔ Nothing about what the pages say changes.
5. **Renders** of `/o` at 390 and 1280 and of the confirmation page, for the Advisor's pass with the wording.

## 10.4 Built (2026-10-22): the Worker's pages in the site's look

Built on `boston/save-offer-brief` after `cc1d2bb`. Every case was run as a single file at `nice -n 15`; the whole site
suite once, at `0b4884b`.

| commit | what |
|---|---|
| `2eb1d35` | the cases first, run red on `cc1d2bb`'s code: SP15 1/6, its Chrome half 0/3, SP3 4/5 |
| `a70a8f9` | the code; SP15's fixture fixed (below) |
| `0b4884b` | CC-8b's golden, re-recorded once from `a70a8f9`'s own tree |
| the next commit | these notes; the READMEs |

**Cases**
- **SP15** (`test/sp15-worker-pages-look.test.mjs`, with `test/sp-worker-pages.mjs`): every page `page()` draws, from the
  Worker's own handlers over a fake D1, at fixed dates. Green 6/6.
  - The derived stylesheet equals its sources.
  - Every page has the same head, its title apart.
  - Every page opens one `<main class="worker-page">` with the logo, linking to `/`.
  - The saved offer has one `.action`, drawn in `--cta` and at least 64 px tall; no other page has one.
  - Each page's words and status are `cc1d2bb`'s, page by page.
  - The `"worker"` contrast pairs are declared and pass.
- **SP15 in Chrome** (`tools/storybook/test/wp-chrome.test.mjs`): the development Worker in Miniflare with its local D1, its
  fonts and logo answered from `copyStatic`, nothing else requested. Green 3/3.
  - `/o` at 390 and 1280: `--body`'s font in use and loaded, and `--head` on the heading; the logo drawn and linking to `/`;
    the button 64 px tall or more in `--cta`'s orange; the column 16 px from the edge at 390, and at most 680 px and
    centred at 1280.
  - The confirmation and the ended offer's pages at 390: the same stylesheet, font and logo. The ended page's link is
    underlined and not orange.
  - SM-1, SM-3, SM-4 and SM-9 pass over the new file.
- **SP3**: its list of moved Worker files gains `src/worker/page-style.json`. Green 5/5.
- ⚠ **SP15's fixture as committed at `2eb1d35` was wrong.** Its codes (`SP15CODE`) were outside the code alphabet, so the
  "saved" and "ended" pages it rendered were the unknown-code page. Fixed in `a70a8f9` (`SPQXCDE2`, `SPQXRE23`), and SP15's
  words case now checks each page is the one its name says. The fixed fixture was not re-run on `2eb1d35`'s tree: SP15 reads
  its base through git, and an archive is not a repository.

**Built**
- **`src/worker/pages.js` `page()`**: its `<style>` is `src/worker/page-style.json`, and its body is one `main` opening (after
  the DRAFT line while the wording is a draft) with the logo, `/assets/fitaf-logo.png`, linking to `/`.
- **`src/worker/page.css`** holds tokens only:
  - the body in `--body`, the heading in `--head` and `--navy`;
  - a column of at most 680 px with 16 px gutters;
  - links back in the plan page's quieter style;
  - `.action a`, the store button's look, at least 64 px tall;
  - the confirmation's two answers drawn alike;
  - the DRAFT line in `--draft`.
- **`npm run worker:style`** (`scripts/worker-style.mjs`) writes `src/worker/page-style.json`. It uses `build.mjs`
  `siteStyle`, which `privacyPage` now uses too; the development build is byte-identical to `8f3baf0`'s, `/privacy/`
  included.
- **`redeem.js`**: the saved offer's *Build my plan →* is wrapped in `<p class="action">`, so its link's markup is unchanged.
- **Contrast**: `scripts/contrast.mjs` reads `page.css` (`--worker-style`), and `src/contrast-pairs.json` gains seven
  `"worker"` pairs.

**Chosen where § 10.3 is silent**
1. The pages § 10.3 names map onto `page()`'s callers:
   - the saved offer is `/o` ORIGINAL;
   - the lapse pages are `/o`'s ended (WELCOME_BACK) and unknown (CURRENT) offers, each with its link back in the quieter
     style;
   - the confirmation is `/confirm`'s landing and its two answers, plus GONE.

   **There is no erase page:** erase is a CLI.
2. The confirmation's *Yes, keep me posted* and *No thanks* are drawn alike, as outlined pills 48 px tall, as easy to
   withhold as to give (rung 5 § 9's rule for E1).
3. The DRAFT token is in the derived stylesheet for every page, used only while the wording is a draft.

**Goldens**
- **CC-8b**:
  - `src/worker/pages.js` `9128c1fa…` → `42be770a…`
  - `src/worker/redeem.js` `2d5e1010…` → `55b172e7…`
  - `src/worker/page-style.json` added, `8ed72850…`

  MS-9 and PR-10 read the same golden. Not moved: S20, U4, M14, WC-9, MS.

**Gates at `0b4884b`:** the whole site suite **1019 of 1020**, with S22 alone, as before. `npm run contrast` passes 90 of 90.
`wp-chrome` passes 3/3.

**Renders** (`dist-dev/renders/`, git-ignored):
- `o-page-390.png`, `o-page-1280.png` and `confirm-390.png`: the Worker's pages in Chrome from the local Worker. The `/o`
  save is the Boston offer's, saved on 2026-10-24 from `?e=boston`.
- `e1-ticked-600.png` and `e1-unticked-600.png`, re-made and unchanged.

## 10.5 Finding and fix, 2026-10-22: S17's chance failure ("no column holds 187")

**Finding.** S17 searched every column of every row for 187 (its protein value) as a whole number. The columns the system
fills with machine values can hold that number by chance: a UUID's *"…-a187b…"* (`save_id`) or an instant's *".187Z"*
(`created_at`, `state_at`, `consent_at`). Nothing private is stored there.

The cause was measured, not assumed. A scratch copy of S17 (never committed) printed, for each run, every column holding
any three-digit whole number and the shape of its value. Over 60 runs at `nice -n 15`, all 60 were green and **only those
five columns** ever held one: the two `save_id`s held the same UUID, and the three instants were the same instant. That is
about 2.3 distinct numbers a run, so 187 turns up about once in 400 runs (S17 also runs inside SP6). It is a chance
failure with no privacy fault.

**Fix** (`test/s17-no-ip-ua-calculator.test.mjs`).
- `MACHINE_COLUMNS` names the machine columns with their exact shapes:
  - the UUIDs: `save_id` in both tables, and `reissued_from`;
  - the offer token, in the code alphabet;
  - the `/confirm` token's SHA-256;
  - the seven ISO instants.
- `holds` searches every other column exactly as before.
- `offShape` requires each machine column to be **exactly** its shape, so it has no room for an IP, a user agent or a
  calculator value.
- The IP and user-agent checks over the whole dump are unchanged.
- **S17c** is the control. 187 planted in a real column (the wording version, the email, the event id, the provider's
  message id) is still found. A machine column off its shape is caught. A chance 187 in an exact UUID and instant is read
  as a finding by the old check and not by the new one.
- After the fix, S17 passed 50 runs of 50, 3/3 each.
- SP6, which runs S1–S17 against the production Worker and counts their cases, expects 39 (it was 38) for S17c.
- ⚠ **Found on the suite run after the fix, and not changed here:** SP3's § 4 item 1 case compares each response's
  headers, `date` included, between two Workers asked one after the other. It failed once (`19:36:08` against
  `19:36:09`), a second boundary falling between the two requests, and it passed alone. It is a chance failure of the
  same kind, and fixing it is the orchestrator's to rule.
