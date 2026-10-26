// A9 (SPEC-analytics.md § 3, § 7): pressing the order link queues the beacon and leaves the link's `href`, with its
// fragment, unchanged: the click-through is a beacon sent as the link is pressed; the link itself is the hand-off's,
// exactly as today. The Chef's Choice link (its `#fitaf=2.…` fragment), Choose my own meals, Choose your meals, a grid
// cell and the Family button are each `order` or `chefs-choice` with the mpid their own href names; See all plans is
// `all-plans`, no mpid. No press is prevented.
import test from "node:test";
import assert from "node:assert/strict";
import { builtPage, openVisit, ORDER } from "./a-harness.mjs";

const clicks = (visit) => visit.beacons.filter((b) => b.body.event === "click").map((b) => b.body);

/** Press the element; return its href before and after, whether the press was prevented, and the clicks it sent. */
function pressLink(visit, element) {
  const before = element.getAttribute("href");
  const n = clicks(visit).length;
  const event = visit.press(element);
  return { before, after: element.getAttribute("href"), prevented: event.defaultPrevented, sent: clicks(visit).slice(n) };
}

test("A9: the Chef's Choice link: the beacon is queued and the href, with its fragment, is unchanged", async () => {
  const visit = openVisit(await builtPage({ week: true }), { hash: "#lean-7" });
  const link = visit.el("cc-checkout");
  const press = pressLink(visit, link);
  assert.match(press.before, new RegExp(`^${ORDER}\\?mpid=21#fitaf=2\\.`), "control: the week's link, with its fragment");
  assert.equal(press.after, press.before, "the href unchanged");
  assert.equal(press.prevented, false, "the press goes on to the store");
  assert.deepEqual(press.sent.map(({ link, mpid }) => [link, mpid]), [["chefs-choice", 21]]);
  // ⚠ AMENDED by SPEC-ui-and-copy-pass § 5 item 3 (2026-10-26, BRIDGE): Choose my own meals is a chip that sends Continue
  // to checkout to the plan's order page; the checkout's press is sent as it is (`chefs-choice`, the mpid its href names).
  const chip = visit.document.querySelector('#cc-menus input[type="radio"][value="own"]');
  for (const r of visit.document.querySelectorAll('#cc-menus input[type="radio"]')) r.checked = r === chip;
  chip.dispatchEvent(new visit.document.defaultView.Event("change", { bubbles: true }));
  const own = pressLink(visit, link);
  assert.equal(own.before, `${ORDER}?mpid=21`);
  assert.equal(own.after, own.before);
  assert.equal(own.prevented, false);
  assert.deepEqual(own.sent.map(({ link, mpid }) => [link, mpid]), [["chefs-choice", 21]]);
});

test("A9: Choose your meals, a grid cell, the Family button and See all plans", async () => {
  const visit = openVisit(await builtPage(), { hash: "#signature-14" });
  const cta = pressLink(visit, visit.el("result-cta"));
  assert.equal(cta.before, `${ORDER}?mpid=29`, "control: Signature 14 is mpid 29");
  assert.equal(cta.after, cta.before);
  assert.deepEqual(cta.sent.map(({ link, mpid }) => [link, mpid]), [["order", 29]]);
  const cell = pressLink(visit, visit.document.querySelector('[data-cell="performance-7"]'));
  assert.deepEqual(cell.sent.map(({ link, mpid }) => [link, mpid]), [["order", 31]]);
  assert.equal(cell.after, cell.before);
  const family = pressLink(visit, visit.document.querySelector('.family-card [data-plan="family"]'));
  assert.deepEqual(family.sent.map(({ link, mpid }) => [link, mpid]), [["order", 35]]);
  const all = pressLink(visit, visit.el("all-link"));
  assert.deepEqual(all.sent, [{ event: "click", s: visit.beacons[0].body.s, link: "all-plans" }]);
  for (const p of [cta, cell, family, all]) assert.equal(p.prevented, false);
});
