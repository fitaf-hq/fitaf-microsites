// SPEC-analytics.md § 11 item 3: `--json` with any refusal of § 5 exits as § 5 does (§ 10 item 13: 2 for a refused
// command line or a missing variable, before any request; 1 when the SQL API refuses or answers what the report cannot
// read), writing nothing to stdout. A11's refusals, each with --json, run as a program; and the SQL API's three, in this
// process over a stand-in for `fetch` (aj-checks.mjs runAt). § 11 item 4 names no case for item 3; this is it. Nothing
// is requested.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { ENV, fixtureAnswers, NAMES, RANGE, runAt } from "./aj-checks.mjs";

test("§ 11 item 3: --json with a refused command line or a missing variable: exit 2, nothing on stdout, before any request", () => {
  const script = join(ROOT, "scripts", "analytics.mjs");
  const run = (args, env) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env: { PATH: process.env.PATH, ...env } });
  const ok = ["--json", ...RANGE];
  const cases = [
    ["no token", ok, { CLOUDFLARE_ACCOUNT_ID: "test-account" }, /CLOUDFLARE_ANALYTICS_TOKEN/],
    ["no account", ok, { CLOUDFLARE_ANALYTICS_TOKEN: "test-token" }, /CLOUDFLARE_ACCOUNT_ID/],
    ["a bad date", ["--json", "--from", "2026-10-32", "--to", "2026-10-25"], ENV, /--from/],
    ["--from after --to", ["--json", "--from", "2026-10-26", "--to", "2026-10-25"], ENV, /--from/],
    ["no --to", ["--json", "--from", "2026-10-23"], ENV, /--to/],
    ["an unknown argument", [...ok, "--rows"], ENV, /--rows/],
    ["an unknown --env", [...ok, "--env", "staging"], ENV, /--env/],
    ["--json given a value", [...RANGE, "--json", "yes"], ENV, /unknown argument: yes/],
  ];
  for (const [label, args, env, message] of cases) {
    const r = run(args, env);
    assert.equal(r.status, 2, `${label}: exit 2 (${r.stderr})`);
    assert.match(r.stderr, message, `${label}: says why`);
    assert.equal(r.stdout, "", `${label}: nothing on stdout`);
    assert.doesNotMatch(r.stderr, /test-token/, `${label}: the token never printed`);
  }
});

test("§ 11 item 3: --json when the SQL API refuses or answers what the report cannot read: exit 1, nothing on stdout", async () => {
  const fixture = await fixtureAnswers();
  const all = (body) => Object.fromEntries(NAMES.map((n) => [n, body]));
  const cases = [
    ["a refusal (403)", fixture, { status: 403 }, /answered 403 to the visitors query/],
    ["not JSON", all("not json"), {}, /not JSON/],
    ["no data list", all({ meta: [], rows: 0 }), {}, /no data list/],
  ];
  for (const [label, answers, options, message] of cases) {
    const r = await runAt(ROOT, [...RANGE, "--json"], answers, options);
    assert.equal(r.code, 1, `${label}: exit 1 (${r.err})`);
    assert.match(r.err, message, `${label}: says why`);
    assert.equal(r.out, "", `${label}: nothing on stdout`);
    assert.equal(r.requests.length, 1, `${label}: the first query's answer stops it`);
  }
});
