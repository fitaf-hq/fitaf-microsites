// R2-91 (SPEC-rung2-progress-and-checkout § 25.4, § 25.7 F3 "As proposed"): the three-step checkout's words come from
// data/messages.json's `handoff` (`steps`, the bar: "Your meals · Delivery · Payment"; `to_delivery`, `to_payment`, the
// Continue button; `back`; `recap`, the line before the Total), inlined by the build as the screen's are (R2-50). So: no
// phrase of them in the source; the built text carries each, with the bar's middle dot written as the ASCII escape
// · (the text stays ASCII, § 17.3), and the block splits the bar at that same escape; a word changed in a COPY of
// the file changes the built text; and the build refuses a bar that is not three names, and a recap without {n}. What
// the bar and buttons SHOW is proven in Chrome (the watch package, R2-83 and R2-84). The copies are made in a temporary
// directory; no file in the repository is edited.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MESSAGES_PATH } from "../build.mjs";
import { STOREFRONT_SOURCE, storefrontText } from "../scripts/build-storefront.mjs";

const RULED = {
  steps: "Your meals · Delivery · Payment",
  to_delivery: "Continue to delivery",
  to_payment: "Continue to payment",
  back: "Back",
};
const ESCAPE = "\\u00b7";

async function withMessages(edit, fn) {
  const dir = await mkdtemp(join(tmpdir(), "boston-r2-91-"));
  try {
    const copy = join(dir, "messages.json");
    const m = JSON.parse(await readFile(MESSAGES_PATH, "utf8"));
    edit(m.handoff);
    await writeFile(copy, JSON.stringify(m, null, 2));
    return await fn(copy);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("R2-91: the steps' words are data/messages.json's, as ruled; none in the source; the dot shipped as \\u00b7; the text ASCII", async () => {
  const words = JSON.parse(await readFile(MESSAGES_PATH, "utf8")).handoff;
  for (const [key, value] of Object.entries(RULED)) assert.equal(words[key], value, `handoff.${key}: the words as ruled (§ 25.7 F3)`);
  assert.match(words.recap, /\{n\}/, "handoff.recap carries {n}");
  const source = await readFile(STOREFRONT_SOURCE, "utf8");
  for (const phrase of [...RULED.steps.split(" · "), RULED.to_delivery, RULED.to_payment, words.recap]) {
    assert.ok(!source.includes(phrase), `the source carries a phrase: ${JSON.stringify(phrase)}`);
  }
  assert.doesNotMatch(source, /["']Back["']/, "the Back button's word is not a string of the source");
  const text = await storefrontText();
  assert.deepEqual([...text].filter((ch) => ch.charCodeAt(0) > 0x7f), [], "the built text is ASCII");
  const asShipped = (s) => JSON.stringify(s).slice(1, -1).replace(/·/g, ESCAPE);
  for (const key of ["steps", "to_delivery", "to_payment", "back", "recap"]) {
    assert.ok(text.includes(`"${key}":"${asShipped(words[key])}"`), `the built text carries handoff.${key}, the dot as ${ESCAPE}`);
  }
  assert.ok(text.includes(`UI.steps.split(" ${ESCAPE} ")`), "the block splits the bar at the same escape");
});

test("R2-91b: a step word changed in a copy of data/messages.json changes the built text", async () => {
  const committed = await storefrontText();
  await withMessages((h) => {
    h.to_payment = "R2-91 A CHANGED WORD";
  }, async (messagesPath) => {
    const text = await storefrontText({ messagesPath });
    assert.notEqual(text, committed);
    assert.ok(text.includes('"to_payment":"R2-91 A CHANGED WORD"'));
  });
});

test("R2-91c: the build refuses a bar that is not three names, and a recap without {n}", async () => {
  await withMessages((h) => {
    h.steps = "Your meals · Payment";
  }, (messagesPath) => assert.rejects(storefrontText({ messagesPath }), /handoff\.steps is not three names/));
  await withMessages((h) => {
    h.recap = "meals";
  }, (messagesPath) => assert.rejects(storefrontText({ messagesPath }), /handoff\.recap has no \{n\}/));
});
