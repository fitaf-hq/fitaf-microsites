// SP3 (SPEC-save-offer-production.md § 3 item 1, § 4 item 1, § 5): with `production` false the production build and the
// production Worker are the base's. "The base" is 63275a8, the contract's own commit (no code of it), extracted by
// `git archive` (sp-production.mjs basePackage).
//   - S20: `npm run build` byte-identical to S20's golden (not re-recorded by this contract), and to the base tree's build;
//   - the production T5 as the base's: no script src, no fetch (T5 itself runs on its own);
//   - the production Worker (src/worker/site.js, wrangler.jsonc's top-level `main`) answers every request as the base's
//     does, byte for byte (status, headers, body), in Miniflare with the same fake assets and bucket; and it has no
//     scheduled handler.
// ⚠ CC-8b's golden is the DEVELOPMENT Worker's file map (every file src/worker/index.js reaches), and § 3 item 1 (the flag
// in data/save.json) and § 4 item 2 (site.js serving rung 4's routes when true) change files in it by construction, so its
// bytes cannot stay the base's; § 4 item 1's "byte-identical in behaviour" is what is checked here, and CC-8b's map is
// compared with the base's file by file: only the files this contract names move (SPEC § 8).
// ⚠ Amended by § 9 item 2 (2026-10-21): the page's one reading of ?e= (src/qr-event.js) is at the head of the analytics
// script of EVERY page, the production page's with `production` false too, so that page is the base's with exactly that
// change (withSection9Reading below: its lines are S20's note's) and every other file the base's, byte for byte; S20's
// golden is re-recorded once for it. The Worker's behaviour is still the base's, byte for byte.
// ⚠ At the merge into boston/live-week-every-menu (2026-10-21) "the base" is 768ca36, the merged tree before this
// contract's branch (sp-production.mjs BASE says why): the production page carries boston/why-button's and
// boston/every-menu's lines from that tree, and this contract's § 9 item 2 reading alone on top of them.
// ⚠ Since SPEC-every-menu-and-nutrition § 11 (2026-10-22) changes the production page, "the base" is 768ca36 with that
// section's own diff applied (sp-production.mjs LATER): the page is still the base's with § 9 item 2's reading alone.
// ⚠ Since SPEC-week-content § 9.2 (2026-10-23): the build's photo sheets (every file under assets/photo-sheets/, the
// emitter's weekly inputs) are compared as byte copies of the tree's own src/assets/photo-sheets/
// (test/production-sheets.mjs); every other file against S20's golden and the base tree's build as before.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import saveConfig from "../data/save.json" with { type: "json" };
import { build, renderPage, ROOT } from "../build.mjs";
import { productionFalseMirror, productionFalseSavePath, workerFiles } from "./cc-harness.mjs";
import { loadPlans } from "./helpers.mjs";
import { committedSheets, sheetsLine, splitSheets } from "./production-sheets.mjs";
import { assertProductionT5, basePackage, BASE } from "./sp-production.mjs";
import { pageAsset, startSite, WEEK_DATA_KEY } from "./wc-harness.mjs";

const s20 = JSON.parse(await readFile(new URL("./s20-production-golden.json", import.meta.url), "utf8"));
const base = await basePackage();
test.after(() => base.dispose());

/** The files this contract changes in the development Worker's reach (SPEC § 8 lists why each moves). */
// src/worker/redeem.js since § 9.2: /o's Build my plan is /?e=<event_id>#from-email.
// Since § 10 (the offer a price promise): data/offers.json (the Boston offer's code_mode none and valid_to), data/delivery-
// zips.json (the official list), src/worker/messages.js (E1's date held), src/worker/redeem.js (/o's) and
// src/worker/zip-class.js (the near ring by prefix beside an exact list).
// Since § 10.3 (the Worker's pages in the site's look): src/worker/pages.js (page(), already moved by § 3) and
// src/worker/redeem.js (the saved offer's one action) again, and src/worker/page-style.json (new: the derived stylesheet).
// Since § 10.7 (no offer after the last one's valid_to): src/worker/index.js (offer_ended), src/worker/offers.js (at most
// one current general offer, null after the last), src/worker/send-due.js (E1 after the end), and messages.js, redeem.js
// and data/offers.json again. Since § 10.9 (a save held through its E1's day; the wording): src/worker/confirm.js (its
// token held as long, "weekly"), and offers.js, send-due.js, messages.js and redeem.js again. Since SPEC-ui-and-copy-pass
// § 1.2 item 3 (a save after the last offer's end kept with no offer, nothing due, 30 days): src/worker/lapse.js (its rule),
// src/worker/save-store.js (no message state when nothing is due), src/worker/scheduled.js (its cut-off), and index.js
// and data/save.json again. (SPEC-ui-and-copy-pass § 2 item 5's data/plans.json, its read_on, is not here: the base takes
// § 2's diff, sp-production.mjs LATER, so the two files are alike.)
const MOVED_WORKER_FILES = [
  "data/delivery-zips.json",
  "data/events.json",
  "data/offers.json",
  "data/save.json",
  "src/worker/choose-sender.js",
  "src/worker/confirm.js",
  "src/worker/index.js",
  "src/worker/lapse.js",
  "src/worker/messages.js",
  "src/worker/offers.js",
  // SPEC-analytics.md § 16 item 1 (2026-10-27): the offer page's copy of the analytics script (new, derived), which the
  // Worker reaches only through pages.js (named here since § 3); the base's pages.js imports no such file.
  "src/worker/page-script.json",
  "src/worker/page-style.json",
  "src/worker/pages.js",
  "src/worker/redeem.js",
  "src/worker/save-store.js",
  "src/worker/scheduled.js",
  "src/worker/send-due.js",
  "src/worker/site.js",
  "src/worker/zip-class.js",
];

