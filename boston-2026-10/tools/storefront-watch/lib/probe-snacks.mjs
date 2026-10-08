// SPEC-snacks-in-the-cart § 1, the probe of a snack in the store's cart: before the block presses snacks, measure how
// the store shows one. One run: a fresh profile (lib/browser.mjs, as probe-counts); the plan's order page WITH NO
// FRAGMENT (so Fit AF's Footer block does nothing); then, each press a real .click() in the page on the store's own
// control of app-product-card, the card the block presses at every width:
//   1. a second snack's Select Options, its Size dropdown opened and closed again to read its choices, and its Hide
//      Options (nothing chosen, nothing added: the choices card);
//   2. the plan's 14 meals' Add to Cart, one at a time, each once its card shows the last one's count;
//   3. the snack's Select Options, its Add to Cart, its "+" (two units), each read on its own card and in the plan's
//      counts (§ 1 items 1 and 3);
//   4. an addition whose card shows Add to Cart directly, once (§ 1 item 2);
//   5. the store's own CHECKOUT (and, if the store opens its extras dialog, that dialog's CONTINUE TO CHECKOUT, once, as
//      the block does), then /checkout READ: every order line, the snack's line and its group, and which elements of
//      them each of the block's hide rules H1-H17 would match (its DEEP text, evaluated with querySelectorAll; the
//      class and the style are never added).
// The reads use the BLOCK'S OWN functions (card, addButton, count, plus, plan, control: their text read from
// src/storefront/fitaf-handoff.js, the key function from src/storefront/meal-key.js), evaluated in the page, beside the
// store's element names. ⛔ Nothing is typed anywhere; nothing is pressed on /checkout; no size is chosen; PAY is never
// pressed; the profile (and the plan in it) is discarded. Screenshots are of elements, and only of the store's public page.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";
import { freshBrowser, poll, sleep } from "./browser.mjs";
import { LOG_PREFIX, SITE_DIR, VIEWPORTS } from "./config.mjs";
import { cutLine, redact } from "./redact.mjs";
import { mealKey } from "../../../src/storefront/meal-key.js";

const NAV_MS = 60_000;
const MENU_MS = 45_000;
/** A press's wait for its count (fill C's ACK_MS). */
export const ACK_MS = 5000;
/** Between presses, at least this long (fill C's MIN_GAP_MS). */
export const GAP_MS = 300;
/** After a press is counted, this long more before the card is read, so a closing expansion has closed. */
export const SETTLE_MS = 1000;
/** CHECKOUT enabled with the plan's count: the block's 50 polls of 200 ms. */
const CHECKOUT_READY_MS = 10_000;
/** After CHECKOUT (and after CONTINUE TO CHECKOUT): the block's 150 polls. */
const AFTER_CHECKOUT_MS = 30_000;
const RECORD_EVERY_MS = 100;

export const BLOCK_PATH = join(SITE_DIR, "src", "storefront", "fitaf-handoff.js");
export const KEY_PATH = join(SITE_DIR, "src", "storefront", "meal-key.js");
/** The block's functions this probe evaluates against the live page, by name. */
const BLOCK_FUNCTIONS = ["text", "first", "card", "addButton", "count", "plus", "plan", "control"];
/** Which of DEEP's hide rules is which (the H numbers of fitaf-handoff.js's comment above DEEP), by the name it begins with. */
const H_NAMES = [
  ["H1", ".sticky-header"], ["H2", ".footer"], ["H2", ".app-hmp-credit"], ["H5", "app-storefront-popup-host"], ["H8", ".smartbanner"],
  ["H3", "a.checkout__guest-signin-banner"], ["H4", "a.contact__sign-in"], ["H6", ".summary__plan-subscription-controls"],
  ["H7", ".checkout-discounts"], ["H9", ".summary__row"], ["H10", ":is(section.checkout__section.tip,app-tip-selector)"],
  ["H11", ".summary__item-price"], ["H12", ".summary__item-addons"], ["H13", ".summary__item-quantity-controls"],
  ["H14", ".summary__item-remove"], ["H15", ".summary__plan-total"], ["H16", ".summary__plan-group-header"], ["H17", ".summary__plan-return"],
];

/** The store's names this probe reads (read on the live store 2026-10-08), recorded in every run's file. */
export const SELECTORS = Object.freeze({
  card: "app-product-card",
  cardTitle: ".product__content-title",
  cardPrice: ".product__content-price",
  additionTag: ".product__content-tag--addition",
  sectionTitle: ".products__section-title",
  toggle: "button.product__toggle",
  toggleLabel: ".product__toggle-label",
  addons: ".product__addons",
  addonItem: ".product__addons-item",
  addonTitle: ".product__addons-item-title",
  addonRequired: ".product__addons-item-required",
  dropdown: "app-dropdown",
  combobox: "[role=combobox]",
  dropdownTrigger: ".dropdown__trigger",
  dropdownValue: ".dropdown__value-text",
  dropdownClear: ".dropdown__clear",
  listboxOption: ".cdk-overlay-pane [role=listbox] [role=option]",
  actions: ".product__actions",
  addLabel: ".product__actions-add_label",
  addPrice: ".product__actions-add_price",
  counter: "app-counter",
  counterValue: ".counter__value",
  increase: '.counter__button[aria-label="Increase value"]',
  decrease: '.counter__button[aria-label="Decrease value"]',
  mobileCard: "app-product-card-mobile",
  mobileTitle: ".product-card-mobile__title",
  mobileActions: ".product-card-mobile__actions",
  itemsCount: ".cart__items-count",
  cart: "app-cart",
  cartRow: "app-cart-product-card",
  phoneSummary: ".mobile-cart-summary",
  phoneStat: ".mobile-cart-summary__stat",
  phoneStatLabel: ".mobile-cart-summary__stat-label",
  phoneStatValue: ".mobile-cart-summary__stat-value",
  sideCheckout: ".cart__checkout button",
  barCheckout: ".mobile-cart-summary__checkout-button button",
  progressLabel: ".cart__progress-label",
  overlayPane: ".cdk-overlay-pane",
  extrasDialog: "app-extra-products-dialog",
  checkout: "app-checkout",
  line: ".summary__item",
  lineName: ".summary__item-name",
  linePrice: ".summary__item-price",
  lineAddons: ".summary__item-addons",
  lineQuantity: ".summary__item-quantity-controls",
  lineRemove: ".summary__item-remove",
  total: ".summary__total",
  row: ".summary__row",
  storeLists: ["hmp_pending_plan_items", "hmp_local_cart"],
});

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** A function's text from the block's source: one line, or from its first line to the next `}` alone on a line. */
function functionText(src, name) {
  const one = new RegExp(`^function ${name}\\(.*\\}$`, "m").exec(src);
  if (one && (one[0].match(/\{/g) ?? []).length === (one[0].match(/\}/g) ?? []).length) return one[0];
  const many = new RegExp(`^function ${name}\\([^\\n]*\\{\\n[\\s\\S]*?^\\}$`, "m").exec(src);
  if (!many) throw new Error(`fitaf-handoff.js has no function ${name}`);
  return many[0];
}

