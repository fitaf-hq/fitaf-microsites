// SPEC-rung2-progress-and-checkout § 5, "Live, in the watch's smoke": W10–W13, added to F5's pass (lib/smoke.mjs runs
// them at each width; lib/smoke-verdict.mjs's rule is unchanged, and a width passes only if both pass).
//   W10  the progress screen during the run: seen after the first press, and gone at done;
//   W11  ⭐ § 3 item 4 on /checkout: the displayed controls inside app-checkout with style#fitaf-deep enabled, then
//        disabled (then enabled again), equal except H3, H4 and H6; the pay button displayed in both;
//   W12  each of H1–H6 on the checkout: found, and hidden while the style is on (a missing one fails open: it shows);
//   W13  the order is one-time: no active subscription switch and no "renews every" line on the deep-carted checkout.
// Two functions run IN THE PAGE (recordFaces, from before the page's own scripts; readFaces, on /checkout after done);
// they read, and toggle our own style for W11, and press and type nothing. facesVerdict is the rule, tested on recorded
// outcomes (W10a–W13a). This is the watch's own reading of the contract: the site's R2 cases in test/r2-*.test.mjs
// measure the same page with their own readers.

/** The screen's element and the checkout's mark and style (src/storefront/fitaf-handoff.js). */
export const SCREEN_ID = "fitaf-screen";
export const STYLE_ID = "fitaf-deep";
/**
 * The hide list, as SPEC-rung2-progress-and-checkout § 3 item 3 names it (the store's own names, release
 * main-2HXLHIG7.js). `inCheckout`: inside app-checkout, where W11 allows exactly these to be hidden. H6 is the offer
 * to subscribe only while it is off: a switch there and no active one (the build's reading, R2-51b: a plan that
 * requires a subscription has no switch, and is never hidden).
 */
export const HIDE = [
  { id: "H1", selectors: [".sticky-header"], inCheckout: false },
  { id: "H2", selectors: [".footer", ".app-hmp-credit"], inCheckout: false },
  { id: "H3", selectors: ["a.checkout__guest-signin-banner"], inCheckout: true },
  { id: "H4", selectors: ["a.contact__sign-in"], inCheckout: true },
  { id: "H5", selectors: ["app-storefront-popup-host"], inCheckout: false },
  {
    id: "H6",
    selectors: [".summary__plan-subscription-controls:has(.summary__subscription-toggle):not(:has(.summary__subscription-toggle--active))"],
    inCheckout: true,
  },
];
/** § 3 item 4: the controls that are measured. */
export const CONTROLS = "input, select, textarea, button, iframe, a[href], [role=switch], [role=radio]";
/** The pay button: a button inside the store's .checkout__submit (its label varies with the payment method). */
export const PAY = ".checkout__submit button";
/** How long W12 waits for each of H1–H6 to render on /checkout (the store renders its pop-up host deferred). */
export const FACES_MS = 10_000;

/**
 * In the page, from before its own scripts (page.evaluateOnNewDocument): record, in order, the screen arriving, each
 * text its step line shows, the style arriving, the mark, and the screen going. Into window.__fitafFaces.
 */
export function recordFaces({ screen, style }) {
  const events = [];
  window.__fitafFaces = events;
  let last = null;
  const t0 = performance.now();
  const push = (e, extra = {}) => events.push({ e, t: Math.round(performance.now() - t0), ...extra });
  new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (n.id === screen) push("screen+");
        if (n.id === style) push("style+");
      }
      for (const n of r.removedNodes) if (n.id === screen) push("screen-");
      if (r.type === "attributes" && r.target === document.documentElement && document.documentElement.classList.contains(style)) {
        if (!events.some((x) => x.e === "mark")) push("mark");
      }
      const s = document.getElementById(screen);
      const line = s && s.contains(r.target) ? s.querySelector('[role="status"]')?.textContent ?? null : null;
      if (line && line !== last) {
        last = line;
        push("step", { text: line });
      }
    }
  }).observe(document, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"] });
}

/** In the page: what recordFaces recorded, and whether the screen is on the page now. */
export function readRecorded(screen) {
  return { events: window.__fitafFaces ?? [], screenAtEnd: Boolean(document.getElementById(screen)) };
}

/**
 * In the page, on /checkout after done: W11–W13's readings. Each control is described by its tag, first class, name
 * and label, so a report can name it; the sets are compared by element. The style is disabled only for W11's second
 * reading, and enabled again before anything else is read.
 */
