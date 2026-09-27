// The purge (SPEC-rung3 § 4) against the dev database, through the wrangler CLI.
//   node scripts/purge.mjs [--dry-run | --apply] [--local | --remote]
// DRY RUN BY DEFAULT: it prints counts only and deletes nothing. `--apply` deletes the contacts of
// every exported claim and marks those claims purged. The logic is src/worker/purge.js, the same
// module the Worker can call later.
import { purge } from "../src/worker/purge.js";
import { cliAdapter, devDatabaseName, parseTarget } from "./d1-cli.mjs";

const argv = process.argv.slice(2);
if (argv.includes("--apply") && argv.includes("--dry-run")) throw new Error("pass --dry-run or --apply, not both");
const dryRun = !argv.includes("--apply");
const target = parseTarget(argv);
const database = await devDatabaseName();

const result = await purge(cliAdapter(database, target), { dryRun });
console.log(JSON.stringify({ database, target, ...result }));
