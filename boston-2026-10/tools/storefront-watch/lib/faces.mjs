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
//        exactly H3, H4, H6, H7, H8 and H10's;
//   W15  (§ 12, a report, not a pass rule) whether the store's extras pop-up opened (expected: not, since fill B sets the
//        store's own key before CHECKOUT) and the seconds from fill B's press of CHECKOUT to /checkout: from the last
//        step line (written just after that press) to the store's app-checkout arriving;
//   W16  (§ 15.3, § 15.5) the Fit AF logo, the store's own header image in an img of ours, alt "Fit AF": on the progress
//        screen (the recorder notes it arriving there) and on the deep-carted checkout (first in app-checkout, found and
//        displayed), each reported found or absent; ABSENT FAILS THE WIDTH. Its own rule, logoVerdict, beside
//        facesVerdict (lib/smoke.mjs runs both), judged only once fill B reached done, as W11–W14.
//   W18  (§ 19) each order line's price, portion, quantity and remove (H11–H14) and the plan's total row (H15): each
//        conditional, each found one hidden while our style is on (judged as W14's); and the lines' height, first top
//        to last bottom with our style, reported with what fourteen lines would take of a phone's 844 px;
//   W19  (§ 21) the plan group's header and its return link (H16, H17): hidden or absent; one found and still displayed
//        with our style fails the width (judged as W14's and W18's);
//   W17  (§ 17.4, a report, not a pass rule) per slide of the progress screen, whether it showed Fit AF's sheet: an img
//        on a host of the block's fixed list (the site's src/storefront/photo-hosts.js), shown (loaded), failed (the
//        browser reported an error: the slide fell back to today's rule), asked (neither seen) or not found.
//   W20  (§ 25, the three-step checkout; § 25.5 names it "a new W19", but W19 is § 21's) the walk: when the block draws
//        its steps (its foot, #fitaf-nav, in app-checkout), the checkout is read at step 1 (done), then after the
//        block's own Continue (step 2), then after Continue again (step 3). ⚠ The smoke types nothing, so on a store
//        whose step-2 fields are required Continue REFUSES at step 2 (§ 25.3, as it must): the refusal is recorded (the
//        control the block focused, and whether it is ng-invalid) and step 3 is entered by setting the block's own class
//        (html.fitaf-step-3), which reads exactly what step 3 displays. At each step: § 25.2's sections (each step's own
//        displayed, the others' hidden), the Total displayed, and W11's measure with that step's own allowance (the
//        controls of the steps not shown); the pay button displayed at step 3 and at no other (§ 25.2, W11 as amended).
//        The hide list (W12, W14, W18, W19) is judged over every step (a target displayed at any step fails), the lines
//        (W18) and the logo (W16) at step 1. A block from before § 25 (no foot): one reading at done, as before, and
//        W20 says so; a report, not a failure, so the hourly smoke of the live block before the paste is unchanged.
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
  // § 19: editing taken out of the checkout; each line its photograph and name only, and no plan total.
  { id: "H11", selectors: [".summary__item-price"], mayHideControls: false, check: "W18" },
  { id: "H12", selectors: [".summary__item-addons"], mayHideControls: false, check: "W18" },
  { id: "H13", selectors: [".summary__item-quantity-controls"], mayHideControls: true, check: "W18" },
  { id: "H14", selectors: [".summary__item-remove"], mayHideControls: true, check: "W18" },
  { id: "H15", selectors: [".summary__plan-total"], mayHideControls: false, check: "W18" },
  // § 21: the plan group's header (its "Remove plan" button) and its return link.
  { id: "H16", selectors: [".summary__plan-group-header"], mayHideControls: true, check: "W19" },
  { id: "H17", selectors: [".summary__plan-return"], mayHideControls: true, check: "W19" },
];
/**
 * § 9: the targets the store renders only in some cases (its credit line is its footer's fallback; a plan may offer no
 * subscription; a pop-up host may not be there): reported found or absent, never a failure for being absent.
 */
