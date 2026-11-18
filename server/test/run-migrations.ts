/**
 * Subprocess used by the cross-process migration tests (RQ-OPS-006).
 *   bun server/test/run-migrations.ts <dbPath> <migrationsDir>          apply pending migrations, print JSON names
 *   bun server/test/run-migrations.ts <dbPath> --hold-lock <sql>        take the write lock, run <sql>, print LOCKED, wait forever
 */
import { readMigrationScripts } from "../src/providers/migration-files.provider.js";
import { openDatabase } from "../src/providers/database.provider.js";
import { SqliteMigrationRepository } from "../src/repositories/migration.repository.js";
import { runMigrations } from "../src/services/migration.service.js";
import { buildCapturingLogger } from "./factories/logger.js";

const BUSY_TIMEOUT_MS = 30_000;
const [dbPath, mode, value] = process.argv.slice(2);
if (!dbPath || !mode) throw new Error("usage: run-migrations.ts <dbPath> <dir> | --hold-lock <sql>");
const db = openDatabase({ path: dbPath, busyTimeoutMs: BUSY_TIMEOUT_MS });

if (mode === "--hold-lock") {
  db.run("BEGIN IMMEDIATE");
  db.run(value ?? "");
  console.log("LOCKED");
  await new Promise(() => undefined);
} else {
  const scripts = await readMigrationScripts(mode);
  const applied = runMigrations({ repository: new SqliteMigrationRepository(db), scripts, logger: buildCapturingLogger().logger });
  console.log(JSON.stringify(applied));
  db.close();
}
