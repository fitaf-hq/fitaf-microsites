// W17 (SPEC-rung2-progress-and-checkout § 17.4, live): given the microsite's own checkout link (`--link`), the smoke runs
// THAT link (its meals, its plan, its photo part) instead of one it builds from the menu, and reports, per slide of the
// progress screen, whether it showed Fit AF's sheet: shown (the sheet's img, on a host of the block's fixed list,
// loaded), failed (asked for, and the browser reported an error: the slide fell back to today's rule), asked (asked
// for, neither seen), or not found (no sheet on that slide). A report, not a pass rule (§ 18).
// W17a: the line, on recorded outcomes, and how a link becomes the smoke's choice (its mpid and its meals by name, read
// against the menu with the site's own key function), no browser.
import test from "node:test";
import assert from "node:assert/strict";
import * as faces from "../lib/faces.mjs";
import * as smoke from "../lib/smoke.mjs";
import { siteCode } from "../lib/site-code.mjs";

const run = (events) => ({ done: true, screenAtEnd: false, events: [{ e: "screen+" }, ...events, { e: "screen-" }] });
const slide = (name, src = "https://eatfitaf.com/assets/photo-sheets/s.jpg") => ({ e: "slide", name, src });

test("W17a: per slide — shown, failed, asked or not found; the line counts the shown", () => {
  assert.equal(typeof faces.sheetLine, "function", "lib/faces.mjs has W17's line");
  const f = run([
    slide("Meal A"),
    { e: "sheet", name: "Meal A", ok: true },
    slide("Meal B"),
    { e: "sheet", name: "Meal B", ok: false },
    slide("Meal C"),
    slide("Meal D", null),
  ]);
  assert.equal(faces.sheetLine(f), "W17: Fit AF's sheet on 1 of 4 slides: Meal A shown; Meal B failed; Meal C asked; Meal D not found");
  assert.equal(faces.sheetLine(run([])), "W17: no slide seen");
  assert.equal(faces.sheetLine(null), "W17: not recorded");
});

test("W17a: --link — the smoke's choice is the link's own plan and meals (by name from the menu, each as many times as the link says)", async () => {
  assert.equal(typeof smoke.linkChoice, "function", "lib/smoke.mjs reads a given link");
  const code = await siteCode();
  const menu = [
    { name: "Meal One", priceCents: 1250 },
    { name: "Meal Two", priceCents: 1250 },
    { name: "Meal Three", priceCents: 1300 },
  ];
  const payload = code.payloadFromArgs(["--mpid", "21", "--item", "Meal One:5", "--item", "Meal Three:2"], code.counts);
  const href = `${code.handoffLink(code.plans, payload)}!0!/assets/photo-sheets/s.jpg!5s!g,g,4w,4w!`;
  const choice = smoke.linkChoice(href, menu, code);
  assert.equal(choice.mpid, 21);
  assert.deepEqual(choice.chosen.map((c) => c.name), [...Array(5).fill("Meal One"), "Meal Three", "Meal Three"]);
  assert.deepEqual(choice.chosen.map((c) => c.priceCents), [...Array(5).fill(1250), 1300, 1300]);
  assert.equal(choice.path, new URL(href).pathname + new URL(href).search + new URL(href).hash, "the link's own path, query and fragment, photo part included");
  assert.throws(() => smoke.linkChoice(href, menu.slice(0, 1), code), /not on the menu/);
  assert.throws(() => smoke.linkChoice("https://fitafnutrition.com/order?mpid=21", menu, code), /#fitaf=/);
});

// ── W17b: the smoke with --link, in Chrome, on the synthetic store ───────────────────────────────────────────────────
// The link carries a photo part on host code 0 (https://eatfitaf.com), whose sheet the browser never fetches from the
// network: the link's page intercepts every request, serving a generated sheet (a flat SVG, never a photograph) for the
// listed host, letting the synthetic store's own through, and refusing anything else. Six of the seven meals have a cell.

import { after, before } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromePath } from "../lib/browser.mjs";
import { renderSmokeReport } from "../lib/report.mjs";
import { MEALS, startStore } from "./browser-store.mjs";

const chrome = (() => {
  try {
    return chromePath();
  } catch {
    return null;
  }
})();
const skip = chrome ? false : "no Chrome found (set CHROME_PATH)";
const CELL = 40;
const SHEET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${CELL * 7}"><rect width="${CELL}" height="${CELL * 7}" fill="#e67e22"/></svg>`;

let store;
let code;
let text;
before(async () => {
  if (skip) return;
  store = await startStore();
  code = await siteCode();
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-w17-"));
  try {
    await code.buildStorefront({ outDir: dir });
    text = await readFile(join(dir, "fitaf-handoff.fill-B.console.js"), "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
after(async () => {
  await store?.close();
});

test("W17b: --link with a photo part — each slide's sheet reported (six shown, the meal without a cell not found); the width passes", { skip, timeout: 120_000 }, async () => {
  store.set({});
  const meals = MEALS.slice(0, 7);
  const cells = Object.fromEntries(meals.slice(0, 6).map((name, i) => [name, { x: 0, y: CELL * i, w: CELL, h: CELL }]));
  const manifest = { base: "assets/photo-sheets/", chefs_choice: { "2026-10-04": { file: "w17.svg", width: CELL, height: CELL * 7, cells } } };
  const args = ["--mpid", "21", ...meals.flatMap((n) => ["--item", `${n}:1`]), "--photos", "2026-10-04", "--host", "0"];
  const link = code.handoffLink(code.plans, code.payloadFromArgs(args, code.counts, manifest));
  assert.match(link, /!0!\/assets\/photo-sheets\/w17\.svg!/, "fixture control: the link carries the photo part");
  const sheets = [];
  const onPage = async (page) => {
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      if (r.url().startsWith("https://eatfitaf.com/")) {
        sheets.push(r.url());
        return r.respond({ status: 200, contentType: "image/svg+xml", body: SHEET_SVG });
      }
      return r.url().startsWith(store.origin) ? r.continue() : r.abort();
    });
  };
  const { verdict, outcome } = await smoke.smokeRun({
    origin: store.origin,
    width: 1280,
    mode: { kind: "paste", text, label: "fill B, pasted" },
    code,
    executablePath: chrome,
    link,
    onPage,
  });
  assert.deepEqual(verdict, { pass: true, reasons: [] }, verdict.reasons.join("; "));
  assert.ok(sheets.length >= 1 && sheets.every((u) => u === "https://eatfitaf.com/assets/photo-sheets/w17.svg"), `the sheet asked for: ${sheets}`);
  const line = faces.sheetLine(outcome.faces);
  assert.match(line, /^W17: Fit AF's sheet on 6 of 7 slides: /, line);
  assert.match(line, new RegExp(`${meals[6]} not found$`), line);
  const report = renderSmokeReport({ flag: false, script: "fill B", runs: [{ width: 1280, verdict, outcome }] }, "t");
  assert.ok(report.includes(line), "the report carries the W17 line");
});