export const CONDITIONAL = [
  ".app-hmp-credit",
  "app-storefront-popup-host",
  ".summary__plan-subscription-controls:has(.summary__subscription-toggle):not(:has(.summary__subscription-toggle--active))",
  ...HIDE.filter((h) => ["W14", "W18", "W19"].includes(h.check)).flatMap((h) => h.selectors),
];
/** § 19 (W18): an order line, and a phone's height, against which fourteen lines are measured. */
export const LINE = ".summary__item";
export const PHONE_HEIGHT = 844;
const FOURTEEN = 14;
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
/** § 15.3 (W16): a Fit AF logo of ours, on the screen or in app-checkout. The store's own header logo is neither. */
export const LOGO = 'img[alt="Fit AF"]';
/** § 25 (W20): the block's own step elements: its foot (Back), Continue. Their presence is a block that draws steps. */
export const STEP_NAV = "fitaf-nav";
export const STEP_GO = "fitaf-go";
/**
 * § 27 (the live release's checkout, replacing § 25.2's synthetic names): step 2's sections, each a .checkout__section
 * with its modifier; the store renders the delivery address and method for delivery, the pickup location for pickup.
 */
export const STEP2 = ["contact", "order-type", "delivery-address", "delivery-method", "schedule", "pickup-location", "special-requests"].map((m) => `.checkout__section.${m}`);
/**
 * § 25.2's table, by what each step shows: each found one displayed at its step and hidden at the others (W20). Step 3's
 * tip is left out: H10 hides it while none is chosen (W14), so its being hidden at step 3 is not a fault.
 */
export const STEPS = [
  { step: 1, shows: [".summary__item"] },
  { step: 2, shows: STEP2 },
  { step: 3, shows: [".checkout__section.payment", ".checkout__section.checkout__consent"] },
];
/** How long the walk waits for a press of the block's Continue to show the next step. */
export const STEP_MS = 2_000;

/**
 * In the page, from before its own scripts (page.evaluateOnNewDocument): record, in order, the screen arriving, each
 * text its step line shows, the style arriving, the mark, and the screen going. Into window.__fitafFaces.
 */
