// W29 (SPEC-rung2-progress-and-checkout § 36 item 10), a pass rule: the struck prices on the surfaces the smoke reaches.
// The smoke's own init script writes sessionStorage fitaf_struck = "1" (⛔ never a UTM-tagged visit: the watch's visits
// must not count in the store's Google Analytics as ours), so the block treats the smoke as a visitor from eatfitaf.com.
// A recorder from before the page's scripts samples the page after every paint (an animation frame, then a task): every
// price the block strikes, read by THIS file's own selectors (the probe's names, storefront/probe-prices/2026-10-27/;
// not the block's code), and every s.fitaf-was. While the offer is current on the smoke's own date in New York
// (data/offers.json), each price shows its struck figure exactly once, right before it, equal to item 3's rule (price x
// 100 / (100 - the share), to the cent); outside it, none. A fault counts only when two samples in a row show it (the
// block corrects the page once per frame). The smoke reaches, on the link's page, the order page's meals (b) and the cart
// summary (c) as the hand-off fills the plan, under the progress screen; and the deep-carted checkout's Plan Total (d),
// which H15 hides, so its figure is in the page and not displayed. The meal plans page (a) is never visited.
// A block from before § 36 carries no struck prices: W29 is then a report ("no struck prices in this block"), never a
// failure, so the hourly smoke of the live block is unchanged until the paste.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE_DIR } from "./config.mjs";

export const STRUCK_KEY = "fitaf_struck";
/** The surfaces, by the store's names: [name, selector]; the order page's meals are read in a section headed for meals. */
export const STRUCK_SURFACES = [
  ["the meal plans page", ".meal-plan__fit-af-price>strong"],
  ["the order page's meals", null],
  ["the cart summary", "app-cart .segment-price,.mobile-cart-summary__stat-value"],
  ["the checkout's Plan Total", ".summary__plan-total-value"],
];
export const MEAL_PRICES = ".product__content-price,.product-card-mobile__price";
export const MEAL_SECTION = { section: ".products__section", title: ".products__section-title", names: "\\bmeals\\b" };
/** A block's text that carries the struck prices names its mark. */
export const carriesStruck = (text) => typeof text === "string" && text.includes(STRUCK_KEY);

/** The offer's share on `date` (YYYY-MM-DD in New York) from data/offers.json's general offers, else 0. */
export function offerOn(date, offers = JSON.parse(readFileSync(join(SITE_DIR, "data", "offers.json"), "utf8"))) {
  const o = (offers.offers ?? []).find((x) => x.applies_to === "general" && x.percent_off && x.valid_from <= date && date <= x.valid_to);
  return o ? o.percent_off : 0;
}
export const newYorkDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);