/** § 9 item 2's change to a page's analytics script, applied to the base's page: qrEvent's declaration and QR_IDS at the
 *  script's head, the open reading qrEvent. The only difference SP3 allows the production page with production false. */
function withSection9Reading(html) {
  const ids = /\nvar QR_IDS = (\[[^\]\n]*\]);\n/.exec(html);
  assert.ok(ids, "control: the base page's analytics list");
  const head = '<script>\n(function () {\n"use strict";\nvar w = window, d = document, perf = w.performance, rnd = w.crypto;';
  assert.equal(html.split(head).length - 1, 1, "control: the analytics script's head, once");
  const fn = 'function qrEvent(search, ids) {\nvar m = /(?:^|[?&])e=([^&#]*)/.exec(search || "");\nreturn m && ids.indexOf(m[1]) >= 0 ? m[1] : "";\n}';
  const lines = [
    ['var x = w.innerWidth || 0, qr = /(?:^|[?&])e=([^&#]*)/.exec(w.location.search || "");', "var x = w.innerWidth || 0;"],
    ['qr: qr && QR_IDS.indexOf(qr[1]) >= 0 ? qr[1] : ""', "qr: qrEvent(w.location.search, QR_IDS)"],
  ];
  let out = html.replace(ids[0], "\n").replace(head, `<script>\n${fn}\nvar QR_IDS = ${ids[1]};\n${head.slice("<script>\n".length)}`);
  for (const [from, to] of lines) {
    assert.equal(out.split(from).length - 1, 1, `control: the base's line, once: ${from}`);
    out = out.replace(from, to);
  }
  return out;
}

async function hashesOf(dir, top = dir) {
  const out = {};
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(out, await hashesOf(path, top));
    else out[relative(top, path)] = createHash("sha256").update(await readFile(path)).digest("hex");
  }
  return out;
}

// SPEC-save-offer-production § 12: release (b) commits production true; every case below about production false builds
// with it false (productionFalseSavePath, or a mirror for the Worker, which reads the file at import): the rollback.
test("SP3: data/save.json's production is true since release (b) (control)", () => {
  assert.equal(saveConfig.production, true);
});

