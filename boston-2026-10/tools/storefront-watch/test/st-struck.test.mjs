// ST1–ST9 (SPEC-rung2-progress-and-checkout § 36 item 11): the full price struck beside the store's, for a visitor from
// eatfitaf.com, in the stand-in store (browser-store.mjs with `prices`: the price elements as the probe measured them,
// storefront/probe-prices/2026-10-27/), headless Chrome on 127.0.0.1, the SHIPPED Footer text placed by the stand-in as
// the store's Custom Scripts place it, on every page. ⛔ Never the live store. The marker is the init script's
// sessionStorage fitaf_struck, or (ST3) a landing address carrying utm_source=eatfitaf on the STAND-IN only. Every case
// fixes the page's clock inside the offer (data/offers.json's dates), so it holds after the offer ends.
//   ST1  marked: each surface's prices struck, each figure item 3's (price x 100 / (100 - the share), to the cent):
//        the meal plans page's four, the order page's meals (desktop and phone cards), the cart summary (the sidebar's
//        segment price, the bar's Cart Total) after the store's own Add to Cart presses, and the checkout's Plan Total
//        after the store's own CHECKOUT; $87.50 -> $116.67 and $12.50 -> $16.67.
//   ST2  unmarked: none, no MutationObserver made, one read of sessionStorage fitaf_struck per page and no write.
//   ST3  marked on landing (?utm_source=eatfitaf&...), a later page without it: still struck; not for a near miss.
//   ST4  a date before valid_from and after valid_to (America/New_York): none; the last minute of valid_to: struck.
//   ST5  a redraw (a price's text changed, its element replaced, the list re-ordered): one each, correct; and a second
//        copy of the block run on the same page (a paste beside the Footer's): one each.
//   ST6  the excluded figures (the additions' prices, an add-on "+$2.00", the Add to Cart button's price, a fee, tax,
//        a discount, the lines, the Total, the pay button): none.
//   ST7  each struck figure aria-hidden, no attribute but class, aria-hidden and style, no element inside, no text but
//        the figure.
//   ST8  the deep-carted checkout at steps 1, 2 and 3: no save link (§ 36 item 8).
//   ST9  at 1280 and 390: each struck figure overlaps nothing displayed of the store's, and nothing of the store's moves
//        after it appears (positions read after paint for 1 s); no painted frame shows a price without its figure.
// Mutants, each in a MIRROR of the site package built by its own build (protocols/mutate-in-a-mirror.md), each beside
// the shipped text passing the same case: the figure as price x 0.75 (ST1); shown without the marker (ST2); shown
// after valid_to (ST4); added twice on a redraw (ST5).
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { cp, copyFile, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { sleep } from "../lib/browser.mjs";
import { VIEWPORTS } from "../lib/config.mjs";
import { MEALS, startStore } from "./browser-store.mjs";
import { browserFor, DONE, openDeep, shipped, skip, untilStep, walkTo } from "./r2-browser.mjs";

const SITE = new URL("../../../", import.meta.url);
const SITE_DIR = new URL(".", SITE).pathname;
const OFFERS = JSON.parse(await readFile(new URL("data/offers.json", SITE), "utf8")).offers.filter((o) => o.applies_to === "general" && o.percent_off);
const OFFER = OFFERS[0];
/** Inside the offer: its first day at noon in New York (16:00Z in daylight time, 17:00Z in standard; both noon-ish). */
const INSIDE = Date.parse(`${OFFER.valid_from}T16:00:00Z`);
/** The day before valid_from, and the day after valid_to, at noon; and valid_to's last minute in New York (EDT). */
const BEFORE = INSIDE - 86_400_000;
const LAST_MINUTE = Date.parse(`${OFFER.valid_to}T23:59:00-04:00`);
const AFTER_END = Date.parse(`${OFFER.valid_to}T23:59:00-04:00`) + 120_000;
const MARK = "fitaf_struck";
/** The four surfaces' price elements, by the store's own names (the probe's), read here independently of the block. */
/**
 * The surfaces' price elements, by the store's own names (the probes', storefront/probe-prices/2026-10-27/), read here
 * independently of the block, each with its kind: a plain price (§ 36 item 3; § 37's size picker's "$X/meal" too), a
 * unit price ("N x $X", only $X struck: § 37 item 3) or a total (§ 37 item 4). Since § 37 every section's card prices.
 */
const TARGETS = [".meal-plan__fit-af-price>strong", "app-cart .segment-price", ".mobile-cart-summary__stat-value", ".summary__plan-total-value", ".meal-plan__fit-af-meal-options button>span", ".product__content-price", ".product-card-mobile__price", "app-extra-products-dialog .popular-card__price", "app-cart-product-card .product__price-original", ".summary__item-price-current"];
const UNITS = ".summary__item-price-unit";
const TOTALS = ".summary__total-preview,.summary__total-value";
const MEAL_PRICES = ".product__content-price,.product-card-mobile__price";
const cents = (t) => {
  const m = /^\$(\d+)\.(\d\d)$/.exec(t);
  return m ? Number(m[1]) * 100 + Number(m[2]) : null;
};
const dollars = (c) => `$${Math.floor(c / 100)}.${String(c % 100).padStart(2, "0")}`;

/** Item 3's rule, here written again: "$12.50" (or § 37's "$12.50/meal") -> "$16.67" at 25 %. */
function figure(text, share = OFFER.percent_off) {
  const c = cents(String(text).replace(/\/meal$/, ""));
  return c ? dollars(Math.round((c * 100) / (100 - share))) : null;
}

/** § 37: what a price element should be struck as, by its kind; null for none. */
function expected(p) {
  if (p.kind === "unit") {
    const m = /^\d+ \u00d7 (\$\d+\.\d\d)$/.exec(p.text);
    return m ? figure(m[1]) : null;
  }
  if (p.kind === "total") {
    const t = cents(p.text);
    const sub = cents(p.sub ?? "");
    return t !== null && sub ? dollars(t + cents(figure(p.sub)) - sub) : null;
  }
  return figure(p.text);
}

let store;
let browser;
let site;
before(async () => {
  if (skip) return;
  store = await startStore();
  browser = await browserFor();
  site = await shipped();
});
after(async () => {
  await browser?.close();
  await store?.close();
});

/** Before the page's scripts: the mark (or not), the page's clock fixed, and counters of observers and of the mark's reads. */
function init({ mark, now, key }) {
  if (mark) sessionStorage.setItem(key, "1");
  if (now) {
    const D = Date;
    window.Date = class extends D {
      constructor(...a) {
        if (a.length) super(...a);
        else super(now);
      }
      static now() {
        return now;
      }
    };
  }
  window.__st = { observers: 0, reads: 0, writes: 0, frames: [] };
  const MO = window.MutationObserver;
  window.MutationObserver = class extends MO {
    constructor(f) {
      super(f);
      window.__st.observers++;
    }
  };
  const get = Storage.prototype.getItem;
  const set = Storage.prototype.setItem;
  Storage.prototype.getItem = function (k) {
    if (k === key) window.__st.reads++;
    return get.call(this, k);
  };
  Storage.prototype.setItem = function (k, v) {
    if (k === key) window.__st.writes++;
    return set.call(this, k, v);
  };
}

/** In the page: every struck figure, and every target price with the figure right before it (if any). */
function read({ targets, units, totals }) {
  const norm = (t) => t.replace(/\s+/g, " ").trim();
  const shown = (e) => e.getClientRects().length > 0;
  const kinds = [];
  for (const p of document.querySelectorAll(targets.join(","))) if (!p.matches(".fitaf-was")) kinds.push([p, "plain"]);
  for (const p of document.querySelectorAll(units)) kinds.push([p, "unit"]);
  for (const p of document.querySelectorAll(totals)) kinds.push([p, "total"]);
  // § 37: the Subtotal's figure, in the row whose label names it; and for a total, the same summary's Subtotal.
  const subOf = (root) => [...(root?.querySelectorAll(".summary__row") ?? [])].find((r) => /^subtotal\b/i.test(norm(r.firstElementChild?.textContent ?? "")));
  for (const r of document.querySelectorAll(".summary")) {
    const row = subOf(r);
    if (row && row.lastElementChild && row.lastElementChild !== row.firstElementChild) kinds.push([row.lastElementChild, "plain"]);
  }
  const was = [...document.querySelectorAll(".fitaf-was")];
  return {
    path: location.pathname,
    prices: kinds.map(([p, kind]) => {
      const prev = p.previousElementSibling;
      // The run of struck figures right before it (§ 37: a line's price and its unit price share one column).
      const before = [];
      for (let e = p.previousElementSibling; e && e.matches(".fitaf-was"); e = e.previousElementSibling) before.push(e);
      const sub = kind === "total" ? subOf(p.closest(".summary"))?.lastElementChild : null;
      return { kind, cls: p.className || p.localName, text: norm(p.textContent), sub: sub ? norm(sub.textContent) : null, struck: prev && prev.matches(".fitaf-was") ? prev.textContent : null, siblings: before.length, shown: shown(p) };
    }),
    was: was.map((s) => ({
      tag: s.localName,
      text: s.textContent,
      aria: s.getAttribute("aria-hidden"),
      attrs: [...s.attributes].map((a) => a.name).sort(),
      kids: s.children.length,
      next: s.nextElementSibling ? { cls: s.nextElementSibling.className, text: norm(s.nextElementSibling.textContent) } : null,
      shown: shown(s),
      size: [parseFloat(getComputedStyle(s).fontSize), s.nextElementSibling ? parseFloat(getComputedStyle(s.nextElementSibling).fontSize) : null],
      line: getComputedStyle(s).textDecorationLine,
    })),
    st: window.__st,
  };
}

/** A context of its own, `path` on the stand-in with the Footer `text` on every page, the page's clock at `now`. */
async function open({ path, width = 1280, mark = true, now = INSIDE, text = site.text, cfg = {} }) {
  store.set({ prices: true, footer: text, footerOnCheckout: true, ...cfg });
  const context = await browser.browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport(VIEWPORTS[width]);
  await page.evaluateOnNewDocument(init, { mark, now, key: MARK });
  await page.goto(store.origin + path, { waitUntil: "load" });
  await sleep(700);
  const at = async () => {
    await sleep(150);
    return page.evaluate(read, { targets: TARGETS, units: UNITS, totals: TOTALS });
  };
  return { page, at, close: () => context.close() };
}

/** Each price with a figure (its kind's, `expected`) has exactly one, right before it, equal to it; none else. */
function judge(r, { expectStruck }) {
  const priced = r.prices.filter((p) => expected(p));
  for (const p of r.prices) {
    const want = expected(p);
    if (!expectStruck || !want) {
      assert.equal(p.struck, null, `${r.path}: ${p.cls} "${p.text}" carries no struck figure`);
      continue;
    }
    assert.equal(p.struck, want, `${r.path}: ${p.cls} "${p.text}" struck as ${want}`);
    assert.equal(p.siblings, 1, `${r.path}: ${p.cls} "${p.text}": exactly one struck figure beside it`);
  }
  assert.equal(r.was.length, expectStruck ? priced.length : 0, `${r.path}: ${expectStruck ? "one struck figure per price" : "no struck figure"} (${r.was.length})`);
}

/** The store's own Add to Cart of the first 7 meals. */
async function cart(page) {
  for (const name of MEALS.slice(0, 7)) {
    await page.evaluate((n) => {
      const card = [...document.querySelectorAll("app-product-card")].find((c) => c.querySelector(".product__content-title").textContent.trim() === n);
      card.querySelector(".product__actions button").click();
    }, name);
    await sleep(60);
  }
}

/** The store's own CHECKOUT, displayed (the sidebar's or the bar's), to its checkout in the app. */
async function checkout(page) {
  await page.evaluate(() => [...document.querySelectorAll(".checkout-control")].find((b) => b.getClientRects().length).click());
  await page.waitForFunction(() => location.pathname === "/checkout" && document.querySelector(".summary__plan-total-value"), { timeout: 5000 });
}

async function st1(text, width = 1280) {
  const plans = await open({ path: "/meal-plans", width, text });
  try {
    const r = await plans.at();
    assert.equal(r.prices.length, 9, "fixture control: the meal plans page's four prices and (§ 37) Lean's five sizes");
    judge(r, { expectStruck: true });
  } finally {
    await plans.close();
  }
  const order = await open({ path: "/order?mpid=21", width, text });
  try {
    const r = await order.at();
    assert.equal(r.prices.filter((p) => /content-price|card-mobile__price/.test(p.cls)).length, (MEALS.length + 3) * 2, "fixture control: each meal's and (§ 37) each addition's two cards");
    judge(r, { expectStruck: true });
    assert.ok(r.prices.some((p) => p.text === "$12.50" && p.struck === "$16.67"), "a meal at $12.50 struck as $16.67");
    await cart(order.page);
    const c = await order.at();
    judge(c, { expectStruck: true });
    const sums = c.prices.filter((p) => /segment-price|stat-value/.test(p.cls) && p.text === "$87.50");
    assert.equal(sums.length, 2, "fixture control: the sidebar's and the bar's $87.50");
    for (const p of sums) assert.equal(p.struck, "$116.67", `${p.cls}: $87.50 struck as $116.67`);
    await checkout(order.page);
    const k = await order.at();
    assert.equal(k.path, "/checkout");
    judge(k, { expectStruck: true });
    const plan = k.prices.find((p) => p.cls === "summary__plan-total-value");
    assert.ok(plan, "fixture control: the Plan Total's figure");
    assert.equal(plan.struck, figure(plan.text), "the Plan Total struck");
  } finally {
    await order.close();
  }
}

test("ST1: marked, every surface's prices struck, each figure item 3's (1280)", { skip }, async () => st1(site.text, 1280));
test("ST1b: the same at 390", { skip }, async () => st1(site.text, 390));

async function st2(text) {
  for (const path of ["/meal-plans", "/order?mpid=21"]) {
    const v = await open({ path, mark: false, text });
    try {
      if (path === "/order?mpid=21") await cart(v.page);
      const r = await v.at();
      judge(r, { expectStruck: false });
      assert.equal(r.st.observers, 0, `${path}: no MutationObserver made`);
      assert.equal(r.st.reads, 1, `${path}: one read of sessionStorage ${MARK}`);
      assert.equal(r.st.writes, 0, `${path}: no write of ${MARK}`);
    } finally {
      await v.close();
    }
  }
}

test("ST2: unmarked, none, no observer, one read of the mark and no write", { skip }, async () => st2(site.text));

test("ST3: marked on landing by utm_source=eatfitaf; a later page without it still struck; a near miss is not", { skip }, async () => {
  const v = await open({ path: "/meal-plans?utm_source=eatfitaf&utm_medium=qr&utm_campaign=boston", mark: false });
  try {
    judge(await v.at(), { expectStruck: true });
    assert.equal(await v.page.evaluate((k) => sessionStorage.getItem(k), MARK), "1", "the mark kept for the tab");
    await v.page.goto(`${store.origin}/order?mpid=21`, { waitUntil: "load" });
    await sleep(700);
    const r = await v.at();
    judge(r, { expectStruck: true });
    assert.ok(r.was.length > 0, "the later page struck");
  } finally {
    await v.close();
  }
  for (const q of ["?utm_source=eatfitafx", "?utm_source=eatfitaf.com", "?x=utm_source=eatfitaf", "#utm_source=eatfitaf"]) {
    const n = await open({ path: `/meal-plans${q}`, mark: false });
    try {
      judge(await n.at(), { expectStruck: false });
    } finally {
      await n.close();
    }
  }
  const later = await open({ path: "/meal-plans?x=1&utm_source=eatfitaf", mark: false });
  try {
    judge(await later.at(), { expectStruck: true });
  } finally {
    await later.close();
  }
});

async function st4(text) {
  for (const [now, struck, name] of [[BEFORE, false, "the day before valid_from"], [AFTER_END, false, "two minutes after valid_to ends in New York"], [LAST_MINUTE, true, "valid_to's last minute in New York"]]) {
    const v = await open({ path: "/meal-plans", now, text });
    try {
      const r = await v.at();
      assert.equal(r.was.length > 0, struck, `${name}: ${struck ? "struck" : "none"}`);
      judge(r, { expectStruck: struck });
    } finally {
      await v.close();
    }
  }
}

test("ST4: a date before valid_from and after valid_to (America/New_York): none", { skip }, async () => st4(site.text));

async function st5(text) {
  const v = await open({ path: "/order?mpid=21", text });
  try {
    judge(await v.at(), { expectStruck: true });
    await v.page.evaluate(() => window.__fixturePrices.text(".products__section .product__content-price", 0, "$13.00"));
    let r = await v.at();
    judge(r, { expectStruck: true });
    assert.ok(r.prices.some((p) => p.text === "$13.00" && p.struck === "$17.33"), "the changed price's figure follows it");
    await v.page.evaluate(() => window.__fixturePrices.replace(".products__section .product__content-price", 1));
    judge(await v.at(), { expectStruck: true });
    await v.page.evaluate(() => window.__fixturePrices.reverse());
    judge(await v.at(), { expectStruck: true });
    await cart(v.page);
    r = await v.at();
    judge(r, { expectStruck: true });
    await v.page.evaluate(text);
    await v.page.evaluate(() => window.__fixturePrices.text(".products__section .product__content-price", 2, "$14.00"));
    judge(await v.at(), { expectStruck: true });
  } finally {
    await v.close();
  }
}

test("ST5: a redraw — the text changed, the element replaced, the list re-ordered — one each, correct", { skip }, async () => st5(site.text));

// ST6 as § 37 amends it (item 2 withdraws "never an add-on's" for extras; items 3 and 4 strike the summary's lines,
// Subtotal and totals): an add-on's "+$2.00", a "From" price and the Add to Cart button's own price are still none; the
// checkout's fees are ST14's.
test("ST6: the excluded figures of the order page — an add-on, a From price, the button's price — none", { skip }, async () => {
  const v = await open({ path: "/order?mpid=21" });
  try {
    judge(await v.at(), { expectStruck: true });
    const bad = await v.page.evaluate(() => [...document.querySelectorAll(".fitaf-was")].filter((s) => s.closest("button") || /^(From |\+)/.test(s.nextElementSibling?.textContent.trim() ?? "")).length);
    assert.equal(bad, 0, "none in a button, none by a From price or an add-on");
    const fromPrice = await v.page.evaluate(() => [...document.querySelectorAll(".product__content-price")].find((p) => p.textContent.trim() === "From $9.00")?.previousElementSibling?.className ?? null);
    assert.notEqual(fromPrice, "fitaf-was", "the From price none");
  } finally {
    await v.close();
  }
});

test("ST7: each struck figure aria-hidden, no words, an s smaller than its price and struck through", { skip }, async () => {
  const v = await open({ path: "/meal-plans" });
  try {
    const r = await v.at();
    assert.equal(r.was.length, 9, "the four plans' prices and (§ 37) Lean's five sizes");
    for (const s of r.was) {
      assert.equal(s.tag, "s");
      assert.equal(s.aria, "true");
      assert.deepEqual(s.attrs, ["aria-hidden", "class", "style"]);
      assert.equal(s.kids, 0);
      assert.match(s.text, /^\$\d+\.\d\d$/, "no text but the figure");
      assert.ok(s.size[0] < s.size[1], `smaller than the price (${s.size.join(" < ")})`);
      assert.equal(s.line, "line-through");
    }
  } finally {
    await v.close();
  }
});

test("ST8: the deep-carted checkout's steps 1, 2 and 3: no save link", { skip }, async () => {
  store.set({ zeroRow: "live" });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text, width: 1280 });
  try {
    assert.equal(await run.verdict(20_000), DONE);
    await sleep(300);
    for (const step of [1, 2, 3]) {
      if (step > 1) await walkTo(run, step);
      await untilStep(run, step);
      assert.equal(await run.page.evaluate(() => document.querySelectorAll("#fitaf-save,[href*='eatfitaf.com']").length), 0, `step ${step}: no save link`);
    }
  } finally {
    await run.close();
  }
});

