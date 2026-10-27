// SPEC-rung2-progress-and-checkout § 36 item 7, the probe of the store's prices: before the struck prices are written,
// read how the live store draws each price on the four surfaces the Advisor named (the meal plans page, a plan's order
// page and its cart summary, and /checkout), and whether the store's app keeps a landing query.
// One run, one width: a fresh profile, and an init script that (a) writes sessionStorage fitaf_struck = "1", the
// block's mark for a visitor from eatfitaf.com (§ 36 item 1), so the visit is a marked visitor's WITHOUT a UTM-tagged
// address (⛔ never a utm_ parameter: the watch's visits must not count in the store's Google Analytics as ours), and
// (b) notes location.search at the document's start and when the store injects its Footer (a <script> whose text names
// fitaf-handoff, the Footer block live today). Then:
//   1. `/?fitaf_probe=1` and `/meal-plans?fitaf_probe=1`: the landing query (§ 36 item 7: not a UTM), read at the start,
//      at the Footer's injection and once the app has settled (location.search, and the navigation entry's own query),
//      and every price element of each page;
//   2. `/order?mpid=N` (no fragment, so Fit AF's block does nothing): every price element; then the first `need` meals'
//      own Add to Cart pressed, one at a time, each once the last is counted (as probe-counts' `ack` runs), and every
//      price element again (the cart summary: the sidebar at 1025 px and wider, the bar below);
//   3. the store's own CHECKOUT (and its extras dialog's CONTINUE TO CHECKOUT, once, if the store opens it, as the block
//      does), then /checkout: every price element.
// A price element: an element one of whose own text nodes holds a "$" and a digit, or a leaf whose text does; for each,
// its tag, class list, text, box, displayed or not, its type (font size, weight, colour, decoration, white-space) and
// its parent's tag, class list, box and layout (display, flex direction, wrap), the path of classes above it, its card
// (title, buttons, Select Options) and its section of the order page (heading); and a skeleton of each container the
// struck figure may go in (tags, classes, boxes, layout).
// With `script` (the CLI's --script <file>: a console file, a Footer block .html, or a storefront/footer-block/ .md, as
// `smoke --script` takes a build), the probe is a REHEARSAL of the struck prices: any block of ours already on the page
// is held off (`__fitafHandoff`, `__fitafStruck` set before the page's scripts, as the smoke does) and the build is
// pasted into each document the probe visits, once its first price is drawn (the front page: once loaded): the front
// page, /meal-plans, /order?mpid=N (the cart and /checkout are the same document, routed in the app; a new document is
// pasted into again). Every read then records each s.fitaf-was: its text, aria-hidden, displayed, its box, the price
// element it sits before (tag, classes, text, box), item 3's figure for that price's text (`share`, data/offers.json on
// the probe's date in New York) and whether it is equal, and every displayed control of the store's whose box overlaps
// it. Without `script` nothing is pasted, and on a store whose own block carries no struck prices none is recorded.
// § 37 item 5 (the second batch): also the plan page with its size picker ("HOW MANY MEALS DELIVERED PER WEEK?"), reached
// from /meal-plans by the store's own link (the first plan card's Choose button), read as `planPage`; the cart filled as
// a visitor fills it with one meal several times (its Add to Cart, then its counter's "+": the plan's count less one)
// and one more meal, so a line shows its "N x $X"; after the store's CHECKOUT, its extras pop-up
// (app-extra-products-dialog) read as `extras` and NOTHING pressed in it: /checkout is then reached by loading its address,
// as a visitor may (a new document), and read; and the skeletons of the picker, the pop-up and the summary's parts.
// ⛔ It types NOTHING anywhere, presses nothing on /checkout, never the payment, never the admin, and presses on the
// order page only each chosen meal's Add to Cart, the store's CHECKOUT and the extras dialog's CONTINUE TO CHECKOUT.
// The profile is discarded. Not a check: nothing reads its files (storefront/probe-prices/).
import { createHash } from "node:crypto";
import { freshBrowser, poll, sleep } from "./browser.mjs";
import { LOG_PREFIX, VIEWPORTS } from "./config.mjs";
import { cutLine, redact } from "./redact.mjs";
import { scriptFromFile } from "./smoke.mjs";