test("SP3 (S20): npm run build with production false is S20's golden, and the base tree's build (§ 9 item 2's reading apart), byte for byte", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "boston-sp3-"));
  try {
    const { build: baseBuild } = await import(pathToFileURL(join(base.pkg, "build.mjs")).href);
    await build({ target: "prod", outDir: join(dir, "now"), savePath: await productionFalseSavePath() });
    await baseBuild({ target: "prod", outDir: join(dir, "base") });
    const [{ sheets, rest: now }, { rest: before }] = [splitSheets(await hashesOf(join(dir, "now"))), splitSheets(await hashesOf(join(dir, "base")))];
    t.diagnostic(sheetsLine(sheets));
    assert.deepEqual(now, s20.files, "S20's golden (every file but the sheets)");
    assert.deepEqual(sheets, await committedSheets(), `the sheets: ${sheetsLine(sheets)}`);
    assert.deepEqual(Object.keys(now), Object.keys(before), `${BASE}'s files (but the sheets)`);
    for (const f of Object.keys(now).filter((f) => f !== "index.html")) assert.equal(now[f], before[f], `${f}: ${BASE}'s, byte for byte`);
    const [page, basePage] = [await readFile(join(dir, "now", "index.html"), "utf8"), await readFile(join(dir, "base", "index.html"), "utf8")];
    assert.notEqual(page, basePage, "control: the page moved");
    assert.equal(page, withSection9Reading(basePage), `index.html: ${BASE}'s with § 9 item 2's reading, and nothing else`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("SP3 (T5): the production page with production false has no script src and no fetch, as the base's", async () => {
  const html = await renderPage(await loadPlans());
  assertProductionT5(html, { production: false });
  const { renderPage: baseRender } = await import(pathToFileURL(join(base.pkg, "build.mjs")).href);
  const basePage = await baseRender(JSON.parse(await readFile(join(base.pkg, "data", "plans.json"), "utf8")));
  assert.equal(html, withSection9Reading(basePage), `${BASE}'s page, § 9 item 2's reading apart`);
});

const REQUESTS = [
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

/** SPEC-save-offer-production § 10.6 (the orchestrator's ruling, 2026-10-22): the `date` response header is the clock,
 *  not the Worker's behaviour (two Workers asked one after the other can straddle a second). Its VALUE is the one thing
 *  not compared; whether a response carries one is (measured: the Worker's own /week/ responses carry none, every other
 *  response here does, and the case below holds that list). Every other header, the status and the body, byte for byte. */
const CLOCK_HEADER = "date";
/** The requests whose responses carry no `date` (the sheets the Worker answers itself from the bucket). */
const WITHOUT_DATE = ["GET /week/chefs-choice-2026-10-18.jpg", "GET /week/nothing-here.jpg"];
function assertSameResponse(a, b, where) {
  assert.equal(a.status, b.status, `${where}: status`);
  assert.equal(CLOCK_HEADER in a.headers, CLOCK_HEADER in b.headers, `${where}: a ${CLOCK_HEADER} header on both responses or neither`);
  const { [CLOCK_HEADER]: _a, ...aHeaders } = a.headers;
  const { [CLOCK_HEADER]: _b, ...bHeaders } = b.headers;
  assert.deepEqual(aHeaders, bHeaders, `${where}: headers`);
  assert.ok(a.body.equals(b.body), `${where}: body`);
}

test("SP3 (§ 10.6, control): responses differing only in their date are the same; in any other header, or without a date, they are not", () => {
  const response = (headers) => ({ status: 200, headers: { "content-type": "font/woff2", date: "Thu, 22 Oct 2026 19:36:08 GMT", ...headers }, body: Buffer.from("font") });
  assertSameResponse(response({}), response({ date: "Thu, 22 Oct 2026 19:36:09 GMT" }), "a second apart");
  assert.throws(() => assertSameResponse(response({}), response({ "cache-control": "no-store" }), "control"), /control: headers/, "another header differing still fails");
  assert.throws(() => assertSameResponse(response({}), response({ "content-type": "text/html" }), "control"), /control: headers/);
  const { date, ...withoutDate } = response({}).headers;
  assert.throws(() => assertSameResponse(response({}), { ...response({}), headers: withoutDate }, "control"), /a date header on both responses or neither/, "a date on one side only fails");
});

test("SP3 (§ 4 item 1): the production Worker answers every request as the base's, byte for byte, and has no scheduled handler", async () => {
  const page = "<!doctype html><title>p</title><script type=\"application/json\" id=\"picks-data\">{\"weeks\":[]}</script>";
  const week = JSON.stringify({ weeks: [{ carts: {} }] });
  const assets = { "/": pageAsset(page), "/fonts/poppins-latin-700-normal.woff2": { status: 200, headers: { "content-type": "font/woff2" }, body: "font" } };
  const objects = { [WEEK_DATA_KEY]: week, "week/chefs-choice-2026-10-18.jpg": "jpeg bytes" };
  const falseRoot = await productionFalseMirror();
  const now = await startSite({ root: falseRoot, entry: "site", assets, objects });
  const before = await startSite({ root: base.pkg, entry: "site", assets, objects });
  try {
    for (const [method, path, body] of REQUESTS) {
      const init = { method, ...(body ? { body, headers: { "content-type": "application/json" } } : {}) };
      const [a, b] = [await now.get(path, init), await before.get(path, init)];
      assertSameResponse(a, b, `${method} ${path}`);
      const dated = CLOCK_HEADER in a.headers;
      assert.equal(dated, !WITHOUT_DATE.includes(`${method} ${path}`), `${method} ${path}: ${dated ? "carries" : "carries no"} ${CLOCK_HEADER} header, as measured`);
    }
    assert.deepEqual(now.assetRequests, before.assetRequests, "the same requests of the assets");
  } finally {
    await now.dispose();
    await before.dispose();
  }
  const worker = (await import(pathToFileURL(join(falseRoot, "src", "worker", "site.js")).href)).default;
  await rm(falseRoot, { recursive: true, force: true });
  assert.deepEqual(Object.keys(worker), ["fetch"], "production false: fetch only, no scheduled handler");
});

test("SP3 (CC-8b): the development Worker's files are the base's but for the files this contract names", async () => {
  const now = await workerFiles();
  const before = await workerFiles(join(base.pkg, "src", "worker", "index.js"));
  // workerFiles names a file by its path from this package; the base's, from the base package.
  const b = Object.fromEntries(Object.entries(before).map(([k, v]) => [relative(base.pkg, resolve(ROOT, k)), v]));
  const a = now;
  const moved = Object.keys({ ...a, ...b }).filter((k) => a[k] !== b[k]).sort();
  assert.deepEqual(moved, MOVED_WORKER_FILES, "only these files differ (SPEC § 8)");
});
