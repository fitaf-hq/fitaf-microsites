// The dev D1 database through the wrangler CLI (what scripts/*.mjs use; the Worker uses its binding).
// The account comes from CLOUDFLARE_ACCOUNT_ID in the environment and is never written anywhere.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { devConfig, ROOT } from "../build.mjs";

export const DEV_DATABASE = "fitaf-leads-dev";

/** The dev environment's D1 database name, refusing anything that is not the dummy database. */
export async function devDatabaseName() {
  const [db] = (await devConfig()).d1_databases;
  if (db?.database_name !== DEV_DATABASE) {
    throw new Error(`refusing: dev D1 binding is ${db?.database_name}, not ${DEV_DATABASE}`);
  }
  return db.database_name;
}

export function parseTarget(argv) {
  const remote = argv.includes("--remote");
  if (remote && argv.includes("--local")) throw new Error("pass --remote or --local, not both");
  return remote ? "--remote" : "--local";
}

function wrangler(args) {
  return execFileSync(join(ROOT, "node_modules", ".bin", "wrangler"), args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** Run SQL; returns the result rows of each statement. */
export function executeCommand(database, target, sql) {
  const out = wrangler(["d1", "execute", database, "--env", "dev", target, "--json", "--command", sql]);
  return JSON.parse(out).map((r) => r.results ?? []);
}

/** Run a SQL file. Success is the exit status: with --file, wrangler mixes progress text into stdout. */
export function executeFile(database, target, path) {
  wrangler(["d1", "execute", database, "--env", "dev", target, "--yes", "--file", path]);
}

/** The purge adapter (src/worker/purge.js) over the CLI. The batch is one multi-statement command. */
export function cliAdapter(database, target) {
  return {
    all: async (sql) => executeCommand(database, target, sql)[0],
    batch: async (sqls) => executeCommand(database, target, sqls.join(";\n")),
  };
}
