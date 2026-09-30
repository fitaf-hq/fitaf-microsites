// W9 (SPEC-storefront-watch § 7 items 2 and 3): when a smoke width fails, the page is recorded as TEXT, never a
// screenshot (the watch runs in a public repository, and a screenshot shows the Owner's photographs): the path; every
// displayed button outside a meal card, with its label and whether it is disabled; any dialog's text; the COUNTS of the
// store's pending list and cart, never their contents; and every console line of the page, each cut to 200
// characters, with anything that looks like a key or token (AIza…, sk_…, a long base64 run) replaced by [REDACTED].
// W9a-c: the rendering and the redaction, on recorded evidence (no browser). W9d: the capture itself, in headless
// Chrome at 390 px against the synthetic store on 127.0.0.1, whose CHECKOUT never routes (skipped without Chrome).
// W9e (item 3): the smoke waits past fill B's longest wait, read from the built fill-B text itself (since
// SPEC-rung2-progress-and-checkout § 15.2, the wait for the first card comes before the 10 s for the meals).
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromePath } from "../lib/browser.mjs";
import { cutLine, LINE_CHARS, redact } from "../lib/redact.mjs";
import { evidenceLines, renderReport, renderSmokeReport } from "../lib/report.mjs";
import { siteCode } from "../lib/site-code.mjs";
import { FILL_B_LONGEST_MS, HANDOFF_MS, smokeRun } from "../lib/smoke.mjs";
import { startStore } from "./browser-store.mjs";

// Planted keys, built at run time so that no key-shaped literal is committed to this public repository.
const AIZA = ["AI", "za", "Sy", "D".repeat(20), "0123456789ABC"].join(""); // "AIza" and 35 more, a Google key's form
const SK = ["sk", "_", "Fit", "Q".repeat(24)].join(""); // the storefront public key's form, sk_…
const BASE64 = "eyJhbGciOiJIUzI1NiJ9" + "Qm9zdG9uMjAyNjEwU21va2VUZXN0VG9rZW4x" + "q7Z3";
// A key with no digit in it: the long-run rule (which asks for a digit) cannot catch it, so only the AIza… rule can.
const AIZA_NO_DIGIT = ["AI", "za", "Sy", "Q".repeat(33)].join("");

test("W9a: the redaction — AIza…, sk_…, a long base64 run; ordinary text kept", () => {
  assert.equal(AIZA.length, 39);
  const line = `init apiKey=${AIZA} storefront ${SK} token ${BASE64} path /order?mpid=21 chunk-EDJZQK2L.js`;
  const out = redact(line);
  for (const secret of [AIZA, SK, BASE64]) assert.ok(!out.includes(secret), `${secret.slice(0, 6)}… left in: ${out}`);
  assert.equal(out.split("[REDACTED]").length - 1, 3, out);
  assert.ok(out.endsWith("path /order?mpid=21 chunk-EDJZQK2L.js"), out);
  const words = "Supercalifragilisticexpialidocious-and-then-some-more-words";
  assert.equal(redact(words), words, "a long run with no digit is not a token");
  assert.equal(AIZA_NO_DIGIT.length, 39);
  assert.equal(redact(`key ${AIZA_NO_DIGIT} end`), "key [REDACTED] end", "an AIza… key, by its own rule");
});

test("W9b: each console line cut to 200 characters, AFTER redaction (a key across the cut is not half shown)", () => {
  assert.equal(LINE_CHARS, 200);
  const long = "L".repeat(300);
  assert.equal(cutLine(long).length, 200);
  const straddling = `${"x ".repeat(95)}${AIZA} after`;
  assert.ok(straddling.indexOf(AIZA) < 200 && straddling.indexOf(AIZA) + AIZA.length > 200, "fixture control: across the cut");
  const cut = cutLine(straddling);
  assert.equal(cut.length, 200);
  // Cut first, the line would keep "AIzaSyDDDD", too short for any key pattern to catch: the prefix would leak.
  assert.ok(!cut.includes(AIZA.slice(0, 6)), cut);
  assert.ok(cut.includes("[REDACTED"), cut);
});