/** Top-level comma split of a selector list (commas inside parentheses stay). */
function splitTop(list) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === "(") depth++;
    else if (list[i] === ")") depth--;
    else if (list[i] === "," && depth === 0) out.push(list.slice(from, i)), (from = i + 1);
  }
  out.push(list.slice(from));
  return out;
}

/**
 * The block's hide rules, from its own text: DEEP evaluated (with Q2 and Q3) in a sandbox, its first rule's :is(...)
 * list split at its top-level commas, the shared "not inside app-checkout" group split into its five names, and each
 * labelled by the name it begins with. The step rules of § 25 (they need the block's step classes) are listed apart.
 */
export function hideRules(src) {
  const q = /^var Q2 = .*$/m.exec(src)?.[0];
  const d = /^var DEEP = [\s\S]*?";$/m.exec(src)?.[0];
  if (!q || !d) throw new Error("fitaf-handoff.js: no Q2 or DEEP declaration");
  const DEEP = vm.runInNewContext(`${q}\n${d}\nDEEP`);
  const PREFIX = "html.fitaf-deep:has(app-checkout) :is(";
  if (!DEEP.startsWith(PREFIX)) throw new Error("DEEP does not begin with its scope");
  let depth = 1;
  let i = PREFIX.length;
  for (; i < DEEP.length && depth; i++) depth += DEEP[i] === "(" ? 1 : DEEP[i] === ")" ? -1 : 0;
  const items = splitTop(DEEP.slice(PREFIX.length, i - 1)).flatMap((item) => {
    const m = /^:is\((.*)\)(:not\(app-checkout \*\))$/.exec(item);
    return m ? splitTop(m[1]).map((n) => n + m[2]) : [item];
  });
  const rules = [];
  const steps = [];
  for (const selector of items) {
    if (selector.includes("fitaf-step")) {
      steps.push(selector);
      continue;
    }
    const h = H_NAMES.find(([, n]) => selector.startsWith(n));
    rules.push({ h: h ? h[0] : null, selector });
  }
  const missing = [...new Set(H_NAMES.map(([h]) => h))].filter((h) => !rules.some((r) => r.h === h));
  return { deepSha256: sha256(DEEP), rules, steps, missing, unlabelled: rules.filter((r) => !r.h).map((r) => r.selector) };
}

/** The script installed in the page: the block's own functions (and its key function), then the probe's reads. */
export async function pageScript() {
  const src = await readFile(BLOCK_PATH, "utf8");
  const keySrc = (await readFile(KEY_PATH, "utf8")).match(/^export function mealKey[\s\S]*?^\}$/m)?.[0];
  if (!keySrc) throw new Error("meal-key.js: no mealKey");
  const fns = BLOCK_FUNCTIONS.map((n) => functionText(src, n)).join("\n");
  const script =
    `window.__snk = (function () { var w = window; function fail(m) { throw new Error(m); }\n${fns}\n` +
    `var key = ${keySrc.replace(/^export /, "").replace("function mealKey", "function")};\n` +
    `var B = { text: text, first: first, card: card, addButton: addButton, count: count, plus: plus, plan: plan, control: control, key: key };\n` +
    `return (${probeHelpers.toString()})(B, ${JSON.stringify(SELECTORS)}); })();`;
  return { script, blockSha256: sha256(src), keySha256: sha256(keySrc), hide: hideRules(src) };
}

/**
 * In the page (as text, from pageScript): the probe's reads and presses, over the block's own functions B. Every read
 * returns plain data. Presses are .click() on the store's own controls of app-product-card.
 */