/**
 * --script's build, from a file's text: a storefront/footer-block/*.md file's fenced fragment (refused unless it hashes to
 * the file's own fragment_sha256), else the file's text; then a Footer block's <script> tags taken off, as the smoke does.
 */
export function scriptOfFile(text) {
  const fenced = /\n````html\n([\s\S]*)````\n?$/.exec(text);
  if (fenced) {
    const want = /^fragment_sha256: ([0-9a-f]{64})$/m.exec(text)?.[1];
    const got = createHash("sha256").update(fenced[1], "utf8").digest("hex");
    if (want !== got) throw new Error(`--script: the block file's fragment hashes to ${got}, its front matter says ${want ?? "nothing"}`);
    return scriptFromFile(fenced[1]);
  }
  return scriptFromFile(text);
}

const NAV_MS = 60_000;
/** The cards' wait, as the smoke's menu read (lib/smoke.mjs). */
const MENU_MS = 45_000;
/** How long the app is given to settle after a page's first price, before it is read. */
export const SETTLE_MS = 3000;
/** A press's count: probe-counts' ACK_WINDOW_MS. */
const ACK_MS = 5000;
/** CHECKOUT enabled with the plan's count: the block's 50 polls of 200 ms. */
const CHECKOUT_READY_MS = 10_000;
/** After CHECKOUT (and after CONTINUE TO CHECKOUT): the block's 150 polls. */
const AFTER_CHECKOUT_MS = 30_000;
/** The landing query the probe carries (§ 36 item 7): not a UTM. */
export const PROBE_QUERY = "?fitaf_probe=1";
/** The block's mark (§ 36 item 1), written by the init script. */
export const MARK_KEY = "fitaf_struck";

/** By the store's own names, as the watch already reads them (probe-counts, the block). */
export const SELECTORS = Object.freeze({
  card: "app-product-card",
  cardTitle: ".product__content-title",
  cardActions: ".product__actions",
  addLabel: "Add to Cart",
  counterValue: ".counter__value",
  total: ".summary__total",
  planTotal: ".summary__plan-total",
});

/** Before the page's scripts: the mark, and the landing query at the start and at the Footer's injection. */
function initScript(markKey) {
  try {
    sessionStorage.setItem(markKey, "1");
  } catch {}
  const L = (window.__fitafLanding = { atStart: location.pathname + location.search, atFooter: null, footerSeenMs: null });
  const seen = (n) => n.nodeName === "SCRIPT" && /fitaf-handoff/.test(n.textContent || "");
  new MutationObserver((ms) => {
    if (L.atFooter !== null) return;
    for (const m of ms) {
      for (const n of m.addedNodes) {
        if (seen(n)) {
          L.atFooter = location.pathname + location.search;
          L.footerSeenMs = Math.round(performance.now());
          return;
        }
      }
    }
  }).observe(document, { childList: true, subtree: true });
}

