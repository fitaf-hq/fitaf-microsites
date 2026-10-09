// W26–W27 (SPEC-storefront-watch § 12 items 1 and 6): F6 reads the page's OWN /catalog/products response.
// W26: the backend host is requested by the page and never by the watch's code, and § 2's planted request (a URL of the
// backend's in the page's HTML) is still refused, never fetched. W27: the report and the issues carry no parameter
// VALUE (the storefront's key travels in that request's query), nor a price.
// In headless Chrome against test/browser-store.mjs on 127.0.0.1, whose order page requests its catalog from the
// synthetic backend reached as `localhost` (another host); the backend's own log says who asked. The watch's own
// requests go to § 6's synthetic store through an injected fetch. Never the live store. Skipped without Chrome.
// The planted values are assembled at run time: no key-shaped literal is committed (as W9b's).
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { chromePath } from "../lib/browser.mjs";
import { renderReport } from "../lib/report.mjs";
import { storeFetcher } from "../lib/store-fetch.mjs";
import { ordinaryVisit } from "../lib/visit.mjs";
import { runWatch } from "../lib/watch.mjs";
import { mealKey } from "../../../src/storefront/meal-key.js";
import { CATALOG_PATH, MEALS, startBackend, startStore } from "./browser-store.mjs";
import { DEPENDENCIES, fakeFetch, ORIGIN, PAGE, syntheticStore, w1Baseline } from "./synthetic-store.mjs";

const chrome = (() => {
  try {
    return chromePath();
  } catch {
    return null;
  }
})();
const skip = chrome ? false : "no Chrome found (set CHROME_PATH)";

const FRIDAY_NOON = new Date("2026-10-09T16:00:00Z");
/** The live backend's catalog, as SPEC-snacks-in-the-cart § 1a read the page requesting it. */
const BACKEND_CATALOG = "https://backend.happymealprep.com/api/v1/tenant/catalog/products";
/** The watch's own user agent (lib/store-fetch.mjs): a request of ours would carry it. */
const WATCH_UA = "fitaf-storefront-watch";
const planted = () => `v${randomBytes(8).toString("hex")}`;
/** The request's parameters, as the live page's carries them (names from § 1a), every value planted. */
const PARAMS = {
  paginate: planted(),
  meal_plan_id: planted(),
  limit: planted(),
  store_api_key: ["sk", "live", randomBytes(16).toString("hex")].join("_"),
  tenant: planted(),
  device_type: planted(),
};
/** A price no other text in a run carries: seven digits, so no port number (at most five) can hold it. */
const PRICE_CENTS = 9876543;
const PRICES = ["9876543", "98765.43"];
const MENU_B = ["Lemon Herb Chicken", MEALS[3], "Pork Carnitas Bowl", "Teriyaki Salmon", MEALS[7], "Mediterranean Quinoa", "BBQ Brisket", "Garlic Shrimp Pasta", "Thai Basil Beef"];

let store;
let backend;
before(async () => {
  if (skip) return;
  store = await startStore();
  backend = await startBackend();
  store.set({ catalog: backend.url(PARAMS) });
});
after(async () => {
  await store?.close();
  await backend?.close();
});

/**
 * A Friday run whose page HTML (§ 6's synthetic store, served to the watch's own code) plants the backend's catalog URL
 * as a script, so the run is a release (F1) and F3 runs on the same visit as F6. Returns the result, the watch's own
 * requests, the visits made and the backend's requests during the run.
 */
async function fridayRun(menu) {
  backend.set({ menu, snacks: ["Protein Brownie"], priceCents: PRICE_CENTS });
  const before = backend.requests.length;
  const pageHits = store.hits("/order");
  const files = syntheticStore((f) => {
    f.set("/order?mpid=21", f.get("/order?mpid=21").replace("</head>", `<script src="${BACKEND_CATALOG}"></script></head>`));
  });
  const own = fakeFetch(files);
  const visits = [];
  const result = await runWatch({
    fetcher: storeFetcher({ fetchImpl: own.fetchImpl, origin: ORIGIN }),
    baseline: { ...w1Baseline(), menu: [...new Set(MEALS.map(mealKey))].sort() },
    dependencies: DEPENDENCIES,
    page: PAGE,
    now: () => FRIDAY_NOON,
    cutover: { timeZone: "America/New_York", seen: null },
    visit: (opts) => {
      visits.push(opts);
      return ordinaryVisit({ page: `${store.origin}/order?mpid=21`, executablePath: chrome, renderMs: 10_000, settleMs: 300, ...opts });
    },
  });
  return { result, own: own.calls, visits, backendRequests: backend.requests.slice(before), pageLoads: store.hits("/order") - pageHits };
}

