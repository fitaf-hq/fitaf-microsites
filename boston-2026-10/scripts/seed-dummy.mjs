// Seed the DEVELOPMENT database with obviously fake saves (see dummy-saves.mjs).
//   node scripts/seed-dummy.mjs [--count 20] [--exported 5] [--local | --remote]
// ⛔ Refuses any database but fitaf-leads-dev: dummy data never goes near production.
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { devDatabaseName, executeFile, parseTarget } from "./d1-cli.mjs";
import { dummySaves, toSql } from "./dummy-saves.mjs";

function intFlag(argv, name, fallback) {
  const i = argv.indexOf(name);
  if (i === -1) return fallback;
  const v = Number(argv[i + 1]);
  if (!Number.isInteger(v) || v < 0) throw new Error(`${name} needs a non-negative integer`);
  return v;
}

const argv = process.argv.slice(2);
const count = intFlag(argv, "--count", 20);
const exported = intFlag(argv, "--exported", 5);
const target = parseTarget(argv);
const database = await devDatabaseName();

const dir = await mkdtemp(join(tmpdir(), "fitaf-seed-"));
try {
  const file = join(dir, "seed.sql");
  await writeFile(file, toSql(dummySaves(count, { exported })) + "\n");
  executeFile(database, target, file);
  console.log(`seeded ${count} dummy saves (${exported} marked exported) into ${database} ${target}`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