/** In the page: every price element, and (§ 36) every struck figure with its price, read only. */
function readPrices(arg) {
  const share = arg?.share ?? 0;
  const PRICE = /\$\s?\d/;
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const shown = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const classes = (el) => [...el.classList];
  const name = (el) => el.tagName.toLowerCase() + [...el.classList].slice(0, 3).map((c) => `.${c}`).join("");
  const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
  // The price's card (a plan's, a meal's, a cart row's): its element, its title, and what its actions show; and the
  // order page's section it is in, by its heading. Names are the store's public ones, as any visitor reads them.
  const CARDS = "app-product-card,app-product-card-mobile,app-cart-product-card,article.meal-plan__fit-af-card";
  const cardOf = (el) => {
    const c = el.closest(CARDS);
    if (!c) return null;
    const t = c.querySelector(".product__content-title,.product-card-mobile__title,h1,h2,h3,h4,[class*=title]");
    const buttons = [...c.querySelectorAll("button")].map((b) => norm(b.textContent)).filter(Boolean);
    return { tag: c.tagName.toLowerCase(), classes: classes(c), title: t ? norm(t.textContent).slice(0, 120) : null, buttons: buttons.slice(0, 6), toggle: !!c.querySelector(".product__toggle") };
  };
  const sectionOf = (el) => {
    const sec = el.closest(".products__section");
    if (!sec) return null;
    const h = sec.querySelector("h1,h2,h3,h4,[class*=title],[class*=heading],[class*=header]");
    const all = [...document.querySelectorAll(".products__section")];
    return { index: all.indexOf(sec), classes: classes(sec), heading: h ? norm(h.textContent).slice(0, 120) : null, headingTag: h ? name(h) : null };
  };
  // A skeleton of each container the struck figure may go in: tags, classes, boxes, layout, and a leaf's text.
  const skeleton = (el, depth) => {
    const cs = getComputedStyle(el);
    const node = { el: name(el), box: box(el), display: cs.display, flex: cs.display.includes("flex") ? `${cs.flexDirection} ${cs.flexWrap} ${cs.justifyContent} ${cs.alignItems} gap ${cs.gap}` : undefined, position: cs.position !== "static" ? cs.position : undefined };
    if (!el.children.length) node.text = norm(el.textContent).slice(0, 80);
    else if (depth > 0) node.children = [...el.children].slice(0, 12).map((c) => skeleton(c, depth - 1));
    return node;
  };
  const SKELETONS = [".meal-plan__fit-af-card", ".products__section", "app-product-card .product__content", "app-product-card-mobile .product-card-mobile__body", "app-cart .cart__order-type", "app-cart-product-card", ".mobile-cart-summary__bar", ".summary__plan-total", ".summary__mobile-bar", "app-extra-products-dialog", ".summary__header", ".summary__item", ".summary__breakdown", ".summary__total", "app-cart"];
  const skeletons = {};
  for (const q of SKELETONS) {
    const shownOne = [...document.querySelectorAll(q)].find(shown) ?? document.querySelector(q);
    if (shownOne) skeletons[q] = skeleton(shownOne, q === ".products__section" ? 1 : q === "app-extra-products-dialog" || q === "app-cart" ? 7 : 5);
  }
  // § 37: the size picker, by its heading's words (its classes unknown until read): the heading's grandparent.
  const pickerHead = [...document.querySelectorAll("body *")].find((e) => !e.children.length && /meals delivered per week/i.test(e.textContent));
  if (pickerHead) skeletons.picker = skeleton(pickerHead.parentElement?.parentElement ?? pickerHead, 7);
  const sections = [...document.querySelectorAll(".products__section")].map((sec, index) => {
    const h = sec.querySelector("h1,h2,h3,h4,[class*=title],[class*=heading],[class*=header]");
    return { index, heading: h ? norm(h.textContent).slice(0, 120) : null, desktopCards: sec.querySelectorAll("app-product-card").length, mobileCards: sec.querySelectorAll("app-product-card-mobile").length };
  });
  const found = [];
  for (const el of document.querySelectorAll("body *")) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName) || el.closest("#fitaf-screen")) continue;
    const leaf = el.children.length === 0;
    if (!(PRICE.test(own(el)) || (leaf && PRICE.test(el.textContent)))) continue;
    const cs = getComputedStyle(el);
    const p = el.parentElement;
    const pcs = p && getComputedStyle(p);
    const path = [];
    for (let a = el.parentElement; a && a !== document.body && path.length < 8; a = a.parentElement) path.push(name(a));
    found.push({
      tag: el.tagName.toLowerCase(),
      classes: classes(el),
      text: norm(el.textContent),
      ownText: norm(own(el)),
      children: el.children.length,
      box: box(el),
      displayed: shown(el),
      type: { fontSize: cs.fontSize, fontWeight: cs.fontWeight, color: cs.color, decoration: cs.textDecorationLine, whiteSpace: cs.whiteSpace, display: cs.display },
      parent: p && {
        tag: p.tagName.toLowerCase(),
        classes: classes(p),
        text: norm(p.textContent).slice(0, 160),
        box: box(p),
        layout: { display: pcs.display, flexDirection: pcs.flexDirection, flexWrap: pcs.flexWrap, justifyContent: pcs.justifyContent, gap: pcs.gap },
      },
      path: path.join(" < "),
      card: cardOf(el),
      section: sectionOf(el),
    });
  }
  // § 36 item 3's figure for a price's text, written again here (not the block's code): "$87.50" -> "$116.67" at 25 %.
  // § 37: by the price's kind: "$X" or "$X/meal" item 3's rule; a unit price "N x $X" its $X's; a total (the summary's
  // header total, its Total) the total + (the struck Subtotal - the Subtotal), the same .summary's, else none.
  const cents = (t) => {
    const m = /^\$(\d{1,3}(?:,\d{3})+|\d+)\.(\d\d)(\/meal)?$/.exec(t);
    return m ? Number(m[1].replace(/,/g, "")) * 100 + Number(m[2]) : 0;
  };
  const up = (c) => Math.round((c * 100) / (100 - share));
  const money = (c) => `$${String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+$)/g, ",")}.${String(c % 100).padStart(2, "0")}`;
  const subOf = (root) => {
    const row = [...(root?.querySelectorAll(".summary__row") ?? [])].find((r) => r.firstElementChild && /^subtotal\b/i.test(norm(r.firstElementChild.textContent)));
    return row && row.lastElementChild !== row.firstElementChild ? row.lastElementChild : null;
  };
  const rule = (t, el) => {
    if (!share) return null;
    if (el?.matches(".summary__item-price-unit")) {
      const m = /^\d+ \u00d7 (\$\S+)$/.exec(t);
      return m && cents(m[1]) ? money(up(cents(m[1]))) : null;
    }
    if (el?.matches(".summary__total-preview,.summary__total-value")) {
      const sub = subOf(el.closest(".summary"));
      const b = sub && cents(norm(sub.textContent));
      return b && cents(t) ? money(cents(t) + up(b) - b) : null;
    }
    return cents(t) ? money(up(cents(t))) : null;
  };
  const CONTROLS = "button,a[href],input,select,textarea,iframe,[role=button],[role=switch],[role=radio]";
  const meet = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)) > 0.5;
  const controls = [...document.querySelectorAll(CONTROLS)].filter(shown);
  const struck = [...document.querySelectorAll("s.fitaf-was")].map((w) => {
    const p = w.nextElementSibling;
    const wb = box(w);
    const priceText = p ? norm(p.textContent) : null;
    const expected = p ? rule(priceText, p) : null;
    return {
      text: w.textContent,
      ariaHidden: w.getAttribute("aria-hidden"),
      displayed: shown(w),
      box: wb,
      fontSize: getComputedStyle(w).fontSize,
      price: p ? { tag: p.tagName.toLowerCase(), classes: classes(p), text: priceText, box: box(p), displayed: shown(p), fontSize: getComputedStyle(p).fontSize } : null,
      parent: name(w.parentElement),
      expected,
      equal: expected !== null && expected === w.textContent,
      overlaps: shown(w) ? controls.filter((c) => !c.contains(w) && meet(wb, box(c))).map((c) => `${name(c)} "${norm(c.textContent).slice(0, 40)}" ${JSON.stringify(box(c))}`) : [],
    };
  });
  const nav = performance.getEntriesByType("navigation")[0];
  let mark = null;
  try {
    mark = sessionStorage.getItem("fitaf_struck");
  } catch {}
  return {
    path: location.pathname,
    search: location.search,
    navigationEntrySearch: nav ? new URL(nav.name).search : null,
    landing: window.__fitafLanding ?? null,
    mark,
    width: innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    sections,
    skeletons,
    pasted: window.__fitafProbePasted === true,
    struck,
    prices: found,
  };
}

