// N5 (SPEC-analytics.md § 12 items 4 and 6): a request naming neither parameter is answered as today, byte for byte:
// every request of SP3's and WC-6's lists (copied below from sp3-production-false.test.mjs REQUESTS and
// wc-06-other-routes.test.mjs OTHER), and the QR code's own address and a beacon. "Today" is c6dd3a5 (release (b), the
// commit this contract's branch starts from): its src/worker/, data/, scripts/ and package.json extracted by `git
// archive` into a temporary directory (read only; AJ2's way), its Workers started exactly as this tree's
// (worker-harness.mjs startWorker, its `main` the tree's own entry: D1, the rate limiters and the vars as wrangler.jsonc
// gives them, the same fake ASSETS and the test clock), each request asked of both. On production's Worker (production
// true as committed, and false, the rollback) and the development Worker. And each request again CARRYING the cookie
// (§ 12 item 4: "the save step, /o, /confirm and the cron ignore the cookie"; item 1: "the page itself is unchanged"):
// still today's answer, which reads no cookie. Compared: the status, every header but `date`'s value (SP3's § 10.6: the
// clock, not the Worker; whether one is sent is compared), every Set-Cookie, and the body; and the requests the assets
// were asked. ⚠ A later contract that changes one of these answers changes TODAY here, as SP3's base is moved.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { ROOT } from "../build.mjs";
import { VALID } from "./a-harness.mjs";
import { HOST, NO_TRACKING_SENT } from "./n-checks.mjs";
import { startWorker } from "./worker-harness.mjs";

const TODAY = "c6dd3a5";