test("W26: the backend is requested by the page, never by the watch's code; § 2's planted backend URL is still refused", { skip }, async () => {
  const { result, own, visits, backendRequests, pageLoads } = await fridayRun(MEALS);
  // § 2: the watch's own requests, every one to the store; the backend's URL in the HTML refused, never fetched.
  assert.ok(own.length > 0 && own.every((u) => new URL(u).origin === ORIGIN), JSON.stringify(own));
  assert.deepEqual(result.refused, [BACKEND_CATALOG]);
  assert.ok(result.flags.includes("F1"), "the planted script is a change to the page: a release");
  // The page asked the backend, once: the browser's agent, the store page's origin. Nothing of ours asked.
  assert.equal(backendRequests.length, 1, JSON.stringify(backendRequests));
  const [req] = backendRequests;
  assert.equal(new URL(req.url, "http://localhost").pathname, CATALOG_PATH);
  assert.equal(req.method, "GET");
  assert.match(req.userAgent, /HeadlessChrome/);
  assert.ok(!req.userAgent.includes(WATCH_UA), "not the watch's own agent");
  assert.equal(req.origin, store.origin, "sent by the store's page");
  // One visit, one page load, read by F3 and F6 alike.
  assert.equal(visits.length, 1);
  assert.equal(pageLoads, 1);
  assert.equal(result.f3.ran, true);
  assert.equal(result.f6.ran, true);
  assert.equal(result.f6.flag, false, result.f6.summary);
  // What F6 says of the request: the host and path, and the parameters' names.
  assert.deepEqual(result.f6.responses, [{ at: `${new URL(backend.origin).host}${CATALOG_PATH}`, params: Object.keys(PARAMS) }]);
});

test("W27: the report and the issues carry no parameter value and no price; the request's names are there", { skip }, async () => {
  const { result, backendRequests } = await fridayRun(MENU_B);
  assert.deepEqual(result.flags, ["F1", "F6"], result.f6.summary);
  // Control: every value was in the request the page made, so each had a way to leak.
  const query = new URL(backendRequests[0].url, "http://localhost").searchParams;
  for (const [name, value] of Object.entries(PARAMS)) assert.equal(query.get(name), value, `${name} was sent`);

  const report = renderReport(result);
  const { fileRunIssues } = await import("../lib/run-issues.mjs");
  const issues = [];
  await fileRunIssues({
    gh: async (args, input) => {
      if (args[0] === "issue" && args[1] === "list") return "[]";
      if (args[0] === "issue" && args[1] === "create") issues.push({ title: args[args.indexOf("--title") + 1], body: input });
      return "";
    },
    result,
    report,
  });
  assert.equal(issues.length, 2, "the release's issue and the menu's");
  const texts = { result: JSON.stringify(result), report, ...Object.fromEntries(issues.flatMap((i, n) => [[`issue ${n} title`, i.title], [`issue ${n} body`, i.body]])) };
  for (const [where, text] of Object.entries(texts)) {
    for (const [name, value] of Object.entries(PARAMS)) assert.ok(!text.includes(value), `${where} carries ${name}'s value`);
    // The key's own random part too: a redaction of `sk_…` is not the proof; the record never held it.
    assert.ok(!text.includes(PARAMS.store_api_key.split("_").at(-1)), `${where} carries the key's characters`);
    for (const price of PRICES) assert.ok(!text.includes(price), `${where} carries a price (${price})`);
  }
  for (const name of Object.keys(PARAMS)) assert.ok(report.includes(name), `the report names the parameter ${name}`);
  const menuIssue = issues.find((i) => i.title.startsWith("storefront-watch: the menu switched"));
  assert.ok(menuIssue, issues.map((i) => i.title).join("; "));
  assert.ok(menuIssue.body.includes("Teriyaki Salmon"), "names, the store's own");
});
