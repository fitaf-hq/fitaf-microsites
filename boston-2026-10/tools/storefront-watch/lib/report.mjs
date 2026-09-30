// The report of one watch run, as Markdown: printed by the CLI, the body of the issue (§ 5), the job summary in CI; and
// the smoke's own report (bin/smoke.mjs). It quotes file names, the dependency literals and our own console lines, and,
// for a smoke width that FAILED, the page as text (§ 7 item 2): never the store's code or config, never a screenshot.
import { facesSummary } from "./faces.mjs";
import { cutLine, redact } from "./redact.mjs";

const list = (items) => (items.length ? items.map((x) => `\`${x}\``).join(", ") : "none");
/** Text quoted from the page, redacted, in a Markdown code span (a backtick in it cannot end the span). */
const quote = (text) => `\`${redact(text).replace(/`/g, "'")}\``;
const BOSTON = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short",
});

/** An HTTP date -> "<ISO, UTC>; Boston <local time>", or null if it does not parse. */
function whenPublished(httpDate) {
  const t = new Date(httpDate);
  if (Number.isNaN(t.getTime())) return null;
  const p = Object.fromEntries(BOSTON.formatToParts(t).map((x) => [x.type, x.value]));
  return `${t.toISOString().replace(/\.000Z$/, "Z")}; Boston ${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} ${p.timeZoneName}`;
}

/** § 7 item 1: a new entry's Last-Modified, the release's publish time. */
function releaseLine(release) {
  if (!release.lastModified) return `- ⭐ a new entry bundle, \`${release.entry}\`: the new entry sent no Last-Modified, so its publish time is not known`;
  const when = whenPublished(release.lastModified);
  return `- ⭐ a new entry bundle, \`${release.entry}\`, published (its Last-Modified) \`${release.lastModified}\`${when ? ` (${when})` : ""}`;
}
const money = (cents) => (typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "not shown");
/** The storefront's public key has the form sk_…; a page error could quote one. Never in an issue. */
const scrub = (text) => String(text).replace(/\bsk_[A-Za-z0-9_-]+/g, "sk_[REDACTED]");

function mode(r) {
  if (r.mode.full) return "in depth (dispatch or --full)";
  if (r.mode.daily) return "hourly, plus the daily F3 and F4";
  return "hourly";
}

function f1Section(r) {
  const c = r.cheap;
  const out = [
    "## F1 — the release",
    "",
    `- entry: \`${c.entry.live ?? "(none found)"}\`${c.entry.live === c.entry.baseline ? " (the baseline's)" : ` — baseline \`${c.entry.baseline}\``}`,
    ...(r.release ? [releaseLine(r.release)] : []),
    `- the entry's imports: added ${list(c.imports.added)}; removed ${list(c.imports.removed)}`,
    `- the page's scripts and module preloads: added ${list(c.html.added)}; removed ${list(c.html.removed)}`,
  ];
  if (r.f1.ran) {
    out.push(
      `- every JS file reachable from the entry: ${r.f1.count} fetched; added ${list(r.f1.added)}; removed ${list(r.f1.removed)}; changed (SHA-256) ${list(r.f1.changed)}`,
    );
  } else {
    out.push(`- in depth: not run (${r.f1.note})`);
  }
  if (r.refused.length) out.push(`- refused, never fetched (not the store's origin): ${list(r.refused)}`);
  return out;
}

function f2Section(r) {
  const out = ["## F2 — the dependencies (storefront/dependencies.json)", ""];
  if (!r.f2.ran) return [...out, `not run (${r.f2.note})`];
  out.push(`${r.f2.found} of ${r.f2.total} found in the fetched files.`);
  for (const d of r.f2.missing) out.push(`- ⛔ **missing** \`${d.literal}\` (${d.id}): ${d.use}. ${d.spec}.`);
  return out;
}

function f3Section(r) {
  const out = ["## F3 — Fit AF's Footer block", ""];
  if (!r.f3.ran) return [...out, `not run (${r.f3.note})`];
  out.push(`${r.f3.flag ? "⛔ " : ""}${r.f3.summary}`);
  for (const b of r.f3.blocks) out.push(`- \`${b.versionLine}\`: text sha256 \`${b.actual}\` ${b.intact ? "(matches its version line)" : "(does NOT match its version line)"}`);
  return out;
}

function f4Section(r) {
  const out = ["## F4 — an ordinary visit costs nothing", ""];
  if (!r.f4.ran) return [...out, `not run (${r.f4.note})`];
  out.push(`${r.f4.flag ? "⛔ " : ""}${r.f4.summary}`);
  for (const l of r.f4.lines) out.push(`- console: \`${scrub(l)}\``);
  for (const e of r.f4.errors) out.push(`- page error from our block: \`${scrub(e.message)}\``);
  return out;
}