function run(cmd, args, { input } = {}) {
  const r = spawnSync(cmd, args, { input, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status}: ${r.stderr}`);
  return r.stdout;
}

const scratch = await realpath(await mkdtemp(join(tmpdir(), "boston-n5-")));
test.after(() => rm(scratch, { recursive: true, force: true }));
const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
const prefix = relative(top, ROOT);
const paths = ["scripts", join("src", "worker"), "data", "package.json"].map((p) => join(prefix, p));
run("tar", ["-x", "-C", scratch], { input: run("git", ["-C", top, "archive", "--format=tar", TODAY, ...paths]) });
const todayPackage = join(scratch, prefix);

/** SP3's list (sp3-production-false.test.mjs REQUESTS), as written there. */
const SP3_REQUESTS = [
  ["GET", "/"],
  ["GET", "/index.html"],
  ["GET", "/week/chefs-choice-2026-10-18.jpg"],
  ["GET", "/week/nothing-here.jpg"],
  ["POST", "/api/save", JSON.stringify({ kind: "offer", email: "dummy-sp3@example.com", zip: "02118" })],
  ["GET", "/api/save"],
  ["GET", "/confirm/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ"],
  ["POST", "/confirm/abc", "action=yes"],
  ["GET", "/o/ABCD2345"],
  ["GET", "/fonts/poppins-latin-700-normal.woff2"],
];
/** WC-6's list (wc-06-other-routes.test.mjs OTHER), a POST or PUT with the body "{}" as there. */
const WC6_OTHER = [
  ["POST", "/api/save", "{}"],
  ["GET", "/api/save"],
  ["GET", "/confirm/x"],
  ["POST", "/confirm/x", "{}"],
  ["GET", "/o/ABCDEFGH"],
  ["GET", "/qr/demo.png"],
  ["PUT", "/", "{}"],
];
/** The QR code's own address (data/events.json's boston) and a beacon, neither naming a parameter of § 12. */
const MORE = [
  ["GET", "/?e=boston"],
  ["GET", "/boston/"],
  ["POST", "/a", JSON.stringify(VALID.open)],
];
const REQUESTS = [...SP3_REQUESTS, ...WC6_OTHER, ...MORE];

/** The fake ASSETS of both trees' Workers (worker-harness: a path -> HTML table, anything else 404). */
const ASSETS = { "/": "<!doctype html><title>n5</title><p>the page</p>", "/boston/": "<!doctype html><title>n5</title><p>an event page</p>" };

/** The three Workers, by worker-harness's options, and each one's entry in a tree. */
const WORKERS = [
  ["production's Worker, production true", { worker: "production" }, "site.js"],
  ["production's Worker, production false (the rollback)", { worker: "production", production: false }, "site.js"],
  ["the development Worker", { worker: "development" }, "index.js"],
];

const CLOCK_HEADER = "date";

/** ⚠ SPEC-analytics.md § 16 item 1 (2026-10-27) changes one answer of these lists by design: the offer page (/o/…, a 200)
 *  carries at the end of its column its data (#offer-data, its kind and the save's event id) and the page's analytics
 *  script, which today's page did not. Those two elements are removed from this tree's page (and must be there, the
 *  control), and the rest is today's byte for byte: the narrowest change to N5, rather than moving TODAY.
 *  ⚠ And SPEC-the-redirect.md § 4 (2026-10-27) changes the same answer's link to the home page: it names the email in its
 *  query, `via=email` (`/?via=email` for an unknown code's page, `&amp;via=email` after `?e=<event>`). That parameter is
 *  removed from this tree's links (and must be there, the control), the rest compared as before. */
const OFFER_ANALYTICS = /<script type="application\/json" id="offer-data">[^<]*<\/script>\n<script>\n[\s\S]*?\n<\/script>\n(?=<\/main>)/;
const VIA_EMAIL_LINK = /href="\/\?(?:via=email"|(e=[a-z0-9-]+)&amp;via=email(?=["#]))/g;
function withoutOfferAnalytics(response, where) {
  const text = response.body.toString("utf8");
  assert.match(text, OFFER_ANALYTICS, `${where}: the offer page carries its data and the analytics script (§ 16 item 1)`);
  assert.match(text, new RegExp(VIA_EMAIL_LINK.source), `${where}: the offer page's link to the home page names the email (SPEC-the-redirect.md § 4)`);
  const body = Buffer.from(text.replace(OFFER_ANALYTICS, "").replace(VIA_EMAIL_LINK, (_m, e) => (e ? `href="/?${e}` : 'href="/"')));
  const headers = { ...response.headers };
  if ("content-length" in headers) headers["content-length"] = String(body.length);
  return { ...response, headers, body };
}

/** A response, read whole: status, headers but `date`'s value (and whether it has one), every Set-Cookie, body. */
async function readAll(res) {
  const headers = Object.fromEntries(res.headers);
  const dated = CLOCK_HEADER in headers;
  delete headers[CLOCK_HEADER];
  return { status: res.status, headers, dated, cookies: res.headers.getSetCookie(), body: Buffer.from(await res.arrayBuffer()) };
}

/** Request `i` of REQUESTS, carrying the cookie or not, from its own documentation address (so no rate limit is met). */
function init(i, [method, , body], cookie) {
  const headers = { "cf-connecting-ip": `198.51.100.${i + 1}` };
  if (body) headers["content-type"] = "application/json"; // as SP3 sends each of its bodies
  if (cookie) headers.cookie = cookie;
  return { method, headers, ...(body ? { body } : {}), redirect: "manual" };
}

for (const [label, options, entry] of WORKERS) {
  test(`N5: ${label} answers every request of SP3's and WC-6's lists as ${TODAY}'s, byte for byte, with and without the cookie`, async () => {
    const now = await startWorker({ ...options, assets: ASSETS, main: join(ROOT, "src", "worker", entry) });
    const before = await startWorker({ ...options, assets: ASSETS, main: join(todayPackage, "src", "worker", entry) });
    try {
      for (const cookie of [undefined, NO_TRACKING_SENT]) {
        for (const [i, request] of REQUESTS.entries()) {
          const where = `${request[0]} ${request[1]}${cookie ? ", carrying the cookie" : ""}`;
          const got = await readAll(await now.mf.dispatchFetch(HOST + request[1], init(i, request, cookie)));
          const a = request[1].startsWith("/o/") && got.status === 200 ? withoutOfferAnalytics(got, where) : got;
          const b = await readAll(await before.mf.dispatchFetch(HOST + request[1], init(i, request, cookie)));
          assert.equal(a.status, b.status, `${where}: status`);
          assert.equal(a.dated, b.dated, `${where}: a ${CLOCK_HEADER} header on both or neither`);
          assert.deepEqual(a.headers, b.headers, `${where}: headers`);
          assert.deepEqual(a.cookies, b.cookies, `${where}: Set-Cookie`);
          assert.ok(a.body.equals(b.body), `${where}: body`);
        }
      }
      assert.deepEqual(now.assetRequests, before.assetRequests, "the same requests of the assets");
      assert.ok(now.assetRequests.length > 0, "control: the assets were asked");
    } finally {
      await now.mf.dispose();
      await before.mf.dispose();
    }
  });
}
