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
//   ST5  a redraw (a price's text changed, its element replaced, the list re-ordered): one each, correct.
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
const TARGETS = [".meal-plan__fit-af-price>strong", "app-cart .segment-price", ".mobile-cart-summary__stat-value", ".summary__plan-total-value"];
const MEAL_PRICES = ".product__content-price,.product-card-mobile__price";

/** Item 3's rule, here written again: "$12.50" -> "$16.67" at 25 %. */
function figure(text, share = OFFER.percent_off) {
  const m = /^\$(\d+)\.(\d\d)$/.exec(text);
  if (!m || !Number(m[1] + m[2])) return null;
  const c = Math.round((Number(m[1]) * 100 + Number(m[2])) * 100 / (100 - share));
  return `$${Math.floor(c / 100)}.${String(c % 100).padStart(2, "0")}`;
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
function read({ targets, meals }) {
  const norm = (t) => t.replace(/\s+/g, " ").trim();
  const shown = (e) => e.getClientRects().length > 0;
  const prices = [...document.querySelectorAll(targets.join(","))];
  for (const sec of document.querySelectorAll(".products__section")) {
    if (/meals/i.test(sec.querySelector(".products__section-title")?.textContent ?? "")) prices.push(...sec.querySelectorAll(meals));
  }
  const was = [...document.querySelectorAll(".fitaf-was")];
  return {
    path: location.pathname,
    prices: prices.map((p) => {
      const prev = p.previousElementSibling;
      const before = [...p.parentNode.children].filter((c) => c.matches(".fitaf-was"));
      return { cls: p.className || p.localName, text: norm(p.textContent), struck: prev && prev.matches(".fitaf-was") ? prev.textContent : null, siblings: before.length, shown: shown(p) };
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
    return page.evaluate(read, { targets: TARGETS, meals: MEAL_PRICES });
  };
  return { page, at, close: () => context.close() };
}

/** Each price shown with a figure has exactly one, right before it, equal to item 3's rule; none else. */
function judge(r, { expectStruck }) {
  const priced = r.prices.filter((p) => figure(p.text));
  for (const p of r.prices) {
    if (!expectStruck || !figure(p.text)) {
      assert.equal(p.struck, null, `${r.path}: ${p.cls} "${p.text}" carries no struck figure`);
      continue;
    }
    assert.equal(p.struck, figure(p.text), `${r.path}: ${p.cls} "${p.text}" struck as ${figure(p.text)}`);
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
    assert.equal(r.prices.length, 4, "fixture control: the meal plans page's four prices");
    judge(r, { expectStruck: true });
  } finally {
    await plans.close();
  }
  const order = await open({ path: "/order?mpid=21", width, text });
  try {
    const r = await order.at();
    assert.equal(r.prices.filter((p) => /content-price|card-mobile__price/.test(p.cls)).length, MEALS.length * 2, "fixture control: each meal's two cards");
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
  } finally {
    await v.close();
  }
}

test("ST5: a redraw — the text changed, the element replaced, the list re-ordered — one each, correct", { skip }, async () => st5(site.text));

test("ST6: the excluded figures — additions, an add-on, the button, a fee, tax, a discount, the lines, the Total — none", { skip }, async () => {
  const v = await open({ path: "/order?mpid=21", cfg: { discountRow: "live", storeLines: true } });
  try {
    const nextOf = () => v.page.evaluate(() => [...document.querySelectorAll(".fitaf-was")].map((s) => s.nextElementSibling?.className));
    const allowed = new Set(["product__content-price", "product-card-mobile__price", "segment-price", "mobile-cart-summary__stat-value", "summary__plan-total-value"]);
    const additions = await v.page.evaluate(() => [...document.querySelectorAll(".products__section")].slice(1).flatMap((s) => [...s.querySelectorAll(".fitaf-was")]).length);
    assert.equal(additions, 0, "no struck figure in the Additions (their $12.50 included)");
    assert.equal(await v.page.evaluate(() => document.querySelectorAll("button .fitaf-was, .dropdown__value-text + .fitaf-was").length), 0, "none in a button, none by the add-on");
    await cart(v.page);
    await checkout(v.page);
    const k = await v.at();
    assert.equal(k.path, "/checkout");
    for (const n of await nextOf()) assert.ok(allowed.has(n), `a struck figure only beside a priced surface's figure, not ${n}`);
    const bad = await v.page.evaluate(() =>
      [".summary__row", ".summary__total", ".summary__item", ".checkout__submit", ".summary__mobile-bar", ".checkout-discounts"].filter((q) => [...document.querySelectorAll(q)].some((e) => e.querySelector(".fitaf-was"))),
    );
    assert.deepEqual(bad, [], "no struck figure in a fee, tax, discount, line, Total or pay button");
    assert.equal(k.was.length, 1, "on the checkout, the Plan Total's alone");
  } finally {
    await v.close();
  }
});

test("ST7: each struck figure aria-hidden, no words, an s smaller than its price and struck through", { skip }, async () => {
  const v = await open({ path: "/meal-plans" });
  try {
    const r = await v.at();
    assert.equal(r.was.length, 4);
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

/** In the page, from before its scripts: after every paint, each target price shown and whether its figure is beside it, and the store's leaves' boxes. */
function frames({ targets, meals }) {
  const leaves = () =>
    [...document.querySelectorAll("main *, .bar *, .side *")].filter((e) => !e.closest(".fitaf-was") && !e.matches(".fitaf-was") && e.getClientRects().length && (!e.children.length || e.matches("img,button,input,select")));
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
  twice: [["s = M.get(p)", "s = null"], ["sweep();", ""]],
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
test("ST mutant: added twice on a redraw — ST5 fails", { skip }, async () => {
  await assert.rejects(st5(await mutantText(MUTANTS.twice)), /exactly one struck figure|one struck figure per price/);
});
