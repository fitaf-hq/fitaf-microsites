// SPEC-rung2-progress-and-checkout § 5, "Live, in the watch's smoke": W10–W13, added to F5's pass (lib/smoke.mjs runs
// them at each width; lib/smoke-verdict.mjs's rule is unchanged, and a width passes only if both pass).
//   W10  the progress screen during the run: seen after the first press, and gone at done;
//   W11  ⭐ § 3 item 4 on /checkout: the displayed controls inside app-checkout with style#fitaf-deep enabled, then
//        disabled (then enabled again), equal except H3, H4 and H6; a pay button displayed in both (§ 9: the displayed
//        one of `.checkout__submit button` and the summary's mobile bar's `.summary__pay-button`, the phone's PAY NOW);
//   W12  each of H1–H6 on the checkout: found, and hidden while the style is on (a missing one fails open: it shows).
//        § 9: H1, H2's .footer, H3 and H4 are REQUIRED; H2's .app-hmp-credit, H5 and H6 are CONDITIONAL, reported
//        found or absent, and their absence is never a failure (a rename of one is F2's to catch, in the bundle);
//   W13  the order is one-time: no active subscription switch and no "renews every" line on the deep-carted checkout;
//   W14  (§ 10) H7–H10 reported, found or absent (the discounts, the app banner, the price rows, the tip: each
//        conditional, each found one hidden while our style is on; the smoke's links carry no offer code and choose no
//        tip); the Total (.summary__total) displayed; W11's payment check as § 10 re-states it: the controls hidden are
//        exactly H3, H4, H6, H7, H8 and H10's.
// Two functions run IN THE PAGE (recordFaces, from before the page's own scripts; readFaces, on /checkout after done);
// they read, and toggle our own style for W11, and press and type nothing. facesVerdict is the rule, tested on recorded
// outcomes (W10a–W13a). This is the watch's own reading of the contract: the site's R2 cases in test/r2-*.test.mjs
// measure the same page with their own readers.

/** The screen's element and the checkout's mark and style (src/storefront/fitaf-handoff.js). */
export const SCREEN_ID = "fitaf-screen";
export const STYLE_ID = "fitaf-deep";
/**
 * The hide list, as SPEC-rung2-progress-and-checkout § 3 item 3 and § 10 name it (the store's own names, release
 * main-2HXLHIG7.js). `mayHideControls`: W11 allows exactly these targets' controls to be hidden (§ 10's re-statement:
 * H3, H4, H6, H7, H8 and H10). `check`: the case that reports it (W12 for H1–H6, W14 for H7–H10). H6 is the offer to
 * subscribe only while it is off: a switch there and no active one (R2-51b). H9 never a row holding the Total; H10 only
 * while no tip is chosen.
 */
export const HIDE = [
  { id: "H1", selectors: [".sticky-header"], mayHideControls: false, check: "W12" },
  { id: "H2", selectors: [".footer", ".app-hmp-credit"], mayHideControls: false, check: "W12" },
  { id: "H3", selectors: ["a.checkout__guest-signin-banner"], mayHideControls: true, check: "W12" },
  { id: "H4", selectors: ["a.contact__sign-in"], mayHideControls: true, check: "W12" },
  { id: "H5", selectors: ["app-storefront-popup-host"], mayHideControls: false, check: "W12" },
  {
    id: "H6",
    selectors: [".summary__plan-subscription-controls:has(.summary__subscription-toggle):not(:has(.summary__subscription-toggle--active))"],
    mayHideControls: true,
    check: "W12",
  },
  { id: "H7", selectors: [".checkout-discounts"], mayHideControls: true, check: "W14" },
  { id: "H8", selectors: [".smartbanner"], mayHideControls: true, check: "W14" },
  { id: "H9", selectors: [".summary__row:not(.summary__row--discount,:has(.summary__total))"], mayHideControls: false, check: "W14" },
  {
    id: "H10",
    selectors: [":is(section.checkout__section.tip,app-tip-selector):not(:has(.tip-selector__remove-btn))"],
    mayHideControls: true,
    check: "W14",
  },
];
/**
 * § 9: the targets the store renders only in some cases (its credit line is its footer's fallback; a plan may offer no
 * subscription; a pop-up host may not be there): reported found or absent, never a failure for being absent.
 */
