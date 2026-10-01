// SPEC-rung2-fill-c § 2, the probe of the store's count: before fill C is written, measure how the store says a press
// counted. One run: a fresh profile; the plan's order page WITH NO FRAGMENT (so Fit AF's Footer block does nothing);
// the first `need` meals whose card shows an enabled Add to Cart (a name on two cards is skipped: fill B refuses it);
// each one's Add to Cart pressed in turn, as fill B presses it (a real .click() on the store's own button, in the
// page). From before the first press, a recorder in the page reads every 50 ms the pressed meals' three counts (the
// card's, the phone card's, the sidebar's row), the plan's own counts and texts, and both CHECKOUT controls, and logs
// each value only when it changes, on the page's own clock (performance.now()). After every press it waits until that
// press is counted or 5 s have passed (`ack`), or 200 ms (`gap`, fill B before rung 2 § 23), or not at all (`nowait`:
// the next press as soon as the last one returns); after the last, until every press is counted or its 5 s are over,
// then 3 s more. lib/probe-analysis.mjs turns the log into each press's times and any count taken back.
// ⛔ It presses NOTHING but each chosen meal's Add to Cart: never a CHECKOUT, a stepper, a dialog; it types nothing, never
// loads /checkout, and stops if the page leaves /order. The profile is discarded.
import { freshBrowser, poll } from "./browser.mjs";
import { LOG_PREFIX, VIEWPORTS } from "./config.mjs";
import { analyse } from "./probe-analysis.mjs";
import { cutLine, redact } from "./redact.mjs";

const NAV_MS = 60_000;
/** The cards' wait, as the smoke's menu read (lib/smoke.mjs). */
const MENU_MS = 45_000;
/** § 2: every 50 ms. */
export const POLL_MS = 50;
/** § 1 item 2's ACK_MS default: a press not counted within this long is "never acknowledged". */
export const ACK_WINDOW_MS = 5000;
/** After the last press's window, the recorder keeps reading this long: a count that comes and goes late. */
export const TAIL_MS = 3000;
/** Fill B's press interval before rung 2 § 23 (it is 1000 ms since). */
export const GAP_MS = 200;
export const SPACINGS = ["ack", "gap", "nowait"];

/**
 * What the probe reads, by the live store's own names (read from its page on 2026-10-01, release main-XIJ2UX3I.js).
 * Recorded in every run's file, so a reader knows what each value was read from.
 */
export const SELECTORS = Object.freeze({
  card: "app-product-card",
  cardTitle: ".product__content-title",
  cardActions: ".product__actions",
  addLabel: "Add to Cart",
  mobileCard: "app-product-card-mobile",
  mobileTitle: ".product-card-mobile__title",
  mobileActions: ".product-card-mobile__actions",
  mobileAddLabel: "Add",
  counter: "app-counter .counter[role=spinbutton]",
  counterValue: ".counter__value",
  counterDecrease: 'button.counter__button[aria-label="Decrease value"]',
  counterIncrease: 'button.counter__button[aria-label="Increase value"]',
  sidebarRow: "app-cart-product-card",
  sidebarRowTitle: ".product__content-title",
  itemsCount: ".cart__items-count",
  progressLabel: ".cart__progress-label",
  phoneItems: ".mobile-cart-summary__stat",
  phoneItemsLabel: ".mobile-cart-summary__stat-label",
  phoneItemsValue: ".mobile-cart-summary__stat-value",
  sideCheckout: ".cart__checkout button",
  barCheckout: ".mobile-cart-summary__checkout-button button",
  toast: ".toast-message",
  pendingKey: "hmp_pending_plan_items",
});

/** In the page: the first `need` meals to press, and the store's release (its entry script's name). Reads only. */
function chooseMeals({ need, sel }) {
  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const shown = new Set([...document.querySelectorAll(`${sel.card} ${sel.cardTitle}, ${sel.mobileCard} ${sel.mobileTitle}`)]
    .filter((t) => t.getClientRects().length > 0).map(text));
  const cards = [...document.querySelectorAll(sel.card)];
  const seen = new Map();
  for (const c of cards) {
    const n = text(c.querySelector(sel.cardTitle));
    if (n) seen.set(n, (seen.get(n) ?? 0) + 1);
  }
  const chosen = [];
  for (const c of cards) {
    if (chosen.length >= need) break;
    const name = text(c.querySelector(sel.cardTitle));
    if (!name || seen.get(name) > 1 || chosen.includes(name) || !shown.has(name)) continue;
    const add = [...c.querySelectorAll(`${sel.cardActions} button`)].find((b) => text(b).includes(sel.addLabel));
    if (add && !add.disabled) chosen.push(name);
  }
  const entry = [...document.scripts].map((s) => s.src).find((s) => /\/main-[A-Za-z0-9]+\.js$/.test(s));
  return {
    chosen,
    cards: cards.length,
    duplicates: [...seen].filter(([, k]) => k > 1).map(([n]) => n),
    release: entry ? entry.slice(entry.lastIndexOf("/") + 1) : null,
  };
}

