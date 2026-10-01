// SPEC-rung2-progress-and-checkout § 17.1: the hosts of Fit AF's photo sheets, by CODE (the index): the production
// site, then the test address. ONE list: scripts/handoff-link.mjs writes a link's host as its code here, and
// scripts/build-storefront.mjs inlines this list in the shipped block (its HOSTS slot), which requests a sheet only on
// a host named here, never on one from the link. A new host is an amendment (R2-77 pins the list against the live block).
export const PHOTO_HOSTS = ["https://eatfitaf.com", "https://fitaf-microsites-dev.fitaf-microsite-boston-2026-10.workers.dev"];
