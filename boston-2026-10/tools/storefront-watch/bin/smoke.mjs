// `npm run smoke -- [--script <file>] [--live] [--width 1280|390] [--report <file>]` (SPEC-storefront-watch § 4)
// The smoke test on the live store, in a headless browser, at both widths (or the one given). Nothing is typed or
// pressed on /checkout; each profile is discarded.
//   --script <file>  paste this build (a console file, or the Footer block .html) as a person would: the way to
//                    test a build before it is pasted in the Footer (§ 4, last point); keep the report with it
//   --live           the link alone: the store's own Footer block runs it
//   (neither)        fill B built from this checkout (npm run build:storefront's text), pasted
//   --link <url>     run THIS checkout link (the microsite's own, its photo part included: SPEC-rung2-progress-and-
//                    checkout § 17, W17) instead of one built from the menu; the report says, per slide, whether the
//                    screen showed Fit AF's sheet
//   --shots <dir>    SPEC-snacks-in-the-cart § 6: a picture of each width's stripped checkout (step 1, the order lines),
//                    saved in <dir>; a picture of the store's page carries its photographs, so <dir> is never tracked
//   --origin <url>   a local synthetic store (http://127.0.0.1:<port> or localhost) instead of the store, to test
//                    the smoke itself; no other origin is accepted
// Exit 0 if every width passed, 1 otherwise, 2 if the smoke itself failed.
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { STORE_ORIGIN, WIDTHS } from "../lib/config.mjs";
import { renderSmokeReport } from "../lib/report.mjs";
import { smoke } from "../lib/smoke.mjs";

const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;

async function main() {
  const { values } = parseArgs({
    options: {
      script: { type: "string" },
      live: { type: "boolean", default: false },
      width: { type: "string", multiple: true },
      report: { type: "string" },
      origin: { type: "string" },
      link: { type: "string" },
      shots: { type: "string" },
    },
  });
  const origin = values.origin ?? STORE_ORIGIN;
  if (origin !== STORE_ORIGIN && !LOCAL.test(origin)) throw new Error(`--origin must be a local fixture (http://127.0.0.1:<port>), got ${origin}`);
  if (values.script && values.live) throw new Error("give --script or --live, not both");
  const widths = values.width ? values.width.map(Number) : WIDTHS;
  for (const w of widths) if (!WIDTHS.includes(w)) throw new Error(`--width must be one of ${WIDTHS.join(", ")}, got ${w}`);
  if (values.link && !/^https:\/\/[^/]+\/order\?mpid=\d+#fitaf=/.test(values.link)) throw new Error(`--link must be a checkout link (https://<store>/order?mpid=N#fitaf=...), got ${values.link}`);
  const result = await smoke({ scriptFile: values.script ?? null, live: values.live, widths, origin, why: "neither --script nor --live given", link: values.link ?? null, shots: values.shots ? resolve(process.env.INIT_CWD ?? process.cwd(), values.shots) : null });
  // For a width that failed, the report carries the page as text (SPEC-storefront-watch § 7 item 2), redacted.
  const report = renderSmokeReport(result);
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