// ── § 37: ST10–ST14 ─────────────────────────────────────────────────────────────────────────────────────────────────

test("ST10: the size picker's per-meal prices struck ($13.00/meal -> $17.33), at 1280 and 390", { skip }, async () => {
  for (const width of [1280, 390]) {
    const v = await open({ path: "/meal-plans", width });
    try {
      const r = await v.at();
      judge(r, { expectStruck: true });
      const sizes = r.prices.filter((p) => /\/meal$/.test(p.text));
      assert.deepEqual(sizes.map((p) => [p.text, p.struck]), [["$13.00/meal", "$17.33"], ["$12.50/meal", "$16.67"], ["$12.25/meal", "$16.33"], ["$12.00/meal", "$16.00"], ["$11.50/meal", "$15.33"]]);
    } finally {
      await v.close();
    }
  }
});

test("ST11: the extras pop-up's and the Additions' prices struck; a free extra, a From price and an upcharge not", { skip }, async () => {
  const v = await open({ path: "/order?mpid=21", cfg: { extrasDialog: true } });
  try {
    const order = await v.at();
    judge(order, { expectStruck: true });
    assert.deepEqual(order.prices.filter((p) => p.cls === "product__content-price" && p.text !== "$12.50" || (p.cls === "product__content-price" && p.struck && false)).map((p) => [p.text, p.struck]), [["From $9.00", null], ["$4.50", "$6.00"]]);
    await cart(v.page);
    await v.page.evaluate(() => [...document.querySelectorAll(".checkout-control")].find((b) => b.getClientRects().length).click());
    await v.page.waitForFunction(() => document.querySelector("app-extra-products-dialog .popular-card__price"), { timeout: 5000 });
    const pop = await v.at();
    judge(pop, { expectStruck: true });
    assert.deepEqual(pop.prices.filter((p) => p.cls === "popular-card__price").map((p) => [p.text, p.struck]), [["$9.00", "$12.00"], ["$4.50", "$6.00"], ["$0.00", null], ["+$2.00", null]]);
  } finally {
    await v.close();
  }
});

