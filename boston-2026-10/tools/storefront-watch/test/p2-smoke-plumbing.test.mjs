// P2, plumbing for F5 (SPEC-storefront-watch § 4): the smoke test (lib/smoke.mjs) in a real headless Chrome, against
// the synthetic store on 127.0.0.1 (test/browser-store.mjs), never the live store. It runs the REAL fill B, built
// from src/storefront by the site's own build, and the link from the site's own payload code; so this proves the
// menu read, the link, the paste (and holding off a block already on the page), the live block, the read of
// /checkout and the pass rule, at both widths. Skipped when no Chrome is installed (CHROME_PATH).
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromePath } from "../lib/browser.mjs";
import { siteCode } from "../lib/site-code.mjs";
import { scriptFromFile, smokeRun } from "../lib/smoke.mjs";
import { MEALS, startStore } from "./browser-store.mjs";

const chrome = (() => {
  try {
    return chromePath();
  } catch {
    return null;
  }
})();
const skip = chrome ? false : "no Chrome found (set CHROME_PATH)";
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

let store;
let code;
let built;
before(async () => {
  store = await startStore();
  code = await siteCode();
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-p2-"));
  try {
    await code.buildStorefront({ outDir: dir });
    built = {
      console: await readFile(join(dir, "fitaf-handoff.fill-B.console.js"), "utf8"),
      footer: scriptFromFile(await readFile(join(dir, "fitaf-handoff.html"), "utf8")),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
after(async () => {
  await store?.close();
});

const paste = () => ({ kind: "paste", text: built.console, label: "fill B, pasted" });
const run = (width, mode) => smokeRun({ origin: store.origin, width, mode, code, executablePath: chrome });
const fitaf = (o) => o.console.filter((l) => l.startsWith("[fitaf-handoff]"));

test("P2: fill B pasted at 1280 (CHECKOUT NOW) and at 390 ×3 (CHECKOUT): pass; nothing pressed on /checkout", { skip }, async () => {
  store.set({});
  for (const [width, label] of [[1280, "CHECKOUT NOW"], [390, "CHECKOUT"]]) {
    const { verdict, outcome } = await run(width, paste());
    assert.deepEqual(verdict, { pass: true, reasons: [] }, `${width}: ${verdict.reasons.join("; ")}`);
    const pressed = outcome.console.filter((l) => l.startsWith("[fixture] pressed"));
    assert.deepEqual(pressed, [`[fixture] pressed ${label}`], `${width}: the layout's own control, once`);
    assert.deepEqual(outcome.chosen.map((c) => c.name), MEALS.slice(0, 7));
    assert.ok(outcome.chosen.every((c) => c.priceCents === 1250));
    assert.equal(outcome.checkout.totalCents, 8750);
    assert.equal(outcome.checkout.totalFrom, "Plan Total");
    assert.ok(outcome.link.startsWith(`${store.origin}/order?mpid=21#fitaf=`));
    assert.deepEqual(fitaf(outcome), ["[fitaf-handoff] fill B, mpid 21", "[fitaf-handoff] done: /checkout"]);
    assert.ok(!outcome.console.includes("[fixture] ORDER PLACED"));
  }
});

test("P2: the link is the site's own: its payload decodes to the 7 chosen meals, one each, mpid 21", { skip }, async () => {
  store.set({});
  const { outcome } = await run(1280, paste());
  const payload = JSON.parse(Buffer.from(new URL(outcome.link).hash.slice("#fitaf=".length), "base64url").toString("utf8"));
  assert.deepEqual(payload, { v: 1, mpid: 21, items: MEALS.slice(0, 7).map((name) => ({ name, qty: 1 })) });
});

test("P2: the live block alone (the store runs our Footer block): pass", { skip }, async () => {
  store.set({ footer: built.footer });
  const { verdict, outcome } = await run(1280, { kind: "live", label: "live" });
  assert.deepEqual(verdict.reasons, []);
  assert.equal(fitaf(outcome).filter((l) => l.startsWith("[fitaf-handoff] fill B")).length, 1);
});

test("P2: a paste while another block of ours is on the page: the pasted one runs, the other is held off", { skip }, async () => {
  const body = '(function () {\nif (location.hash.slice(0, 7) !== "#fitaf=") return;\nif (window.__fitafHandoff) return;\nwindow.__fitafHandoff = true;\nconsole.info("[fitaf-handoff] stopped: the block already on the page ran");\n})();\n';
  store.set({ footer: `\n/* fitaf-handoff 0000000 sha256:${sha256(body)} */\n${body}` });
  const { verdict, outcome } = await run(1280, paste());
  assert.deepEqual(verdict.reasons, []);
  assert.ok(!fitaf(outcome).some((l) => l.includes("already on the page")));
});

test("P2: the extras dialog at 390, and a sold-out first meal (skipped when choosing): pass", { skip }, async () => {
  store.set({ extrasDialog: true, soldOut: [MEALS[0]] });
  const { verdict, outcome } = await run(390, paste());
  assert.deepEqual(verdict.reasons, []);
  assert.deepEqual(outcome.chosen.map((c) => c.name), MEALS.slice(1, 8));
});

test("P2: /checkout missing a chosen meal, or a wrong total: fail, saying which", { skip }, async () => {
  store.set({ dropOnCheckout: MEALS[3] });
  const dropped = await run(1280, paste());
  assert.equal(dropped.verdict.pass, false);
  assert.ok(dropped.verdict.reasons.some((r) => r.includes(MEALS[3])), dropped.verdict.reasons.join("; "));

  store.set({ totalDeltaCents: 125 });
  const wrong = await run(1280, paste());
  assert.equal(wrong.verdict.pass, false);
  assert.ok(wrong.verdict.reasons.some((r) => r.includes("$88.75") && r.includes("$87.50")), wrong.verdict.reasons.join("; "));
});
