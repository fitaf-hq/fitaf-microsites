// UC3 (SPEC-ui-and-copy-pass.md § 1 item 3, the Advisor's note f-save-errors: "Please move the error message (and any
// messages) to a more appropriate/logical place"; the finding: they "appear below the fine print, away from the field
// they are about"). An error about a field (the email, the ZIP code) is read directly under that field and marks it
// (aria-invalid, and aria-describedby naming the message); an error about the whole save (the check, the network, the
// offer) is read directly above the button that made it; out of area, its line and button take the place of the offer's
// own (the tick, Save my offer and the fine print), directly after the fields, which stay so the ZIP can be corrected;
// the done lines in the step's place (UC2). Every message's words unchanged. On the development page with the fixture
// week (the step is shown only beside Continue to checkout, § 1 item 2); the production page carries the same step.
import test from "node:test";
import assert from "node:assert/strict";
import { readingOrder } from "./save-end-fixture.mjs";
import { approvedWeekPage, fire, IN_ZIP, NEAR_ZIP, neighbours, openStep, saveWith, settle, shown, type, weekPage } from "./uc-harness.mjs";

const pages = [
  ["the development page", await weekPage()],
  ["the production page (production true)", (await approvedWeekPage()).html],
];

/** Flow 1's messages, word for word as they were before this contract (src/save/flow1.js MESSAGES). */
const WORDS = {
  email_invalid: "That email address doesn't look right.",
  zip_invalid: "Enter a five-digit ZIP code.",
  rate_limited: "Too many tries — please wait a minute and try again.",
  turnstile_failed: "We couldn't check this request. Please try again.",
  loading: "Still loading — please try again in a moment.",
  network: "Couldn't reach us. Check your connection and try again.",
  other: "Something went wrong. Please try again.",
};
const FIELDS = { email: "save-email", zip: "save-zip" };
const MESSAGE_OF = { email: "save-email-error", zip: "save-zip-error" };