/** The cart as ST12 and ST13 fill it: the first meal six times (its Add to Cart, then its "+") and the second once. */
async function sixAndOne(page) {
  const press = (n, plus) =>
    page.evaluate(
      (name, p) => {
        const card = [...document.querySelectorAll("app-product-card")].find((c) => c.querySelector(".product__content-title").textContent.trim() === name);
        (p ? card.querySelector('.product__actions .counter__button[aria-label="Increase value"]') : card.querySelector(".product__actions button")).click();
      },
      n,
      plus,
    );
  for (let k = 0; k < 6; k++) {
    await press(MEALS[0], k > 0);
    await sleep(60);
  }
  await press(MEALS[1], false);
  await sleep(60);
}

test("ST12: the summary's Subtotal, each line's price and its unit price struck", { skip }, async () => {
  const v = await open({ path: "/order?mpid=21", cfg: { storeLines: true } });
  try {
    await sixAndOne(v.page);
    await checkout(v.page);
    const k = await v.at();
    judge(k, { expectStruck: true });
    const of = (cls) => k.prices.filter((p) => p.cls === cls).map((p) => [p.text, p.struck]);
    assert.deepEqual(of("summary__item-price-current"), [["$75.00", "$100.00"], ["$12.50", "$16.67"]]);
    assert.deepEqual(of("summary__item-price-unit"), [["6 \u00d7 $12.50", "$16.67"]], "only the unit's $X, as its own struck figure");
    assert.deepEqual(k.prices.filter((p) => p.kind === "plain" && p.cls === "span").map((p) => [p.text, p.struck]), [["$87.50", "$116.67"]], "the Subtotal");
  } finally {
    await v.close();
  }
});

