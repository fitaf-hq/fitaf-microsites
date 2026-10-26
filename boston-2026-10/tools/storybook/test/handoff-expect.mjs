// SM-10's and SM-11's reading of a walk (SPEC-storybook-microsite.md § 8.4). Not a test file itself.
//
// SM-10, the states: Screen · A the screen with no slide; Screen · B at k of t the step line for that meal (the screen's
// words, data/messages.json's handoff.step, read when the case runs); Screen · C the last step (the bar full, the
// screen's checkout line); Checkout · 1–3 exactly § 25.2's sections for the step, as § 27 measured them on the live
// release (each a .checkout__section by its modifier), and the Total, in each; the ordinary visit no step bar. Every
// story ready, its frame the viewport's size.
// SM-11, never pays: no visit's console carries the fixture's "[fixture] ORDER PLACED". Its control: every visit that
// ran the hand-off carries the fixture's own line for the store's CHECKOUT, so the console of the frame inside the story
// is read at all.

/** § 27: step 2's seven sections and step 3's three, each a .checkout__section with its modifier. */
export const STEP2 = ["contact", "order-type", "delivery-address", "delivery-method", "schedule", "pickup-location", "special-requests"].map((m) => `.checkout__section.${m}`);
export const STEP3 = ["tip", "payment", "checkout__consent"].map((m) => `.checkout__section.${m}`);
const LINES = ".summary__item";
/** What the walk reads of a Hand-off story's checkout (walk.mjs's inspectHandoff). */
export const SECTIONS = [LINES, ...STEP2, ...STEP3];
/** The synthetic store renders an order for delivery (its default): step 2's sections but the pickup location. */
const RENDERED_FOR_DELIVERY = STEP2.filter((s) => !s.endsWith(".pickup-location"));
/**
 * § 25.2 as § 27 measured it: what each step shows (`on`: every one rendered, displayed) and hides (`off`: none
 * displayed). The tip is step 3's, but H10 hides it while none is chosen, so it is `off` here, as in R2-84.
 */
const TABLE = {
  1: { on: [LINES], off: [...STEP2, ...STEP3] },
  2: { on: RENDERED_FOR_DELIVERY, off: [LINES, ...STEP3] },
  3: { on: [".checkout__section.payment", ".checkout__section.checkout__consent"], off: [LINES, ...STEP2, ".checkout__section.tip"] },
};
const CHECKOUT_STEP = { "Checkout · 1 Your meals": 1, "Checkout · 2 Delivery": 2, "Checkout · 3 Payment": 3 };
export const ORDER_PLACED = "[fixture] ORDER PLACED";
const CHECKOUT_PRESSED = /^\[fixture\] pressed CHECKOUT( NOW)?$/;

/**
 * The meal of each press, in the order the block presses a link's meals (SPEC-rung2-fill-c § 1: every meal's first
 * press before any meal's second; then each meal's further presses, meal by meal).
 */
export function pressOrder(items) {
  return [...items.map((it) => it.name), ...items.flatMap((it) => Array.from({ length: it.qty - 1 }, () => it.name))];
}

/** A name as a card shows it and the block reads it: whitespace collapsed, trimmed. */
const asShown = (name) => name.replace(/\s+/g, " ").trim();

