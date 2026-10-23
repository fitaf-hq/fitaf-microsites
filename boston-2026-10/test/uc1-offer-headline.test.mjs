// UC1 (SPEC-ui-and-copy-pass.md § 1 item 1, the Advisor's note 01-landing-start: "Drop "Your Boston offer" and make the
// text – "Today only: sign up to save 25%" (I'm OK with iterating on it) and more prominent"): the offer at the top. The
// box loses its heading "Your Boston offer"; the offer's line is the box's heading, its words a new field of the offer,
// `headline` (data/offers.json); `label` is unchanged wherever it prints today (the save step's line and /o; E1 prints
// neither), since "Today only" would be false in a next-morning email; an offer without `headline` prints `label`, as
// now; the box keeps its accessible name. Both builds that carry the box: the development page and the production page
// with `production` true. Its look at 390 and 1280 is Storybook's (tools/storybook/test/uc-chrome.test.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { parseHTML } from "linkedom";
import offersFile from "../data/offers.json" with { type: "json" };
import { productionRefusals } from "../scripts/production-inputs.mjs";
import { offerForSave } from "../src/worker/offers.js";
import { zonedDate } from "../src/worker/zoned-time.js";
import saveConfig from "../data/save.json" with { type: "json" };
import { FIXTURE_OFFERS } from "./offer-box-fixture.mjs";
import { readingOrder } from "./save-end-fixture.mjs";
import { pageText, productionInputs, saveData } from "./sp-production.mjs";
import { approvedWeekPage, CHECKOUT, NOW, openStep, weekPage } from "./uc-harness.mjs";
import { fetchPage, FixedRedemptions, postSave, RecordingSender, rows, runSendDue, startWorker, validSave } from "./worker-harness.mjs";

/** § 1 item 1's words, the Advisor's, and the label they leave unchanged (approved 2026-10-21). */
const HEADLINE = "Today only: sign up to save 25%";
const LABEL = "Sign up today to save 25%";
/** The box's accessible name, as it was before this contract (its heading's words). */
const BOX_NAME = "Your Boston offer";

const today = zonedDate(NOW, saveConfig.send_time_zone);
const pages = async () => [
  ["the development page", await weekPage()],
  ["the production page (production true)", (await approvedWeekPage()).html],
];