async function st13(text) {
  for (const [shippingCents, taxCents, total, struck] of [[500, 0, "$92.50", "$121.67"], [0, 0, "$87.50", "$116.67"]]) {
    const v = await open({ path: "/order?mpid=21", text, cfg: { storeLines: true, shippingCents, taxCents } });
    try {
      await cart(v.page);
      await checkout(v.page);
      const k = await v.at();
      const totals = k.prices.filter((p) => p.kind === "total");
      assert.deepEqual(totals.map((p) => [p.cls, p.text, p.sub]), [["summary__total-preview", total, "$87.50"], ["summary__total-value", total, "$87.50"]], "fixture control: the header's total and the Total row");
      for (const p of totals) assert.equal(p.struck, struck, `${p.cls} ${p.text} with shipping ${shippingCents}: the total + (the struck Subtotal - the Subtotal) = ${struck}`);
      judge(k, { expectStruck: true });
      // No Subtotal on the page (the store drawing its summary without it): the totals get nothing.
      await v.page.evaluate(() => document.querySelector("[data-fixture=subtotal]").parentNode.remove());
      const none = await v.at();
      assert.deepEqual(none.prices.filter((p) => p.kind === "total").map((p) => p.struck), [null, null], "no Subtotal: no struck total");
    } finally {
      await v.close();
    }
  }
}

