// Erase on request (SPEC-rung4 § 6; flows/06 6.7) against the dev database, through the wrangler CLI.
//   node scripts/erase.mjs --email <address> [--dry-run | --apply] [--local | --remote]
// DRY RUN BY DEFAULT: counts only. `--apply` deletes the address's contacts, cancels an unsent message,
// and marks each save 'erased'. Prints counts only — never the address.
// ⛔ Refuses any database but fitaf-leads-dev. The logic is src/worker/erase.js.
import { erase } from "../src/worker/erase.js";
import { cliAdapter, devDatabaseName, parseTarget } from "./d1-cli.mjs";

const argv = process.argv.slice(2);
if (argv.includes("--apply") && argv.includes("--dry-run")) throw new Error("pass --dry-run or --apply, not both");
const at = argv.indexOf("--email");
const email = at === -1 ? undefined : argv[at + 1];
const dryRun = !argv.includes("--apply");
const target = parseTarget(argv);
const database = await devDatabaseName();

const result = await erase(cliAdapter(database, target), { email, dryRun });
console.log(JSON.stringify({ database, target, ...result }));