/** An element's accessible name by aria-labelledby: the referenced elements' text, in order (hidden ones included). */
function labelledBy(document, node) {
  const ids = (node.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
  assert.ok(ids.length > 0, `#${node.id} is named by aria-labelledby`);
  return ids.map((id) => document.getElementById(id)?.textContent.replace(/\s+/g, " ").trim() ?? `(no #${id})`).join(" ");
}

test("UC1: the Boston offer carries the headline; its label is unchanged", () => {
  const [offer] = offersFile.offers;
  assert.equal(offer.headline, HEADLINE, "offers[].headline, the Advisor's words");
  assert.equal(offer.label, LABEL, "the label as approved (2026-10-21)");
  assert.equal(offer.label_approved, "2026-10-21");
});

test("UC1: in the markup, the box's one heading is the offer's line, empty until the page fills it; no visible 'Your Boston offer'; the box keeps its name", async () => {
  for (const [name, html] of await pages()) {
    const { document } = parseHTML(html);
    const box = document.getElementById("offer-box");
    assert.ok(box, `${name}: the box`);
    const headings = [...box.querySelectorAll("h1, h2, h3, h4, h5, h6")];
    assert.deepEqual(headings.map((h) => h.id), ["save-offer-label"], `${name}: the box's one heading is the offer's line`);
    assert.equal(headings[0].localName, "h2", `${name}: a level-2 heading, as the box's heading was`);
    assert.equal(headings[0].textContent, "", `${name}: empty in the markup: the page writes it (the build stays date-independent, S24)`);
    assert.equal(labelledBy(document, box), BOX_NAME, `${name}: the box keeps its accessible name`);
    assert.equal(labelledBy(document, document.getElementById("save")), BOX_NAME, `${name}: and the step, named by the same element, keeps its own`);
    const nameElement = document.getElementById(box.getAttribute("aria-labelledby"));
    assert.ok(nameElement.hasAttribute("hidden"), `${name}: the name's element is not drawn ("the box loses its heading")`);
  }
});

test("UC1: as run, the box's heading is the headline and the step's line the label, each written as text", async () => {
  assert.equal(offerForSave(today).id, offersFile.offers[0].id, "control: the Boston offer is the one live on the page's clock");
  for (const [name, html] of await pages()) {
    const page = openStep(html, { hash: CHECKOUT });
    const heading = page.el("save-offer-label");
    assert.equal(heading.textContent, HEADLINE, `${name}: the box prints the headline`);
    assert.equal(heading.children.length, 0, `${name}: as text, never as markup`);
    assert.equal(page.el("save-step-offer-label").textContent, LABEL, `${name}: the step's line keeps the label`);
    const box = readingOrder(page.el("offer-box"));
    assert.deepEqual(box.map((n) => n.id), ["save-offer-label"], `${name}: a visitor reads one thing in the box, its heading (no "${BOX_NAME}")`);
  }
});

test("UC1: an offer without a headline prints its label in the box, as before", async () => {
  assert.ok(FIXTURE_OFFERS.offers.every((o) => !("headline" in o)), "control: the fixture's offers carry no headline");
  const page = openStep(await weekPage({ offers: FIXTURE_OFFERS }), { now: Date.parse("2026-10-15T17:00:00Z") });
  const expected = offerForSave("2026-10-15", FIXTURE_OFFERS.offers).label;
  assert.equal(page.el("save-offer-label").textContent, expected, "the box prints the label");
  assert.equal(page.el("save-step-offer-label").textContent, expected, "and the step's line the same label");
});

test("UC1: the page receives the headline (never a code); an offer's markup is written as text", async () => {
  const offers = saveData(await weekPage()).offers;
  assert.deepEqual(offers.map((o) => o.headline), [HEADLINE], "save-data carries the headline");
  for (const o of offers) assert.ok(!("shared_code" in o) && !("code_mode" in o), "no code reaches the page (S23)");
  const marked = structuredClone(offersFile);
  marked.offers[0].headline = '<em>today</em> & "more"';
  const page = openStep(await weekPage({ offers: marked }));
  assert.equal(page.el("save-offer-label").textContent, marked.offers[0].headline, "the headline's markup shown as text");
  assert.equal(page.el("save-offer-label").children.length, 0);
});

test("UC1: /o prints the label, never the headline; E1 prints neither", async () => {
  const { mf, db } = await startWorker();
  try {
    assert.equal((await postSave(mf, validSave({ email: "dummy-uc1@example.com" }))).status, 200);
    const [{ offer_code: code }] = await rows(db, "SELECT offer_code FROM saves");
    const words = pageText((await fetchPage(mf, `/o/${code}`)).text);
    assert.ok(words.includes(LABEL), "/o: the label");
    assert.ok(!words.includes(HEADLINE), "/o: not the headline");
    const sender = new RecordingSender();
    await runSendDue(db, { nowMs: Date.parse("2026-10-25T13:00:00Z"), sender, redemptions: new FixedRedemptions() });
    assert.equal(sender.messages.length, 1, "control: E1 went");
    assert.ok(!sender.messages[0].text.includes(HEADLINE) && !sender.messages[0].html.includes(HEADLINE), "E1: no headline");
  } finally {
    await mf.dispose();
  }
});

test("UC1: the production gate refuses a headline left a placeholder, as it refuses such a label", async () => {
  const { dir, save, zips, vars, options } = await productionInputs();
  try {
    const draftText = await readFile(options.draftPath, "utf8");
    const offers = { ...structuredClone(offersFile), status: "approved" };
    const named = (o) => productionRefusals({ save, offers: o, zips, draftText, vars, printed: [] }).filter((r) => /offers\.json/.test(r));
    assert.deepEqual(named(offers), [], "control: the committed headline is refused nothing");
    offers.offers[0].headline = "[The headline]";
    assert.deepEqual(named(offers), [`data/offers.json: offer ${offers.offers[0].id}'s headline is a placeholder: [The headline]`]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