/**
 * In the page: the recorder and the press, as window.__fitafProbe. Each read is a short string per key, logged as
 * [t, key, value] only when it changes. Keys: card.i / mcard.i ("add", "count N", "add+count N", "neither", "no
 * actions", "missing"), row.i ("count N", "row", "absent"), items, phoneItems, progressLabel (text or null), side and bar
 * ("text|enabled|shown", or null), pending (the store's pending list's COUNT, never its contents), toasts, path.
 */
function installProbe({ names, sel, everyMs }) {
  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
  const byTitle = (cardSel, titleSel) => {
    const m = new Map();
    for (const c of document.querySelectorAll(cardSel)) {
      const n = text(c.querySelector(titleSel));
      if (n && !m.has(n)) m.set(n, c);
    }
    return m;
  };
  const cardState = (card, actionsSel, label, exact) => {
    if (!card) return "missing";
    const actions = card.querySelector(actionsSel);
    if (!actions) return "no actions";
    const add = [...actions.querySelectorAll("button")].some((b) => (exact ? text(b) === label : text(b).includes(label)));
    const c = actions.querySelector(sel.counter);
    const count = c ? `count ${text(c.querySelector(sel.counterValue)) ?? "?"}` : null;
    if (add && count) return `add+${count}`;
    return add ? "add" : count ?? "neither";
  };
  const button = (q) => {
    const b = document.querySelector(q);
    return b ? `${text(b)}|${b.disabled ? "disabled" : "enabled"}|${b.getClientRects().length ? "shown" : "hidden"}` : null;
  };
  const phoneItems = () => {
    const stat = [...document.querySelectorAll(sel.phoneItems)].find((s) => text(s.querySelector(sel.phoneItemsLabel)) === "Items");
    return stat ? text(stat.querySelector(sel.phoneItemsValue)) : null;
  };
  const pending = () => {
    try {
      const raw = localStorage.getItem(sel.pendingKey);
      if (raw === null) return "absent";
      const v = JSON.parse(raw);
      if (Array.isArray(v)) return String(v.length);
      if (v && typeof v === "object") return String(Object.values(v).reduce((n, x) => n + (Array.isArray(x) ? x.length : 0), 0));
      return "not a list";
    } catch {
      return "unreadable";
    }
  };
  const read = () => {
    const cards = byTitle(sel.card, sel.cardTitle);
    const mcards = byTitle(sel.mobileCard, sel.mobileTitle);
    const rows = byTitle(sel.sidebarRow, sel.sidebarRowTitle);
    const st = {};
    names.forEach((n, i) => {
      st[`card.${i}`] = cardState(cards.get(n), sel.cardActions, sel.addLabel, false);
      st[`mcard.${i}`] = cardState(mcards.get(n), sel.mobileActions, sel.mobileAddLabel, true);
      const row = rows.get(n);
      const v = row && row.querySelector(sel.counterValue);
      st[`row.${i}`] = row ? (v ? `count ${text(v)}` : "row") : "absent";
    });
    st.items = text(document.querySelector(sel.itemsCount));
    st.phoneItems = phoneItems();
    st.progressLabel = text(document.querySelector(sel.progressLabel));
    st.side = button(sel.sideCheckout);
    st.bar = button(sel.barCheckout);
    st.pending = pending();
    st.toasts = String(document.querySelectorAll(sel.toast).length);
    st.path = location.pathname;
    return st;
  };
  const ackOf = (v) => /^count [1-9]\d*$/.test(v);
  const P = { changes: [], last: {}, samples: 0, maxGapMs: 0, prevT: null, presses: [], waiters: [] };
  const sample = () => {
    const t = performance.now();
    if (P.prevT !== null) P.maxGapMs = Math.max(P.maxGapMs, t - P.prevT);
    P.prevT = t;
    P.samples++;
    const st = read();
    for (const k of Object.keys(st)) {
      if (st[k] !== P.last[k]) {
        P.changes.push([t, k, st[k]]);
        P.last[k] = st[k];
      }
    }
    P.waiters = P.waiters.filter((w) => {
      if (ackOf(P.last[`card.${w.i}`])) return w.done(true), false;
      if (t >= w.deadline) return w.done(false), false;
      return true;
    });
  };
  sample();
  P.timer = setInterval(sample, everyMs);
  window.__fitafProbe = {
    press(i) {
      if (location.pathname !== "/order") return { pressed: false, reason: `the page left /order: ${location.pathname}` };
      const card = byTitle(sel.card, sel.cardTitle).get(names[i]);
      const b = card && [...card.querySelectorAll(`${sel.cardActions} button`)].find((x) => text(x).includes(sel.addLabel));
      if (!b) return { pressed: false, reason: `no Add to Cart on the card (${cardState(card, sel.cardActions, sel.addLabel, false)})` };
      const t0 = performance.now();
      b.click();
      const t1 = performance.now();
      const after = byTitle(sel.card, sel.cardTitle).get(names[i]);
      const p = { pressed: true, t0, t1, immediate: cardState(after, sel.cardActions, sel.addLabel, false) };
      P.presses[i] = p;
      return p;
    },
    /** Resolves true once press i's card shows a count, false at its press + ms; at once if already counted. */
    waitAck(i, ms) {
      const deadline = P.presses[i].t0 + ms;
      if (ackOf(P.last[`card.${i}`])) return Promise.resolve(true);
      return new Promise((done) => {
        P.waiters.push({ i, deadline, done });
        // A starved interval must not hold the wait past its deadline: one more read just after it.
        setTimeout(sample, Math.max(0, deadline - performance.now()) + 5);
      });
    },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    stop() {
      clearInterval(P.timer);
      sample();
      return { changes: P.changes, samples: P.samples, maxGapMs: P.maxGapMs, presses: P.presses, last: P.last };
    },
  };
}

