// probe-prices --script (SPEC-rung2-progress-and-checkout § 36 item 13, the orchestrator's rehearsal of the struck
// prices): the build pasted into each document the probe visits, every s.fitaf-was recorded per surface with its
// price, item 3's figure and the boxes. In the stand-in store (browser-store.mjs `prices`, no Footer of its own),
// headless Chrome on 127.0.0.1; ⛔ never the live store. The page's clock is fixed inside the offer.
//   PP1  with the shipped text, at 1280 and 390: the front page none; the meal plans page's four, the order page's
//        meals (desktop and phone cards), the cart summary's two figures ($87.50 -> $116.67) and the checkout's Plan
//        Total, each recorded before its price, equal to item 3's figure, aria-hidden, overlapping no control; pasted
//        once per document (the front page, /meal-plans, /order: the cart and the checkout are the order page's
//        document, routed in the app).
//   PP2  without --script: nothing pasted and no struck figure recorded on any surface.
//   PP3  the CLI's file reader: a storefront/footer-block/*.md file gives its fenced fragment without its <script> tags;
//        a fragment that does not hash to the file's fragment_sha256 is refused; a console file is taken as it is.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { probePricesRun, scriptOfFile } from "../lib/probe-prices.mjs";
import { startStore } from "./browser-store.mjs";
import { chrome, shipped, skip } from "./r2-browser.mjs";

const SITE = new URL("../../../", import.meta.url);
const OFFER = JSON.parse(await readFile(new URL("data/offers.json", SITE), "utf8")).offers.find((o) => o.applies_to === "general" && o.percent_off);
const INSIDE = Date.parse(`${OFFER.valid_from}T16:00:00Z`);

let store;
let site;
before(async () => {
  if (skip) return;
  store = await startStore();
  site = await shipped();
});
after(async () => {
  await store?.close();
});

const clockAt = (now) => async (page) =>
  page.evaluateOnNewDocument((t) => {
    const D = Date;
    window.Date = class extends D {
      constructor(...a) {
        if (a.length) super(...a);
        else super(t);
      }
      static now() {
        return t;
      }
    };
  }, now);

const run = (width, script) =>
  probePricesRun({ origin: store.origin, width, mpid: 21, need: 7, executablePath: chrome, script, scriptLabel: script ? "the shipped text" : null, share: OFFER.percent_off, onPage: clockAt(INSIDE) });

test("PP1: --script, every surface's struck figures recorded before their prices, item 3's figure, overlapping nothing (1280, 390)", { skip, timeout: 180_000 }, async () => {
  store.set({ prices: true });
  for (const width of [1280, 390]) {
    const r = await run(width, site.text);
    assert.equal(r.error, null, `${width}: ${r.error}`);
    assert.deepEqual(r.pastes, ["/", "/meal-plans", "/order"], `${width}: one paste per document`);
    assert.deepEqual(r.reads.front.struck, [], "the front page: none");
    const at = (k) => r.reads[k].struck;
    assert.deepEqual(at("mealPlans").map((w) => [w.price.tag, w.price.text, w.text]), [["strong", "$11.50", "$15.33"], ["strong", "$13.00", "$17.33"], ["strong", "$14.00", "$18.67"], ["strong", "$38.00", "$50.67"]]);
    const meals = at("order");
    assert.equal(meals.length, 18, `${width}: each meal's two cards (${meals.length})`);
    assert.ok(meals.every((w) => /^(product__content-price|product-card-mobile__price)$/.test(w.price.classes.join(" ")) && w.price.text === "$12.50" && w.text === "$16.67"), JSON.stringify(meals[0]));
    const cart = at("cart").filter((w) => w.price.text === "$87.50");
    assert.deepEqual(cart.map((w) => [w.price.classes.join(" "), w.text]).sort(), [["mobile-cart-summary__stat-value", "$116.67"], ["segment-price", "$116.67"]]);
    assert.deepEqual(at("checkout").map((w) => [w.price.classes.join(" "), w.price.text, w.text]), [["summary__plan-total-value", "$87.50", "$116.67"]]);
    for (const k of ["mealPlans", "order", "cart", "checkout"]) {
      for (const w of at(k)) {
        assert.equal(w.equal, true, `${width} ${k}: ${w.text} is item 3's figure for ${w.price.text} (${w.expected})`);
        assert.equal(w.ariaHidden, "true");
        assert.deepEqual(w.overlaps, [], `${width} ${k}: ${w.text} overlaps no control`);
        assert.ok(w.box && w.price.box, "both boxes recorded");
      }
      assert.ok(at(k).some((w) => w.displayed), `${width} ${k}: a struck figure displayed`);
    }
  }
});

test("PP2: without --script, nothing pasted and no struck figure recorded", { skip, timeout: 120_000 }, async () => {
  store.set({ prices: true });
  const r = await run(1280, null);
  assert.equal(r.error, null, r.error);
  assert.deepEqual(r.pastes, []);
  for (const [k, read] of Object.entries(r.reads)) assert.deepEqual(read.struck, [], `${k}: none`);
  assert.ok(r.reads.mealPlans.prices.length === 4 && r.reads.checkout.prices.length > 0, "fixture control: the priced surfaces read");
});

test("PP3: --script's file reader: a block .md file's fragment, checked against its hash; a console file as it is", async () => {
  const dir = new URL("storefront/footer-block/", SITE);
  const latest = (await readdir(dir)).filter((f) => /^2026-10-27-fitaf-handoff-\w+\.md$/.test(f)).sort().pop();
  const md = await readFile(new URL(latest, dir), "utf8");
  const text = scriptOfFile(md);
  assert.match(text, /^\n\/\* fitaf-handoff \w+ sha256:[0-9a-f]{64} \*\/\n/, "the fragment's text, its version line first");
  assert.ok(!text.includes("<script>") && !text.includes("</script>"), "its <script> tags taken off");
  assert.throws(() => scriptOfFile(md.replace("fitaf_struck", "fitaf_strucK")), /hashes to/, "a changed fragment refused");
  assert.equal(scriptOfFile("/* fitaf-handoff x sha256:0 */\n(function () {})();\n"), "/* fitaf-handoff x sha256:0 */\n(function () {})();\n");
});
