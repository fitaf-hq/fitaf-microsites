// The development page: DRAFT §§ 1–2 as written, marked DRAFT, no menu link; the dev T5 (only Turnstile
// and one same-origin POST); Flow 1's states in the page; one page per event.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import events from "../data/events.json" with { type: "json" };
import saveConfig from "../data/save.json" with { type: "json" };
import { build, renderPage, ROOT, TURNSTILE_SCRIPT_URL } from "../build.mjs";
import { offerForSave } from "../src/worker/offers.js";
import { zonedDate } from "../src/worker/zoned-time.js";
import { isSameOrigin, loadedUrls, loadPlans } from "./helpers.mjs";
import { devPage } from "./dev-page.mjs";
import { simulatePage } from "./page-sim.mjs";

const devHtml = await devPage();
const prodHtml = await renderPage(await loadPlans());

const squash = (s) => s.replace(/\s+/g, " ").trim();
const visibleText = (html) =>
  squash(
    html
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ")
      .replace(/<\/?(strong|em|b|small|span)\b[^>]*>/g, "") // inline: no word break
      .replace(/<[^>]+>/g, " ") // block: a word break
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'"),
  );

/** One section of DRAFT.md's blockquotes, as paragraphs of plain text (emphasis, headings and ☐ removed). */
async function draftParagraphs(from, to) {
  const md = await readFile(join(ROOT, "consent", "DRAFT.md"), "utf8");
  const section = md.split(from)[1].split(to)[0];
  return section
    .split(/\n>\s*\n/)
    .map((p) => p.split("\n").filter((l) => l.startsWith(">")).map((l) => l.replace(/^>\s?/, "")).join(" "))
    .map((p) => squash(p.replace(/^#+\s*/, "").replace(/\*+/g, "").replace(/☐\s*/g, "").replace(/\[ (.+) \]/, "$1")))
    .filter(Boolean);
}

/** Where the page's layout breaks a draft paragraph: the heading from the offer, each field's label from its help. */
function pieces(paragraph) {
  return paragraph
    .split(/(?<=Your Boston offer) | (?=Delivery ZIP code — )/)
    .flatMap((part) => (/^(Email|Delivery ZIP code) — /.test(part) ? part.split(" — ") : [part]));
}

/** DRAFT § 1's bracketed offer line is the Owner's placeholder; on the page it is the slot SPEC-rung4 § 2a fills. */
const isOfferLine = (piece) => /^\[The offer\b/.test(piece);

test("S18: every paragraph of DRAFT §§ 1–2 appears on the dev page as written; the offer line is the slot", async () => {
  const text = visibleText(devHtml);
  const one = await draftParagraphs("## 1. What the visitor sees", "## 2.");
  const two = await draftParagraphs("## 2. Out of area", "## 3.");
  assert.equal(one.length, 6, "§ 1's blockquote has 6 paragraphs");
  assert.equal(two.length, 3, "§ 2's blockquote has 3 paragraphs");
  const all = [...one, ...two].flatMap(pieces);
  assert.equal(all.length, 13, "9 paragraphs -> 2 + 1 + 4 + 1 + 1 + 1 + 3 = 13 pieces");
  assert.deepEqual(all.map(isOfferLine), [false, true, ...Array(11).fill(false)], "one piece is the offer line: the second, under the heading");
  for (const piece of all.filter((p) => !isOfferLine(p))) assert.ok(text.includes(piece), `missing from the page: ${piece}`);
  assert.ok(text.includes("Build my plan →"), "the skip link below the form (DRAFT § 1)");

  // The offer line (§ 2a): a slot under the heading, filled in the browser with offers.json's own label.
  assert.ok(!text.includes(all[1]), "the draft's literal offer line is not on the page");
  assert.match(devHtml, /<h2 id="save-title">Your Boston offer<\/h2>\s*<p class="save-offer"><strong id="save-offer-label"><\/strong><\/p>/);
  const now = Date.now();
  const label = offerForSave(zonedDate(now, saveConfig.send_time_zone)).label;
  assert.equal(simulatePage(devHtml, { now }).el("save-offer-label").textContent, label, "offers.json's own label (`[The offer]` today)");
});

test("S18: marked `DRAFT — not for use · wording v0.3-draft`; the production page carries none of it", () => {
  assert.equal(saveConfig.wording_version, "v0.3-draft");
  assert.match(devHtml, /<div class="draft-banner" role="note"><strong>DRAFT — not for use\.<\/strong>/);
  assert.ok(visibleText(devHtml).includes("DRAFT — not for use · wording v0.3-draft"));
  assert.ok(!prodHtml.includes("DRAFT"));
  assert.ok(!prodHtml.includes("/api/save") && !prodHtml.includes("save-data"));
});

test("S18: no menu link — no menu input exists; given one, the link appears", async () => {
  assert.doesNotMatch(devHtml, /this week(&#39;|')s menu/i);
  assert.doesNotMatch(devHtml, /id="save-skip-menu"/);
  const withMenu = await devPage({ menu: true });
  assert.match(withMenu, /id="save-skip-menu">See this week&#39;s menu →</, "control: the switch works");
});

test("S18: the marketing box is not pre-ticked and not required; no input can be submitted by the browser", () => {
  const boxes = [...devHtml.matchAll(/<input\b[^>]*type="checkbox"[^>]*>/g)].map((m) => m[0]);
  assert.equal(boxes.length, 1);
  assert.doesNotMatch(boxes[0], /\bchecked\b|\brequired\b/);
  const inputs = [...devHtml.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]);
  assert.ok(inputs.length >= 5);
  for (const i of inputs) assert.doesNotMatch(i, /\bname=/, `no name attribute, so a native submit carries nothing: ${i}`);
});

test("S18 (dev T5): the only external script is Turnstile; the only fetch is the save endpoint; same origin", () => {
  const srcs = [...devHtml.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(srcs, [TURNSTILE_SCRIPT_URL]);
  const fetches = [...devHtml.matchAll(/\bfetch\s*\(([^,]+),/g)].map((m) => m[1]);
  assert.deepEqual(fetches, ["cfg.api"]);
  assert.match(devHtml, /"api":"\/api\/save"/);
  assert.doesNotMatch(devHtml, /<link\b|XMLHttpRequest|sendBeacon|@import|<iframe\b|localStorage|sessionStorage|document\.cookie/i);
  for (const url of loadedUrls(devHtml)) assert.ok(isSameOrigin(url), `same-origin only, got ${url}`);
  assert.ok(Buffer.byteLength(devHtml) < 60 * 1024, "under the 60 KB budget");
});

test("S18: Flow 1's states in the page — OFFER, ERROR keeps what was typed, SAVED; #from-email opens at Flow 2", async () => {
  const page = simulatePage(devHtml);
  assert.deepEqual(page.missing(["save-skip-menu"]), [], "every id the scripts use exists in the page");
  assert.equal(page.el("save-open").hidden, false, "OFFER: the offer and the form");
  assert.equal(page.el("save-collapsed").hidden, true);

  page.type("save-email", "dummy-s18@example.com");
  page.type("save-zip", "0211");
  page.el("save-form").dispatch("submit");
  assert.equal(page.el("save-error").hidden, false, "ERROR(zip_invalid)");
  assert.equal(page.el("save-error").textContent, "Enter a five-digit ZIP code.");
  assert.equal(page.el("save-email").value, "dummy-s18@example.com", "what was typed is kept");
  assert.equal(page.record.fetches.length, 0);

  page.type("save-zip", "02118");
  assert.equal(page.el("save-error").hidden, true, "editing leaves ERROR");
  page.el("save-form").dispatch("submit");
  await page.settle();
  assert.equal(page.record.fetches.length, 1);
  assert.equal(page.record.fetches[0].url, "/api/save");
  assert.equal(page.el("save-done").hidden, false, "SAVED");
  assert.equal(visibleText(`<p>Saved — look for it tomorrow at <strong>${page.el("save-done-email").textContent}</strong></p>`), "Saved — look for it tomorrow at dummy-s18@example.com");
  assert.equal(page.el("save-skip-plan").hidden, false, "SAVED keeps the links");
  const body = JSON.parse(page.record.fetches[0].init.body);
  assert.deepEqual(body, {
    kind: "offer", email: "dummy-s18@example.com", zip: "02118", consent_marketing: false,
    event_id: events[0].id, wording_version: "v0.3-draft", turnstile_token: "XXXX.DUMMY.TOKEN.XXXX",
  });

  const skip = simulatePage(devHtml);
  skip.el("save-skip-plan").dispatch("click");
  assert.equal(skip.el("save-open").hidden, true, "PLAN: Flow 1 collapses");
  assert.equal(skip.el("save-collapsed").hidden, false, "to one line: Save my offer");
  skip.el("save-reopen").dispatch("click");
  assert.equal(skip.el("save-open").hidden, false, "and reopens");

  const fromEmail = simulatePage(devHtml, { hash: "#from-email" });
  assert.equal(fromEmail.el("save-open").hidden, true, "#from-email opens at Flow 2");
  assert.equal(fromEmail.el("save-collapsed").hidden, false);
  assert.match(devHtml, /id="save-reopen">Save my offer</);
});

test("S18: Flow 2 reframed — question 1 is Meal size, each size with its per-meal calories and protein", async () => {
  const plans = await loadPlans();
  assert.match(devHtml, /<span class="step-num" aria-hidden="true">1<\/span>Meal size<\/h2>/);
  assert.doesNotMatch(visibleText(devHtml), /What's your goal\?/);
  for (const p of plans.individual) {
    const button = new RegExp(`<button[^>]*data-goal="${p.id}"[^>]*>([\\s\\S]*?)</button>`).exec(devHtml)[1];
    assert.match(button, new RegExp(`<span class="choice-name">${p.name}</span>\\s*<span class="choice-line">Per meal</span>`), p.id);
    assert.ok(button.includes(`<span class="fact">${p.calories.min}–${p.calories.max} cal</span><span class="fact">${p.protein_g.min}–${p.protein_g.max} g protein</span>`), p.id);
    assert.ok(!devHtml.includes(p.promise), `no goal language: ${p.promise}`);
  }
  assert.match(devHtml, /data-goal="lean"/, "the fragment keys are unchanged (#lean-14)");
});

test("S18: the dev build writes /<event-id>/index.html per event, with its event id; / is the first event", async () => {
  const out = await mkdtemp(join(tmpdir(), "boston-dev-"));
  try {
    await build({ target: "dev", outDir: out });
    for (const e of events) {
      const html = await readFile(join(out, e.id, "index.html"), "utf8");
      assert.match(html, new RegExp(`"event_id":"${e.id}"`));
    }
    assert.equal(await readFile(join(out, "index.html"), "utf8"), await readFile(join(out, events[0].id, "index.html"), "utf8"));
    assert.equal(await readFile(join(out, "index.html"), "utf8"), devHtml, "what the tests read is what the build writes");
    await readFile(join(out, "fonts", "poppins-latin-700-normal.woff2"));
    assert.match(devHtml, /src="\/assets\/fitaf-logo\.png"/, "assets addressed from the root, so /<event-id>/ finds them");
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