/** In the page: the first `need` displayed, enabled, uniquely named meals, as probe-counts chooses them. */
function chooseMeals({ need, sel }) {
  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const cards = [...document.querySelectorAll(sel.card)];
  const seen = new Map();
  for (const c of cards) {
    const n = text(c.querySelector(sel.cardTitle));
    if (n) seen.set(n, (seen.get(n) ?? 0) + 1);
  }
  const chosen = [];
  for (const c of cards) {
    if (chosen.length >= need) break;
    const n = text(c.querySelector(sel.cardTitle));
    if (!n || seen.get(n) > 1 || chosen.includes(n)) continue;
    const add = [...c.querySelectorAll(`${sel.cardActions} button`)].find((b) => text(b).includes(sel.addLabel));
    if (add && !add.disabled) chosen.push(n);
  }
  const entry = [...document.scripts].map((s) => s.src).find((s) => /\/main-[A-Za-z0-9]+\.js$/.test(s));
  return { chosen, cards: cards.length, release: entry ? entry.slice(entry.lastIndexOf("/") + 1) : null };
}

/** In the page: press meal `name`'s own Add to Cart, or (`plus`) its counter's "+", as fill C does (a real click). */
function pressMeal({ name, sel, plus = false }) {
  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  if (location.pathname !== "/order") return { pressed: false, reason: `the page left /order: ${location.pathname}` };
  const card = [...document.querySelectorAll(sel.card)].find((c) => text(c.querySelector(sel.cardTitle)) === name);
  const b = card && (plus ? card.querySelector(`${sel.cardActions} .counter__button[aria-label="Increase value"]`) : [...card.querySelectorAll(`${sel.cardActions} button`)].find((x) => text(x).includes(sel.addLabel)));
  if (!b) return { pressed: false, reason: plus ? "no + on the card" : "no Add to Cart on the card" };
  b.click();
  return { pressed: true };
}

