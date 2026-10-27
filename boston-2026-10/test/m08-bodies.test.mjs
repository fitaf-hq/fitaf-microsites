import test, { after } from "node:test";
import assert from "node:assert/strict";
import events from "../data/events.json" with { type: "json" };
import { displayCode } from "../src/worker/messages.js";
import { longDate, offerById } from "../src/worker/offers.js";
import { TOKEN_RE } from "../src/worker/token.js";
import { linkIn, NEAR_ZIP, postSave, startWorker, validSave } from "./worker-harness.mjs";
import { AllowlistSender } from "../src/worker/allowlist.js";
import { draftMessage, readHtml, resendSender, saveOffers, saveRow, send, stubFetch } from "./rung5-fixture.mjs";

const { mf, db, vars } = await startWorker();
after(() => mf.dispose());

// ⚠ Since SPEC-ui-and-copy-pass § 8 (2026-10-26) DRAFT § 3's E1 is the band (the flyer front's lines, which the draft names
// and does not copy: draftMessage puts them in its place), Claim my offer, the line under it, Already ordered?, and the
// footer's two lines, its link the literal eatfitaf.com to SITE_URL/; it has no /confirm link, ticked or not (item 7).
test("M8: E1 and E-X bodies, HTML and text -> DRAFT § 3 as written, placeholders filled; /o/ and /confirm/ use SITE_URL", async () => {
  const people = { ticked: "delivered+m8-ticked@resend.dev", unticked: "delivered+m8-unticked@resend.dev", ex: "delivered+m8-ex@resend.dev" };
  await saveOffers(mf, db, [people.ticked], { consent_marketing: true });
  const nowMs = await saveOffers(mf, db, [people.unticked]);
  await postSave(mf, validSave({ kind: "expansion", email: people.ex, zip: NEAR_ZIP }));
  const stub = stubFetch(() => Response.json({ id: "m8" }));
  const counts = await send(db, nowMs, new AllowlistSender(resendSender(stub.fetch), "@resend.dev"));
  assert.equal(counts.sent, 3);
  const bodyFor = (to) => stub.calls.find((c) => c.body.to[0] === to).body;

  const EX = await draftMessage("**E-X — at once, to an out-of-area request.**");
  assert.ok(EX.lines.length === 3, "control: the draft's E-X was read");

  for (const who of ["ticked", "unticked"]) {
    const row = await saveRow(db, people[who]);
    const body = bodyFor(people[who]);
    const offer = offerById(row.offer_id);
    // SPEC-save-offer-production § 10: the form of E1's second line for this offer (the date held, or the code).
    const E1 = await draftMessage("**E1 — the next morning, to a saved offer.**", { codeMode: offer.code_mode });
    assert.ok(E1.lines.length >= 8 && E1.lines.includes("Claim my offer"), "control: the draft's E1 was read, its band in place, one form of the line under the button");
    const expected = E1.lines.map((l) =>
      l.replace("[event]", events[0].name).replace("XXXX-XXXX", displayCode(row.offer_code)).replace("[date]", longDate(offer.valid_to)),
    );
    assert.equal(body.subject, E1.subject);
    assert.ok(!/\[[^\]]*\]|XXXX/.test(body.text + body.html), `${who}: no placeholder left`);
    const html = readHtml(body.html);
    assert.deepEqual(html.paragraphs, expected, `${who}: the HTML part is the draft, line for line`);
    for (const line of expected) assert.ok(body.text.includes(line), `${who}: the text part lacks: ${line}`);

    const offerUrl = `${vars.SITE_URL}/o/${row.offer_code}`;
    assert.ok(body.text.includes(offerUrl), `${who}: text /o/ link on SITE_URL`);
    assert.ok(body.text.includes(`eatfitaf.com: ${vars.SITE_URL}/`), `${who}: the footer's link on SITE_URL`);
    assert.deepEqual(html.hrefs, [offerUrl, `${vars.SITE_URL}/`], `${who}: HTML links: the button, the footer's; on SITE_URL`);
    assert.equal(linkIn(body.text, "/confirm/"), null, `${who}: no /confirm link (SPEC-ui-and-copy-pass § 8 item 7)`);
    assert.ok(!body.html.includes("/confirm/"));
  }

  const body = bodyFor(people.ex);
  assert.equal(body.subject, EX.subject);
  const expected = EX.lines.map((l) => l.replace("[ZIP]", NEAR_ZIP));
  const html = readHtml(body.html);
  assert.deepEqual(html.paragraphs, expected, "E-X HTML, line for line");
  for (const line of expected) assert.ok(body.text.includes(line), `E-X text lacks: ${line}`);
  const token = linkIn(body.text, "/confirm/");
  assert.match(token, TOKEN_RE);
  assert.deepEqual(html.hrefs, [`${vars.SITE_URL}/confirm/${token}`]);
  assert.ok(!/\[[^\]]*\]/.test(body.text + body.html), "E-X: no placeholder left");
});
