// SPEC-rung2-progress-and-checkout §§ 30 and 31, on the synthetic order page (linkedom: the SHIPPED text, as the other
// rung 2 cases run it). What a browser draws (the box's size, nothing moving, the discount UI's display) is measured in
// Chrome by the watch package's P1–P3 (r2-p30-placeholder) and Z1–Z5 (r2-z31-zero); these read the structure the
// block builds and the order of what it does, in the site's own suite.
//   R2-92 (§ 30 item 1) every slide's first element is its photograph's box (div.f), its last the meal's name: with a
//         cell (the sheet's img inside the box), with no cell (the box empty: the placeholder), with the card's loaded
//         photo (inside the box), and after the sheet fails (the box kept, the sheet's img gone). Mutant: the box made
//         only when the photograph loads — R2-92 fails.
//   R2-93 (§ 31) at the checkout, before the screen goes: the code field (inside .checkout-discounts) given `zero` by
//         an input event (and change, blur), its Apply pressed once when enabled, never the gift card's; `zero:
//         applied` once the store's mark shows the code, then done. A coded link (~SAVE10): since § 31.2 item 3 (ruled:
//         the visible code field is the visitor's), `zero: coded link`, nothing typed or pressed, then done. No checkout
//         component, or no code field: `zero: not found`, done. A refusal: `zero: refused`. No sign: `zero: no sign`
//         after 25 polls (the stated bound), done. Mutant: the coded link's skip removed — R2-93b fails. (§ 31's mutant,
//         the code read from the link, has no run left to show in: a coded link types nothing at all.)
import test from "node:test";
import assert from "node:assert/strict";
import { CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, LOG_PREFIX, orderPage, POLL_MS, run, script } from "./r2-harness.mjs";
import { NAMES, NO_CELL, observe, PIXEL, sheetUrl, weekFragment, weekPage, WITH_CELL } from "./r2-photos.mjs";

const DONE = `${LOG_PREFIX} done: /checkout`;
const ZERO = (m) => `${LOG_PREFIX} zero: ${m}`;

// ── R2-92 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Every slide on the screen now: [its first element's class, its last element's tag, the srcs inside its box]. */
function slideShapes(doc) {
  return [...(doc.querySelector("#fitaf-screen .c")?.children ?? [])].map((s) => ({
    name: s.lastElementChild?.textContent ?? null,
    first: s.firstElementChild ? `${s.firstElementChild.localName}.${s.firstElementChild.className}` : null,
    last: s.lastElementChild?.localName ?? null,
    inBox: [...(s.firstElementChild?.querySelectorAll("img") ?? [])].map((i) => i.getAttribute("src")),
    outside: [...s.children].filter((c, k) => k && c.localName === "img").length,
  }));
}

/** Run `text` on `page` with `fragment`, checking every slide's shape at every step; returns the last shapes. */
async function shapes(text, page, fragment, onStep = () => {}) {
  let last = [];
  const problems = [];
  await observe(text, page, fragment, {
    onStep: (o) => {
      onStep(o);
      const now = slideShapes(page.document);
      if (now.length) last = now;
      for (const s of now) if (s.first !== "div.f" || s.last !== "b" || s.outside) problems.push(JSON.stringify(s));
    },
  });
  assert.deepEqual([...new Set(problems)], [], "every slide, at every step: its box first, its name last, no img outside the box");
  return last;
}