/** In the page (§ 37 item 5): press the first plan card's own Choose button on /meal-plans; its label, or null. */
function choosePlan() {
  const b = [...document.querySelectorAll("button.meal-plan__fit-af-select")].find((x) => x.getClientRects().length);
  if (!b) return null;
  b.click();
  return b.textContent.replace(/\s+/g, " ").trim();
}

/** In the page: meal `name`'s count on its card (0 with no counter). */
function countOf({ name, sel }) {
  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const card = [...document.querySelectorAll(sel.card)].find((c) => text(c.querySelector(sel.cardTitle)) === name);
  const v = card && card.querySelector(`${sel.cardActions} ${sel.counterValue}`);
  return v ? Number(text(v)) || 0 : 0;
}

/**
 * In the page: the block's control(): the first displayed button matching `source`, enabled, outside a meal card; its
 * label, and pressed once when `press`. Self-contained: page.evaluate sends this function's text alone.
 */
function control({ source, press }) {
  const re = new RegExp(source, "i");
  const text = (el) => el.textContent.replace(/\s+/g, " ").trim();
  const b = [...document.querySelectorAll("button")].find(
    (x) => !x.disabled && re.test(text(x)) && x.getClientRects().length && !x.closest("app-product-card,app-product-card-mobile"),
  );
  if (!b) return null;
  if (press) b.click();
  return text(b);
}

/**
 * With a script: paste it into this document unless it already has been (the probe's own mark, window.__fitafProbePasted),
 * our holds lifted first, as the smoke lifts them before its paste. A paste that throws is recorded, never a stop.
 */
