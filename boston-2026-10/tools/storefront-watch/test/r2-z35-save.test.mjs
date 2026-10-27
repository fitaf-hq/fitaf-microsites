// SO1–SO4 (SPEC-rung2-progress-and-checkout § 35): *Save my offer* on the Payment step, one text link in the block's
// own foot at step 3 alone, above § 33's *Contact customer service*. In the stand-in checkout (browser-store.mjs, the
// live zero row drawn as § 33.1 measured it), headless Chrome on 127.0.0.1, the SHIPPED text pasted as a person pastes
// it; step 2's fields typed into the STAND-IN (never the store) to walk to step 3 as a person would. ⛔ The link's
// destination is never followed or loaded: only its attributes and its box are read.
//   SO1  at step 3 the link once, its words data/messages.json's handoff.save, its address https://eatfitaf.com/#save,
//        target _blank and rel noopener, a link not a button, 14 px, the page's --muted (never orange), underlined,
//        centred, in the foot (#fitaf-nav), and above the contact link (before it, and its box above it); at 1280 and 390.
//   SO2  at steps 1 and 2 on the page once and NOT displayed (and the contact link displayed: nothing else moves).
//   SO3  one link after 3 → 2 → 3 (Back, then Continue) and after the store's re-render; displayed at step 3 again.
//   SO4  at step 3, the page scrolled to its foot: the link's box overlaps neither the pay button (the form's
//        .checkout__submit button; on a phone the summary's .summary__pay-button) nor the card field (the payment
//        section's iframe) nor the phone's bottom bar (.summary__mobile-bar), nor any other displayed control; at 1280
//        and 390.
// Mutants (each beside the shipped text passing the same case): the link shown in every step (SO2 fails); the link
// added twice (SO3 fails).
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sleep } from "../lib/browser.mjs";
import { startStore } from "./browser-store.mjs";
import { browserFor, DONE, mutate, openDeep, press, shipped, skip, untilStep, walkTo } from "./r2-browser.mjs";

const SITE = new URL("../../../", import.meta.url);
const SAVE = "https://eatfitaf.com/#save";
const HELP = "https://fitafnutrition.com/contact";
/** The shipped text's one rule hiding the link at steps 1 and 2 (the mutant takes it out). */
const STEP_RULE = ":is(.fitaf-step-1,.fitaf-step-2):has(#fitaf-nav) #fitaf-save,";
/** The shipped text's one call that makes the link (the mutant makes it twice). */
const MAKE = "ui(save);";

let store;
let browser;
let site;
let words;
let muted;
before(async () => {
  if (skip) return;
  store = await startStore();
  browser = await browserFor();
  site = await shipped();
  words = JSON.parse(await readFile(new URL("data/messages.json", SITE), "utf8")).handoff;
  const hex = /--muted:\s*#([0-9a-f]{6})/i.exec(await readFile(new URL("src/template.html", SITE), "utf8"))[1];
  muted = `rgb(${[0, 2, 4].map((k) => parseInt(hex.slice(k, k + 2), 16)).join(", ")})`;
});
after(async () => {
  await browser?.close();
  await store?.close();
});

const ours = (lines) => lines.filter((l) => l.startsWith("[fitaf-handoff]"));

async function deepRun({ text = site.text, width = 1280 } = {}) {
  store.set({ zeroRow: "live" });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text, width });
  const verdict = await run.verdict(20_000);
  await sleep(300);
  assert.equal(verdict, DONE, JSON.stringify(ours(run.lines)));
  return run;
}

/** In the page: the save link(s) and where the first is, against the contact link, the checkout and every control. */
function saveRead({ save, help }) {
  const shown = (e) => Boolean(e) && e.getClientRects().length > 0;
  const by = (href) => [...document.querySelectorAll("a")].filter((a) => a.getAttribute("href") === href);
  const links = by(save);
  const a = links[0];
  if (!a) return { count: 0 };
  const h = by(help)[0] ?? null;
  window.scrollTo(0, document.documentElement.scrollHeight);
  const c = document.querySelector("app-checkout");
  const r = a.getBoundingClientRect();
  const cr = c.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(a);
  const tr = range.getBoundingClientRect();
  const cs = getComputedStyle(a);
  const overlap = (b) => b.left < r.right && r.left < b.right && b.top < r.bottom && r.top < b.bottom;
  const over = (els) => els.filter((e) => e !== a && shown(e) && [...e.getClientRects()].some(overlap)).map((e) => `${e.localName}.${e.className}`);
  return {
    count: links.length,
    text: a.textContent,
    tag: a.localName,
    role: a.getAttribute("role"),
    target: a.getAttribute("target"),
    rel: a.getAttribute("rel"),
    shown: shown(a),
    inNav: Boolean(a.closest("#fitaf-nav")),
    inCheckout: c.contains(a),
    fontPx: parseFloat(cs.fontSize),
    color: cs.color,
    underline: cs.textDecorationLine,
    centre: Math.abs((tr.left + tr.right) / 2 - (cr.left + cr.right) / 2),
    help: h ? { shown: shown(h), after: Boolean(a.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING), gap: Math.round(h.getBoundingClientRect().top - r.bottom) } : null,
    pay: over([...document.querySelectorAll(".checkout__submit button, .summary__pay-button button, .summary__pay-button")]),
    card: over([...document.querySelectorAll(".checkout__section.payment iframe")]),
    bar: over([...document.querySelectorAll(".summary__mobile-bar")]),
    controls: over([...document.querySelectorAll("button,input,select,textarea,a,iframe,[role=radio],[role=switch]")]),
  };
}
const read = (run) => run.page.evaluate(saveRead, { save: SAVE, help: HELP });

