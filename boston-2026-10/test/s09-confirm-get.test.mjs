import test, { after } from "node:test";
import assert from "node:assert/strict";
import { newToken } from "../src/worker/token.js";
import { dumpAllTables, fetchPage, startWorker } from "./worker-harness.mjs";
import { savedAndSent } from "./confirm-fixture.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("S9: GET /confirm/<token> changes nothing (every row equal before and after)", async () => {
  const t = await savedAndSent(mf, db);
  const before = await dumpAllTables(db);
  assert.ok(before.dump.save_contacts.some((c) => c.confirm_token_hash), "control: tokens were minted");

  const offer = await fetchPage(mf, `/confirm/${t.yes.token}`);
  assert.equal(offer.status, 200);
  assert.match(offer.text, /<h1>Keep hearing from Fit AF\?<\/h1>/, "LANDING");
  assert.match(offer.text, /<form method="post">/, "the confirmation is a button (a POST), not the link");
  const expansion = await fetchPage(mf, `/confirm/${t.expansion.token}`);
  assert.match(expansion.text, /We'll email you when Fit AF delivers near 01602 — nothing else\./);
  const gone = await fetchPage(mf, `/confirm/${newToken()}`);
  assert.equal(gone.status, 404);
  for (let i = 0; i < 3; i++) await fetchPage(mf, `/confirm/${t.no.token}`);

  const afterDump = await dumpAllTables(db);
  assert.deepEqual(afterDump.dump, before.dump, "row by row, equal");
  assert.equal(afterDump.text, before.text);
});
