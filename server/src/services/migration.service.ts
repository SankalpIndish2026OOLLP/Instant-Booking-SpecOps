import { MigrationError } from "../errors/migration-error.js";
import type { Logger } from "../logging/logger.js";
import type {
  AppliedMigration,
  MigrationRepository,
  MigrationScript,
  MigrationSession,
} from "../repositories/migration.repository.js";

/** Inputs of {@link runMigrations}. */
export interface RunMigrationsOptions {
  repository: MigrationRepository;
  scripts: readonly MigrationScript[];
  logger: Logger;
}

function verifyApplied(applied: readonly AppliedMigration[], scripts: readonly MigrationScript[]): void {
  const byName = new Map(scripts.map((script) => [script.name, script]));
  for (const row of applied) {
    const script = byName.get(row.name);
    if (!script) throw new MigrationError("MIGRATION_MISSING", row.name);
    if (script.checksum !== row.checksum) throw new MigrationError("MIGRATION_CHECKSUM_MISMATCH", row.name);
  }
}

/** Inside one write transaction: verify what is applied, then apply the next pending script, if any. */
function applyNext(session: MigrationSession, scripts: readonly MigrationScript[]): string | undefined {
  session.ensureTable();
  const applied = session.listApplied();
  verifyApplied(applied, scripts);
  const appliedNames = new Set(applied.map((row) => row.name));
  const next = scripts.find((script) => !appliedNames.has(script.name));
  if (!next) return undefined;
  try {
    session.apply(next);
  } catch (cause) {
    throw new MigrationError("MIGRATION_FAILED", next.name, { cause });
  }
  return next.name;
}

/**
 * Applies pending migrations in ascending name order, one write transaction per file (RQ-OPS-004, RQ-OPS-005, RQ-OPS-006).
 * The check for applied files and the apply share a transaction, so concurrent processes apply each file exactly once.
 * @returns names of the migrations applied by this run.
 * @throws MigrationError when an applied file is missing or changed, or a script fails.
 */
export function runMigrations(options: RunMigrationsOptions): string[] {
  const scripts = [...options.scripts].sort((a, b) => (a.name < b.name ? -1 : 1));
  const appliedNow: string[] = [];
  for (;;) {
    const name = options.repository.inWriteTransaction((session) => applyNext(session, scripts));
    if (name === undefined) return appliedNow;
    options.logger.info("migration applied", { migration: name });
    appliedNow.push(name);
  }
}