/** SM-10: one line per thing a Hand-off story does not show; [] when every one shows its state. */
export function handoffProblems(results, { words, links }) {
  const problems = [];
  for (const r of results.filter((x) => x.handoff)) {
    const where = `${r.story} · ${r.width}${r.extra?.k ? ` · k ${r.extra.k} of ${r.extra.t}` : ""}`;
    const fail = (what) => problems.push(`${where}: ${what}`);
    if (r.state !== "ready") fail(`${r.state}: ${r.problem}`);
    if (r.frameWidth !== r.width || r.innerWidth !== r.width || r.innerHeight !== r.height) {
      fail(`frame ${r.frameWidth} × ${r.frameHeight}, its page ${r.innerWidth} × ${r.innerHeight}, not ${r.width} × ${r.height}`);
    }
    const step = CHECKOUT_STEP[r.story];
    // SPEC-rung2-progress-and-checkout § 30 (P4): every screen story shows the placeholder. Screen · A, the empty
    // carousel's, holding the store's logo as its mark; B and C, the shown slide's box first, the photograph's size, the
    // placeholder in it (under the tile a story's card image draws). placeholderPlaces() compares where.
    const ph = r.placeholder;
    if (r.story === "Screen · A") {
      if (!r.screen || r.slides !== 0 || r.path !== "/order") fail(`screen ${r.screen}, ${r.slides} slides, at ${r.path}: not the screen with no meal`);
      if (!ph?.empty || ph.empty.content === "none" || !/^url\(/.test(ph.empty.mark)) fail(`no placeholder on the empty carousel: ${JSON.stringify(ph)}`);
    }
    if (r.story === "Screen · B" || r.story === "Screen · C") {
      const box = ph?.shown?.box;
      if (ph?.first !== "f" || !box || box[0] !== ph.side || box[1] !== ph.side || ph.shown.content === "none") fail(`the shown slide's box is not the placeholder's at the photograph's size: ${JSON.stringify(ph)}`);
    }
    if (r.story === "Screen · A") {
      // (read above)
    } else if (r.story === "Screen · B") {
      const [k, t] = [Number(r.extra.k), Number(r.extra.t)];
      const meal = asShown(pressOrder(links[t].items)[k - 1]);
      const line = words.step.replace("{meal}", meal).replace("{n}", String(k)).replace("{total}", String(t));
      if (!r.screen || r.line !== line || r.slide !== meal) fail(`shows "${r.line}" (slide "${r.slide}"), not "${line}"`);
    } else if (r.story === "Screen · C") {
      if (!r.screen || r.line !== words.checkout || r.bar !== "100%" || r.path !== "/order") fail(`shows "${r.line}", bar ${r.bar}, at ${r.path}: not the last step`);
    } else if (step) {
      if (JSON.stringify(r.steps) !== JSON.stringify([step]) || !r.stepBar || r.path !== "/checkout") fail(`step ${JSON.stringify(r.steps)}, step bar ${r.stepBar}, at ${r.path}: not step ${step}`);
      for (const sel of TABLE[step].on) if (!(r.sections[sel].found > 0 && r.sections[sel].displayed === r.sections[sel].found)) fail(`step ${step}: ${sel} not displayed ${JSON.stringify(r.sections[sel])}`);
      for (const sel of TABLE[step].off) if (r.sections[sel].displayed !== 0) fail(`step ${step}: ${sel} displayed ${JSON.stringify(r.sections[sel])}`);
      if (!r.total) fail(`step ${step}: the Total not displayed`);
    } else if (r.story === "Checkout · ordinary visit") {
      const lines = r.sections[LINES];
      if (r.stepBar || r.steps.length || r.path !== "/checkout") fail(`a step bar ${r.stepBar}, steps ${JSON.stringify(r.steps)}, at ${r.path}`);
      if (!(lines.found > 0 && lines.displayed === lines.found) || !r.total) fail(`the store's checkout not whole: lines ${JSON.stringify(lines)}, Total ${r.total}`);
    } else {
      fail("a Hand-off story this case does not know");
    }
  }
  return problems;
}

/**
 * § 30 (P4): the screen never jumps between its states. At each width, the plate of Screen · A's empty carousel and the
 * plate in every Screen · B and C's shown box are one size in one place. One line per difference; [] when none.
 */
export function placeholderPlaces(results) {
  const problems = [];
  const screens = results.filter((r) => r.handoff && /^Screen · [ABC]$/.test(r.story) && r.placeholder);
  for (const width of new Set(screens.map((r) => r.width))) {
    const at = screens.filter((r) => r.width === width);
    const a = at.find((r) => r.story === "Screen · A")?.placeholder?.empty?.plate;
    if (!a) {
      problems.push(`${width}: no Screen · A placeholder to compare with`);
      continue;
    }
    for (const r of at.filter((x) => x.story !== "Screen · A")) {
      const p = r.placeholder?.shown?.plate;
      if (JSON.stringify(p) !== JSON.stringify(a)) problems.push(`${r.story} · ${width}${r.extra?.k ? ` · k ${r.extra.k} of ${r.extra.t}` : ""}: its plate ${JSON.stringify(p)}, Screen · A's ${JSON.stringify(a)}`);
    }
  }
  return problems;
}

/** SM-11: one line per visit whose console carries the fixture's order line; [] when none does. */
export function payProblems(results) {
  return results.filter((r) => r.console.some((l) => l.includes(ORDER_PLACED))).map((r) => `${r.story} · ${r.width}: ${ORDER_PLACED}`);
}

/** SM-11's control: the Hand-off visits that ran the hand-off yet carry no line of the store's CHECKOUT. */
export function unheardCheckouts(results) {
  return results
    .filter((r) => r.handoff && (CHECKOUT_STEP[r.story] || r.story === "Screen · C"))
    .filter((r) => !r.console.some((l) => CHECKOUT_PRESSED.test(l)))
    .map((r) => `${r.story} · ${r.width}`);
}
