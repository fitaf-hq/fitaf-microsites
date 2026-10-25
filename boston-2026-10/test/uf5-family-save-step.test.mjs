// UF5 (SPEC-ui-and-copy-pass.md § 2.2 item 3: "The offer and the save step apply to Family as to individuals"): the save
// step is shown beside a Family cart's Continue to checkout, directly after the card's last link (Choose my own meals),
// as beside an individual's (SPEC-ui-and-copy-pass § 1 item 2, UC2's rule); never on Family with no answer or with no
// cart (Choose your meals alone); and a save from Family is the same save. The development page and the production page
// with every input approved (`production` true), each with the version-2 fixture week, the save's services stood in for.
import test from "node:test";
import assert from "node:assert/strict";
import { pageWithWeek, weekData } from "../scripts/week-content.mjs";
import { V2_DIR } from "./ms-harness.mjs";
import { assertFlowOneAbsent, assertFlowOneDirectlyAfterStoreButton } from "./save-end-fixture.mjs";
import { approvedPage } from "./sp-production.mjs";
import { openStep, saveWith } from "./uc-harness.mjs";
import { pages } from "./uq-harness.mjs";

const { development } = await pages();
const approved = pageWithWeek((await approvedPage()).html, (await weekData({ picksDir: V2_DIR, target: "prod" })).data);
const BUILDS = { "the development page": development, "the production page (production true)": approved };

test("UF5: the save step beside a Family cart's checkout, directly after Choose my own meals; none without one", () => {
  for (const [where, html] of Object.entries(BUILDS)) {
    const { button } = assertFlowOneDirectlyAfterStoreButton(openStep(html, { hash: "#family-and" }));
    assert.equal(button.id, "cc-own", `${where}, #family-and: after the card's last link`);
    for (const hash of ["#family", "#family-or"]) {
      try {
        assertFlowOneAbsent(openStep(html, { hash }));
      } catch (err) {
        err.message = `${where}, ${hash}: no Family cart's checkout, so no step: ${err.message}`;
        throw err;
      }
    }
  }
});

test("UF5: a save from Family is the same save (the offer's, the step's fields)", async () => {
  for (const [where, html] of Object.entries(BUILDS)) {
    const page = openStep(html, { hash: "#family-and" });
    assertFlowOneDirectlyAfterStoreButton(page); // control: the step is shown, beside Family's checkout
    await saveWith(page);
    assert.equal(page.fetches.length, 1, `${where}: one request`);
    const body = JSON.parse(page.fetches[0].init.body);
    assert.deepEqual(Object.keys(body).sort(), ["consent_marketing", "email", "event_id", "kind", "turnstile_token", "wording_version", "zip"], `${where}: the save's fields`);
    assert.equal(body.kind, "offer", `${where}: an offer save`);
    assert.equal(page.el("save-done").hidden, false, `${where}: saved`);
  }
});
