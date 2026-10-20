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
  reads `<from>/<delivery>.json` and the photo sheets it names from `<from>/photo-sheets/`, and writes
  `<out>/previews/<delivery>/picks-data.json` and those sheets, deterministic, as § 3 there. Refused without `--from`,
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