async function ensurePasted(page, script, record) {
  if (!script || (await page.evaluate(() => window.__fitafProbePasted === true))) return;
  await page.evaluate(() => {
    delete window.__fitafHandoff;
    delete window.__fitafStruck;
  });
  try {
    await page.evaluate(script);
  } catch (err) {
    record.pageErrors.push(cutLine(`the pasted script threw: ${String(err?.message ?? err)}`));
  }
  await page.evaluate(() => {
    window.__fitafProbePasted = true;
  });
  record.pastes.push(await page.evaluate(() => location.pathname));
}

/** Wait for a first price on the page (or `waitFor`), paste the script if any, then SETTLE_MS, then read. */
async function settledRead(page, { waitFor = null, script = null, share = 0, record }) {
  await poll(page, waitFor ?? (() => /\$\s?\d/.test(document.body?.textContent ?? "")), undefined, Boolean, { timeoutMs: MENU_MS, everyMs: 250 });
  await ensurePasted(page, script, record);
  await sleep(SETTLE_MS);
  return page.evaluate(readPrices, { share });
}

/** Every quoted page string redacted (lib/redact.mjs), as the watch's reports are. */
function redacted(read) {
  for (const p of read.prices) {
    p.text = redact(p.text);
    p.ownText = redact(p.ownText);
    if (p.parent) p.parent.text = redact(p.parent.text);
    if (p.card?.title) p.card.title = redact(p.card.title);
    if (p.card) p.card.buttons = p.card.buttons.map(redact);
  }
  for (const w of read.struck ?? []) w.overlaps = w.overlaps.map(redact);
  read.skeletons = JSON.parse(redact(JSON.stringify(read.skeletons)));
  return read;
}

/**
 * One run at one width. The record is the run's file (bin/probe-prices.mjs writes it); `error` is null unless the run
 * could not be made as asked (the reads made before the error are kept).
 */