/**
 * One run. `spacing`: "ack", "gap" (gapMs after each press returns, on the page's own timer, as fill B's), or "nowait".
 * The record is the run's file (bin/probe-counts.mjs writes it): the settings, the chosen meals, the recorder's change
 * log, and lib/probe-analysis.mjs's reading of it. `error` is null unless the run could not be made as asked.
 */
export async function probeRun({ origin, width, mpid, need, spacing, gapMs = GAP_MS, executablePath, now = () => new Date() }) {
  if (!SPACINGS.includes(spacing)) throw new Error(`spacing must be one of ${SPACINGS.join(", ")}: ${spacing}`);
  const record = {
    probe: "probe-counts (SPEC-rung2-fill-c § 2)",
    at: now().toISOString(),
    origin,
    path: `/order?mpid=${mpid}`,
    width,
    viewport: VIEWPORTS[width],
    spacing,
    gapMs: spacing === "gap" ? gapMs : null,
    mpid,
    need,
    ackWindowMs: ACK_WINDOW_MS,
    tailMs: TAIL_MS,
    release: null,
    cards: null,
    duplicates: [],
    chosen: [],
    cardsMs: null,
    selectors: SELECTORS,
    sampling: null,
    presses: [],
    takeBacks: [],
    glitches: [],
    final: null,
    changes: [],
    fitafLines: [],
    pageErrors: [],
    error: null,
  };
  const { browser, close } = await freshBrowser({ executablePath });
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORTS[width]);
    page.on("console", (m) => {
      if (m.text().startsWith(LOG_PREFIX)) record.fitafLines.push(cutLine(redact(m.text())));
    });
    page.on("pageerror", (e) => record.pageErrors.push(cutLine(redact(String(e?.message ?? e)))));
    const start = Date.now();
    await page.goto(`${origin}${record.path}`, { waitUntil: "load", timeout: NAV_MS });
    const menu = await poll(page, chooseMeals, { need, sel: SELECTORS }, (m) => m.chosen.length >= need, { timeoutMs: MENU_MS, everyMs: 100 });
    record.cardsMs = Date.now() - start;
    Object.assign(record, { release: menu?.release ?? null, cards: menu?.cards ?? 0, duplicates: menu?.duplicates ?? [], chosen: menu?.chosen ?? [] });
    if (record.chosen.length < need) {
      record.error = `only ${record.chosen.length} of ${need} meals with an enabled Add to Cart after ${MENU_MS / 1000} s`;
      return record;
    }
    await page.evaluate(installProbe, { names: record.chosen, sel: SELECTORS, everyMs: POLL_MS });
    const made = [];
    for (let i = 0; i < need; i++) {
      const p = await page.evaluate((k) => window.__fitafProbe.press(k), i);
      if (!p.pressed) {
        record.error = `press ${i} (${record.chosen[i]}): ${p.reason}`;
        break;
      }
      made.push(i);
      if (spacing === "ack") await page.evaluate((k, ms) => window.__fitafProbe.waitAck(k, ms), i, ACK_WINDOW_MS);
      else if (spacing === "gap") await page.evaluate((ms) => window.__fitafProbe.sleep(ms), gapMs);
    }
    for (const i of made) await page.evaluate((k, ms) => window.__fitafProbe.waitAck(k, ms), i, ACK_WINDOW_MS);
    await page.evaluate((ms) => window.__fitafProbe.sleep(ms), TAIL_MS);
    const log = await page.evaluate(() => window.__fitafProbe.stop());
    Object.assign(record, analyse({ log, chosen: record.chosen, need, ackWindowMs: ACK_WINDOW_MS }));
    record.sampling = { everyMs: POLL_MS, samples: log.samples, maxGapMs: Math.round(log.maxGapMs * 10) / 10 };
  } catch (err) {
    record.error = `the probe failed: ${String(err?.message ?? err)}`;
  } finally {
    await close();
  }
  return record;
}
