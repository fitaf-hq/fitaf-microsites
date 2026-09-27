// The development page (rung 3): the wording is DRAFT.md § 1 as written, it is marked DRAFT, and its
// only departures from rung 1's T5 are the Turnstile script and one fetch to the claim endpoint.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { claimSlots, renderPage, ROOT, TURNSTILE_SCRIPT_URL } from "../build.mjs";
import { loadPlans } from "./helpers.mjs";

const claim = JSON.parse(await readFile(join(ROOT, "data", "claim.json"), "utf8"));
const devHtml = await renderPage(await loadPlans(), await claimSlots(claim, "1x00000000000000000000BB"));
const prodHtml = await renderPage(await loadPlans());

const squash = (s) => s.replace(/\s+/g, " ").trim();
const visibleText = (html) =>
  squash(
    html
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ")
      .replace(/<\/?(strong|em|b|small|span)\b[^>]*>/g, "") // inline: no word break
      .replace(/<[^>]+>/g, " ") // block: a word break
      .replace(/&amp;/g, "&"),
  );

/** DRAFT.md § 1's blockquote, as paragraphs of plain text (markdown emphasis and ☐ removed). */
async function draftParagraphs() {
  const md = await readFile(join(ROOT, "consent", "DRAFT.md"), "utf8");
  const section = md.split("## 1. What the visitor sees")[1].split("## 2.")[0];
  return section
    .split(/\n>\s*\n/)
    .map((p) => p.split("\n").filter((l) => l.startsWith(">")).map((l) => l.replace(/^>\s?/, "")).join(" "))
    .map((p) => squash(p.replace(/^#+\s*/, "").replace(/\*+/g, "").replace(/☐\s*/g, "").replace(/\[ (.+) \]/, "$1")))
    .filter(Boolean);
}

/**
 * Where the page's layout breaks a draft paragraph: the heading from the offer line, and each field's
 * label from its help text (the draft joins those with " — "). Every other paragraph is compared whole.
 */
function pieces(paragraph) {
  return paragraph
    .split(/(?<=Claim your Boston offer) | (?=(?:Email|Mobile number|Delivery ZIP code) — |\(one is enough\))/)
    .flatMap((part) => (/^(Email|Mobile number|Delivery ZIP code) — /.test(part) ? part.split(" — ") : [part]));
}

test("R3-page: every paragraph of DRAFT.md § 1 appears on the dev page as written", async () => {
  const text = visibleText(devHtml);
  const paragraphs = await draftParagraphs();
  assert.equal(paragraphs.length, 7, "the draft's § 1 blockquote has 7 paragraphs");
  const all = paragraphs.flatMap(pieces);
  assert.equal(all.length, 15, "7 paragraphs -> 2 + 8 + 5 = 15 pieces");
  for (const piece of all) assert.ok(text.includes(piece), `missing from the page: ${piece}`);
});

test("R3-page: the dev page says DRAFT — not for use, visibly, with the wording version", () => {
  assert.match(devHtml, /<div class="draft-banner" role="note"><strong>DRAFT — not for use\.<\/strong>/);
  assert.ok(visibleText(devHtml).includes("DRAFT — not for use · wording v0.2-draft"));
  assert.ok(!prodHtml.includes("DRAFT"), "the production page carries no claim section at all");
  assert.ok(!prodHtml.includes("/api/claim"));
});

test("R3-page: the only external script is Turnstile, and the only fetch is the claim endpoint", () => {
  const srcs = [...devHtml.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(srcs, [TURNSTILE_SCRIPT_URL]);
  const fetches = [...devHtml.matchAll(/\bfetch\s*\(([^,]+),/g)].map((m) => m[1]);
  assert.deepEqual(fetches, ["cfg.api"]);
  assert.match(devHtml, /"api":"\/api\/claim"/);
  assert.doesNotMatch(devHtml, /<link\b|XMLHttpRequest|sendBeacon|@import|<img\b|<iframe\b/i);
  assert.ok(Buffer.byteLength(devHtml) < 60 * 1024, "still under the 60 KB budget");
});
