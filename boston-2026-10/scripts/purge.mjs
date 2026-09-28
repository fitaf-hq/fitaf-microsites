// The purge (SPEC-rung4 § 6 step 3; rung 3's, on rung 4's tables) against the dev database, via the wrangler CLI.
//   node scripts/purge.mjs [--dry-run | --apply] [--local | --remote]
// DRY RUN BY DEFAULT: it prints counts only and deletes nothing. `--apply` deletes the contacts of
// every exported save and marks those saves purged. The logic is src/worker/purge.js, the same
// module the scheduled Worker runs.
import { purge } from "../src/worker/purge.js";
import { cliAdapter, devDatabaseName, parseTarget } from "./d1-cli.mjs";

const argv = process.argv.slice(2);
if (argv.includes("--apply") && argv.includes("--dry-run")) throw new Error("pass --dry-run or --apply, not both");
const dryRun = !argv.includes("--apply");
const target = parseTarget(argv);
const database = await devDatabaseName();

const result = await purge(cliAdapter(database, target), { dryRun });
console.log(JSON.stringify({ database, target, ...result }));