/**
 * § 7 item 2: a failed width's page, as text. `e` is what lib/smoke.mjs recorded (unredacted): every quoted string is
 * redacted here, and each console line cut to 200 characters after that.
 */
export function evidenceLines(e) {
  if (!e) return ["- the page as text: not recorded"];
  if (e.error) return [`- the page as text: could not be read (${redact(e.error)})`];
  const buttons = e.buttons.map((b) => `${quote(b.label)} (${b.disabled ? "disabled" : "enabled"})`);
  const lists = e.lists.map((l) => `${l.key}: ${l.state === "count" ? `${l.count} entr${l.count === 1 ? "y" : "ies"}` : l.state}`);
  return [
    `- the page as text (SPEC-storefront-watch § 7; never a screenshot), ${e.where}:`,
    `  - path: \`${e.path}\``,
    `  - displayed buttons outside meal cards: ${buttons.join("; ") || "none"}`,
    `  - dialogs: ${e.dialogs.map(quote).join("; ") || "none"}`,
    `  - the store's lists, counts only: ${lists.join("; ")}`,
    `  - the page's console, every line (${e.console.length}), each cut to 200 characters, keys and tokens redacted:`,
    ...e.console.map((line) => `    - \`${cutLine(line).replace(/`/g, "'")}\``),
    ...(e.errors?.length ? [`  - page errors: ${e.errors.map((x) => `\`${cutLine(x).replace(/`/g, "'")}\``).join(" · ")}`] : []),
  ];
}

function smokeRun(run) {
  const o = run.outcome;
  const out = [
    `### ${run.width} px: ${run.verdict.pass ? "PASS" : "⛔ FAIL"}`,
    "",
    ...run.verdict.reasons.map((why) => `- ${scrub(why)}`),
    `- chosen from the order page (${o.chosen.length} of ${o.need}; ${o.menu} meals listed): ${o.chosen.map((c) => `${c.name} (${money(c.priceCents)})`).join("; ") || "none"}`,
  ];
  if (o.checkout) {
    out.push(
      `- /checkout: path \`${o.checkout.path}\`; names listed ${o.checkout.names.length}; "N items" read: ${o.checkout.itemCounts.join(", ") || "none"}; total ${money(o.checkout.totalCents)}${o.checkout.totalFrom ? ` (from "${o.checkout.totalFrom}")` : ""}`,
    );
  }
  const lines = o.console.filter((l) => l.startsWith("[fitaf-handoff]"));
  out.push(`- console: ${lines.length ? lines.map((l) => `\`${cutLine(l)}\``).join(" · ") : "no [fitaf-handoff] line"}`);
  if (o.faces) out.push(`- the two faces (W10–W13, SPEC-rung2-progress-and-checkout § 5): ${redact(facesSummary(o.faces))}`);
  if (o.errors.length) out.push(`- page errors: ${o.errors.slice(0, 5).map((e) => `\`${cutLine(e)}\``).join(" · ")}`);
  if (!run.verdict.pass) out.push(...evidenceLines(o.evidence));
  return out;
}

function f5Section(r) {
  const out = ["## F5 — the smoke test (SPEC § 4)", ""];
  if (!r.f5.ran) return [...out, `not run (${r.f5.note})`];
  if (r.f5.error) return [...out, `⛔ ${r.f5.error}`];
  out.push(`Script: ${r.f5.script}.`, "");
  for (const run of r.f5.runs) out.push(...smokeRun(run), "");
  return out;
}

/** The smoke's own report (bin/smoke.mjs): each width's verdict, and for a width that failed, the page as text. */
export function renderSmokeReport(result, at = new Date().toISOString()) {
  const out = [`# storefront-watch smoke: ${result.flag ? "⛔ FAIL" : "PASS"}`, "", `${at} · script: ${result.script}`, ""];
  for (const run of result.runs) out.push(...smokeRun(run), "");
  return scrub(out.join("\n"));
}

export function renderReport(r) {
  const head = [
    `# storefront-watch: ${r.flags.length ? `⛔ ${r.flags.join(" ")}` : "green"} — \`${r.entry ?? "(no entry)"}\``,
    "",
    `${r.at} · ${r.page} · ${mode(r)} · ${r.fetches} request(s), every one to the store's origin`,
    "",
  ];
  const body = [f1Section(r), f2Section(r), f3Section(r), f4Section(r), f5Section(r)].map((s) => s.join("\n"));
  return scrub(`${head.join("\n")}\n${body.join("\n\n")}\n`);
}