export function readFaces({ hide, controls, pay, style: styleId }) {
  const style = document.getElementById(styleId);
  const checkout = document.querySelector("app-checkout");
  const shown = (el) => el.getClientRects().length > 0;
  const describe = (el) => {
    const cls = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean)[0];
    const name = el.getAttribute("name");
    const label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""}${name ? `[name=${name}]` : ""}${label ? ` "${label}"` : ""}`;
  };
  const out = {
    path: location.pathname,
    style: Boolean(style),
    mark: document.documentElement.classList.contains(styleId),
    payment: null,
    hide: [],
    oneTime: null,
  };
  if (checkout && style) {
    const measure = () => [...checkout.querySelectorAll(controls)].filter(shown);
    const withStyle = measure();
    style.disabled = true;
    const without = measure();
    const inside = hide.filter((h) => h.inCheckout).flatMap((h) => h.selectors);
    const allowed = without.filter((el) => inside.some((sel) => el.matches(sel) || el.closest(sel)));
    const hideCounts = hide.flatMap((h) => h.selectors.map((selector) => ({ id: h.id, selector, found: document.querySelectorAll(selector).length })));
    style.disabled = false;
    out.payment = {
      hidden: without.filter((el) => !withStyle.includes(el)).map(describe).sort(),
      allowed: allowed.map(describe).sort(),
      added: withStyle.filter((el) => !without.includes(el)).map(describe).sort(),
      payWith: withStyle.some((el) => el.matches(pay)),
      payWithout: without.some((el) => el.matches(pay)),
      counts: { with: withStyle.length, without: without.length },
    };
    out.hide = hideCounts.map((h) => ({ ...h, displayed: [...document.querySelectorAll(h.selector)].filter(shown).length }));
  } else {
    out.hide = hide.flatMap((h) => h.selectors.map((selector) => ({ id: h.id, selector, found: document.querySelectorAll(selector).length, displayed: null })));
  }
  const scope = checkout || document.body;
  const renews = [];
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.nodeValue.replace(/\s+/g, " ").trim();
    if (/renews every/i.test(t) && !n.parentElement?.closest("script,style,template")) renews.push(t.slice(0, 120));
  }
  out.oneTime = {
    activeSwitches: scope.querySelectorAll('.summary__subscription-toggle--active, [role="switch"][aria-checked="true"]').length,
    renews,
  };
  return out;
}

const ALL_FOUND = (faces) => faces.hide.every((h) => h.found > 0);

/** W11–W13's readings, read again until every one of H1–H6 is found or FACES_MS has passed. */
export async function readCheckoutFaces(page, poll) {
  const arg = { hide: HIDE, controls: CONTROLS, pay: PAY, style: STYLE_ID };
  return poll(page, readFaces, arg, (f) => f.payment !== null && ALL_FOUND(f), { timeoutMs: FACES_MS, everyMs: 500 });
}

/**
 * The rule. `faces`: { done, events, screenAtEnd, checkout } (checkout: readFaces's result, or null when fill B did not
 * reach done). Returns { reasons }: none is a pass. A run that did not reach done is already failed by the smoke's own
 * rule; here only W10's "the screen goes" is judged for it.
 */
export function facesVerdict(faces) {
  const reasons = [];
  const kinds = (faces.events ?? []).map((e) => e.e);
  if (faces.screenAtEnd) reasons.push("W10: the progress screen is still on the page at the end of the run");
  if (!faces.done) return { reasons };
  if (!kinds.includes("screen+")) reasons.push("W10: the progress screen never appeared");
  else if (!(faces.events ?? []).some((e) => e.e === "step" && e.text)) reasons.push("W10: the screen never showed a meal added (nothing after the first press)");
  if (!faces.screenAtEnd && kinds.includes("screen+") && !kinds.includes("screen-")) reasons.push("W10: the screen's going was not seen");

  const c = faces.checkout;
  if (!c) return { reasons: [...reasons, "W11–W13: /checkout was not read"] };
  if (!c.style) reasons.push("W11: no style#fitaf-deep on /checkout: the checkout was not stripped");
  const p = c.payment;
  if (c.style && !p) reasons.push("W11: no app-checkout on /checkout to measure");
  if (p) {
    const extra = p.hidden.filter((x) => !p.allowed.includes(x));
    const kept = p.allowed.filter((x) => !p.hidden.includes(x));
    if (extra.length) reasons.push(`W11: the style hides controls that are not H3, H4 or H6: ${extra.join("; ")}`);
    if (kept.length) reasons.push(`W11: H3, H4 or H6's controls still displayed with the style: ${kept.join("; ")}`);
    if (p.added.length) reasons.push(`W11: controls displayed only with the style: ${p.added.join("; ")}`);
    if (!p.payWith || !p.payWithout) {
      reasons.push(`W11: the pay button is not displayed ${!p.payWith && !p.payWithout ? "with the style or without it" : !p.payWith ? "with the style" : "without the style"}`);
    }
  }
  for (const h of c.hide ?? []) {
    if (!h.found) reasons.push(`W12: ${h.id} ${h.selector} not found on /checkout: nothing there to hide, so a renamed one shows (fails open)`);
    else if (h.displayed) reasons.push(`W12: ${h.id} ${h.selector} found and still displayed with the style (${h.displayed})`);
  }
  if (c.oneTime?.activeSwitches) reasons.push(`W13: an active subscription switch on /checkout (${c.oneTime.activeSwitches}): the order is not one-time`);
  if (c.oneTime?.renews?.length) reasons.push(`W13: a "renews every" line on /checkout: ${c.oneTime.renews.join("; ")}`);
  return { reasons };
}

/** A one-line summary of the faces for the report. */
export function facesSummary(faces) {
  if (!faces) return "not recorded";
  const kinds = (faces.events ?? []).map((e) => e.e);
  const steps = (faces.events ?? []).filter((e) => e.e === "step").length;
  const screen = kinds.includes("screen+") ? `the screen seen (${steps} step lines), ${faces.screenAtEnd ? "STILL UP at the end" : "gone"}` : "the screen never seen";
  const c = faces.checkout;
  if (!c) return `${screen}; /checkout not read`;
  const p = c.payment;
  const pay = p ? `${p.counts.without} controls in app-checkout, ${p.hidden.length} hidden by the style (H3, H4, H6: ${p.allowed.length}), pay button ${p.payWith && p.payWithout ? "displayed" : "NOT displayed"}` : "no measure";
  const found = (c.hide ?? []).map((h) => `${h.id}${h.found ? (h.displayed ? " shown" : "") : " missing"}`).join(" ");
  const once = c.oneTime && !c.oneTime.activeSwitches && !c.oneTime.renews.length ? "one-time" : "NOT one-time";
  return `${screen}; ${pay}; hide list: ${found}; ${once}`;
}
