// The report of one watch run, as Markdown: printed by the CLI, the body of the issue (§ 5), the job summary in CI.
// It quotes file names, the dependency literals and our own console lines; never the store's code or config.

const list = (items) => (items.length ? items.map((x) => `\`${x}\``).join(", ") : "none");
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
  out.push(`- console: ${lines.length ? lines.map((l) => `\`${scrub(l)}\``).join(" · ") : "no [fitaf-handoff] line"}`);
  if (o.errors.length) out.push(`- page errors: ${o.errors.slice(0, 5).map((e) => `\`${scrub(e).slice(0, 200)}\``).join(" · ")}`);
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