/** Evidence as the smoke records it at a width that failed (lib/smoke.mjs readEvidence), unredacted. */
const EVIDENCE = {
  where: "the order page, after the link",
  path: "/order",
  buttons: [
    { label: "CHECKOUT", disabled: false },
    { label: "Sign in / Create account", disabled: false },
    { label: "Add 1 more meal", disabled: true },
  ],
  dialogs: ["Sign in to continue Sign in / Create account Continue browsing"],
  lists: [
    { key: "hmp_pending_plan_items", state: "count", count: 7 },
    { key: "hmp_local_cart", state: "absent", count: null },
  ],
  console: ["[fitaf-handoff] fill B, mpid 21", `firebase apiKey ${AIZA}`, "L".repeat(300), "[fitaf-handoff] stopped: /checkout not reached"],
  errors: [`TypeError: ${SK} is not defined`],
};

const failedRun = (evidence = EVIDENCE) => ({
  width: 390,
  verdict: { pass: false, reasons: ['the console says "[fitaf-handoff] stopped: /checkout not reached"'] },
  outcome: { need: 7, menu: 9, chosen: [], console: evidence.console, errors: evidence.errors, checkout: { path: "/order", names: [], itemCounts: [], totalCents: null }, evidence },
});

function assertEvidence(text) {
  assert.ok(text.includes("`/order`"), "the path");
  assert.ok(text.includes("`CHECKOUT` (enabled)"), text);
  assert.ok(text.includes("`Sign in / Create account` (enabled)"));
  assert.ok(text.includes("`Add 1 more meal` (disabled)"));
  assert.ok(text.includes("Sign in to continue Sign in / Create account Continue browsing"), "the dialog's text");
  assert.ok(text.includes("hmp_pending_plan_items: 7"), "the pending list's count");
  assert.ok(text.includes("hmp_local_cart: absent"));
  assert.ok(text.includes("[fitaf-handoff] stopped: /checkout not reached"), "the console, ours included");
  assert.ok(text.includes(`\`${"L".repeat(199)}…\``), "a long line cut to 200");
  assert.ok(!text.includes("L".repeat(201)));
  for (const secret of [AIZA, SK]) assert.ok(!text.includes(secret), `${secret.slice(0, 6)}… in the report`);
  assert.ok(text.includes("firebase apiKey [REDACTED]"));
  assert.ok(!/screenshot|\.png/i.test(text.replace("never a screenshot", "")), "no screenshot");
}

test("W9c: a failed width's report (the watch's issue body, and the smoke's own report) lists the evidence, redacted", () => {
  const lines = evidenceLines(EVIDENCE).join("\n");
  assertEvidence(lines);
  const watchResult = {
    at: "2026-09-29T23:00:00.000Z",
    page: "https://fitafnutrition.com/order?mpid=21",
    mode: { full: true, daily: false, browser: true },
    entry: "main-SYNTH002.js",
    fetches: 2,
    refused: [],
    release: null,
    cheap: { entry: { live: "main-SYNTH002.js", baseline: "main-SYNTH002.js" }, imports: { added: [], removed: [] }, html: { added: [], removed: [] } },
    f1: { ran: false, note: "n/a" },
    f2: { ran: false, note: "n/a" },
    f3: { ran: false, note: "n/a" },
    f4: { ran: false, note: "n/a" },
    f5: { ran: true, flag: true, script: "fill B, pasted", runs: [failedRun()] },
    flags: ["F5"],
  };
  assertEvidence(renderReport(watchResult));
  assertEvidence(renderSmokeReport({ flag: true, script: "fill B, pasted", runs: [failedRun()] }, "2026-09-29T23:00:00.000Z"));
});