/** R2-92 over `text`. */
async function boxCase(text) {
  // With cells (the card images never load): each cell slide's box holds the sheet's img; a slide with no cell, nothing.
  const cells = await shapes(text, await weekPage(), weekFragment());
  assert.equal(cells.length, NAMES.length, "fixture control: every meal's slide");
  for (const s of cells) assert.deepEqual(s.inBox, WITH_CELL.includes(s.name) ? [sheetUrl(0)] : [], `${s.name}: its box`);
  assert.ok(NO_CELL.length >= 1, "fixture control: a meal with no cell");
  // No photo part, the first card's photo loaded: that slide's box holds it; the rest, empty boxes.
  const cards = await shapes(text, await weekPage((name) => (name === NAMES[0] ? { complete: true, naturalWidth: 640, currentSrc: PIXEL } : {})), weekFragment(""));
  for (const s of cards) assert.deepEqual(s.inBox, s.name === NAMES[0] ? [PIXEL] : [], `${s.name}: its box (the card's photo)`);
  // The sheet fails once asked for: every box kept; the sheet's img gone from each.
  let failed = false;
  const after = await shapes(text, await weekPage(), weekFragment(), ({ page, made }) => {
    const asked = made.filter((i) => i.getAttribute("src") === sheetUrl(0) && i.parentElement);
    if (failed || !asked.length) return;
    failed = true;
    for (const i of made.filter((m) => m.getAttribute("src") === sheetUrl(0))) i.dispatchEvent(new page.document.defaultView.Event("error"));
  });
  assert.ok(failed, "fixture control: the sheet failed");
  for (const s of after) assert.deepEqual(s.inBox, [], `${s.name}: its box kept, the sheet's img gone`);
}

test("R2-92: every slide's first element is its photograph's box, its last the name — with a cell, without one, the card's photo, the sheet failed", async () => {
  await boxCase(await script());
});

test("R2-92 (mutant): the box made only when the photograph loads — R2-92 fails", async () => {
  const text = await script();
  const from = '(f = el.appendChild(d.createElement("div"))).className = "f";';
  assert.equal(text.split(from).length, 2, "the mutant's site, once in the shipped text");
  const mutant = text
    .replace(from, 'f = el.appendChild(d.createElement("div"));')
    .replace("g.onerror = function () { BAD = 1; ui(", 'g.onload = function () { f.className = "f"; }; g.onerror = function () { BAD = 1; ui(');
  await assert.rejects(boxCase(mutant), assert.AssertionError);
});

// ── R2-93 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The store's checkout as R2-70 draws it at the route (an app-checkout), with `fields` in a .checkout-discounts: a gift
 * card field and its Apply, then (unless `code` is false) a discount-code field and its Apply, disabled until its own
 * input events give it a value. The code's Apply answers on the store's next tick by `answer` ("apply": the mark
 * "ZERO" beside it for `zero`; "refuse": a role=alert message; "silent": nothing). Records every input event's value
 * and every press.
 */
async function zeroRun(text, { fragment = fragmentFor(CHECKOUT_PAYLOAD), checkout = true, code = true, answer = "apply" } = {}) {
  const page = await orderPage();
  const h = fakeWindow({ fragment, page });
  const seen = { inputs: [], presses: [], delaysAtPress: null };
  const pushState = h.window.history.pushState;
  h.window.history.pushState = (...args) => {
    pushState(...args);
    if (h.url.pathname !== "/checkout" || !checkout) return;
    const doc = page.document;
    const c = doc.createElement("app-checkout");
    c.innerHTML =
      '<div class="checkout"><form class="checkout__form"><section class="checkout__section checkout-discounts">' +
      '<input name="giftCard" aria-label="Gift card"><button type="button" class="gift">Apply</button>' +
      (code ? '<input name="coupon" aria-label="Discount code"><button type="button" class="code" disabled>Apply</button>' : "") +
      "</section></form></div>";
    doc.body.appendChild(c);
    for (const input of c.querySelectorAll("input")) {
      input.addEventListener("input", () => {
        seen.inputs.push([input.getAttribute("name"), input.value]);
        if (input.nextElementSibling?.classList.contains("code")) input.nextElementSibling.disabled = !input.value;
      });
    }
    for (const b of c.querySelectorAll("button")) {
      b.addEventListener("click", () => {
        seen.presses.push(b.className);
        seen.delaysAtPress ??= h.timers.delays.length;
        if (!b.classList.contains("code") || answer === "silent") return;
        h.timers.later(() => {
          const value = b.previousElementSibling.value;
          if (answer === "apply" && value.toLowerCase() === "zero") b.parentElement.appendChild(doc.createElement("span")).textContent = "ZERO";
          else {
            const msg = b.parentElement.appendChild(doc.createElement("p"));
            msg.setAttribute("role", "alert");
            msg.textContent = "This code is not valid";
          }
        });
      });
    }
  };
  run(text, h.window);
  h.timers.drain();
  const ours = h.info.filter((l) => l.startsWith(LOG_PREFIX));
  return { h, seen, ours, page };
}