export const CONDITIONAL = [
  ".app-hmp-credit",
  "app-storefront-popup-host",
  ".summary__plan-subscription-controls:has(.summary__subscription-toggle):not(:has(.summary__subscription-toggle--active))",
  ...HIDE.filter((h) => h.check === "W14").flatMap((h) => h.selectors),
];
/** § 10 item 4 (W14): the Total, never hidden; on a phone the only place the visitor sees what they will pay. */
export const TOTAL = ".summary__total";
/** § 3 item 4: the controls that are measured. */
export const CONTROLS = "input, select, textarea, button, iframe, a[href], [role=switch], [role=radio]";
/**
 * § 9: the pay button is a displayed button in one of these: the form's .checkout__submit (above 1024 px) or the
 * summary's mobile bar's .summary__pay-button (1024 px and narrower, "PAY NOW"). Its label varies with the payment.
 */
export const PAY = [".checkout__submit", ".summary__pay-button"];
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
export function readFaces({ hide, controls, pay, total: totalSel, style: styleId }) {
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
    const isPay = (el) => el.tagName === "BUTTON" && Boolean(el.closest(pay.join(",")));
    const withStyle = measure();
    style.disabled = true;
    const without = measure();
    const inside = hide.filter((h) => h.mayHideControls).flatMap((h) => h.selectors);
    const allowed = without.filter((el) => inside.some((sel) => el.matches(sel) || el.closest(sel)));
    const hideCounts = hide.flatMap((h) => h.selectors.map((selector) => ({ id: h.id, selector, found: document.querySelectorAll(selector).length })));
    style.disabled = false;
    out.payment = {
      hidden: without.filter((el) => !withStyle.includes(el)).map(describe).sort(),
      allowed: allowed.map(describe).sort(),
      added: withStyle.filter((el) => !without.includes(el)).map(describe).sort(),
      payWith: withStyle.some(isPay),
      payWithout: without.some(isPay),
      payShown: withStyle.filter(isPay).map(describe),
      counts: { with: withStyle.length, without: without.length },
    };
    out.hide = hideCounts.map((h) => ({ ...h, displayed: [...document.querySelectorAll(h.selector)].filter(shown).length }));
    const totals = [...document.querySelectorAll(totalSel)];
    out.total = { found: totals.length, displayed: totals.filter(shown).length };
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

const REQUIRED_FOUND = (faces) => faces.hide.every((h) => h.found > 0 || CONDITIONAL.includes(h.selector));

/**
 * W11–W14's readings, read again until every REQUIRED target of H1–H6 and the Total are found, or FACES_MS has
 * passed. The conditional ones are reported as they are at that reading.
 */
export async function readCheckoutFaces(page, poll) {
  const arg = { hide: HIDE, controls: CONTROLS, pay: PAY, total: TOTAL, style: STYLE_ID };
  return poll(page, readFaces, arg, (f) => f.payment !== null && REQUIRED_FOUND(f) && f.total?.found > 0, { timeoutMs: FACES_MS, everyMs: 500 });
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
    // § 9: a conditional target's absence is reported (facesSummary), never a failure. H7–H10 are W14's (§ 10).
    const check = HIDE.find((x) => x.id === h.id)?.check ?? "W12";
    if (!h.found && !CONDITIONAL.includes(h.selector)) {
      reasons.push(`${check}: ${h.id} ${h.selector} not found on /checkout: nothing there to hide, so a renamed one shows (fails open)`);
    } else if (h.found && h.displayed) {
      reasons.push(`${check}: ${h.id} ${h.selector} found and still displayed with the style (${h.displayed})`);
    }
  }
  if (c.style && c.total) {
    if (!c.total.found) reasons.push("W14: no .summary__total on /checkout: the Total the visitor pays is not shown");
    else if (!c.total.displayed) reasons.push("W14: the Total (.summary__total) is not displayed with the style");
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
  const pay = p ? `${p.counts.without} controls in app-checkout, ${p.hidden.length} hidden by the style (H3, H4, H6: ${p.allowed.length}), pay button ${p.payWith && p.payWithout ? `displayed (${(p.payShown ?? []).join(", ")})` : "NOT displayed"}` : "no measure";
  const many = (id) => (c.hide ?? []).filter((h) => h.id === id).length > 1;
  const found = (c.hide ?? [])
    .map((h) => {
      const name = many(h.id) ? `${h.id} ${h.selector}` : h.id;
      if (!h.found) return `${name} ${CONDITIONAL.includes(h.selector) ? "absent" : "MISSING"}`;
      return h.displayed ? `${name} SHOWN` : name;
    })
    .join(", ");
  const once = c.oneTime && !c.oneTime.activeSwitches && !c.oneTime.renews.length ? "one-time" : "NOT one-time";
  const total = c.total ? (c.total.displayed ? "Total displayed" : c.total.found ? "Total NOT displayed" : "no Total") : "Total not read";
  return `${screen}; ${pay}; hide list: ${found}; ${total}; ${once}`;
}