test("W9c: a width that PASSED carries no evidence section", () => {
  const passed = { ...failedRun(), verdict: { pass: true, reasons: [] } };
  assert.ok(!renderSmokeReport({ flag: false, script: "fill B", runs: [passed] }, "t").includes("hmp_pending_plan_items"));
});

const chrome = (() => {
  try {
    return chromePath();
  } catch {
    return null;
  }
})();
const skip = chrome ? false : "no Chrome found (set CHROME_PATH)";

let store;
let code;
let consoleFile;
before(async () => {
  store = await startStore();
  code = await siteCode();
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-w9-"));
  try {
    await code.buildStorefront({ outDir: dir });
    consoleFile = await readFile(join(dir, "fitaf-handoff.fill-B.console.js"), "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
after(async () => {
  await store?.close();
});

test("W9d: at 390 px the store never routes — the smoke fails, and records the page as text, the planted key redacted", { skip, timeout: 180_000 }, async () => {
  store.set({ signIn: true, consoleNoise: [`firebase apiKey ${AIZA}`, `${"N".repeat(250)} end`] });
  const run = await smokeRun({ origin: store.origin, width: 390, mode: { kind: "paste", text: consoleFile, label: "fill B, pasted" }, code, executablePath: chrome });
  assert.equal(run.verdict.pass, false);
  assert.ok(run.outcome.console.includes("[fitaf-handoff] stopped: /checkout not reached"), JSON.stringify(run.outcome.console));
  const e = run.outcome.evidence;
  assert.equal(e.path, "/order");
  assert.deepEqual(e.buttons, [
    { label: "CHECKOUT", disabled: false },
    { label: "Sign in / Create account", disabled: false },
    { label: "Continue browsing", disabled: false },
  ]);
  assert.deepEqual(e.dialogs, ["Sign in to continue Sign in / Create account Continue browsing"]);
  assert.deepEqual(e.lists, [
    { key: "hmp_pending_plan_items", state: "count", count: 7 },
    { key: "hmp_local_cart", state: "absent", count: null },
  ]);
  assert.ok(e.console.some((l) => l.includes(AIZA)), "fixture control: the planted key reached the page's console");
  const report = renderSmokeReport({ flag: true, script: "fill B, pasted", runs: [run] }, "t");
  assert.ok(!report.includes(AIZA), "the key is not in the report");
  assert.ok(report.includes("firebase apiKey [REDACTED]"));
  assert.ok(report.includes(`\`${"N".repeat(199)}…\``), "the long line cut to 200");
  assert.ok(report.includes("`Continue browsing` (enabled)"));
  assert.ok(!run.outcome.console.includes("[fixture] ORDER PLACED"));
});

test("W9e (§ 7 item 3): the smoke's ceiling is above fill B's longest wait, as the built fill-B text sets it", () => {
  const m = /var POLL_MS = (\d+), MAX_POLLS = (\d+), AFTER_CHECKOUT = (\d+), NO_CARDS = (\d+);/.exec(consoleFile);
  assert.ok(m, "the built text's poll constants");
  const [poll, before, after, cards] = m.slice(1).map(Number);
  assert.equal(after * poll, 30_000, "fill B waits 30 s after CHECKOUT (SPEC-rung2 § 11 item 4)");
  assert.equal(cards * poll, 30_000, "and up to 30 s for the page's first card (SPEC-rung2-progress-and-checkout § 15.2)");
  // SPEC-rung2-progress-and-checkout § 15.2: the wait for the first card, then the 10 s for every meal's card (from the
  // first card), one tick per press of mpid 21's 7 meals, an enabled CHECKOUT, then CHECKOUT's and CONTINUE's waits.
  const longest = cards * poll + before * poll + 7 * poll + before * poll + 2 * after * poll;
  assert.equal(longest, 111_400, "30 s + 10 s + 1.4 s + 10 s + 30 s + 30 s");
  assert.equal(FILL_B_LONGEST_MS, longest);
  assert.ok(HANDOFF_MS > longest, `${HANDOFF_MS} ms`);
});
