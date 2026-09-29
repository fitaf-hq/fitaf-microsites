// `npm run smoke -- [--script <file>] [--live] [--width 1280|390] [--report <file>]` (SPEC-storefront-watch § 4)
// The smoke test on the live store, in a headless browser, at both widths (or the one given). Nothing is typed or
// pressed on /checkout; each profile is discarded.
//   --script <file>  paste this build (a console file, or the Footer block .html) as a person would: the way to
//                    test a build before it is pasted in the Footer (§ 4, last point); keep the report with it
//   --live           the link alone: the store's own Footer block runs it
//   (neither)        fill B built from this checkout (npm run build:storefront's text), pasted
//   --origin <url>   a local synthetic store (http://127.0.0.1:<port> or localhost) instead of the store, to test
//                    the smoke itself; no other origin is accepted
// Exit 0 if every width passed, 1 otherwise, 2 if the smoke itself failed.
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { STORE_ORIGIN, WIDTHS } from "../lib/config.mjs";
import { smoke } from "../lib/smoke.mjs";

const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;

const money = (c) => (typeof c === "number" ? `$${(c / 100).toFixed(2)}` : "not shown");

function render(result) {
  const out = [`# storefront-watch smoke: ${result.flag ? "⛔ FAIL" : "PASS"}`, "", `${new Date().toISOString()} · script: ${result.script}`, ""];
  for (const { width, verdict, outcome: o } of result.runs) {
    out.push(`## ${width} px: ${verdict.pass ? "PASS" : "⛔ FAIL"}`, "");
    for (const why of verdict.reasons) out.push(`- ${why}`);
    out.push(`- chosen (${o.chosen.length} of ${o.need}; ${o.menu} meals listed): ${o.chosen.map((c) => `${c.name} (${money(c.priceCents)})`).join("; ")}`);
    if (o.checkout) out.push(`- /checkout: ${o.checkout.path}; ${o.checkout.names.length} names; items ${o.checkout.itemCounts.join(", ") || "none"}; total ${money(o.checkout.totalCents)}${o.checkout.totalFrom ? ` (${o.checkout.totalFrom})` : ""}`);
    out.push(`- console: ${o.console.filter((l) => l.startsWith("[fitaf-handoff]")).join(" · ") || "no [fitaf-handoff] line"}`);
    if (o.errors.length) out.push(`- page errors: ${o.errors.slice(0, 5).join(" · ")}`);
    out.push("");
  }
  return out.join("\n");
}

async function main() {
  const { values } = parseArgs({
    options: {
      script: { type: "string" },
      live: { type: "boolean", default: false },
      width: { type: "string", multiple: true },
      report: { type: "string" },
      origin: { type: "string" },
    },
  });
  const origin = values.origin ?? STORE_ORIGIN;
  if (origin !== STORE_ORIGIN && !LOCAL.test(origin)) throw new Error(`--origin must be a local fixture (http://127.0.0.1:<port>), got ${origin}`);
  if (values.script && values.live) throw new Error("give --script or --live, not both");
  const widths = values.width ? values.width.map(Number) : WIDTHS;
  for (const w of widths) if (!WIDTHS.includes(w)) throw new Error(`--width must be one of ${WIDTHS.join(", ")}, got ${w}`);
  const result = await smoke({ scriptFile: values.script ?? null, live: values.live, widths, origin, why: "neither --script nor --live given" });
  const report = render(result);
  process.stdout.write(`${report}\n`);
  if (values.report) await writeFile(values.report, report);
  return result.flag ? 1 : 0;
}

main().then(
  (code) => process.stdout.write("", () => process.exit(code)),
  (err) => {
    console.error(`storefront-watch smoke: ${err.stack ?? err}`);
    process.exit(2);
  },
);