test("ST13: the header total and the Total, with a fee ($92.50 -> $121.67) and without ($87.50 -> $116.67); none without a Subtotal", { skip }, async () => st13(site.text));

test("ST14: shipping, tax, tip, a discount and the pay buttons never struck", { skip }, async () => {
  const v = await open({ path: "/order?mpid=21", cfg: { storeLines: true, shippingCents: 500, taxCents: 123, tipCents: 300, discountRow: "live" } });
  try {
    await cart(v.page);
    await checkout(v.page);
    const k = await v.at();
    judge(k, { expectStruck: true });
    const bad = await v.page.evaluate(() => {
      const rows = [...document.querySelectorAll(".summary__row")].filter((r) => !/^subtotal\b/i.test(r.firstElementChild?.textContent.trim() ?? ""));
      return [...rows, ...document.querySelectorAll(".checkout__submit, .summary__pay-button, .summary__mobile-bar, .checkout-discounts")].filter((e) => e.querySelector(".fitaf-was")).map((e) => e.textContent.replace(/\s+/g, " ").trim().slice(0, 40));
    });
    assert.deepEqual(bad, [], "no struck figure in shipping, tax, tip, a discount or a pay button");
    assert.ok((await v.page.evaluate(() => document.querySelectorAll(".summary__row").length)) >= 5, "fixture control: Subtotal, shipping, tax, tip and the discount row drawn");
  } finally {
    await v.close();
  }
});

