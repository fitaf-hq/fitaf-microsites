// S29 (SPEC-rung4-save-offer.md § 2b item 1): the page's markup has no dialog, [aria-modal] or overlay element for
// Flow 1 ("We do not need to enable the initial modal/overlay we were planning"). The page's dialogs are Flow 2's See
// all plans grid and, since SPEC-why-fit-af.md § 2 item 2, the footer's /why/ page (#why); neither is Flow 1's. Two
// mutants on copies, in memory, show the assertion can fire.
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 4 B (2026-10-26, the Advisor: "When tapped, that shows a modal with the contents of
// the "save offer form". I think that will cleanup the flow."): § 2b item 1 is reversed for Flow 1 by his ruling. S29 now
// holds § 4 B's form of it (save-end-fixture assertFlowOneInItsDialog): Flow 1 inside exactly one modal element, its own
// dialog, which Not ready? opens; no overlay styling; nothing modal inside it; the offer box in no dialog. Its mutants:
// Flow 1 back in the page's flow (out of its dialog, rung 4's place), Flow 1 wrapped in a second modal dialog, and Flow 1
// styled as an overlay; each fails it.
import test from "node:test";
import assert from "node:assert/strict";
import { devPage } from "./dev-page.mjs";
import { assertFlowOneInItsDialog } from "./save-end-fixture.mjs";

const html = await devPage({ card: true });

test("S29 (§ 4 B): Flow 1 in one modal dialog, its own; no overlay; nothing modal inside it", () => {
  assertFlowOneInItsDialog(html);
});

test("S29: mutants — Flow 1 out of its dialog, in a second modal dialog, or styled as an overlay -> S29 fails", () => {
  const section = /<section class="save js-only" id="save"[\s\S]*?<\/section>/.exec(html)?.[0];
  assert.ok(section && html.split(section).length === 2, "the mutation site (Flow 1's section) occurs exactly once");
  const dialogEnd = "\n      </dialog>";
  assert.equal(html.split(dialogEnd).length - 1, 1, "the mutation site (Flow 1's dialog's end) occurs exactly once");
  const outOfIt = html.replace(section, "").replace(dialogEnd, dialogEnd + "\n" + section);
  assert.throws(() => assertFlowOneInItsDialog(outOfIt), /Flow 1 is inside exactly one modal element, its own dialog/, "Flow 1 back in the page's flow");
  const twice = html.replace(section, `<dialog open aria-modal="true">${section}</dialog>`);
  assert.throws(() => assertFlowOneInItsDialog(twice), /exactly one modal element|aria-modal/, "Flow 1 in a second modal dialog");
  const style = "</style>";
  assert.equal(html.split(style).length - 1 >= 1, true);
  const overlay = html.replace(style, ".save { position: fixed; inset: 0; z-index: 10; }\n</style>");
  assert.throws(() => assertFlowOneInItsDialog(overlay), /no overlay: \.save/, "Flow 1 styled as an overlay");
});