/** The two lines at the end: the block's zero line, then done, and the screen gone. */
function assertEnd(r, m) {
  assert.deepEqual(r.ours.slice(-2), [ZERO(m), DONE], JSON.stringify(r.ours));
  assert.equal(r.page.document.getElementById("fitaf-screen"), null, "the screen gone");
}

/** R2-93b over `text`: a coded link (~SAVE10) gets no zero (§ 31.2 item 3): nothing typed, nothing pressed, its line. */
async function codedCase(text) {
  const r = await zeroRun(text, { fragment: fragmentFor({ ...CHECKOUT_PAYLOAD, code: "SAVE10" }) });
  assert.deepEqual(r.seen.inputs, [], "nothing typed: the visible code field is the visitor's");
  assert.deepEqual(r.seen.presses, [], "nothing pressed");
  assertEnd(r, "coded link");
}

test("R2-93: the code field given zero by its input event, its Apply pressed once when enabled, the mark awaited, then done", async () => {
  const r = await zeroRun(await script());
  assert.deepEqual(r.seen.inputs, [["coupon", "zero"]], "one input event, on the code field alone, its value zero");
  assert.deepEqual(r.seen.presses, ["code"], "the code's Apply pressed once; the gift card's never");
  assertEnd(r, "applied");
});

test("R2-93b: a coded link (~SAVE10) — no zero (§ 31.2 item 3): zero: coded link, nothing typed or pressed, then done", async () => {
  await codedCase(await script());
});

test("R2-93b (mutant): the coded link's skip removed — R2-93b fails", async () => {
  const text = await script();
  const site = 'if (CODE) m = "coded link";';
  assert.equal(text.split(site).length, 2, "the mutant's site, once in the shipped text");
  await assert.rejects(codedCase(text.replace(site, 'if (0) m = "coded link";')), assert.AssertionError);
});

test("R2-93c: no checkout component, or no code field — zero: not found, then done; nothing typed or pressed", async () => {
  const none = await zeroRun(await script(), { checkout: false });
  assertEnd(none, "not found");
  const noField = await zeroRun(await script(), { code: false });
  assert.deepEqual([noField.seen.inputs, noField.seen.presses], [[], []], "the gift card's field untouched");
  assertEnd(noField, "not found");
});

test("R2-93d: refused — zero: refused; no sign — zero: no sign after 25 polls; done either way, pressed once", async () => {
  const refused = await zeroRun(await script(), { answer: "refuse" });
  assert.deepEqual(refused.seen.presses, ["code"]);
  assertEnd(refused, "refused");
  const silent = await zeroRun(await script(), { answer: "silent" });
  assert.deepEqual(silent.seen.presses, ["code"]);
  assertEnd(silent, "no sign");
  const after = silent.h.timers.delays.slice(silent.seen.delaysAtPress);
  assert.ok(after.every((ms) => ms === POLL_MS), `only polls after the press: ${after}`);
  assert.equal(after.length, 25, `the stated bound: 25 polls of ${POLL_MS} ms after the press (${after.length})`);
});

test("R2-93e: the zero line comes before done on the plain page too (no checkout drawn): every existing finish still ends with done", async () => {
  const r = await zeroRun(await script(), { checkout: false });
  assert.equal(r.ours.at(-1), DONE);
  assert.equal(r.ours.filter((l) => l.startsWith(`${LOG_PREFIX} zero:`)).length, 1, "one zero line");
});
