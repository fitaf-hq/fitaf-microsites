// SN-5 (SPEC-snacks-in-the-cart § 2 "no version bump", § 5 item 4, § 7): the block pasted in the store's Footer today —
// the one the watch's baseline expects (storefront/watch-baseline.json, expectedFooter), rebuilt from its own commit and
// checked against its SHA-256 by r2-live.mjs (76871ff9… on 2026-10-08) — refuses a link carrying a snack with NOTHING
// pressed: it reads `_<key>` as a bad meal, removes the fragment and stops, the visitor left on the plan's order page as
// rung 1 leaves it. The control: the same link without its snacks, which the pasted block fills to CHECKOUT. This is why
// no link carrying a snack is published before the Advisor pastes the block that reads it (§ 7).
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { FC_PATH, FC_PAYLOAD } from "./fc-harness.mjs";
import { liveText } from "./r2-live.mjs";
import { assertRefused, LOG_PREFIX, refKey } from "./r2-harness.mjs";
import { snRun, SN_PAYLOAD } from "./sn-harness.mjs";

/** The block pasted on 2026-10-08 (SPEC-rung2-progress-and-checkout § 27's text; the watch's expectedFooter). */
const PASTED = "76871ff95ab458a2453625efa0d8b8d8dd4ea330d9f02d0232ca6713c06a36d7";
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

test("SN-5: the pasted block refuses a link carrying a snack, pressing nothing", async () => {
  const text = await liveText();
  assert.equal(sha256(text), PASTED, "control: the text is the pasted block's");
  const r = await snRun({ text });
  assert.deepEqual(r.page.all, [], "no press at all: no meal, no snack, no control");
  assertRefused(r.h, FC_PATH, new RegExp(`stopped: bad meal: _${refKey(SN_PAYLOAD.snacks[0].name)}$`));
  assert.deepEqual([r.page.store.pending, r.page.store.cart], [[], []], "the plan and the cart hold nothing");
});

test("SN-5 (control): the pasted block fills the same link without its snacks", async () => {
  const r = await snRun({ text: await liveText(), payload: FC_PAYLOAD });
  assert.equal(r.last, `${LOG_PREFIX} done: /checkout`, JSON.stringify(r.ours));
});