/** In the page, from before its scripts: after every paint, each target price shown and whether its figure is beside it, and the store's leaves' boxes. */
function frames({ targets, meals }) {
  const leaves = () =>
    [...document.querySelectorAll("main *, .bar *, .side *")].filter((e) => !e.closest(".fitaf-was") && !e.matches(".fitaf-was") && !e.querySelector(".fitaf-was") && e.getClientRects().length && (!e.children.length || e.matches("img,button,input,select")));
  // (§ 37: a store element that HOLDS a figure, the size's button, is its container, not something it overlaps.)
  window.__frames = [];
  window.__leaves = leaves;
  const tick = () => {
    setTimeout(() => {
      const prices = [...document.querySelectorAll(targets.join(","))];
      for (const sec of document.querySelectorAll(".products__section")) if (/meals/i.test(sec.querySelector(".products__section-title")?.textContent ?? "")) prices.push(...sec.querySelectorAll(meals));
      const bare = prices.filter((p) => p.getClientRects().length && /^\$\d+\.\d\d$/.test(p.textContent.trim()) && !/^\$0\.00$/.test(p.textContent.trim()) && !(p.previousElementSibling && p.previousElementSibling.matches(".fitaf-was")));
      window.__frames.push({ was: document.querySelectorAll(".fitaf-was").length, bare: bare.map((p) => p.className + " " + p.textContent.trim()) });
    }, 0);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function st9(width) {
  const v = await open({ path: "/meal-plans", width });
  const boxes = () =>
    v.page.evaluate(() => {
      const r = (e) => {
        const b = e.getBoundingClientRect();
        return [b.left + scrollX, b.top + scrollY, b.width, b.height].map((n) => Math.round(n * 10) / 10);
      };
      const was = [...document.querySelectorAll(".fitaf-was")].filter((s) => s.getClientRects().length).map((s) => ({ s: s.textContent, box: r(s) }));
      const leaves = window.__leaves().map((e) => ({ e: e.localName + "." + e.className, box: r(e) }));
      return { was, leaves };
    });
  const overlap = (a, b) => Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1])) > 0.5;
  const check = async (where) => {
    const first = await boxes();
    assert.ok(first.was.length > 0, `${where}: struck figures displayed`);
    for (const w of first.was) for (const l of first.leaves) assert.ok(!overlap(w.box, l.box), `${where}: ${w.s} overlaps ${l.e} ${JSON.stringify([w.box, l.box])}`);
    await sleep(1000);
    const later = await boxes();
    assert.deepEqual(later.leaves, first.leaves, `${where}: nothing of the store's moved after the figures appeared`);
    assert.deepEqual(later.was, first.was, `${where}: the figures stayed put`);
  };
  try {
    await v.page.evaluate(frames, { targets: TARGETS, meals: MEAL_PRICES });
    await check(`/meal-plans at ${width}`);
    await v.page.goto(`${store.origin}/order?mpid=21`, { waitUntil: "load" });
    await v.page.evaluate(frames, { targets: TARGETS, meals: MEAL_PRICES });
    await sleep(700);
    await check(`/order at ${width}`);
    await cart(v.page);
    await sleep(300);
    await check(`the cart summary at ${width}`);
    const fs = await v.page.evaluate(() => window.__frames);
    const shown = fs.findIndex((f) => f.was > 0);
    const bare = fs.slice(shown).filter((f, k, a) => f.bare.length && a[k + 1]?.bare.length);
    assert.deepEqual(bare, [], `at ${width}: no two painted frames in a row with a price shown without its figure (of ${fs.length})`);
    await checkout(v.page);
    await check(`the checkout at ${width}`);
  } finally {
    await v.close();
  }
}

