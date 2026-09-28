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

test("M8: E1 and E-X bodies, HTML and text -> DRAFT § 3 as written, placeholders filled; /o/ and /confirm/ use SITE_URL", async () => {
  const people = { ticked: "delivered+m8-ticked@resend.dev", unticked: "delivered+m8-unticked@resend.dev", ex: "delivered+m8-ex@resend.dev" };
  await saveOffers(mf, db, [people.ticked], { consent_marketing: true });
  const nowMs = await saveOffers(mf, db, [people.unticked]);
  await postSave(mf, validSave({ kind: "expansion", email: people.ex, zip: NEAR_ZIP }));
  const stub = stubFetch(() => Response.json({ id: "m8" }));
  const counts = await send(db, nowMs, new AllowlistSender(resendSender(stub.fetch), "@resend.dev"));
  assert.equal(counts.sent, 3);
  const bodyFor = (to) => stub.calls.find((c) => c.body.to[0] === to).body;

  const E1 = await draftMessage("**E1 — the next morning, to a saved offer.**");
  const EX = await draftMessage("**E-X — at once, to an out-of-area request.**");
  assert.ok(E1.lines.length === 6 && EX.lines.length === 3, "control: the draft's messages were read");

  for (const who of ["ticked", "unticked"]) {
    const row = await saveRow(db, people[who]);
    const body = bodyFor(people[who]);
    const offer = offerById(row.offer_id);
    const expected = E1.lines
      .map((l) => l.replace("[event]", events[0].name).replace("XXXX-XXXX", displayCode(row.offer_code)).replace("[date]", longDate(offer.valid_to)))
      .filter((l) => who === "ticked" || !l.startsWith("You asked to hear about"));
    assert.equal(body.subject, E1.subject);
    assert.ok(!/\[[^\]]*\]|XXXX/.test(body.text + body.html), `${who}: no placeholder left`);
    const html = readHtml(body.html);
    assert.deepEqual(html.paragraphs, expected, `${who}: the HTML part is the draft, line for line`);
    for (const line of expected) assert.ok(body.text.includes(line), `${who}: the text part lacks: ${line}`);

    const offerUrl = `${vars.SITE_URL}/o/${row.offer_code}`;
    assert.ok(body.text.includes(offerUrl), `${who}: text /o/ link on SITE_URL`);
    if (who === "ticked") {
      const token = linkIn(body.text, "/confirm/");
      assert.match(token, TOKEN_RE);
      assert.deepEqual(html.hrefs, [offerUrl, `${vars.SITE_URL}/confirm/${token}`], "HTML links: SITE_URL, the same token");
    } else {
      assert.deepEqual(html.hrefs, [offerUrl]);
      assert.equal(linkIn(body.text, "/confirm/"), null);
    }
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
