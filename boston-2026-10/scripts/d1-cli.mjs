// The D1 databases through the wrangler CLI (what scripts/*.mjs use; the Worker uses its binding). The seeder and the
// purge reach development's alone; the erase reaches production's too (SPEC-save-offer-production.md § 4 item 5).
// The account comes from CLOUDFLARE_ACCOUNT_ID in the environment and is never written anywhere.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { devConfig, productionConfig, ROOT } from "../build.mjs";

export const DEV_DATABASE = "fitaf-leads-dev";
/** Each environment's one database (wrangler.jsonc's binding DB): anything else is refused. */
export const ERASE_DATABASES = Object.freeze({ dev: DEV_DATABASE, prod: "fitaf-leads-prod" });

export { productionConfig };

/** The database `env`'s config binds, refusing an unknown environment and any name but that environment's. */
export function databaseFor(env, config) {
  if (!Object.hasOwn(ERASE_DATABASES, env)) throw new Error(`refusing: unknown --env ${env} (dev or prod)`);
  const name = config?.d1_databases?.[0]?.database_name;
  if (name !== ERASE_DATABASES[env]) throw new Error(`refusing: the ${env} D1 binding is ${name}, not ${ERASE_DATABASES[env]}`);
  return name;
}

/** The arguments of `wrangler d1 execute` for `env`: production is wrangler.jsonc's top level (no --env). */
export const wranglerD1Args = (env, database, target, rest) => ["d1", "execute", database, ...(env === "dev" ? ["--env", "dev"] : []), target, ...rest];

/** scripts/erase.mjs's arguments: `--env dev|prod` (dev by default), `--email`, a dry run unless `--apply`, the target. */
export function eraseArgs(argv) {
  if (argv.includes("--apply") && argv.includes("--dry-run")) throw new Error("pass --dry-run or --apply, not both");
  const at = argv.indexOf("--env");
  const env = at === -1 ? "dev" : argv[at + 1];
  if (at !== -1 && (!env || env.startsWith("--"))) throw new Error("--env needs dev or prod");
  if (!Object.hasOwn(ERASE_DATABASES, env)) throw new Error(`refusing: unknown --env ${env} (dev or prod)`);
  const e = argv.indexOf("--email");
  return { env, email: e === -1 ? undefined : argv[e + 1], dryRun: !argv.includes("--apply"), target: parseTarget(argv) };
}

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

/** Run SQL; returns the result rows of each statement. `env`: whose database (development's by default). */
export function executeCommand(database, target, sql, env = "dev") {
  const out = wrangler(wranglerD1Args(env, database, target, ["--json", "--command", sql]));
  return JSON.parse(out).map((r) => r.results ?? []);
}

/** Run a SQL file. Success is the exit status: with --file, wrangler mixes progress text into stdout. */
export function executeFile(database, target, path) {
  wrangler(wranglerD1Args("dev", database, target, ["--yes", "--file", path]));
}

/** The purge adapter (src/worker/purge.js) over the CLI. The batch is one multi-statement command. */
export function cliAdapter(database, target, env = "dev") {
  return {
    all: async (sql) => executeCommand(database, target, sql, env)[0],
    batch: async (sqls) => executeCommand(database, target, sqls.join(";\n"), env),
  };
}
