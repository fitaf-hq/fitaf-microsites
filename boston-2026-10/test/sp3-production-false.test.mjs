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
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import saveConfig from "../data/save.json" with { type: "json" };
import { build, renderPage, ROOT } from "../build.mjs";
import { workerFiles } from "./cc-harness.mjs";
import { loadPlans } from "./helpers.mjs";
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
const MOVED_WORKER_FILES = [
  "data/delivery-zips.json",
  "data/events.json",
  "data/offers.json",
  "data/save.json",
  "src/worker/choose-sender.js",
  "src/worker/messages.js",
  "src/worker/pages.js",
  "src/worker/redeem.js",
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

test("SP3: data/save.json's production is false (control)", () => {
  assert.equal(saveConfig.production, false);
});

test("SP3 (S20): npm run build with production false is S20's golden, and the base tree's build (§ 9 item 2's reading apart), byte for byte", async () => {
  const dir = await mkdtemp(join(tmpdir(), "boston-sp3-"));
  try {
    const { build: baseBuild } = await import(pathToFileURL(join(base.pkg, "build.mjs")).href);
    await build({ target: "prod", outDir: join(dir, "now") });
    await baseBuild({ target: "prod", outDir: join(dir, "base") });
    const [now, before] = [await hashesOf(join(dir, "now")), await hashesOf(join(dir, "base"))];
    assert.deepEqual(now, s20.files, "S20's golden");
    assert.deepEqual(Object.keys(now), Object.keys(before), `${BASE}'s files`);
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

test("SP3 (§ 4 item 1): the production Worker answers every request as the base's, byte for byte, and has no scheduled handler", async () => {
  const page = "<!doctype html><title>p</title><script type=\"application/json\" id=\"picks-data\">{\"weeks\":[]}</script>";
  const week = JSON.stringify({ weeks: [{ carts: {} }] });
  const assets = { "/": pageAsset(page), "/fonts/poppins-latin-700-normal.woff2": { status: 200, headers: { "content-type": "font/woff2" }, body: "font" } };
  const objects = { [WEEK_DATA_KEY]: week, "week/chefs-choice-2026-10-18.jpg": "jpeg bytes" };
  const now = await startSite({ entry: "site", assets, objects });
  const before = await startSite({ root: base.pkg, entry: "site", assets, objects });
  try {
    for (const [method, path, body] of REQUESTS) {
      const init = { method, ...(body ? { body, headers: { "content-type": "application/json" } } : {}) };
      const [a, b] = [await now.get(path, init), await before.get(path, init)];
      assert.equal(a.status, b.status, `${method} ${path}: status`);
      assert.deepEqual(a.headers, b.headers, `${method} ${path}: headers`);
      assert.ok(a.body.equals(b.body), `${method} ${path}: body`);
    }
    assert.deepEqual(now.assetRequests, before.assetRequests, "the same requests of the assets");
  } finally {
    await now.dispose();
    await before.dispose();
  }
  const worker = (await import("../src/worker/site.js")).default;
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
