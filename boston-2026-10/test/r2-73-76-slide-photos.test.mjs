// R2-73 – R2-76 (SPEC-rung2-progress-and-checkout § 17.2, § 17.4), on the synthetic order page holding the fixture
// week's cards (r2-photos.mjs). The links are written by the tests' own encoder (r2-photos.mjs photoText), never by the
// tool under test (R2-72 checks the tool writes the same text). "A request" is an img the block gives a src (linkedom
// loads nothing); a card's image is given the state a browser would report.
//   R2-73 ⭐ the card images never load: each slide shows its meal's cell from the coded host AT ITS FIRST PRESS (the
//         step its slide is made), the window § 17.2 names; a meal with no cell has today's slide (the name alone).
//   R2-74 an old link (no photo part): the slides exactly as today — step for step what the LIVE block (914668de…, rebuilt
//         as R2-71 rebuilds it) shows on the same page; and (R2-74b) what the live block does with a link that HAS the
//         photo part (§ 17.1: the builder states it).
//   R2-75 ⛔ an unknown host code (out of the list, a URL, a word): no request at all, and today's slides; the fill as
//         ever (done).
//   R2-76 the sheet fails: per slide, today's fallback (the card's loaded image, else the name alone), and no sheet asked
//         for again.
import test from "node:test";
import assert from "node:assert/strict";
import { script } from "./r2-harness.mjs";
import { liveText, PREVIOUS_FOOTER, FILL_B_FOOTER } from "./r2-live.mjs";
import { DONE, expectedWindow, NAMES, NO_CELL, observe, PIXEL, sheetUrl, slideAtFirstPress, unknownHost, WITH_CELL, weekFragment, weekPage } from "./r2-photos.mjs";

test("R2-73: card images never loading — each slide shows its meal's cell from the coded host at its first press", async () => {
  assert.ok(WITH_CELL.length >= 2 && NO_CELL.length >= 1, "fixture control: meals with and without a cell");
  await slideAtFirstPress(await script(), 0);
  await slideAtFirstPress(await script(), 1); // the test address
});

/** A step-by-step record of the slides, comparable between two texts. */
const record = async (text, page, fragment) => {
  const seen = await observe(text, page, fragment);
  return { info: seen.h.info, presses: page.all, first: [...seen.first.values()], last: seen.last, srcs: seen.srcs };
};
/** R2-52's page: one card's photo loaded, the others not. */
const r2_52 = (name) => (name === NAMES[0] ? { complete: true, naturalWidth: 640, currentSrc: PIXEL } : {});

test("R2-74: an old link (no photo part) — the slides exactly as the live block shows them, step for step", async () => {
  const live = await liveText(FILL_B_FOOTER);
  const ours = await record(await script(), await weekPage(r2_52), weekFragment(""));
  const theirs = await record(live, await weekPage(r2_52), weekFragment(""));
  assert.ok(ours.info.includes(DONE), "control: the fill completes");
  assert.deepEqual(ours.first[0], { name: NAMES[0], sheet: null, card: PIXEL }, "control: today's rule, the card's loaded photo");
  // The one line that differs is the fill's own name: the live block is fill B, this text fill C (SPEC-rung2-fill-c).
  assert.ok(theirs.info.includes("[fitaf-handoff] fill B, mpid 21"), "control: the live block names fill B");
  assert.deepEqual(ours, { ...theirs, info: theirs.info.map((line) => line.replace("] fill B, mpid", "] fill C, mpid")) });
});

test("R2-74b: the LIVE block (914668de…) given a link with the photo part — refuses it whole: nothing pressed, no screen", async () => {
  const live = await liveText(PREVIOUS_FOOTER);
  const page = await weekPage();
  const seen = await observe(live, page, weekFragment());
  assert.deepEqual(page.all, [], "nothing pressed");
  assert.equal(seen.first.size, 0, "no screen, no slide");
  assert.equal(seen.h.url.hash, "", "the fragment removed");
  assert.ok(seen.h.info.some((l) => /^\[fitaf-handoff\] stopped: bad meal: /.test(l)), JSON.stringify(seen.h.info));
});

test("R2-75: an unknown host code — no request to any host, today's slides, the fill as ever", async () => {
  await unknownHost(await script());
});

test("R2-76: the sheet fails — per slide, today's fallback (the card's loaded image, else the name alone); not asked for again", async () => {
  const page = await weekPage(r2_52);
  let failed = 0;
  const seen = await observe(await script(), page, weekFragment(), {
    onStep: ({ made }) => {
      // The browser reports the sheet's failure once its first slide has asked for it.
      const asked = made.filter((i) => i.getAttribute("src") === sheetUrl(0) && i.parentElement);
      if (failed || !asked.length) return;
      failed = asked.length;
      for (const i of made.filter((m) => m.getAttribute("src") === sheetUrl(0))) i.dispatchEvent(new page.document.defaultView.Event("error"));
    },
  });
  assert.ok(seen.h.info.includes(DONE), JSON.stringify(seen.h.info));
  assert.equal(failed, 1, "fixture control: the first slide asked for the sheet, and it failed");
  assert.deepEqual(seen.first.get(NAMES[0]).sheet, expectedWindow(NAMES[0]), "fixture control: the first slide showed the cell before the failure");
  assert.deepEqual(
    seen.last,
    NAMES.map((name) => ({ name, sheet: null, card: name === NAMES[0] ? PIXEL : null })),
    "every slide by today's rule: the first, its card's loaded photo; the rest, the name alone",
  );
  const sheets = seen.srcs.filter((s) => s === sheetUrl(0)).length;
  assert.ok(sheets <= 2, `not asked for again after it failed (${sheets}: the early load and the first slide)`);
});