/** In the page, from before its scripts: the mark, and the recorder (window.__fitafStruck29). Reads; changes nothing. */
export function recordStruck({ key, share, surfaces, meals, section }) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {}
  const R = (window.__fitafStruck29 = { samples: 0, judged: 0, seenWas: 0, pricedSeen: false, blockSeen: false, surfaces: {}, faults: [], prev: new Set() });
  new MutationObserver((ms) => {
    if (R.blockSeen) return;
    for (const m of ms) for (const n of m.addedNodes) if (n.nodeName === "SCRIPT" && (n.textContent || "").includes(key)) R.blockSeen = true;
  }).observe(document, { childList: true, subtree: true });
  const figure = (t) => {
    const m = /^\$(\d{1,3}(?:,\d{3})+|\d+)\.(\d\d)$/.exec(t);
    if (!m) return null;
    const c0 = Number(m[1].replace(/,/g, "")) * 100 + Number(m[2]);
    if (!c0) return null;
    const c = Math.round((c0 * 100) / (100 - share));
    return `$${String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+$)/g, ",")}.${String(c % 100).padStart(2, "0")}`;
  };
  const norm = (e) => e.textContent.replace(/\s+/g, " ").trim();
  const targets = () => {
    const out = [];
    for (const [name, sel] of surfaces) {
      let list = sel ? [...document.querySelectorAll(sel)] : [];
      if (!sel) for (const s of document.querySelectorAll(section.section)) if (new RegExp(section.names, "i").test(norm(s.querySelector(section.title) ?? s).slice(0, 80))) list = list.concat([...s.querySelectorAll(meals)]);
      for (const p of list) out.push([name, p]);
    }
    return out;
  };
  const sample = () => {
    R.samples++;
    const was = [...document.querySelectorAll(".fitaf-was")];
    R.seenWas = Math.max(R.seenWas, was.length);
    const all = targets();
    if (all.some(([, p]) => figure(norm(p)))) R.pricedSeen = true;
    if (share && !was.length) return; // before the block runs (a paste comes after the cards), nothing is judged
    R.judged++;
    const faults = new Set();
    const priced = new Set();
    const shownNow = {};
    for (const [name, p] of all) {
      {
        const want = share ? figure(norm(p)) : null;
        const prev = p.previousElementSibling;
        const beside = [...p.parentNode.children].filter((c) => c.matches(".fitaf-was"));
        if (!want) {
          if (beside.length && prev && prev.matches(".fitaf-was")) faults.add(`${name}: "${norm(p)}" struck as ${prev.textContent} (expected none)`);
          continue;
        }
        R.surfaces[name] ??= { prices: 1, displayed: 0 };
        if (p.getClientRects().length) shownNow[name] = 1;
        else shownNow[name] ??= 0;
        priced.add(p);
        if (!prev || !prev.matches(".fitaf-was")) faults.add(`${name}: "${norm(p)}" has no struck figure before it`);
        else if (prev.textContent !== want) faults.add(`${name}: "${norm(p)}" struck as ${prev.textContent}, not ${want}`);
        if (beside.length > 1) faults.add(`${name}: "${norm(p)}" has ${beside.length} struck figures beside it`);
      }
    }
    // A surface's "displayed" is as the latest sample that held it found it (the Plan Total is drawn, then hidden by H15).
    for (const name of Object.keys(shownNow)) R.surfaces[name].displayed = shownNow[name];
    for (const w of was) if (!(w.nextElementSibling && priced.has(w.nextElementSibling))) faults.add(`a struck figure ${w.textContent} beside no price it strikes (${w.nextElementSibling?.className || "nothing"})`);
    for (const f of faults) if (R.prev.has(f) && !R.faults.includes(f) && R.faults.length < 10) R.faults.push(f);
    R.prev = faults;
  };
  const tick = () => {
    setTimeout(sample, 0);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** In the page: the recorder's result (the set of the last sample's faults left out). */
export function readStruck() {
  const R = window.__fitafStruck29;
  return R ? { samples: R.samples, judged: R.judged, seenWas: R.seenWas, pricedSeen: R.pricedSeen, blockSeen: R.blockSeen, surfaces: R.surfaces, faults: R.faults } : null;
}

/**
 * W29's rule on a run's record `r` (readStruck's, kept per page the smoke read), the block carrying the struck prices or
 * not (`carries`), and the share on the smoke's date (0: no offer). Not judged for a block without them.
 */
export function struckVerdict(r, { carries, share }) {
  if (!carries) return { reasons: [] };
  if (!r) return { reasons: ["W29: the struck prices were not recorded"] };
  if (!share) return { reasons: r.seenWas ? [`W29: ${r.seenWas} struck figures shown with no offer current`] : [] };
  const reasons = r.faults.map((f) => `W29: ${f}`);
  if (!r.seenWas && r.pricedSeen) reasons.push("W29: no struck figure on any priced surface the smoke reached, the offer current");
  return { reasons };
}

/** W29's line for the report. */
export function struckLine(r, { carries, share, date }) {
  const head = "W29: the struck prices (fitaf_struck set by the smoke's init script): ";
  if (!carries) return `${head}no struck prices in this block (from before § 36)`;
  if (!r) return `${head}not recorded`;
  const offer = share ? `the offer current on ${date} in New York, ${share}%` : `no offer current on ${date} in New York`;
  const surfaces = Object.entries(r.surfaces)
    .map(([name, s]) => `${name} ${s.displayed ? "displayed" : "in the page, not displayed"}`)
    .join("; ");
  const faults = r.faults.length ? `; FAULTS: ${r.faults.join(" | ")}` : "; each price struck once, item 3's figure";
  if (share && !r.pricedSeen) return `${head}${offer}; no priced surface reached (none of the four's price elements in the page)`;
  return `${head}${offer}; ${r.judged} of ${r.samples} samples judged; at most ${r.seenWas} struck figures; ${surfaces || "no priced surface"}${share ? faults : r.seenWas ? "; STRUCK with no offer" : "; none, as expected"}`;
}
