// SP11 (SPEC-save-offer-production.md § 9.2): every link the Worker and its emails give back to the page resolves, on the
// production Worker and on the development one. `/o/<code>`'s *Build my plan →* is `/?e=<event_id>#from-email`: a page
// the Worker serves with 200 (production serves the page at `/` alone), carrying the save's event in `?e=` (which the page
// reads with qrEvent, § 9 item 2) and `#from-email` (Flow 1 collapsed to its one line, SPEC-rung4 § 2b item 4). And E1's
// *See my offer* and *Yes, keep me posted*, E-X's *Yes, tell me*, the /confirm page's form and its *See my offer*, and
// `/o`'s other page's link, each answered 200 by the same Worker. ⚠ Since SPEC-ui-and-copy-pass § 8 E1's links are *Claim
// my offer* (/o/<code>) and its footer's *eatfitaf.com* (SITE_URL/), and since its § 8.2 item 1 a ticked save's *Yes, keep
// me posted* again, in the footer above them. Each Worker runs in Miniflare with that build's own pages
// as its assets (production: the approved fixtures' build, `/` and `/privacy/`; development: `/`, each `/<event-id>/` and
// `/privacy/`), mail captured by a stubbed Resend (no request leaves the machine).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import events from "../data/events.json" with { type: "json" };
import { build, devConfig } from "../build.mjs";
import { E1_SUBJECT, EX_SUBJECT } from "../src/worker/messages.js";
import { RESEND_URL } from "../src/worker/resend-sender.js";
import { simulatePage } from "./page-sim.mjs";
import { DUMMY_KEY } from "./rung5-fixture.mjs";
import { productionBuild } from "./sp-production.mjs";
import { fetchPage, NEAR_ZIP, postSave, rows, startWorker, TEST_CONFIRM_TOKEN_KEY, validSave } from "./worker-harness.mjs";

const EVENT = "boston";
const BACK = `/?e=${EVENT}#from-email`;

/** The development build's pages, by the path the assets serve each at. */
async function devAssets() {
  const out = await mkdtemp(join(tmpdir(), "boston-sp11-dev-"));
  try {
    await build({ target: "dev", outDir: out });
    const read = (f) => readFile(join(out, f), "utf8");
    const map = { "/": await read("index.html"), "/privacy/": await read(join("privacy", "index.html")) };
    for (const e of events) map[`/${e.id}/`] = await read(join(e.id, "index.html"));
    return map;
  } finally {
    await rm(out, { recursive: true, force: true });
  }
}

/** The production build's pages with `production` true and the approved fixtures: the page at `/` and /privacy/. */
async function productionAssets() {
  const { html, privacy, error } = await productionBuild();
  assert.equal(error, null, "control: the approved production build");
  return { "/": html, "/privacy/": privacy };
}

/** A link's path and query on the Worker's own site (`siteUrl`), the fragment apart. */
function onSite(link, siteUrl) {
  const url = new URL(link, siteUrl);
  assert.equal(url.origin, new URL(siteUrl).origin, `${link}: on the site's own origin`);
  return url;
}

