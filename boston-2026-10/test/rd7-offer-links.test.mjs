// RD7 (SPEC-the-redirect.md § 4, § 7): the offer page of each kind (EM-A1's pages: a save from each event, its offer
// live, with and without the code's hyphen; an unknown code; an ended offer, known and unknown; a welcome page) has one
// link to the home page (the logo, pages.js's on every Worker page, apart), and it carries via=email in its query, before
// any fragment, the fragment where it was: /?e=<event>&via=email#from-email (saved, welcome), /?e=<event>&via=email
// (ended), /?via=email (current, and an unknown code's ended page). And the plan page served at such a link ignores the
// query's via (its open's via still the fragment's, SPEC-analytics.md § 16 item 2). EM-A1 and EM-A2 run as their own
// cases, unchanged.
import test from "node:test";
import assert from "node:assert/strict";
import { offerLinkProblems } from "./rd-checks.mjs";

test("RD7: every offer page's link to the home page carries via=email before its fragment; the plan page reads via from the fragment alone", async () => {
  assert.deepEqual(await offerLinkProblems(), []);
});