function probeHelpers(B, S) {
  const d = document;
  const tx = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
  const shown = (el) => !!(el && el.getClientRects().length);
  const desc = (el) => {
    if (!el) return null;
    const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).filter((c) => !/^ng-/.test(c)).join(".") : "";
    const attrs = ["role", "aria-label", "aria-expanded", "aria-selected", "type"].filter((a) => el.hasAttribute(a)).map((a) => `[${a}="${el.getAttribute(a)}"]`).join("");
    return el.tagName.toLowerCase() + cls + attrs;
  };
  const shape = (el, depth = 0, max = 6) => {
    if (!el || depth > max) return [];
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).filter(Boolean).join(" ").slice(0, 80);
    const line = `${"  ".repeat(depth)}${desc(el)}${own ? ` "${own}"` : ""}${shown(el) ? "" : " {not displayed}"}`;
    return [line, ...[...el.children].filter((c) => !["svg", "path", "circle", "img"].includes(c.tagName.toLowerCase()) || depth < 2).flatMap((c) => shape(c, depth + 1, max))];
  };
  /** As shape, but each order line is one row (its element and its name), not its insides. */
  const outline = (el, depth = 0, max = 6) => {
    if (!el || depth > max) return [];
    if (el.matches(S.line)) return [`${"  ".repeat(depth)}${desc(el)} [line: ${tx(el.querySelector(S.lineName))}]${shown(el) ? "" : " {not displayed}"}`];
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).filter(Boolean).join(" ").slice(0, 80);
    const line = `${"  ".repeat(depth)}${desc(el)}${own ? ` "${own}"` : ""}${shown(el) ? "" : " {not displayed}"}`;
    return [line, ...[...el.children].filter((c) => !["svg", "path", "circle", "img"].includes(c.tagName.toLowerCase())).flatMap((c) => outline(c, depth + 1, max))];
  };
  const pathIn = (el, root) => {
    const p = [];
    for (let e = el; e && e !== root; e = e.parentElement) p.unshift(desc(e));
    return p.join(" > ");
  };
  const byTitle = (title) => [...d.querySelectorAll(S.card)].find((c) => tx(c.querySelector(S.cardTitle)) === title) || null;
  const mobileByTitle = (title) => [...d.querySelectorAll(S.mobileCard)].find((c) => tx(c.querySelector(S.mobileTitle)) === title) || null;
  const section = (c) => {
    for (let e = c.parentElement; e; e = e.parentElement) {
      const t = e.querySelector(S.sectionTitle);
      if (t) return tx(t);
    }
    return null;
  };
  const listCount = (k) => {
    try {
      const raw = localStorage.getItem(k);
      if (raw === null) return "absent";
      const v = JSON.parse(raw);
      if (Array.isArray(v)) return v.length;
      if (v && typeof v === "object") return Object.values(v).reduce((n, x) => n + (Array.isArray(x) ? x.length : 0), 0);
      return "not a list";
    } catch (e) {
      return "unreadable";
    }
  };
  const blockSafe = (f) => {
    try {
      return f();
    } catch (e) {
      return `stop: ${e.message}`;
    }
  };

  /** The card the block would find for this title (card(key(title))), or the refusal it would stop on. */
  const blockCard = (title) => {
    try {
      return { card: B.card(B.key(title)), refused: null };
    } catch (e) {
      return { card: null, refused: e.message };
    }
  };

  /** Every app-product-card: title, key, addition or not, its section, what it shows, and the phone card's. */
  function inventory() {
    const cards = [...d.querySelectorAll(S.card)];
    const keys = {};
    const rows = cards.map((c) => {
      const title = tx(c.querySelector(S.cardTitle));
      const key = title ? B.key(title) : null;
      if (key) keys[key] = (keys[key] || 0) + 1;
      const tog = c.querySelector(S.toggle);
      const add = B.addButton(c);
      const m = title ? mobileByTitle(title) : null;
      return {
        title,
        key,
        addition: !!c.querySelector(S.additionTag),
        section: section(c),
        price: tx(c.querySelector(S.cardPrice)),
        toggle: tog ? tx(tog) : null,
        addToCart: add ? tx(add) : null,
        displayed: shown(c),
        mobile: m ? { title: tx(m.querySelector(S.mobileTitle)), action: tx(m.querySelector(S.mobileActions)), size: tx(m.querySelector(S.dropdownValue)), displayed: shown(m) } : null,
      };
    });
    const entry = [...d.scripts].map((s) => s.src).find((s) => /\/main-[A-Za-z0-9]+\.js$/.test(s));
    return {
      release: entry ? entry.slice(entry.lastIndexOf("/") + 1) : null,
      cards: rows,
      sharedKeys: Object.keys(keys).filter((k) => keys[k] > 1),
      sections: [...d.querySelectorAll(S.sectionTitle)].map(tx),
    };
  }

  /** One card, read every way § 1 asks: the toggle, the expansion (Size), Add to Cart, the counter, and the block's reads. */
  function cardState(title) {
    const c = byTitle(title);
    if (!c) return { found: false };
    const tog = c.querySelector(S.toggle);
    const addons = c.querySelector(S.addons);
    const actions = c.querySelector(S.actions);
    const addBtn = actions && [...actions.querySelectorAll("button")].find((b) => /Add to Cart/.test(tx(b)));
    const counter = c.querySelector(S.counter);
    const value = c.querySelector(S.counterValue);
    const inc = c.querySelector(S.increase);
    const bc = blockCard(title);
    const m = mobileByTitle(title);
    const mValue = m && m.querySelector(S.counterValue);
    return {
      found: true,
      displayed: shown(c),
      toggle: tog
        ? { element: desc(tog), label: tx(tog.querySelector(S.toggleLabel)) ?? tx(tog), ariaExpanded: tog.getAttribute("aria-expanded"), insideActions: !!tog.closest(S.actions), displayed: shown(tog) }
        : null,
      addons: addons
        ? {
            element: desc(addons),
            displayed: shown(addons),
            items: [...addons.querySelectorAll(S.addonItem)].map((it) => {
              const dd = it.querySelector(S.dropdown);
              const cb = it.querySelector(S.combobox);
              // A radio, by any of the forms a store may draw one: a native input, or an element with role=radio.
              const radios = [...it.querySelectorAll("input[type=radio], [role=radio]")].map((r) => ({
                element: desc(r),
                label: tx(r.closest("label")) || r.getAttribute("aria-label") || tx(r.parentElement),
                checked: r.matches("input") ? r.checked : r.getAttribute("aria-checked") === "true",
              }));
              const marked = [...it.querySelectorAll("[class*='--selected'],[class*='--active'],[class*='--checked'],[aria-checked='true'],[aria-selected='true']")].map((e) => ({ element: desc(e), text: tx(e) }));
              const value = tx(it.querySelector(S.dropdownValue));
              const controls = it.querySelector("app-addon-controls > *");
              return {
                title: tx(it.querySelector(S.addonTitle)),
                required: !!it.querySelector(S.addonRequired),
                kind: dd ? "dropdown" : radios.length ? "radio" : "other",
                control: dd ? `${dd.tagName.toLowerCase()} > ${desc(cb)}` : desc(it.querySelector("select,input,[role]")),
                value,
                radios,
                marked,
                chosen: dd ? !!value : radios.length ? radios.some((r) => r.checked) || marked.length > 0 : null,
                clearButton: desc(it.querySelector(S.dropdownClear)),
                formState: controls ? [...controls.classList].filter((k) => /^ng-(valid|invalid|pristine|dirty|touched|untouched)$/.test(k)).join(" ") : null,
                errors: [...it.querySelectorAll("[class*='error'],[role=alert]")].map(tx).filter(Boolean),
                shape: dd ? null : shape(it, 0, 8),
              };
            }),
            formState: (() => {
              const body = addons.firstElementChild;
              return body ? [...body.classList].filter((k) => /^ng-(valid|invalid)$/.test(k)).join(" ") : null;
            })(),
          }
        : null,
      actions: actions
        ? {
            element: desc(actions),
            displayed: shown(actions),
            buttons: [...actions.querySelectorAll("button")].map((b) => ({ element: desc(b), text: tx(b), disabled: b.disabled || b.getAttribute("aria-disabled") === "true" })),
            addToCart: addBtn ? { element: pathIn(addBtn, c), label: tx(actions.querySelector(S.addLabel)), price: tx(actions.querySelector(S.addPrice)), text: tx(addBtn) } : null,
          }
        : null,
      counter: counter
        ? { element: pathIn(counter, c), insideActions: !!counter.closest(S.actions), value: tx(value), valuePath: value ? pathIn(value, c) : null, increase: inc ? pathIn(inc, c) : null, decrease: !!c.querySelector(S.decrease) }
        : null,
      block: {
        card: bc.refused ? `refused: ${bc.refused}` : bc.card === c ? "this card" : bc.card ? "another card" : "none",
        addButton: blockSafe(() => (B.addButton(c) ? tx(B.addButton(c)) : null)),
        count: blockSafe(() => B.count(c)),
        plus: blockSafe(() => (B.plus(c) ? pathIn(B.plus(c), c) : null)),
      },
      mobile: m ? { displayed: shown(m), action: tx(m.querySelector(S.mobileActions)), counter: mValue ? tx(mValue) : null, size: tx(m.querySelector(S.dropdownValue)) } : null,
      errors: [...c.querySelectorAll("[class*='error'],[role=alert]")].map(tx).filter(Boolean),
      toasts: [...d.querySelectorAll(".toast-message")].map(tx),
    };
  }

  /** The plan's counts every way the page shows them, and the block's own reads of them. */
  function planState() {
    const ic = d.querySelector(S.itemsCount);
    const btn = (q) => {
      const b = d.querySelector(q);
      return b ? { text: tx(b), enabled: !b.disabled, displayed: shown(b) } : null;
    };
    const ctl = blockSafe(() => B.control(/^checkout( now)?$/i));
    const rows = [...d.querySelectorAll(`${S.cart} ${S.cartRow}`)].map((r) => ({ title: tx(r.querySelector(S.cardTitle)), count: tx(r.querySelector(S.counterValue)) }));
    return {
      path: location.pathname,
      itemsCount: ic ? { text: tx(ic), displayed: shown(ic) } : null,
      phoneStats: [...d.querySelectorAll(S.phoneStat)].map((s) => ({ label: tx(s.querySelector(S.phoneStatLabel)), value: tx(s.querySelector(S.phoneStatValue)), displayed: shown(s) })),
      blockPlan: blockSafe(() => B.plan()),
      blockCheckout: typeof ctl === "string" ? ctl : ctl ? tx(ctl) : null,
      sideCheckout: btn(S.sideCheckout),
      barCheckout: btn(S.barCheckout),
      progressLabel: tx(d.querySelector(S.progressLabel)),
      sidebarRows: rows,
      lists: Object.fromEntries(S.storeLists.map((k) => [k, listCount(k)])),
      oneTime: [...d.querySelectorAll(`${S.cart} *, ${S.phoneSummary} *`)]
        .filter((e) => /one[\s-]?time/i.test([...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ")))
        .map((e) => ({ element: desc(e), text: tx(e.parentElement), displayed: shown(e) })),
      overlays: [...d.querySelectorAll(S.overlayPane)].map((p) => desc(p.firstElementChild) || "empty"),
    };
  }

  /** Every Additions card and meal card, as the inventory; the first `need` displayed meals with an enabled Add to Cart. */
  function chooseMeals(need) {
    const out = [];
    for (const c of d.querySelectorAll(S.card)) {
      if (out.length >= need) break;
      if (c.querySelector(S.additionTag)) continue;
      const t = tx(c.querySelector(S.cardTitle));
      const m = t && mobileByTitle(t);
      const vis = shown(c) || shown(m);
      const add = B.addButton(c);
      if (t && vis && add && !add.disabled && !out.includes(t)) out.push(t);
    }
    return out;
  }

  const press = (el, what) => {
    if (!el) return { pressed: false, what };
    const at = performance.now();
    el.click();
    return { pressed: true, what, element: desc(el), text: tx(el), at };
  };

  const rec = { log: [], last: {}, timer: null };
  /** The snack's checkout line and group, as checkoutRead found them, for the screenshots of exactly what was read. */
  const held = { line: null, group: null };
  const recordOnce = (titles) => {
    const t = Math.round(performance.now());
    const st = { path: location.pathname, plan: String(blockSafe(() => B.plan())), items: tx(d.querySelector(S.itemsCount)) };
    for (const s of d.querySelectorAll(S.phoneStat)) st[`phone:${tx(s.querySelector(S.phoneStatLabel))}`] = tx(s.querySelector(S.phoneStatValue));
    titles.forEach((title, i) => {
      const c = byTitle(title);
      st[`card${i}`] = !c
        ? "missing"
        : [
            c.querySelector(S.toggle) ? `toggle:${tx(c.querySelector(S.toggleLabel))}` : "no toggle",
            c.querySelector(S.addons) ? "addons" : "no addons",
            B.addButton(c) ? "add" : "no add",
            `count:${B.count(c)}`,
          ].join("|");
    });
    st.overlays = String(d.querySelectorAll(S.overlayPane).length);
    for (const k of Object.keys(st)) if (st[k] !== rec.last[k]) rec.log.push([t, k, st[k]]), (rec.last[k] = st[k]);
  };

  return {
    inventory,
    cardState,
    planState,
    chooseMeals,
    mealCount: (title) => B.count(byTitle(title)),
    pressMeal: (title) => press(B.addButton(byTitle(title)), "meal Add to Cart"),
    pressToggle: (title) => press(byTitle(title)?.querySelector(S.toggle), "Select Options / Hide Options"),
    pressAdd: (title) => press(B.addButton(byTitle(title)), "Add to Cart"),
    pressPlus: (title) => press(B.plus(byTitle(title)), 'the counter\'s "+"'),
    pressControl: (re) => press(blockSafe(() => B.control(re)), `control ${re}`),
    controlReady: (re) => {
      const b = blockSafe(() => B.control(re));
      return b && typeof b !== "string" ? tx(b) : null;
    },
    /** Open the card's Size dropdown (its trigger), read the listbox the store draws, then close it with its trigger. */
    async choices(title) {
      const c = byTitle(title);
      const trig = c && c.querySelector(S.dropdownTrigger);
      if (!trig) return { opened: false };
      const before = tx(c.querySelector(S.dropdownValue));
      trig.click();
      let opts = [];
      for (let i = 0; i < 30 && !opts.length; i++) {
        await new Promise((r) => setTimeout(r, 100));
        opts = [...d.querySelectorAll(S.listboxOption)];
      }
      const read = opts.map((o) => ({ text: tx(o), selected: o.getAttribute("aria-selected") === "true" }));
      const listbox = opts[0] ? desc(opts[0].closest("[role=listbox]")) : null;
      trig.click();
      await new Promise((r) => setTimeout(r, 500));
      return { opened: true, valueBefore: before, listbox, options: read, valueAfter: tx(c.querySelector(S.dropdownValue)), overlaysAfterClose: d.querySelectorAll(S.listboxOption).length };
    },
    /** The extras dialog, if the store opened one: its text's first words and its buttons' labels. */
    extras() {
      const x = d.querySelector(S.extrasDialog);
      if (!x) return null;
      return { element: desc(x), heading: tx(x.querySelector("h1,h2,h3,h4")), buttons: [...x.querySelectorAll("button")].map((b) => tx(b)).filter(Boolean).slice(0, 12), displayed: shown(x) };
    },
    heldLine: () => held.line,
    heldGroup: () => held.group,
    recordStart(titles, everyMs) {
      recordOnce(titles);
      rec.timer = setInterval(() => recordOnce(titles), everyMs);
      return true;
    },
    recordStop() {
      clearInterval(rec.timer);
      return rec.log;
    },
    /** /checkout, read: every line (by the block's key), the snack's line, its group and header, and the hide rules. */
    checkoutRead(snackTitle, mealTitles, rules) {
      const co = d.querySelector(S.checkout);
      const lines = [...d.querySelectorAll(S.line)].filter((l) => l.querySelector(S.lineName));
      // The name element's parts: its own text, and each child element's (the store appends a badge to an add-on's name,
      // "Add-on", so the whole text is not the card's title). A line is a card's when any part, or the whole, keys alike.
      const nameParts = (l) => {
        const n = l.querySelector(S.lineName);
        const own = [...n.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent).join(" ").replace(/\s+/g, " ").trim();
        return { whole: tx(n), own: own || null, children: [...n.children].map((k) => ({ element: desc(k), text: tx(k) })) };
      };
      const keysOf = (l) => {
        const p = nameParts(l);
        return [p.whole, p.own, ...p.children.map((k) => k.text)].filter(Boolean).map(B.key);
      };
      const nameKey = (l) => keysOf(l)[0];
      const mealKeys = new Set(mealTitles.map(B.key));
      const snackKey = B.key(snackTitle);
      const isMeal = (l) => keysOf(l).some((k) => mealKeys.has(k));
      // A line's group: its largest ancestor (below app-checkout) holding no line of the other kind (meal / not a meal).
      const groupOf = (line) => {
        let g = line;
        for (let e = line.parentElement; e && e !== co && e !== d.body; e = e.parentElement) {
          if (lines.some((l) => isMeal(l) !== isMeal(line) && e.contains(l))) break;
          g = e;
        }
        return g;
      };
      const headerOf = (g, line) =>
        g === line
          ? []
          : [...g.querySelectorAll("*")]
              .filter((e) => !line.contains(e) && !lines.some((l) => l.contains(e)) && (/header|title/.test(typeof e.className === "string" ? e.className : "") || /^H[1-6]$/.test(e.tagName)))
              .filter((e) => ![...e.children].some((k) => /header|title/.test(typeof k.className === "string" ? k.className : "")))
              .map((e) => ({ element: desc(e), text: tx(e), displayed: shown(e), hiddenBy: hiddenBy(e) }));
      const lineRead = (l) => ({
        name: tx(l.querySelector(S.lineName)),
        key: nameKey(l),
        meal: isMeal(l),
        price: tx(l.querySelector(S.linePrice)),
        addons: tx(l.querySelector(S.lineAddons)),
        quantity: tx(l.querySelector(S.lineQuantity)),
        remove: !!l.querySelector(S.lineRemove),
        displayed: shown(l),
      });
      const snackLine = lines.find((l) => keysOf(l).includes(snackKey)) || null;
      const group = snackLine ? groupOf(snackLine) : null;
      held.line = snackLine;
      held.group = group;
      // Which hide rules would hide this element: the rule matches it or one of its ancestors (el.closest).
      const hiddenBy = (el) =>
        el
          ? rules.filter((r) => {
              try {
                return !!el.closest(r.selector);
              } catch (e) {
                return false;
              }
            }).map((r) => r.h)
          : null;
      // Every element whose own text says the order is one-time (or renews), and what would hide it.
      const ONE_TIME = /one[\s-]?time|renews|recurring|subscription/i;
      const oneTime = [...d.querySelectorAll("app-checkout *")]
        .filter((e) => ONE_TIME.test([...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ")))
        .map((e) => ({ element: desc(e), text: (tx(e) || "").slice(0, 120), displayed: shown(e), path: pathIn(e, co), hiddenBy: hiddenBy(e) }));
      const rel = (el) =>
        !snackLine ? "elsewhere"
        : el === snackLine ? "the line"
        : snackLine.contains(el) ? "inside the line"
        : el.contains(snackLine) ? (el === group ? "the group" : "an ancestor of the group")
        : group && group.contains(el) ? "inside the group"
        : "elsewhere";
      const hide = rules.map((r) => {
        let els;
        try {
          els = [...d.querySelectorAll(r.selector)];
        } catch (e) {
          return { h: r.h, selector: r.selector, error: e.message };
        }
        const near = els.filter((e) => rel(e) !== "elsewhere").map((e) => ({ where: rel(e), element: desc(e), text: (tx(e) || "").slice(0, 120), displayed: shown(e) }));
        return { h: r.h, selector: r.selector, matches: els.length, elsewhere: els.length - near.length, near };
      });
      return {
        path: location.pathname,
        checkoutFound: !!co,
        lines: lines.map((l) => ({ ...lineRead(l), group: (() => {
          const g = groupOf(l);
          const h = headerOf(g, l);
          return h.length ? h.map((x) => x.text).join(" | ") : null;
        })() })),
        snack: snackLine
          ? {
              line: { ...lineRead(snackLine), nameParts: nameParts(snackLine), matchedBy: (() => {
                const p = nameParts(snackLine);
                return B.key(p.whole) === snackKey ? "the whole name" : p.own && B.key(p.own) === snackKey ? "the name's own text" : "a child of the name";
              })(), element: desc(snackLine), shape: shape(snackLine, 0, 5),
                hiddenBy: hiddenBy(snackLine),
                partsHiddenBy: [...snackLine.querySelectorAll("*")].filter((e) => e.children.length === 0 || e.matches("[class*='summary__item-']")).map((e) => ({ element: desc(e), text: (tx(e) || "").slice(0, 60), hiddenBy: hiddenBy(e) })) },
              group: group === snackLine ? null : { element: desc(group), pathFromCheckout: pathIn(group, co), hiddenBy: hiddenBy(group), header: headerOf(group, snackLine), lines: lines.filter((l) => group.contains(l)).map((l) => tx(l.querySelector(S.lineName))), outline: outline(group, 0, 6) },
              // The group's container (on 2026-10-08 the plan's own group): its children, each with what would hide it.
              container: group && group.parentElement && group.parentElement !== co
                ? { element: desc(group.parentElement), hiddenBy: hiddenBy(group.parentElement), children: [...group.parentElement.children].map((k) => ({ element: desc(k), text: k.matches(S.line) ? `[line: ${tx(k.querySelector(S.lineName))}]` : (tx(k) || "").slice(0, 120), displayed: shown(k), hiddenBy: hiddenBy(k) })) }
                : null,
            }
          : null,
        oneTime,
        mealGroup: (() => {
          const m = lines.find(isMeal);
          const g = m && groupOf(m);
          return g && g !== m ? { element: desc(g), pathFromCheckout: pathIn(g, co), header: headerOf(g, m), lines: lines.filter((l) => g.contains(l)).length, outline: outline(g, 0, 4) } : null;
        })(),
        total: (() => {
          const t = d.querySelector(S.total);
          return t ? { element: desc(t), text: tx(t), displayed: shown(t) } : null;
        })(),
        rows: [...d.querySelectorAll(S.row)].map((r) => tx(r)).slice(0, 20),
        planTotal: tx(d.querySelector(".summary__plan-total")),
        hide,
      };
    },
  };
}

/** The page's own catalog response (never a request of ours): each product's name, categories, price and Size field. */
function catalogOf(body) {
  const data = Array.isArray(body?.data) ? body.data : [];
  return data.map((p) => ({
    name: p.name,
    categories: (p.categories ?? []).map((c) => c.slug),
    price: p.effective_price ?? null,
    hasVariants: p.has_variants ?? null,
    fields: (p.addon_fields ?? []).map((f) => ({
      title: f.title,
      required: f.required,
      display: f.display_type,
      options: (f.options ?? []).map((o) => ({ name: o.name, isDefault: o.is_default, amount: o.amount })),
    })),
  }));
}

const BOX = { 1280: "card", 390: "mobile card" };

/**
 * One run at `width`. The record is the run's file: settings, the inventory, every step's reads, the recorder's log,
 * the checkout's reads, and the screenshots' names. `error` is null unless the run could not be made as asked.
 */
export async function probeSnacksRun({ origin, width, mpid, need, snack, choicesSnack, direct, shotsDir, shots = true, stamp, executablePath, now = () => new Date() }) {
  const { script, blockSha256, keySha256, hide } = await pageScript();
  const record = {
    probe: "probe-snacks (SPEC-snacks-in-the-cart § 1)",
    at: now().toISOString(),
    origin,
    path: `/order?mpid=${mpid}`,
    width,
    viewport: VIEWPORTS[width],
    mpid,
    need,
    block: { file: "src/storefront/fitaf-handoff.js", sha256: blockSha256, keySha256, functions: BLOCK_FUNCTIONS, deepSha256: hide.deepSha256 },
    hideRules: { rules: hide.rules, stepRulesNotEvaluated: hide.steps, missing: hide.missing, unlabelled: hide.unlabelled },
    selectors: SELECTORS,
    release: null,
    catalog: null,
    names: null,
    inventory: null,
    chosen: { meals: [], snack: null, choicesCard: null, direct: null },
    steps: [],
    recorder: [],
    extras: null,
    checkout: null,
    screenshots: [],
    fitafLines: [],
    pageErrors: [],
    error: null,
  };
  const step = (name, data) => record.steps.push({ step: name, t: Date.now(), ...data });
  const { browser, close } = await freshBrowser({ executablePath });
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORTS[width]);
    page.on("console", (m) => {
      if (m.text().startsWith(LOG_PREFIX)) record.fitafLines.push(cutLine(redact(m.text())));
    });
    page.on("pageerror", (e) => record.pageErrors.push(cutLine(redact(String(e?.message ?? e)))));
    let catalogBody = null;
    page.on("response", async (r) => {
      try {
        const u = new URL(r.url());
        if (/\/catalog\/products$/.test(u.pathname) && !catalogBody) {
          catalogBody = { at: `${u.host}${u.pathname}`, params: [...u.searchParams.keys()], body: await r.json() };
        }
      } catch {
        // a response with no body (a redirect, a preflight) is not the catalog
      }
    });
    // Pictures only when asked (`shots`: the CLI's --shots takes them in the first run at each width by default), each
    // of one element; a photograph-heavy one (the extras dialog) as a JPEG, so the record stays small.
    const shot = async (handle, what, jpeg = false) => {
      // No picture: the handle asked for is still awaited (and any failure of it dropped), so its promise never rejects
      // unheard when the page closes (a crash at the first run without pictures, 2026-10-08).
      if (!shots) return Promise.resolve(handle).then(() => {}, () => {});
      const file = `run-${stamp}-${width}-${String(record.screenshots.length + 1).padStart(2, "0")}-${what}.${jpeg ? "jpg" : "png"}`;
      try {
        const el = await handle;
        if (!el) throw new Error("no such element");
        await el.screenshot({ path: join(shotsDir, file), ...(jpeg ? { type: "jpeg", quality: 70 } : {}) });
        record.screenshots.push({ file, what });
      } catch (err) {
        record.screenshots.push({ file: null, what, failed: String(err?.message ?? err).slice(0, 160) });
      }
    };
    const cardHandle = (title) =>
      page.evaluateHandle((t, w, S) => {
        const tx = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
        const q = w === 1280 ? [S.card, S.cardTitle] : [S.mobileCard, S.mobileTitle];
        return [...document.querySelectorAll(q[0])].find((c) => tx(c.querySelector(q[1])) === t) || null;
      }, title, width, SELECTORS).then((h) => h.asElement());
    const one = (sel) => page.$(sel);
    // The store's toast ("… added to cart") sits over the sidebar's top for a few seconds: its picture waits for it to go.
    // At 390 the cart bar is fixed to the viewport's foot, and an element picture of it captures the page beneath: there,
    // the picture is the viewport clipped to the bar's own box.
    const cartShot = async (what) => {
      if (!shots) return;
      await poll(page, () => document.querySelectorAll(".toast-message").length === 0, undefined, Boolean, { timeoutMs: 6000, everyMs: 200 });
      if (width === 1280) return shot(one(SELECTORS.cart), `sidebar-${what}`);
      const file = `run-${stamp}-${width}-${String(record.screenshots.length + 1).padStart(2, "0")}-cart-bar-${what}.png`;
      try {
        const box = await page.evaluate((q) => {
          const r = document.querySelector(q)?.getBoundingClientRect();
          return r && r.width && r.height ? { x: Math.max(0, r.left), y: Math.max(0, r.top), width: Math.min(r.width, innerWidth), height: Math.min(r.height, innerHeight - Math.max(0, r.top)) } : null;
        }, SELECTORS.phoneSummary);
        if (!box) throw new Error("the cart bar has no box");
        await page.screenshot({ path: join(shotsDir, file), clip: box, captureBeyondViewport: false });
        record.screenshots.push({ file, what: `cart-bar-${what}` });
      } catch (err) {
        record.screenshots.push({ file: null, what: `cart-bar-${what}`, failed: String(err?.message ?? err).slice(0, 160) });
      }
    };
    const snk = (fn, ...args) => page.evaluate(fn, ...args);

    await page.goto(`${origin}${record.path}`, { waitUntil: "load", timeout: NAV_MS });
    const ready = await poll(page, (n) => document.querySelectorAll("app-product-card .product__content-title").length >= n, need, Boolean, { timeoutMs: MENU_MS, everyMs: 250 });
    if (!ready) throw new Error(`fewer than ${need} titled cards after ${MENU_MS / 1000} s`);
    await sleep(1500);
    for (let i = 0; i < 25 && !catalogBody; i++) await sleep(200);
    await page.evaluate(script);
    const inv = await snk(() => window.__snk.inventory());
    record.release = inv.release;
    record.inventory = inv;
    const additions = inv.cards.filter((c) => c.addition);
    if (catalogBody) {
      const cat = catalogOf(catalogBody.body);
      const snacks = cat.filter((p) => p.categories.includes("snacks"));
      record.catalog = { from: catalogBody.at, params: catalogBody.params, products: cat.length, snacks };
      // § 1 item 5: each addition card's title beside the catalog's name for it (matched by the block's key), and keys.
      record.names = additions.map((c) => {
        const p = cat.find((x) => mealKey(x.name) === c.key);
        return {
          title: c.title,
          mobileTitle: c.mobile?.title ?? null,
          catalogName: p?.name ?? null,
          sameText: p ? p.name === c.title : null,
          snack: p ? p.categories.includes("snacks") : null,
          key: c.key,
          catalogKey: p ? mealKey(p.name) : null,
        };
      });
    }
    const snackKeys = new Set(record.catalog?.snacks.map((p) => mealKey(p.name)) ?? []);
    const isSnack = (c) => (snackKeys.size ? snackKeys.has(c.key) : true);
    const required = (title) => record.catalog?.snacks.find((p) => mealKey(p.name) === mealKey(title))?.fields.some((f) => f.title === "Size" && f.required);
    const toggles = additions.filter((c) => c.toggle && isSnack(c));
    const snackTitle = snack ?? (toggles.find((c) => required(c.title)) ?? toggles[0])?.title;
    const choicesTitle = choicesSnack ?? (toggles.find((c) => c.title !== snackTitle && required(c.title) === false) ?? toggles.find((c) => c.title !== snackTitle))?.title;
    const directSnack = additions.find((c) => isSnack(c) && !c.toggle && c.addToCart);
    const directCard = direct ? additions.find((c) => c.title === direct) : directSnack ?? additions.find((c) => !c.toggle && c.addToCart);
    record.chosen.snack = snackTitle ?? null;
    record.chosen.choicesCard = choicesTitle ?? null;
    record.chosen.direct = directCard ? { title: directCard.title, snack: isSnack(directCard) && snackKeys.size > 0, why: directSnack ? "a snack showing Add to Cart directly" : "no snack card shows Add to Cart directly; the first addition that does" } : null;
    if (!snackTitle) throw new Error("no snack card shows Select Options");
    const meals = await snk((n) => window.__snk.chooseMeals(n), need);
    record.chosen.meals = meals;
    if (meals.length < need) throw new Error(`only ${meals.length} of ${need} meals with an enabled Add to Cart`);
    const watched = [snackTitle, ...(directCard ? [directCard.title] : [])];
    await snk((t, ms) => window.__snk.recordStart(t, ms), watched, RECORD_EVERY_MS);

    // 0. Before anything is pressed.
    await shot(cardHandle(snackTitle), `snack-${BOX[width].replace(" ", "-")}-before`);
    step("start", { snack: await snk((t) => window.__snk.cardState(t), snackTitle), plan: await snk(() => window.__snk.planState()) });

    // 1. The choices card: Select Options, the Size dropdown opened and closed, Hide Options. Nothing chosen or added.
    if (choicesTitle) {
      const before = await snk((t) => window.__snk.cardState(t), choicesTitle);
      const p1 = await snk((t) => window.__snk.pressToggle(t), choicesTitle);
      await poll(page, (t) => !!window.__snk.cardState(t).addons, choicesTitle, Boolean, { timeoutMs: ACK_MS, everyMs: 100 });
      const expanded = await snk((t) => window.__snk.cardState(t), choicesTitle);
      const choices = await snk((t) => window.__snk.choices(t), choicesTitle);
      const p2 = await snk((t) => window.__snk.pressToggle(t), choicesTitle);
      await sleep(GAP_MS + 200);
      step("choices card", { title: choicesTitle, before, pressed: [p1, p2], expanded, choices, after: await snk((t) => window.__snk.cardState(t), choicesTitle) });
    }

    // 1b. Every other snack showing Select Options: its expansion read (the Size control, whether a value is already
    // chosen, the form's validity), then its Hide Options. Nothing chosen or added.
    const survey = [];
    for (const c of toggles.filter((x) => x.title !== snackTitle && x.title !== choicesTitle)) {
      await snk((t) => window.__snk.pressToggle(t), c.title);
      await poll(page, (t) => !!window.__snk.cardState(t).actions?.addToCart, c.title, Boolean, { timeoutMs: ACK_MS, everyMs: 100 });
      const expanded = await snk((t) => window.__snk.cardState(t), c.title);
      await snk((t) => window.__snk.pressToggle(t), c.title);
      await sleep(GAP_MS);
      const after = await snk((t) => window.__snk.cardState(t), c.title);
      survey.push({ title: c.title, toggle: expanded.toggle?.label, addons: expanded.addons, addToCart: expanded.actions?.addToCart ?? null, buttons: expanded.actions?.buttons ?? null, collapsedTo: after.toggle?.label, addonsAfter: !!after.addons });
    }
    step("survey", { cards: survey });

    // 2. The plan's meals, one at a time, each once the last one's card shows its count.
    const presses = [];
    for (const title of meals) {
      const p = await snk((t) => window.__snk.pressMeal(t), title);
      const t0 = Date.now();
      const n = await poll(page, (t) => window.__snk.mealCount(t), title, (k) => k >= 1, { timeoutMs: ACK_MS, everyMs: 100 });
      presses.push({ title, pressed: p.pressed, counted: n >= 1, ms: Date.now() - t0 });
      if (!p.pressed) throw new Error(`meal ${title}: no Add to Cart`);
      await sleep(GAP_MS);
    }
    await sleep(SETTLE_MS);
    step("meals", { presses, plan: await snk(() => window.__snk.planState()) });
    await cartShot("meals");

    // 3. The snack: Select Options, then Add to Cart, then its "+".
    const s0 = await snk((t) => window.__snk.cardState(t), snackTitle);
    const pt = await snk((t) => window.__snk.pressToggle(t), snackTitle);
    const t1 = Date.now();
    await poll(page, (t) => !!window.__snk.cardState(t).actions?.addToCart, snackTitle, Boolean, { timeoutMs: ACK_MS, everyMs: 100 });
    const expandMs = Date.now() - t1;
    await sleep(GAP_MS);
    const s1 = await snk((t) => window.__snk.cardState(t), snackTitle);
    step("snack Select Options", { before: s0, pressed: pt, expandMs, after: s1, plan: await snk(() => window.__snk.planState()) });
    await shot(cardHandle(snackTitle), `snack-${BOX[width].replace(" ", "-")}-after-select-options`);

    const pa = await snk((t) => window.__snk.pressAdd(t), snackTitle);
    const t2 = Date.now();
    const c1 = await poll(page, (t) => window.__snk.cardState(t).block.count, snackTitle, (k) => k >= 1, { timeoutMs: ACK_MS, everyMs: 100 });
    const countMs = Date.now() - t2;
    await sleep(SETTLE_MS);
    step("snack Add to Cart", { pressed: pa, counted: c1 >= 1, countMs, after: await snk((t) => window.__snk.cardState(t), snackTitle), plan: await snk(() => window.__snk.planState()) });
    await shot(cardHandle(snackTitle), `snack-${BOX[width].replace(" ", "-")}-after-add-to-cart`);
    await cartShot("snack-1-unit");

    const pp = await snk((t) => window.__snk.pressPlus(t), snackTitle);
    const t3 = Date.now();
    const c2 = pp.pressed ? await poll(page, (t) => window.__snk.cardState(t).block.count, snackTitle, (k) => k >= 2, { timeoutMs: ACK_MS, everyMs: 100 }) : null;
    const plusMs = Date.now() - t3;
    await sleep(SETTLE_MS);
    step('snack "+"', { pressed: pp, counted: c2 >= 2, countMs: plusMs, after: await snk((t) => window.__snk.cardState(t), snackTitle), plan: await snk(() => window.__snk.planState()) });
    await shot(cardHandle(snackTitle), `snack-${BOX[width].replace(" ", "-")}-2-units`);
    await cartShot("snack-2-units");

    // 4. An addition whose card shows Add to Cart directly.
    if (directCard) {
      const d0 = await snk((t) => window.__snk.cardState(t), directCard.title);
      const pd = await snk((t) => window.__snk.pressAdd(t), directCard.title);
      const t4 = Date.now();
      const c3 = await poll(page, (t) => window.__snk.cardState(t).block.count, directCard.title, (k) => k >= 1, { timeoutMs: ACK_MS, everyMs: 100 });
      const dMs = Date.now() - t4;
      await sleep(SETTLE_MS);
      step("direct Add to Cart", { title: directCard.title, before: d0, pressed: pd, counted: c3 >= 1, countMs: dMs, after: await snk((t) => window.__snk.cardState(t), directCard.title), plan: await snk(() => window.__snk.planState()) });
      await shot(cardHandle(directCard.title), `direct-${BOX[width].replace(" ", "-")}-after-add-to-cart`);
    }

    // 4b. § 1's stop condition, tried: each snack whose required Size showed no chosen value in the survey, expanded
    // again and its Add to Cart pressed ONCE, nothing chosen (the block never chooses a size): does the store count it?
    for (const u of survey.filter((s) => s.addons?.items.some((i) => i.required && i.chosen === false)).slice(0, 2)) {
      await snk((t) => window.__snk.pressToggle(t), u.title);
      await poll(page, (t) => !!window.__snk.cardState(t).actions?.addToCart, u.title, Boolean, { timeoutMs: ACK_MS, everyMs: 100 });
      await sleep(GAP_MS);
      const before = await snk((t) => window.__snk.cardState(t), u.title);
      await shot(cardHandle(u.title), `unchosen-${BOX[width].replace(" ", "-")}-expanded`);
      const pu = await snk((t) => window.__snk.pressAdd(t), u.title);
      const t6 = Date.now();
      const cu = await poll(page, (t) => window.__snk.cardState(t).block.count, u.title, (k) => k >= 1, { timeoutMs: ACK_MS, everyMs: 100 });
      const uMs = Date.now() - t6;
      const soon = await snk((t) => window.__snk.cardState(t), u.title);
      await sleep(SETTLE_MS);
      step("unchosen Add to Cart", { title: u.title, before, pressed: pu, counted: cu >= 1, waitedMs: uMs, soon, after: await snk((t) => window.__snk.cardState(t), u.title), plan: await snk(() => window.__snk.planState()) });
      await shot(cardHandle(u.title), `unchosen-${BOX[width].replace(" ", "-")}-after-add-to-cart`);
    }
    record.recorder = await snk(() => window.__snk.recordStop());

    // 5. CHECKOUT, as the block finds it, once enabled; the extras dialog's CONTINUE TO CHECKOUT if the store opens it.
    const CHECKOUT = /^checkout( now)?$/i;
    const label = await poll(page, () => window.__snk.controlReady(/^checkout( now)?$/i), undefined, Boolean, { timeoutMs: CHECKOUT_READY_MS, everyMs: 200 });
    step("before CHECKOUT", { control: label ?? null, plan: await snk(() => window.__snk.planState()) });
    if (!label) throw new Error("no enabled CHECKOUT within 10 s");
    const pc = await snk(() => window.__snk.pressControl(/^checkout( now)?$/i));
    const t5 = Date.now();
    const where = await poll(page, () => (location.pathname === "/checkout" ? "checkout" : document.querySelector("app-extra-products-dialog") ? "extras" : null), undefined, Boolean, { timeoutMs: AFTER_CHECKOUT_MS, everyMs: 200 });
    record.extras = { opened: where === "extras", afterMs: Date.now() - t5 };
    if (where === "extras") {
      record.extras.dialog = await snk(() => window.__snk.extras());
      await shot(one(SELECTORS.extrasDialog), "extras-dialog", true);
      const pcc = await snk(() => window.__snk.pressControl(/^continue to checkout$/i));
      record.extras.pressed = pcc;
      await poll(page, () => location.pathname === "/checkout", undefined, Boolean, { timeoutMs: AFTER_CHECKOUT_MS, everyMs: 200 });
    }
    step("CHECKOUT", { pressed: pc, label: CHECKOUT.source, path: await snk(() => location.pathname), ms: Date.now() - t5 });
    if ((await snk(() => location.pathname)) !== "/checkout") throw new Error("/checkout not reached");

    // 6. /checkout, read only.
    await poll(page, (t) => [...document.querySelectorAll(".summary__item .summary__item-name")].length > 0 && !!document.querySelector(".summary__total"), snackTitle, Boolean, { timeoutMs: AFTER_CHECKOUT_MS, everyMs: 250 });
    await sleep(2000);
    record.checkout = await snk((t, m, r) => window.__snk.checkoutRead(t, m, r), snackTitle, meals, hide.rules);
    await shot(page.evaluateHandle(() => window.__snk.heldLine()).then((h) => h.asElement()), "checkout-snack-line");
    await shot(page.evaluateHandle(() => window.__snk.heldGroup()).then((h) => h.asElement()), "checkout-snack-group");
  } catch (err) {
    record.error = `the probe failed: ${String(err?.message ?? err)}`;
  } finally {
    await close();
  }
  return record;
}