/** SO1 at `width`: at step 3, one link, its words, address, target and rel, its type, above the contact link. */
async function atPayment(text, width) {
  const run = await deepRun({ text, width });
  try {
    await walkTo(run, 3);
    await sleep(200);
    const s = await read(run);
    assert.equal(s.count, 1, `one link to ${SAVE} at step 3: ${JSON.stringify(s)}`);
    assert.equal(s.text, words.save, "its words, data/messages.json's handoff.save");
    assert.equal(s.tag, "a", "a link");
    assert.equal(s.role, null, "never a button");
    assert.equal(s.target, "_blank", "a new tab: the checkout stays where the visitor left it");
    assert.equal(s.rel, "noopener");
    assert.equal(s.shown, true, "displayed at step 3");
    assert.equal(s.inNav, true, "in the block's own foot");
    assert.equal(s.inCheckout, true, "inside the checkout, so it goes with it");
    assert.equal(s.fontPx, 14, "§ 33's type: 14 px");
    assert.equal(s.color, muted, "the page's --muted, never orange");
    assert.equal(s.underline, "underline");
    assert.ok(s.centre <= 2, `its text centred in the checkout (${s.centre} px off)`);
    assert.ok(s.help?.shown, `fixture control: the contact link displayed (${JSON.stringify(s.help)})`);
    assert.equal(s.help.after, true, "the contact link after it");
    assert.ok(s.help.gap >= 0, `its box above the contact link's (${s.help.gap} px)`);
    return s;
  } finally {
    await run.close();
  }
}

test("SO1: at step 3, the link once — words, address, target and rel, type, in the foot, above the contact link (1280)", { skip, timeout: 60_000 }, async () => {
  await atPayment(site.text, 1280);
});

test("SO1b: the same at 390", { skip, timeout: 60_000 }, async () => {
  await atPayment(site.text, 390);
});

/** SO2 over `text`: at steps 1 and 2 the link on the page once and not displayed; the contact link displayed. */
async function hiddenBefore(text) {
  const run = await deepRun({ text });
  try {
    for (const step of [1, 2]) {
      if (step === 2) await press(run, "go");
      await untilStep(run, step);
      await sleep(200);
      const s = await read(run);
      assert.equal(s.count, 1, `fixture control: the link made at done, on the page at step ${step}`);
      assert.equal(s.shown, false, `the link not displayed at step ${step}`);
      assert.equal(s.help?.shown, true, `the contact link displayed at step ${step}`);
    }
  } finally {
    await run.close();
  }
}

test("SO2: at steps 1 and 2 the link is not displayed", { skip, timeout: 60_000 }, async () => {
  await hiddenBefore(site.text);
});

test("SO2 (mutant): the link shown in every step — SO2 fails", { skip, timeout: 60_000 }, async () => {
  await assert.rejects(hiddenBefore(mutate(site.text, STEP_RULE, "")), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});

/** SO3 over `text`: one link after 3 → 2 → 3 and after the store's re-render, displayed at step 3. */
async function oneLink(text) {
  const run = await deepRun({ text, width: 390 });
  try {
    await walkTo(run, 3);
    assert.equal((await read(run)).count, 1, "one at step 3");
    await press(run, "back");
    await untilStep(run, 2);
    assert.equal((await read(run)).count, 1, "one at step 2, after Back");
    await press(run, "go");
    await untilStep(run, 3);
    await sleep(200);
    let s = await read(run);
    assert.equal(s.count, 1, "one at step 3 again, after Continue");
    assert.equal(s.shown, true, "displayed at step 3 again");
    await run.page.evaluate(() => window.__fixtureRerender());
    await sleep(300);
    assert.ok(run.lines.includes("[fixture] summary re-rendered"), "fixture control: the store drew its rows again");
    s = await read(run);
    assert.equal(s.count, 1, "one after the store's re-render");
    assert.equal(s.shown, true, "and still displayed");
  } finally {
    await run.close();
  }
}

test("SO3: 3 → 2 → 3 and a re-render leave one link", { skip, timeout: 60_000 }, async () => {
  await oneLink(site.text);
});

test("SO3 (mutant): the link added twice — SO3 fails", { skip, timeout: 60_000 }, async () => {
  await assert.rejects(oneLink(mutate(site.text, MAKE, `${MAKE} ${MAKE}`)), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});

/** SO4 at `width`: at step 3, at the page's foot, the link's box over no pay button, card field, bar or control. */
async function overNothing(width) {
  const run = await deepRun({ width });
  try {
    await walkTo(run, 3);
    await sleep(200);
    const s = await read(run);
    assert.equal(s.shown, true, `fixture control: the link displayed (${JSON.stringify(s)})`);
    const fixture = await run.page.evaluate(() => ({
      pay: [...document.querySelectorAll(".checkout__submit button, .summary__pay-button button")].filter((e) => e.getClientRects().length).length,
      card: [...document.querySelectorAll(".checkout__section.payment iframe")].filter((e) => e.getClientRects().length).length,
    }));
    assert.ok(fixture.pay >= 1 && fixture.card >= 1, `fixture control: a pay button and the card field displayed (${JSON.stringify(fixture)})`);
    assert.deepEqual(s.pay, [], `over no pay button (${width})`);
    assert.deepEqual(s.card, [], `over no card field (${width})`);
    assert.deepEqual(s.bar, [], `over no bottom bar (${width})`);
    assert.deepEqual(s.controls, [], `over no control (${width})`);
  } finally {
    await run.close();
  }
}

test("SO4: at step 3, over neither the pay button nor the card field nor any control (1280)", { skip, timeout: 60_000 }, async () => {
  await overNothing(1280);
});

test("SO4b: the same at 390 (the summary's PAY NOW and the bottom bar)", { skip, timeout: 60_000 }, async () => {
  await overNothing(390);
});