export function recordFaces({ screen, style, logo, hosts = [] }) {
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
        const has = (tag) => n.nodeType === 1 && (n.localName === tag || n.querySelector(tag));
        if (has("app-extra-products-dialog") && !events.some((x) => x.e === "extras+")) push("extras+");
        if (has("app-checkout") && !events.some((x) => x.e === "checkout+")) push("checkout+");
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
    // W17: each slide of the carousel, once, as it arrives: the src of its img on a listed host (Fit AF's sheet), or
    // null; and that img's load or error, once.
    for (const el of document.getElementById(screen)?.querySelector(".c")?.children ?? []) {
      if (el.__fitafSlide) continue;
      el.__fitafSlide = true;
      const name = (el.querySelector("b")?.textContent ?? "").replace(/\s+/g, " ").trim();
      const img = [...el.querySelectorAll("img")].find((i) => hosts.some((h) => (i.getAttribute("src") ?? "").startsWith(`${h}/`)));
      push("slide", { name, src: img ? img.getAttribute("src") : null });
      if (!img) continue;
      if (img.complete && img.naturalWidth) push("sheet", { name, ok: true });
      else {
        img.addEventListener("load", () => push("sheet", { name, ok: true }), { once: true });
        img.addEventListener("error", () => push("sheet", { name, ok: false }), { once: true });
      }
    }
    // W16: the Fit AF logo arriving on the screen, once.
    const mark = document.getElementById(screen)?.querySelector(logo);
    if (mark && !events.some((x) => x.e === "logo")) push("logo", { src: mark.getAttribute("src") });
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
export function readFaces({ hide, controls, pay, total: totalSel, style: styleId, logo, line = ".summary__item", step = null, step2 = [], sections = [] }) {
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
    // § 25 (W20): at a step, the controls of the steps not shown are hidden by design (the form at step 1; at step 2
    // the form but step 2's sections, and the lines; at step 3 step 2's sections and the lines), and so is the pay
    // button before step 3. With no step (a block from before § 25), none.
    const offStep = (el) => {
      const form = el.closest(".checkout__form");
      const two = step2.length && el.closest(step2.join(","));
      const lines = el.closest(line);
      if (step === 1) return Boolean(form || isPay(el));
      if (step === 2) return Boolean((form && !two) || lines || isPay(el));
      if (step === 3) return Boolean(two || lines);
      return false;
    };
    const allowed = without.filter((el) => inside.some((sel) => el.matches(sel) || el.closest(sel)) || offStep(el));
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
    out.sections = Object.fromEntries(sections.map((sel) => {
      const all = [...document.querySelectorAll(sel)];
      return [sel, { found: all.length, displayed: all.filter(shown).length }];
    }));
  } else {
    out.hide = hide.flatMap((h) => h.selectors.map((selector) => ({ id: h.id, selector, found: document.querySelectorAll(selector).length, displayed: null })));
  }
  // W18: the order lines displayed (with our style, as the visitor sees them), first top to last bottom.
  const lines = checkout ? [...checkout.querySelectorAll(line)].filter(shown) : [];
  out.lines = { count: lines.length, height: lines.length ? Math.round(lines[lines.length - 1].getBoundingClientRect().bottom - lines[0].getBoundingClientRect().top) : 0 };
  // W16: the Fit AF logo in the checkout component, found and displayed: a CHILD of app-checkout, where the block puts it,
  // so an image of the store's own inside the checkout, whatever its alt, is never read as ours.
  const logos = checkout ? [...checkout.querySelectorAll(`:scope > ${logo}`)] : [];
  out.logo = { found: logos.length, displayed: logos.filter(shown).length };
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
 * passed. The conditional ones are reported as they are at that reading. § 25 (W20): when the block draws its steps,
 * the walk (walkSteps) reads each step, and the readings are merged (mergeSteps); else the one reading, `steps: null`.
 */
export async function readCheckoutFaces(page, poll) {
  const arg = { hide: HIDE, controls: CONTROLS, pay: PAY, total: TOTAL, style: STYLE_ID, logo: LOGO, line: LINE, step2: STEP2, sections: STEPS.flatMap((s) => s.shows) };
  const first = await poll(page, readFaces, arg, (f) => f.payment !== null && REQUIRED_FOUND(f) && f.total?.found > 0, { timeoutMs: FACES_MS, everyMs: 500 });
  if (!first?.payment || !(await page.evaluate((id) => Boolean(document.getElementById(id)), STEP_NAV))) return first && { ...first, steps: null };
  const steps = await walkSteps(page, poll, arg);
  return steps.some((s) => !s.error) ? mergeSteps(steps) : { ...first, steps };
}

/** In the page: the step the block shows (its class on <html>), and the focused element, described. */
export function stepNow() {
  const html = document.documentElement;
  const a = document.activeElement;
  const describe = (el) => `${el.tagName.toLowerCase()}${el.getAttribute("name") ? `[name=${el.getAttribute("name")}]` : ""}`;
  return {
    step: [1, 2, 3].filter((n) => html.classList.contains(`fitaf-step-${n}`)),
    focused: a && a !== document.body ? { el: describe(a), invalid: a.classList.contains("ng-invalid") } : null,
  };
}

/**
 * § 25 (W20): the walk. Step 1 as at done; the block's own Continue pressed (a trusted click where it is drawn), step 2;
 * pressed again, step 3, or, when the block refuses (the store's step-2 fields required and empty: the smoke types
 * nothing), the refusal recorded and step 3 entered by the block's own class. Each step read with its own allowance.
 * Reads, presses only the block's own Continue, types nothing. A press that fails ends the walk, recorded.
 */
export async function walkSteps(page, poll, arg) {
  const steps = [];
  const read = async (step, reached, extra = {}) => steps.push({ step, reached, ...extra, ...(await page.evaluate(readFaces, { ...arg, step })) });
  const until = (n) => poll(page, stepNow, null, (s) => s.step.length === 1 && s.step[0] === n, { timeoutMs: STEP_MS, everyMs: 100 });
  const at1 = await page.evaluate(stepNow);
  if (!(at1.step.length === 1 && at1.step[0] === 1)) return [{ step: 1, error: `at done the block shows step ${at1.step.join(",") || "none"}, not step 1` }];
  await read(1, "done");
  try {
    await page.click(`#${STEP_GO}`);
  } catch (err) {
    return [...steps, { step: 2, error: `Continue could not be pressed: ${err.message}` }];
  }
  const at2 = await until(2);
  if (!(at2?.step.length === 1 && at2.step[0] === 2)) return [...steps, { step: 2, error: `Continue at step 1 did not show step 2 (${at2?.step.join(",") || "none"})` }];
  await read(2, "Continue");
  try {
    await page.click(`#${STEP_GO}`);
  } catch (err) {
    return [...steps, { step: 3, error: `Continue could not be pressed at step 2: ${err.message}` }];
  }
  const at3 = await until(3);
  if (at3?.step.length === 1 && at3.step[0] === 3) {
    await read(3, "Continue");
    return steps;
  }
  const refused = at3?.focused ?? null;
  await page.evaluate(() => {
    document.documentElement.classList.remove("fitaf-step-1", "fitaf-step-2");
    document.documentElement.classList.add("fitaf-step-3");
  });
  await read(3, "class", { refused });
  return steps;
}

/**
 * The walk's readings as one: the payment (W11) is step 3's, as § 25.2 amends it; each hide-list target its most
 * displayed over the steps; the Total its least; the lines, the logo and the one-time check step 1's. `steps` keeps
 * each step's own (W20).
 */
export function mergeSteps(steps) {
  const ok = steps.filter((s) => !s.error);
  const { step, reached, refused, ...first } = ok[0];
  const three = ok.find((s) => s.step === 3);
  const hide = (first.hide ?? []).map((h) => ({ ...h, displayed: Math.max(...ok.map((s) => s.hide.find((x) => x.selector === h.selector)?.displayed ?? 0)) }));
  const totals = ok.map((s) => s.total).filter(Boolean);
  return {
    ...first,
    payment: three ? three.payment : first.payment,
    hide,
    total: totals.length ? { found: Math.max(...totals.map((x) => x.found)), displayed: Math.min(...totals.map((x) => x.displayed)) } : first.total,
    steps: steps.map((s) => (s.error ? s : { step: s.step, reached: s.reached, refused: s.refused ?? null, payment: s.payment, sections: s.sections, total: s.total })),
  };
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
  for (const s of c.steps ?? []) reasons.push(...stepReasons(s));
  if (c.oneTime?.activeSwitches) reasons.push(`W13: an active subscription switch on /checkout (${c.oneTime.activeSwitches}): the order is not one-time`);
  if (c.oneTime?.renews?.length) reasons.push(`W13: a "renews every" line on /checkout: ${c.oneTime.renews.join("; ")}`);
  return { reasons };
}

/**
 * § 25 (W11 at steps 1 and 2, W20): one step's reasons. Step 3's payment is the top-level one (W11 as before, its pay
 * button required); at steps 1 and 2 the same measure with that step's allowance, and the pay button must NOT be
 * displayed. Each step: its own sections displayed, the others' hidden, and the Total displayed.
 */
export function stepReasons(s) {
  if (s.error) return [`W20: the walk stopped at step ${s.step}: ${s.error}`];
  const reasons = [];
  const p = s.payment;
  if (p && s.step < 3) {
    const extra = p.hidden.filter((x) => !p.allowed.includes(x));
    const kept = p.allowed.filter((x) => !p.hidden.includes(x));
    if (extra.length) reasons.push(`W11: the style hides controls that are not H3, H4 or H6, nor another step's (step ${s.step}): ${extra.join("; ")}`);
    if (kept.length) reasons.push(`W11: controls the style should hide at step ${s.step} still displayed: ${kept.join("; ")}`);
    if (p.added.length) reasons.push(`W11: controls displayed only with the style (step ${s.step}): ${p.added.join("; ")}`);
    if (p.payWith) reasons.push(`W11: the pay button displayed at step ${s.step} (only at step 3): ${(p.payShown ?? []).join(", ")}`);
  }
  for (const st of STEPS) {
    for (const sel of st.shows) {
      const x = s.sections?.[sel];
      if (!x?.found) continue;
      if (st.step === s.step && !x.displayed) reasons.push(`W20: at step ${s.step}, ${sel} (its own) not displayed`);
      if (st.step !== s.step && x.displayed) reasons.push(`W20: at step ${s.step}, ${sel} (step ${st.step}'s) displayed`);
    }
  }
  if (!s.total?.displayed) reasons.push(`W20: the Total not displayed at step ${s.step}`);
  return reasons;
}

/** W20's line for the report: each step, how it was reached, what it displayed of § 25.2's sections, and the Total. */
export function stepsLine(faces) {
  const c = faces?.checkout;
  if (!c) return "W20: /checkout not read";
  if (!c.steps) return "W20: no steps on this checkout (a block from before SPEC-rung2-progress-and-checkout § 25)";
  const how = (s) => {
    if (s.reached !== "class") return s.reached;
    const f = s.refused;
    return `Continue REFUSED at step 2${f ? ` (focused ${f.el}${f.invalid ? ", ng-invalid" : ""})` : ""}: entered by the block's class, the smoke types nothing`;
  };
  const parts = c.steps.map((s) => {
    if (s.error) return `step ${s.step}: ${s.error}`;
    const shown = Object.entries(s.sections ?? {}).filter(([, x]) => x.displayed).map(([sel, x]) => `${sel} ${x.displayed}`);
    const pay = s.payment?.payWith ? "; the pay button" : "";
    return `step ${s.step} (${how(s)}): ${shown.join(", ") || "none of § 25.2's sections"}; the Total ${s.total?.displayed ? "displayed" : "NOT displayed"}${pay}`;
  });
  return `W20: ${parts.join(" | ")}`;
}

/**
 * W15 (§ 12): from the recorded events, whether the extras pop-up opened, and the seconds from the press of CHECKOUT
 * (the last step line before the checkout arrived) to the store's app-checkout arriving; null when either is not seen.
 */
export function extrasReport(events = []) {
  const arrived = events.find((e) => e.e === "checkout+");
  const pressed = arrived ? events.filter((e) => e.e === "step" && e.t <= arrived.t).at(-1) : null;
  return {
    opened: events.some((e) => e.e === "extras+"),
    checkoutSeconds: arrived && pressed ? Math.round(arrived.t - pressed.t) / 1000 : null,
  };
}

/**
 * W16 (§ 15.3): the Fit AF logo on the screen (a "logo" event recorded) and on the checkout (readFaces's `logo`: found
 * and displayed). Returns { reasons }: none is a pass. Judged only once fill B reached done, as W11–W14; a run that did
 * not is failed by the smoke's own rule.
 */
export function logoVerdict(faces) {
  const reasons = [];
  if (!faces?.done) return { reasons };
  if (!(faces.events ?? []).some((e) => e.e === "logo")) reasons.push("W16: no Fit AF logo on the progress screen (absent)");
  const l = faces.checkout?.logo;
  if (!l) reasons.push("W16: the checkout's logo was not read (/checkout not read)");
  else if (!l.found) reasons.push("W16: no Fit AF logo on the deep-carted checkout (absent)");
  else if (!l.displayed) reasons.push("W16: the Fit AF logo on the deep-carted checkout is there but not displayed");
  return { reasons };
}

/** W16's line for the report: each logo found or ABSENT. */
export function logoLine(faces) {
  const screen = (faces?.events ?? []).some((e) => e.e === "logo") ? "found" : "ABSENT";
  const l = faces?.checkout?.logo;
  const checkout = !l ? "not read" : !l.found ? "ABSENT" : l.displayed ? "found" : "found, NOT displayed";
  return `W16: the Fit AF logo on the screen: ${screen}; on the checkout: ${checkout}`;
}

/**
 * W17 (§ 17.4): per slide, Fit AF's sheet shown (its img loaded), failed (an error: the slide fell back), asked (neither
 * seen) or not found (no sheet on that slide); the line counts the shown. A report, not a pass rule.
 */
export function sheetLine(faces) {
  if (!faces) return "W17: not recorded";
  const events = faces.events ?? [];
  const slides = events.filter((e) => e.e === "slide");
  if (!slides.length) return "W17: no slide seen";
  const state = (s) => {
    if (!s.src) return "not found";
    const seen = events.find((e) => e.e === "sheet" && e.name === s.name);
    return !seen ? "asked" : seen.ok ? "shown" : "failed";
  };
  const states = slides.map((s) => [s.name, state(s)]);
  const shown = states.filter(([, st]) => st === "shown").length;
  return `W17: Fit AF's sheet on ${shown} of ${slides.length} slides: ${states.map(([n, st]) => `${n} ${st}`).join("; ")}`;
}

/** W18's height line: the lines read, their height, and what fourteen take at that pitch of a phone's 844 px. */
export function linesLine(faces) {
  const l = faces?.checkout?.lines;
  if (!faces?.checkout) return "W18: /checkout not read";
  if (!l?.count) return "W18: no order line read";
  const pitch = Math.round(l.height / l.count);
  const fourteen = pitch * FOURTEEN;
  return `W18: ${l.count} order lines in ${l.height} px (${pitch} px each); 14 would take ${fourteen} px of ${PHONE_HEIGHT}: ${fourteen > PHONE_HEIGHT ? "DOES NOT FIT" : "fits"}`;
}

/** W15's line for the report. */
export function extrasLine(x) {
  if (!x) return "W15: not recorded";
  const wait = typeof x.checkoutSeconds === "number" ? `CHECKOUT to /checkout in ${x.checkoutSeconds.toFixed(1)} s` : "CHECKOUT to /checkout not seen";
  return `W15: the extras pop-up ${x.opened ? "OPENED (expected: not)" : "did not open"}; ${wait}`;
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
