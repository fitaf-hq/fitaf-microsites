// S29 (SPEC-rung4-save-offer.md § 2b item 1): the page's markup has no dialog, [aria-modal] or overlay element for
// Flow 1 ("We do not need to enable the initial modal/overlay we were planning"). The page's dialogs are Flow 2's See
// all plans grid and, since SPEC-why-fit-af.md § 2 item 2, the footer's /why/ page (#why); neither is Flow 1's. Two
// mutants on copies, in memory, show the assertion can fire.
import test from "node:test";
import assert from "node:assert/strict";
import { devPage } from "./dev-page.mjs";
import { assertNoModalForFlowOne } from "./save-end-fixture.mjs";

const html = await devPage({ card: true });

test("S29: no dialog, [aria-modal] or overlay element for Flow 1", () => {
  assertNoModalForFlowOne(html);
});

test("S29: mutants — Flow 1 in a modal dialog, or styled as an overlay -> S29 fails", () => {
  const section = /<section class="save js-only" id="save"[\s\S]*?<\/section>/.exec(html)?.[0];
  assert.ok(section && html.split(section).length === 2, "the mutation site (Flow 1's section) occurs exactly once");
  const inDialog = html.replace(section, `<dialog open aria-modal="true">${section}</dialog>`);
  assert.throws(() => assertNoModalForFlowOne(inDialog), /not inside dialog|aria-modal/, "Flow 1 in a modal dialog");
  const style = "</style>";
  assert.equal(html.split(style).length - 1 >= 1, true);
  const overlay = html.replace(style, ".save { position: fixed; inset: 0; z-index: 10; }\n</style>");
  assert.throws(() => assertNoModalForFlowOne(overlay), /no overlay: \.save/, "Flow 1 styled as an overlay");
});