/** The step's messages and marks at this moment: every message shown, by id, and each field's marks. */
function messages(page) {
  const ids = ["save-email-error", "save-zip-error", "save-error", "save-expansion-error"];
  return {
    shown: Object.fromEntries(ids.filter((id) => shown(page, id)).map((id) => [id, page.el(id).textContent])),
    marks: Object.fromEntries(
      Object.entries(FIELDS).map(([f, id]) => [f, [page.el(id).getAttribute("aria-invalid"), page.el(id).getAttribute("aria-describedby")]]),
    ),
  };
}
const UNMARKED = [null, null];
/** A node as a failure names it (never the node itself: an assertion inspecting a DOM node never ends). */
const named = (n) => (n ? `${n.localName}${n.id ? `#${n.id}` : ""}${n.className ? `.${String(n.className).split(" ").join(".")}` : ""}` : "nothing");

/** A field's error: read directly under the field, the field marked, nothing else shown or marked. */
function assertFieldError(page, field, words, where) {
  const input = page.el(FIELDS[field]);
  const message = page.el(MESSAGE_OF[field]);
  assert.equal(named(neighbours(page, input).after), named(message), `${where}: the message is read directly under the ${field} field`);
  assert.deepEqual(messages(page), {
    shown: { [MESSAGE_OF[field]]: words },
    marks: { email: UNMARKED, zip: UNMARKED, [field]: ["true", MESSAGE_OF[field]] },
  }, `${where}: only that message, and only that field marked (aria-invalid, aria-describedby naming the message)`);
}

/** An error about the whole save: read directly above `button`, no field marked. */
function assertWholeError(page, id, button, words, where) {
  assert.equal(named(neighbours(page, page.el(button)).before), named(page.el(id)), `${where}: the message is read directly above #${button}`);
  assert.deepEqual(messages(page), { shown: { [id]: words }, marks: { email: UNMARKED, zip: UNMARKED } }, `${where}: no field marked`);
}

test("UC3: an email or a ZIP code the page refuses — its message directly under that field, the field marked; nothing sent", async () => {
  for (const [where, html] of pages) {
    const email = openStep(html);
    await saveWith(email, { email: "not-an-address", zip: IN_ZIP });
    assertFieldError(email, "email", WORDS.email_invalid, `${where}, email`);
    const zip = openStep(html);
    await saveWith(zip, { zip: "0211" });
    assertFieldError(zip, "zip", WORDS.zip_invalid, `${where}, ZIP`);
    assert.equal(email.fetches.length + zip.fetches.length, 0, `${where}: nothing sent`);
  }
});

test("UC3: editing a refused field takes its message and its mark away", async () => {
  const page = openStep(pages[0][1]);
  await saveWith(page, { zip: "0211" });
  assertFieldError(page, "zip", WORDS.zip_invalid, "control");
  type(page, "save-zip", "02118");
  assert.deepEqual(messages(page), { shown: {}, marks: { email: UNMARKED, zip: UNMARKED } }, "no message, no mark");
});

test("UC3: the Worker refusing a field (email_invalid, zip_invalid) — the message under that field too", async () => {
  for (const [error, field] of [["email_invalid", "email"], ["zip_invalid", "zip"]]) {
    const page = openStep(pages[0][1], { stubs: { reply: { ok: false, json: { ok: false, error } } } });
    await saveWith(page);
    assert.equal(page.fetches.length, 1, `${error}: control: the save was sent`);
    assertFieldError(page, field, WORDS[error], `the Worker's ${error}`);
  }
});

test("UC3: an error about the whole save (the check, the network, the offer) — directly above Save my offer", async () => {
  const cases = [
    ["the check failed", { turnstile: "fail" }, WORDS.turnstile_failed],
    ["the check not loaded", { turnstile: null }, WORDS.loading],
    ["the network", { network: true }, WORDS.network],
    ["too many tries", { reply: { ok: false, json: { ok: false, error: "rate_limited" } } }, WORDS.rate_limited],
    ["the offer ended", { reply: { ok: false, json: { ok: false, error: "offer_ended" } } }, WORDS.other],
  ];
  for (const [where, html] of pages) {
    for (const [what, stubs, words] of cases) {
      const page = openStep(html, { stubs });
      await saveWith(page);
      assertWholeError(page, "save-error", "save-submit", words, `${where}, ${what}`);
    }
  }
});

test("UC3: out of area — its line and button in place of the offer's tick, Save my offer and fine print, directly after the fields", async () => {
  for (const [where, html] of pages) {
    const page = openStep(html);
    await saveWith(page, { zip: NEAR_ZIP });
    const read = readingOrder(page.el("save"));
    const zip = page.el("save-zip");
    const line = page.document.querySelector(".save-out-line");
    assert.equal(named(read[read.indexOf(zip) + 1]), named(line), `${where}: "We don't deliver to … yet" read directly after the fields`);
    for (const id of ["save-marketing", "save-submit"]) assert.equal(shown(page, id), false, `${where}: #${id} not shown out of area`);
    assert.equal([...page.el("save-form").querySelectorAll(".save-notice")].some((n) => read.includes(n)), false, `${where}: nor the offer's fine print`);
    assert.equal(shown(page, "save-expansion"), true, `${where}: Tell me when you deliver here`);
    assert.equal(shown(page, "save-email") && shown(page, "save-zip"), true, `${where}: the fields stay`);
    type(page, "save-zip", IN_ZIP);
    for (const id of ["save-marketing", "save-submit"]) assert.equal(shown(page, id), true, `${where}: editing the ZIP brings #${id} back`);
    assert.equal(shown(page, "save-out-of-area"), false, `${where}: and takes the out-of-area line away`);
  }
});

test("UC3: out of area, an error about the expansion save — directly above Tell me when you deliver here", async () => {
  const page = openStep(pages[0][1], { stubs: { turnstile: "fail" } });
  await saveWith(page, { zip: NEAR_ZIP });
  page.el("save-expansion").click();
  await settle();
  assertWholeError(page, "save-expansion-error", "save-expansion", WORDS.turnstile_failed, "the expansion's check failed");
  assert.equal(shown(page, "save-out-of-area"), true, "the out-of-area line stays");
});

test("UC3: each message's words are as they were", async () => {
  const script = [...pages[0][1].matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes("Flow 1 — save the offer"));
  for (const [key, words] of Object.entries(WORDS)) assert.ok(script.includes(`${key}: ${JSON.stringify(words)}`), `${key}: "${words}"`);
  const page = openStep(pages[0][1]);
  fire(page, page.el("save-form"), "submit");
  await settle();
  assert.equal(page.el("save-email-error").textContent, WORDS.email_invalid, "control: an empty email is the email's error");
});
