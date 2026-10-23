// Erase on request (SPEC-rung4 § 6; flows/06 6.7), through the wrangler CLI, against development's database or, since
// SPEC-save-offer-production.md § 4 item 5, production's (the privacy notice promises a deletion on request). Run by the
// operator with the d1 token, never by the page.
//   node scripts/erase.mjs --email <address> [--env dev | --env prod] [--dry-run | --apply] [--local | --remote]
// DRY RUN BY DEFAULT: counts only. `--apply` deletes the address's contacts, cancels an unsent message,
// and marks each save 'erased'. Prints counts only — never the address. `--env dev` by default.
// ⛔ Refuses any database but the environment's own: fitaf-leads-dev, or fitaf-leads-prod with --env prod.
// The logic is src/worker/erase.js.
import { erase } from "../src/worker/erase.js";
import { devConfig } from "../build.mjs";
import { cliAdapter, databaseFor, eraseArgs, productionConfig } from "./d1-cli.mjs";

const { env, email, dryRun, target } = eraseArgs(process.argv.slice(2));
const database = databaseFor(env, env === "prod" ? await productionConfig() : await devConfig());

const result = await erase(cliAdapter(database, target, env), { email, dryRun });
console.log(JSON.stringify({ env, database, target, ...result }));
