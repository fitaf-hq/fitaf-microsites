# Preview sites: a fixed copy of a planned week's page, staff only, ordering off. CONTRACT, before any code

**Written 2026-10-18 (Fit AF session 247).** **Why**: the Advisor, after the Owner meeting of 2026-10-17 (Fit AF's
decision record `2026-10-17-the-picks-from-our-plans-and-the-breakfast-slate.md` § 7a item 1): previews *"similar to
how Cloudflare handles workers.dev"*, *"fixed copies of each week's menu"*, so every planned menu can be reviewed, with
the checkout disabled; *"publish the variant of the microsite with the Boston menu now so it can be tested by the Fit AF
team"*. **Ruled 2026-10-18** (§ 7g item 8 there): staff only, behind a sign-in; the address
**`https://preview.eatfitaf.com/<delivery>/`** (one hostname under the zone's free certificate, which covers first-level
subdomains only). This contract is the umbrella; its three parts are each built under their own repository's contract
(§ 6).

## 1. What a preview is

1. **One page per delivery** (a Sunday, `YYYY-MM-DD`): `https://preview.eatfitaf.com/2026-11-01/`. `/` lists the
   deliveries that have a preview, newest first, each a link. Anything else is a 404.
2. **The production page** with that week's Chef's Choice card filled in, **and ordering off**: every control that would
   leave for the store (the card's *Continue to checkout*, *Choose my own meals*, every plan or snack link) is shown
   disabled and leads nowhere; a banner at the top reads *"Preview of the week delivered {date}. Ordering is off."*, and
   *"Not yet approved."* when no approval binds to the week's picks (§ 2). No save step (rung 4), no analytics beacon, no
   Footer hand-off: the page has no link to the store at all.
3. **Fixed**: a preview changes only when it is published again; it never reads the store, and the live site never reads
   a preview.
4. **Staff only**: one Cloudflare Access application on `preview.eatfitaf.com` (the one-time PIN, as the internal
   estate's), allowing only the emails the Advisor names. ⛔ **No email or policy detail is written in this
   repository** (it is public): they are `fitaf-infra`'s configuration.

## 2. The week's data: a preview file

- **`<delivery>.json`, outside this repository** (amended 2026-10-20, below): the version-2 picks shape
  (`SPEC-week-content.md` § 1) plus `"preview": true` and `"approved": true | false`. Its meal names are **Fit AF's**
  (`name` and `display` both): before the store lists a week there is no store name, and nothing here makes a link from
  it. Written by Fit AF's emitter in its preview mode (§ 6 part 1), with the week's photo sheet(s) beside it in
  `photo-sheets/<file>.jpg`; the live week files under `data/picks/` are never touched by it.
- `checkPicks` accepts a preview file only where a preview is read (the preview build and the preview content command),
  and refuses `preview: true` everywhere else, so a preview can never reach the live site.
- **The content command** gains `--preview`: `npm run content -- --preview --week <delivery> --from <dir> --out <dir>`
  reads `<from>/<delivery>.json` and, when present, **the week's sheet entry
  `<from>/photo-sheets/chefs-choice-<delivery>.json`** (`{ file, width, height, cells }`, the shape of one
  `data/photo-sheets.json` `chefs_choice[<delivery>]` entry, its cells keyed by Fit AF's names) with the sheet it names
  in `<from>/photo-sheets/`, and writes `<out>/previews/<delivery>/picks-data.json` and that sheet, deterministic, as
  § 3 there. No entry: plain tiles, nothing copied. ⚠ **Ruled 2026-10-20 by the orchestrator** (the two builds read it
  two ways: one shared `<from>/photo-sheets.json`, against Fit AF's photos emitter writing one entry per week): **one
  file per week**, so a preview's pull request into `fitaf-infra` adds only its own files and never edits a manifest
  every other preview shares. Refused without `--from`,
  and refused when `--from` resolves inside this repository's tree.

⚠ **Amended 2026-10-20** (Fit AF's decision record `2026-10-17-the-picks-from-our-plans-and-the-breakfast-slate.md`
§ 7i item 2, the Advisor's ruling on where a preview's data lives: *"fitaf-infra, private"*). This section first put the
preview file at `data/previews/<delivery>.json` **in this repository**, which is public: a planned week, perhaps not
yet approved, would have been readable on GitHub days or weeks before the store lists it, and the sign-in would have
protected only the page. **A preview's data never enters this repository**: Fit AF's emitter writes it, a reviewed pull
request commits it into `fitaf-infra` (its Amendment 1.9), and the preview content job passes its own checkout's
directory as `--from`. This repository holds only the preview build's code and its cases' fixtures (invented weeks).

## 3. The build and the Worker

- **A build target `preview`**: `dist-preview/`, the production page's template with § 1 item 2's changes built in
  (the banner's slot, the controls disabled, no beacon, no rung 4), and **no week in it**. `npm run build -- --env preview`.
  The production and development builds are **byte-identical** to today's (S20 and the dev goldens).
- **The preview Worker** (`src/worker/preview.js`, one entry, nothing shared with the live Workers but the page's own
  modules): `GET /` lists `previews/` in its bucket (binding `PREVIEW`); `GET /<delivery>/` serves `dist-preview`'s page
  with `previews/<delivery>/picks-data.json` put into `#picks-data` exactly as `site.js` does for the live week
  (`SPEC-week-content.md` § 4 item 2), or a 404 page naming the date when there is none; `GET /<delivery>/week/<file>.jpg`
  serves that week's photo sheet; the page's static files from the assets; anything else 404. `Cache-Control` as the
  live page's (a publish is seen within a minute).

## 4. Cases (`node --test`, no network; a fake `ASSETS` and a fake `PREVIEW`)

**PV1** a preview file builds a page whose every store link is absent and whose controls are disabled (the built page
holds no `fitafnutrition.com` URL at all); **PV2** the banner names the date, and *"Not yet approved."* only when
`approved` is false; **PV3** `checkPicks` refuses `preview: true` in the production and development builds and in the
live content command; **PV4** the preview Worker: `/` lists two fixture deliveries newest first, `/2026-11-01/` carries
that week, `/2026-11-08/` with no object is a 404 naming the date, `/2026-11-01/week/x.jpg` serves the sheet, a path
with `..` or a non-date is a 404; **PV5** the production and development builds byte-identical (S20, the dev goldens);
**PV6** the preview content command deterministic; **PV7** the preview content command refused without `--from`, and with a `--from` inside this repository's tree (§ 2, amended 2026-10-20). **Mutants**: a store link left in the preview page (PV1); the
refusal of `preview: true` removed from the live content command (PV3).

## 5. Not here

The sign-in's configuration and the allowed emails (`fitaf-infra`); which weeks get a preview (a person publishes one;
later, perhaps every planned week at the plan's own approval); the live site.

## 6. Its three parts, and the order

1. **Fit AF**: `emit_microsite_picks.py --preview --picks <file> --out <path>` writes § 2's file from a picks file,
   approved or not (`approved` true when an approval record binds to the file's SHA-256), with Fit AF's names and no
   store catalog; and the photo sheet from the bound photographs only (`emit_microsite_photos.py`'s preview mode). Its
   contract is an amendment of `emit_microsite_picks.spec.md` there.
2. **This repository**: §§ 2–4.
3. **`fitaf-infra`**, its own amendment (1.9): a bucket for the previews, the preview Worker built from a third line of
   `microsites.lock` (`preview <commit>`), the custom domain `preview.eatfitaf.com`, the Access application and its
   policy (the Advisor's emails), and the content job's `environment=preview` writing `previews/<delivery>/` and never
   deleting another delivery's objects, **the preview file and its photo sheets committed in `fitaf-infra` itself**
   and passed to the content command as `--from` (§ 2, amended 2026-10-20). **The Advisor's step first**: Zero Trust on the account that holds
   `eatfitaf.com` (today it is on the internal account only), with the one-time PIN as its login method.

Then the first preview, **2026-11-01** (the Boston menu): Fit AF's file, this repository's commit, the pin, the content
run; the Advisor opens `https://preview.eatfitaf.com/2026-11-01/`, signs in, and the Fit AF team tests it.

## 7. Built (part 2, this repository) — found at the build, not ruled

Red at `c6ece96` (each case file alone: PV1, PV2, PV3a, PV4, PV6, PV7 and the three mutant cases failing on the missing
feature; PV3b and PV5 passing, as they must: they pin what does not change), green at the commit that carries this
section, each case file alone. §§ 1–6 are unchanged.

**What was built**

- `build.mjs`: the target `preview` (`npm run build -- --env preview` → `dist-preview/`): `renderPage` with
  `previewSlots()` (the production slots, the page's files addressed from the root as the development pages' are,
  `ANALYTICS` empty) and `{ orderLinks: false }` (the grid's six cells and Family's button written with no `href`,
  `role="link" aria-disabled="true"`; plan-data's `base` empty). The template gains three slots, `PREVIEW_STYLE`,
  `PREVIEW_BANNER` (first in `<body>`) and `PREVIEW_SCRIPT` (last), empty on every other page (PV5).
- `src/preview/`: `banner.html`, `style.css`, `preview.js`; the words in `data/messages.json`'s `preview`.
- `scripts/chefs-choice.mjs`: `checkPicks(json, name, plans, photo, { preview })`; `pageData` writes the week's
  `preview: true` and `approved`. `scripts/week-content.mjs`: `previewContent()`, `previewSource()`, `--preview`.
- `src/worker/preview.js`: `route`, `isDate`, `isPreviewWeek`, `servePreview`; it imports `script-json.js` only.

**The choices, where §§ 1–4 left one open**

1. ⛔ **Superseded 2026-10-20 by § 2's ruling (the orchestrator's, `48731b4`): one file per week.** The command reads
   the week's sheet entry `<from>/photo-sheets/chefs-choice-<delivery>.json`, exactly `{ file, width, height, cells }`,
   and the sheet it names beside it, and no longer reads `<from>/photo-sheets.json`; no entry, plain tiles. Built at the
   commit after `3c7a0ed` (the cases: PV6b, red on the reading below); a field the ruled shape lacks is refused, the
   build's reading. The reading as it stood:
   **How a preview file names its sheet.** § 2 says the command reads "the photo sheets it names", and the preview
   file is the version-2 shape plus two keys, none naming a sheet. Read as: `<from>/photo-sheets.json`, in
   `data/photo-sheets.json`'s shape (the photos emitter's own), its `chefs_choice[<delivery>]` `{ file, width, height,
   cells }` with the cells keyed by the week's names (Fit AF's), the file in `<from>/photo-sheets/`. No manifest, or no
   entry for the week: plain tiles, nothing copied. ⚠ **This is the interface with Fit AF's `emit_microsite_photos.py`
   preview mode, which is not yet contracted there** (`emit_microsite_picks.spec.md` § 8 item 4 names the sheet only).
2. **The banner's date** is the delivery as the address names it (`2026-11-01`), written by the page's script from
   `#picks-data`'s one week; *Not yet approved.* is in the markup and hidden only when the week says `approved: true`
   (a week whose approval is unknown is not called approved). The words are the build's (a change is a release), as §
   8.1 item 4 of SPEC-week-content chose for `updating`. Without JavaScript the date is blank (the card needs it too).
3. **Ordering off, at run time.** A preview's carts keep one entry per size, its value `""` (no link), so the card's
   script shows the size's list; plan-data's `base` is `""`, so app.js writes `?mpid=N` on *Choose your meals*, which
   the card's script reads to choose the size. `preview.js` runs last and takes every `<a>`'s `href` away, marking it
   `role="link" aria-disabled="true"`, at load, after each `hashchange` (its listener follows app.js's and the card's)
   and after each click (app.js re-renders without a `hashchange` when a choice leaves the fragment as it was). No link
   holds an address at any moment a visitor can act; the served page holds no store URL in its bytes.
4. **`preview` and `approved` are the week's keys** in the content (as `updating` is), not the top level's.
5. **`checkPicks`** refuses `"preview": true` unless the caller passes `{ preview: true }` (the preview content command
   alone), and in a preview read refuses a file that is not a preview's; a preview file is version 2, never `updating`,
   its `approved` true or false. Its carts pass the link tool's checks (`payloadFromArgs`) and make no link. ⚠ A preview
   file put in `data/picks/` refuses the live content of EVERY week (the live command reads every file, SPEC-week-content
   § 7 item 10): loud, by design.
6. **"This repository's tree"** is the package's parent directory (the repository's top level: `../README.md`), both
   sides compared by real path, so a link elsewhere that resolves into the repository is refused (PV7). Not `git
   rev-parse`: a checkout without `.git`, or one nested in another repository, would answer differently.
7. **The command line**: `--preview` takes `--week`, `--from` and `--out` only (`--env` and `--picks` refused: a
   preview has no link to carry a host and reads nothing of `data/picks/`); `--from` without `--preview` is refused; an
   `--out` already holding `previews/` is refused, as one holding `week/` is.
8. **The Worker.** It expects `run_worker_first: true` (the list is at `/`, where the assets hold the bare preview
   page). Static files are `/fonts/…` and `/assets/…` only; `/<delivery>` without its slash, `/index.html` and any
   method but GET on the Worker's own routes are 404s. An object that is not a preview of its date (not one week, a
   different `delivery`, no `preview: true` or `approved`, or not the shape the page reads) is the 404 naming the date:
   **a live week's content, which carries the store's links, is never served here** (PV4 checks it). The list is by key
   (`previews/<date>/picks-data.json` present), not by reading each object.
9. **Nothing shared with the live Workers**: the shape check is written again in `preview.js` (`isPreviewWeek`, the
   keys the page's scripts read plus the two marks) rather than imported from `site.js`, which imports the beacon.

**Mutation results (§ 4, `test/pv-mutants.test.mjs`, each in a nested mirror)**: the control passes PV1 and PV3. A
store link left in the preview page (the preview build with `orderLinks: true`): PV1 red, 16 problems, the first *"the
built page holds 8 URL(s) of fitafnutrition.com"*. The refusal of `preview: true` removed from the live content
command (`checkPicks`' refusal outside a preview read): PV3 red, `checkPicks`, the live content (prod and dev, alone
and beside a live week) and the program (exit 0, `week/` written) all accept it. PV4, probed by hand the same way (not
committed): a list oldest first, a `..` let through, and the preview marks unchecked are each red.

**Found**

- ⚠ **`--out` inside this repository is not refused** (§ 2 is silent): the objects would sit, untracked, in the public
  repository's working tree. Not built, since `fitaf-infra`'s job may place `--out` anywhere; the orchestrator's to rule.
- `wrangler.jsonc` is not touched: the preview Worker's bucket name, settings and domain are `fitaf-infra`'s, and its
  mirror of this file is unchanged.
- ⚠ `npm run contrast` does not read `src/preview/style.css` (its inputs are a fixed list); the file draws only the
  measured white-on-navy pair and dims a disabled link (inactive controls). Storybook's SM-4 reads every `src/**/*.css`
  rule and every phrase of `data/messages.json`, so the two new rules and the banner's words are now page text it must
  not copy.
- PV5's golden is every file of both builds as `8081b46` wrote them (git archive of that commit, `pv-05-record.mjs`);
  the production `index.html` there is S20's `ac981505…`.

**Not run here**: the full suite, Storybook, the watch, `npm run contrast`, any build of every target; nothing
deployed, no `wrangler`, no bucket written; the page not looked at in a browser (linkedom and Miniflare only).
