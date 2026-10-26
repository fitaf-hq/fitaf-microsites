// Shared by UC1–UC8 (SPEC-ui-and-copy-pass.md § 1, round 1 of the Advisor's UI and copy pass) and by the save-step
// cases its item 2 amends. Not a test file itself. Since § 1 item 2 the save step is shown only beside the card's
// Continue to checkout, which only a week's Chef's Choice cart draws, so these pages carry a week: the site's own build,
// the fixture week (test/fixtures/picks/, version 1: a cart for 7 meals and one for 14) made into content by its own
// weekData and put into #picks-data by its own pageWithWeek, as the Workers put the bucket's (cc-harness pageWithPicks).
// The page runs as a browser runs it (cc-harness openPlanPage), the save's two outside services stood in for: Turnstile
// and the Worker's /api/save.
import assert from "node:assert/strict";
import { pageWithWeek, weekData } from "../scripts/week-content.mjs";
import { FIXTURE_DIR, hiddenInTree, openPlanPage } from "./cc-harness.mjs";
import { devPage } from "./dev-page.mjs";
import { PAGE_NOW_MS } from "./page-sim.mjs";
import { readingOrder } from "./save-end-fixture.mjs";
import { approvedPage } from "./sp-production.mjs";

/** The fixture week's cart: on Lean, 7 meals (lunch or dinner, every day): the card shows Continue to checkout. */
export const CHECKOUT = "#lean-7";
/** Answers the fixture week has no cart for (lunch or dinner, weekdays: the 4 plan): Choose your meals alone. */
export const NO_CART = "#lean-or-5d";
/** The pages' clock: noon in New York on 2026-10-24, a day of the Boston offer (page-sim.mjs PAGE_NOW_MS). */
export const NOW = PAGE_NOW_MS;
/** A ZIP code in the delivery area, and one in the near ring (not on the official list), as the Worker's harness has them. */
export const IN_ZIP = "02118";
export const NEAR_ZIP = "03101";

/** The development page as the build writes it (dev-page.mjs, the card holding no week), the fixture week put in it as
 *  the development Worker would. `offers` replaces data/offers.json. */
export async function weekPage({ offers } = {}) {
  return pageWithWeek(await devPage({ card: true, ...(offers ? { offers } : {}) }), (await weekData({ picksDir: FIXTURE_DIR, target: "dev" })).data);
}

/** The production page with `production` true, built from the approved fixtures (sp-production.mjs), the fixture week in
 *  it as the production Worker would put it. */
export async function approvedWeekPage() {
  const { html, inputs } = await approvedPage();
  return { html: pageWithWeek(html, (await weekData({ picksDir: FIXTURE_DIR, target: "prod" })).data), inputs };
}

/**
 * Turnstile and the Worker, stood in for. `turnstile`: "pass" (its callback with the test token), "fail" (its error
 * callback) or null (its script not loaded). `reply` is /api/save's answer; `network` makes the request fail. `fetches`
 * records each request.
 */
export function saveStubs({ turnstile = "pass", reply = { ok: true, json: { ok: true } }, network = false } = {}) {
  const fetches = [];
  const widget = {};
  const globals = {
    fetch(url, init) {
      fetches.push({ url, init });
      return network ? Promise.reject(new TypeError("offline")) : Promise.resolve({ ok: reply.ok, json: () => Promise.resolve(reply.json) });
    },
  };
  if (turnstile) {
    globals.turnstile = {
      render(_selector, options) {
        widget.callback = options.callback;
        widget.failed = options["error-callback"];
        return "uc-widget";
      },
      reset() {},
      execute() {
        if (turnstile === "pass") widget.callback("XXXX.DUMMY.TOKEN.XXXX");
        else widget.failed();
      },
    };
  }
  return { globals, fetches };
}

/** The page at `hash`, its clock at `now`, the save's services stood in for by `stubs` (saveStubs' options). */
export function openStep(html, { hash = CHECKOUT, now = NOW, stubs = {} } = {}) {
  const { globals, fetches } = saveStubs(stubs);
  const page = openPlanPage(html, { hash, now, globals });
  return Object.assign(page, { fetches });
}

/** Let promise chains (fetch().then…) settle. */
export const settle = () => new Promise((r) => setImmediate(r));

/** A visitor's event on `node` (submit, input, click), as the browser dispatches it. */
export function fire(page, node, type) {
  const event = page.document.createEvent("Event");
  event.initEvent(type, true, true);
  node.dispatchEvent(event);
}

/** A visitor typing into a field: its value, then the input event the browser fires. */
export function type(page, id, value) {
  page.el(id).value = value;
  fire(page, page.el(id), "input");
}

/** A visitor filling the step's fields and pressing Save my offer; then the page's promise chains settle. */
export async function saveWith(page, { email = "dummy-uc@example.com", zip = IN_ZIP } = {}) {
  page.el("save-email").value = email;
  page.el("save-zip").value = zip;
  fire(page, page.el("save-form"), "submit");
  await settle();
}

/** What a visitor reads of the step (section#save), in document order: each displayed element's id, or its class. */
export function stepRead(page) {
  return readingOrder(page.el("save")).map((n) => n.id || `.${n.className}`);
}

/** Whether `id` is shown (it and every ancestor without `hidden`). */
export const shown = (page, id) => !hiddenInTree(page.el(id));

/** The element a visitor reads directly before / after `node` in the whole page. */
export function neighbours(page, node) {
  const read = readingOrder(page.document.body);
  const i = read.indexOf(node);
  assert.ok(i >= 0, `#${node.id} is read`);
  return { before: read[i - 1] ?? null, after: read[i + 1] ?? null };
}