export async function probePricesRun({ origin, width, mpid, need, executablePath, script = null, scriptLabel = null, share = 0, onPage = null, now = () => new Date() }) {
  const record = {
    probe: "probe-prices (SPEC-rung2-progress-and-checkout § 36 item 7)",
    at: now().toISOString(),
    origin,
    width,
    viewport: VIEWPORTS[width],
    mpid,
    need,
    markKey: MARK_KEY,
    probeQuery: PROBE_QUERY,
    settleMs: SETTLE_MS,
    selectors: SELECTORS,
    script: script ? scriptLabel ?? "a script" : null,
    share,
    pastes: [],
    release: null,
    chosen: [],
    counted: [],
    steps: [],
    reads: {},
    fitafLines: [],
    pageErrors: [],
    error: null,
  };
  const { browser, close } = await freshBrowser({ executablePath });
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORTS[width]);
    page.on("console", (m) => {
      if (m.text().startsWith(LOG_PREFIX)) record.fitafLines.push(cutLine(m.text()));
    });
    page.on("pageerror", (e) => record.pageErrors.push(cutLine(String(e?.message ?? e))));
    await page.evaluateOnNewDocument(initScript, MARK_KEY);
    if (onPage) await onPage(page);
    if (script) {
      // Any block of ours already on the page held off, its hand-off and its struck prices (as the smoke's paste mode).
      await page.evaluateOnNewDocument(() => {
        window.__fitafHandoff = true;
        window.__fitafStruck = true;
      });
    }
    const read = (waitFor = null) => settledRead(page, { waitFor, script, share, record }).then(redacted);
    const step = (name, extra = {}) => record.steps.push({ step: name, at: now().toISOString(), ...extra });

    // 1. The landing query, and the front page's and the meal plans page's prices.
    // The front page drew no price on 2026-10-27 (probe-prices/2026-10-27/): it is read once loaded, not after a price.
    for (const [key, path, waitFor] of [["front", `/${PROBE_QUERY}`, () => document.readyState === "complete"], ["mealPlans", `/meal-plans${PROBE_QUERY}`, null]]) {
      await page.goto(`${origin}${path}`, { waitUntil: "load", timeout: NAV_MS });
      record.reads[key] = await read(waitFor);
      step(key, { path });
    }
    // § 37 item 5: the plan page's size picker, reached by the store's own link from /meal-plans.
    const chose = await page.evaluate(choosePlan);
    step("choose a plan", { label: chose });
    if (chose) {
      const PICKER = () => /meals delivered per week/i.test(document.body?.textContent ?? "");
      record.reads.planPage = await read(PICKER);
      step("planPage", { path: await page.evaluate(() => location.pathname + location.search) });
    }

    // 2. The order page, then the meals' own Add to Cart, then the cart summary.
    const orderPath = `/order?mpid=${mpid}`;
    await page.goto(`${origin}${orderPath}`, { waitUntil: "load", timeout: NAV_MS });
    const menu = await poll(page, chooseMeals, { need, sel: SELECTORS }, (m) => m.chosen.length >= need, { timeoutMs: MENU_MS, everyMs: 200 });
    record.release = menu?.release ?? null;
    record.chosen = menu?.chosen ?? [];
    record.reads.order = await read();
    step("order", { path: orderPath, cards: menu?.cards ?? 0 });
    if (record.chosen.length < need) throw new Error(`only ${record.chosen.length} of ${need} meals with an enabled Add to Cart`);
    // § 37: the first chosen meal the plan's count less one times (its Add to Cart, then its "+"), and the second once,
    // so the summary shows a line of several ("N x $X") and a line of one.
    const units = [[record.chosen[0], need - 1], [record.chosen[1], 1]];
    for (const [name, times] of units) {
      for (let k = 0; k < times; k++) {
        const p = await page.evaluate(pressMeal, { name, sel: SELECTORS, plus: k > 0 });
        if (!p.pressed) throw new Error(`${name}: ${p.reason}`);
        const n = await poll(page, countOf, { name, sel: SELECTORS }, (c) => c > k, { timeoutMs: ACK_MS, everyMs: 100 });
        record.counted.push(n ?? 0);
        await sleep(300);
      }
    }
    step("pressed", { counted: record.counted });
    record.reads.cart = await read();

    // 3. CHECKOUT, as the block finds it, once enabled; the extras dialog's CONTINUE TO CHECKOUT if the store opens it.
    const CHECKOUT = "^checkout( now)?$";
    const label = await poll(page, control, { source: CHECKOUT, press: false }, Boolean, { timeoutMs: CHECKOUT_READY_MS, everyMs: 200 });
    if (!label) throw new Error("no enabled CHECKOUT within 10 s");
    await page.evaluate(control, { source: CHECKOUT, press: true });
    step("CHECKOUT", { label });
    const where = await poll(page, () => (location.pathname === "/checkout" ? "checkout" : document.querySelector("app-extra-products-dialog") ? "extras" : null), undefined, Boolean, { timeoutMs: AFTER_CHECKOUT_MS, everyMs: 200 });
    if (where === "extras") {
      // § 37 item 5: the pop-up read as it shows, nothing pressed in it; then /checkout by its address (a new document).
      record.reads.extras = await read(() => /\$\s?\d/.test(document.querySelector("app-extra-products-dialog")?.textContent ?? ""));
      step("extras", { path: await page.evaluate(() => location.pathname) });
      await page.goto(`${origin}/checkout`, { waitUntil: "load", timeout: NAV_MS });
      step("/checkout loaded");
    }
    if ((await page.evaluate(() => location.pathname)) !== "/checkout") throw new Error("/checkout not reached");
    record.reads.checkout = await read(() => !!document.querySelector(".summary__total"));
    step("checkout", { path: "/checkout" });
  } catch (err) {
    record.error = `the probe failed: ${String(err?.message ?? err)}`;
  } finally {
    await close();
  }
  return record;
}
