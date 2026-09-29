// SPEC-storefront-watch § 3, F3 and F4, judged from what one ordinary visit recorded (lib/visit.mjs).
// F3: Fit AF's Footer block, a <script> the app injects at run time whose text starts with the version line
// `/* fitaf-handoff <commit> sha256:<hex> */`, the hex being the SHA-256 of the text after that line
// (scripts/build-storefront.mjs). F4: an ordinary visit logs no `[fitaf-handoff]` line and throws nothing from it.
import { createHash } from "node:crypto";
import { LOG_PREFIX, VERSION_PREFIX } from "./config.mjs";

const VERSION_LINE = /^\/\* (fitaf-handoff (\S+) sha256:([0-9a-f]{64})) \*\/$/;
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

/** A script text that starts (after white space) with the version line, or null. */
export function parseBlock(text) {
  const t = text.replace(/^\s+/, "");
  if (!t.startsWith(VERSION_PREFIX)) return null;
  const nl = t.indexOf("\n");
  const first = (nl < 0 ? t : t.slice(0, nl)).trimEnd();
  const body = nl < 0 ? "" : t.slice(nl + 1);
  const m = VERSION_LINE.exec(first);
  const actual = sha256(body);
  return {
    versionLine: m ? m[1] : first,
    commit: m ? m[2] : null,
    declared: m ? m[3] : null,
    actual,
    intact: Boolean(m) && m[3] === actual,
  };
}

/** `visit`: { rendered, scripts: [script texts] }; `expected`: the baseline's expectedFooter (a version line) or null. */
export function footerVerdict(visit, expected) {
  const blocks = visit.scripts.map(parseBlock).filter(Boolean);
  const found = blocks.map((b) => `${b.versionLine}${b.intact ? "" : " (its text does not match its version line)"}`);
  if (!visit.rendered) {
    return { flag: true, informational: false, blocks, summary: "could not check: the order page never rendered its meal cards" };
  }
  if (expected == null) {
    const what = blocks.length ? `found ${blocks.length}: ${found.join("; ")}` : "none found";
    return { flag: false, informational: true, blocks, summary: `informational, no block expected yet (baseline expectedFooter: null): ${what}` };
  }
  let summary;
  if (!blocks.length) summary = `absent (expected ${expected})`;
  else if (blocks.length > 1) summary = `more than one (${blocks.length}): ${found.join("; ")}`;
  else if (blocks[0].versionLine !== expected) summary = `not the expected block: found ${found[0]}, expected ${expected}`;
  else if (!blocks[0].intact) summary = `its text does not match its version line: sha256 ${blocks[0].actual}`;
  else return { flag: false, informational: false, blocks, summary: `present once, the expected block, its text intact: ${expected}` };
  return { flag: true, informational: false, blocks, summary };
}

/** `visit`: { console: [lines], errors: [{ message, fromOurBlock }] }. */
export function quietVerdict(visit) {
  const lines = visit.console.filter((l) => l.includes(LOG_PREFIX));
  const errors = visit.errors.filter((e) => e.fromOurBlock);
  const otherErrors = visit.errors.filter((e) => !e.fromOurBlock);
  const flag = lines.length > 0 || errors.length > 0;
  const summary = flag
    ? `an ordinary visit is not free: ${lines.length} [fitaf-handoff] line(s), ${errors.length} page error(s) from our block`
    : `an ordinary visit logged nothing of ours and threw nothing from our block (${otherErrors.length} page error(s) from the store's own code)`;
  return { flag, lines, errors, otherErrors, summary };
}
