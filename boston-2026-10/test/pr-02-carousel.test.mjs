// PR-2 (SPEC-plan-page-refinement § 2 item 1, § 5): the carousel. Below the logo, above the tabs: five windows onto the
// manifest's carousel cells by position, each alt=""; a dot each; the page's script advances it on a 4 s timer, and
// starts none under prefers-reduced-motion (the script's own check). Over the fixture manifest and sheets.
import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { midday, DAYS, openPlanPage } from "./cc-harness.mjs";
import { FIXTURE_PHOTOS as photos, photoPage } from "./pr-harness.mjs";

const CAROUSEL_MS = 4000;
const pct = (n) => `${Number(n.toFixed(4))}%`;

// Updated (§ 8 items 1–2): no dots (PR-12), and the carousel is the top of the page with the logo over it (PR-13).
test("PR-2: five cells from the manifest, alt=\"\"; a 4 s timer; none under reduced motion", async () => {
  const prod = await photoPage("prod");
  const { document } = parseHTML(prod);
  assert.ok(prod.indexOf('id="carousel"') < prod.indexOf('class="tabs'), "above the tabs");
  const sheet = photos.carousel;
  const cells = ["1", "2", "3", "4", "5"].map((n) => sheet.cells[n]);
  const imgs = [...document.querySelectorAll("#carousel .slide img")];
  assert.equal(imgs.length, 5, "five photos");
  imgs.forEach((img, i) => {
    assert.equal(img.getAttribute("alt"), "", `photo ${i + 1}: decorative`);
    assert.equal(img.getAttribute("src"), photos.base + sheet.file, `photo ${i + 1}: the sheet`);
    assert.match(img.getAttribute("style"), new RegExp(`top:${pct((-cells[i].y / cells[i].h) * 100)}(;|$)`), `photo ${i + 1}: its cell`);
  });
  const page = openPlanPage(prod, { now: midday(DAYS["S-5"]) });
  assert.deepEqual(page.timers.map((t) => t.ms), [CAROUSEL_MS], "one timer, every 4 s");
  page.tick();
  assert.equal(page.document.querySelectorAll("#carousel .slide")[1].className, "slide on", "it advances to the second");
  const still = openPlanPage(prod, { now: midday(DAYS["S-5"]), reducedMotion: true });
  assert.deepEqual(still.timers, [], "no timer under prefers-reduced-motion");
});