test("ST9: at 1280 the struck figures overlap nothing of the store's and nothing moves after they appear", { skip }, async () => st9(1280));
test("ST9b: the same at 390", { skip }, async () => st9(390));

// ── The mutants, each in a mirror of the site package that this file builds and removes ─────────────────────────────

/** The site package copied to a temporary directory (its node_modules linked), `edit` applied to the mirror's own files. */
async function mirror(edit) {
  const dir = await realpath(await mkdtemp(join(tmpdir(), "st-struck-mirror-")));
  for (const name of ["build.mjs", "package.json", "wrangler.jsonc"]) await copyFile(join(SITE_DIR, name), join(dir, name));
  for (const name of ["data", "scripts", "src", "consent"]) await cp(join(SITE_DIR, name), join(dir, name), { recursive: true });
  await symlink(await realpath(join(SITE_DIR, "node_modules")), join(dir, "node_modules"));
  await edit(dir);
  return dir;
}

/** The mutant's shipped text: the mirror's struck source changed (each `from` exactly once), built by the mirror's build. */
async function mutantText(changes) {
  const dir = await mirror(async (d) => {
    const path = join(d, "src", "storefront", "fitaf-struck.js");
    let src = await readFile(path, "utf8");
    for (const [from, to] of changes) {
      const n = src.split(from).length - 1;
      if (n !== 1) throw new Error(`mutant: expected ${JSON.stringify(from)} once in fitaf-struck.js, found it ${n} times`);
      src = src.replace(from, to);
    }
    await writeFile(path, src);
  });
  try {
    const build = await import(pathToFileURL(join(dir, "scripts", "build-storefront.mjs")).href);
    const files = await build.storefrontFiles({ commit: "mutant0" });
    const text = files.find((f) => f.name.endsWith(".console.js")).content;
    assert.notEqual(text, site.text, "fixture control: the mutant's text differs from the shipped text");
    return text;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const MUTANTS = {
  times075: [["c * 100 / (100 - share)", "c * 0.75"]],
  noMarker: [["if (!on) return;", "on = 1;"]],
  afterEnd: [["o[2] >= day", "true"]],
  twice: [["s = M.get(p)", "s = null"], ["sweep(keep);", ""]],
  totalWhole: [["t + up(b) - b", "up(t)"]],
};

test("ST mutant: the figure as price x 0.75 — ST1 fails", { skip }, async () => {
  await assert.rejects(st1(await mutantText(MUTANTS.times075)), /struck as/);
});
test("ST mutant: shown without the marker — ST2 fails", { skip }, async () => {
  await assert.rejects(st2(await mutantText(MUTANTS.noMarker)), /carries no struck figure|no struck figure|no MutationObserver/);
});
test("ST mutant: shown after valid_to — ST4 fails", { skip }, async () => {
  await assert.rejects(st4(await mutantText(MUTANTS.afterEnd)), /after valid_to ends in New York: none/);
});
test("ST mutant (§ 37): a total marked up whole — ST13 fails", { skip }, async () => {
  await assert.rejects(st13(await mutantText(MUTANTS.totalWhole)), /with shipping 500: the total \+ \(the struck Subtotal - the Subtotal\)/);
});
test("ST mutant: added twice on a redraw — ST5 fails", { skip }, async () => {
  await assert.rejects(st5(await mutantText(MUTANTS.twice)), /exactly one struck figure|one struck figure per price/);
});