async function assertLinksBack({ worker, assets, siteUrl, bindings = {} }) {
  const { mf, outbound, db } = await startWorker({
    worker,
    assets,
    bindings: { RESEND_API_KEY: DUMMY_KEY, CONFIRM_TOKEN_KEY: TEST_CONFIRM_TOKEN_KEY, MAIL_FROM: "Fit AF <offers-sp11@example.com>", ...bindings },
    resend: () => Response.json({ id: "sp11-accepted" }),
  });
  const get = async (url, opts) => fetchPage(mf, url.pathname + url.search, opts);
  try {
    assert.deepEqual((await postSave(mf, validSave({ email: "dummy-sp11@example.com", event_id: EVENT, consent_marketing: true }))).json, { ok: true });
    assert.deepEqual((await postSave(mf, validSave({ kind: "expansion", email: "dummy-sp11-ex@example.com", zip: NEAR_ZIP }))).json, { ok: true });
    const latest = Math.max(...(await rows(db, "SELECT send_at FROM saves")).map((r) => Date.parse(r.send_at)));
    const outcome = await (await mf.getWorker()).scheduled({ cron: "*/5 * * * *", scheduledTime: new Date(latest + 60_000) });
    assert.equal(outcome.outcome, "ok");
    const mail = Object.fromEntries(outbound.filter((r) => r.url === RESEND_URL).map((r) => JSON.parse(r.body)).map((m) => [m.subject, m.text]));
    const linksOf = (text) => [...text.matchAll(/^(.*?): (https?:\/\/\S+)$/gm)].map((m) => [m[1].trim(), m[2]]);
    const e1 = Object.fromEntries(linksOf(mail[E1_SUBJECT]).map(([label, link]) => [label.split(". ").at(-1), onSite(link, siteUrl)]));
    const ex = Object.fromEntries(linksOf(mail[EX_SUBJECT]).map(([label, link]) => [label.split(". ").at(-1), onSite(link, siteUrl)]));
    assert.deepEqual(Object.keys(e1), ["Claim my offer", "Yes, keep me posted", "You're getting this email because you saved an offer at eatfitaf.com"], "control: E1's three links (a ticked save)");
    assert.deepEqual(Object.keys(ex), ["Yes, tell me"], "control: E-X's one link");

    // E1's footer's eatfitaf.com: SITE_URL/, the plan page, 200.
    const home = await get(e1["You're getting this email because you saved an offer at eatfitaf.com"]);
    assert.equal(e1["You're getting this email because you saved an offer at eatfitaf.com"].pathname, "/", "the footer's link: the site's root");
    assert.equal(home.status, 200, "E1's eatfitaf.com: 200");
    // E1's Claim my offer: /o/<code>, 200; its Build my plan: /?e=<event>#from-email, a page the Worker serves with 200.
    const o = await get(e1["Claim my offer"]);
    assert.equal(o.status, 200, `E1's Claim my offer ${e1["Claim my offer"].pathname}: 200`);
    const back = /<a href="([^"]+)">Build my plan →<\/a>/.exec(o.text)?.[1]?.replaceAll("&amp;", "&");
    assert.equal(back, BACK, "/o's Build my plan: the page at /, the save's event in ?e=, #from-email");
    const backUrl = onSite(back, siteUrl);
    assert.equal(backUrl.searchParams.get("e"), EVENT);
    assert.equal(backUrl.hash, "#from-email");
    const page = await get(backUrl);
    assert.equal(page.status, 200, `${backUrl.pathname}${backUrl.search}: 200`);
    assert.match(page.text, /<script type="application\/json" id="save-data">/, "the plan page with the save step");
    // Opened there: Flow 1 collapsed to its one line (#from-email), and a save from it names the event (?e=).
    const visit = simulatePage(page.text, { search: backUrl.search, hash: backUrl.hash });
    assert.equal(visit.el("save-open").hidden, true, "#from-email: Flow 1 collapsed");
    assert.equal(visit.el("save-collapsed").hidden, false, "to its one-line Save my offer");
    visit.el("save-reopen").dispatch("click");
    visit.type("save-email", "dummy-sp11-again@example.com");
    visit.type("save-zip", "02118");
    visit.el("save-form").dispatch("submit");
    await visit.settle();
    assert.equal(JSON.parse(visit.record.fetches[0].init.body).event_id, EVENT, "the save from it names the event");

    // /o's other page (an unknown code: the current offer): its Build my plan, 200.
    const current = await get(onSite("/o/ZZZZ-ZZZZ", siteUrl));
    const currentLink = /<a href="([^"]+)">Build my plan →<\/a>/.exec(current.text)?.[1];
    assert.equal((await get(onSite(currentLink, siteUrl))).status, 200, `/o's current offer page's ${currentLink}: 200`);

    // E1's Yes, keep me posted and E-X's Yes, tell me: /confirm/<token>, 200; its form posts to itself; CONFIRMED's
    // See my offer, /o/<code>, 200.
    const landing = await get(e1["Yes, keep me posted"]);
    assert.equal(landing.status, 200, "E1's Yes, keep me posted: 200");
    assert.match(landing.text, /<form method="post">/, "the form posts to its own address");
    const confirmed = await get(e1["Yes, keep me posted"], { form: { action: "yes" } });
    assert.equal(confirmed.status, 200, "the form's Yes: 200");
    const see = /<a href="([^"]+)">See my offer<\/a>/.exec(confirmed.text)?.[1];
    assert.equal((await get(onSite(see, siteUrl))).status, 200, `the confirmed page's See my offer ${see}: 200`);
    assert.equal((await get(ex["Yes, tell me"])).status, 200, "E-X's Yes, tell me: 200");
  } finally {
    await mf.dispose();
  }
}

test("SP11: on the production Worker (production true), every link back to the page resolves with 200", async () => {
  await assertLinksBack({ worker: "production", assets: await productionAssets(), siteUrl: "https://eatfitaf.com" });
});

test("SP11: the same on the development Worker", async () => {
  await assertLinksBack({ worker: "development", assets: await devAssets(), siteUrl: (await devConfig()).vars.SITE_URL, bindings: { SEND_ALLOWLIST: "@example.com" } });
});
