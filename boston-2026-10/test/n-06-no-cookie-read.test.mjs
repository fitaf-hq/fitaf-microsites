// N6 (SPEC-analytics.md § 12 items 1 and 6): the page carries no `cookie` read. The cookie is HttpOnly and read by the
// Worker alone; the page is unchanged by § 12, its script reads no cookie and touches no storage (§ 1 item 1, T5, A1,
// A2). On the production page and every page the development build writes: no inline script of the page names
// `cookie` at all (any case: no document.cookie, no cookieStore); and a whole visit (A2's: open, four answers, the
// result, the order link, the page left) in a stub window whose document.cookie and storage APIs throw if touched,
// touches none of them, the visit's beacons sent (control).
import test from "node:test";
import assert from "node:assert/strict";
import { builtPage, devPages, wholeVisit } from "./a-harness.mjs";

/** Every page: the production page and each development page. */
async function pages() {
  return [["production /", await builtPage()], ...(await devPages()).map((p) => [`development ${p.path}`, p.html])];
}

test("N6: no inline script of any built page names a cookie", async () => {
  const all = await pages();
  assert.ok(all.length >= 2, "control: the production page and the development pages");
  for (const [where, html] of all) {
    // The scripts a browser runs (a-harness openVisit's): the inline <script> elements; the JSON data elements (#picks-data,
    // #save-data) are data the page's script reads, and the Turnstile script is another host's, loaded by URL.
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.ok(scripts.some((s) => s.includes("sendBeacon")), `${where}: control, the analytics script is among the page's scripts`);
    for (const [i, script] of scripts.entries()) {
      const hit = /.{0,40}cookie.{0,40}/i.exec(script);
      assert.equal(hit, null, `${where}: script ${i + 1} names a cookie: ${hit?.[0]}`);
    }
  }
});

test("N6: a whole visit on every built page reads no cookie and touches no storage", async () => {
  for (const [where, html] of await pages()) {
    const visit = wholeVisit(html);
    assert.deepEqual(visit.touched, [], `${where}: touched`);
    assert.deepEqual(visit.errors.map((e) => e.message), [], `${where}: a script threw`);
    const events = new Set(visit.beacons.map((b) => b.body.event));
    for (const event of ["open", "answer", "result", "click", "leave"]) assert.ok(events.has(event), `${where}: control, the visit sent ${event}`);
  }
});
