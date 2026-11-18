import { createHash } from "node:crypto";
import type {
  AppliedMigration,
  MigrationRepository,
  MigrationScript,
  MigrationSession,
} from "../../src/repositories/migration.repository.js";

/** Builds a migration script whose checksum is the SHA-256 of its SQL, like a real file. */
export function buildScript(name: string, sql = `SELECT '${name}';`): MigrationScript {
  return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
}

/** In-memory repository for unit tests only; a throwing `work` leaves nothing changed, like a rolled-back transaction. */
export class InMemoryMigrationRepository implements MigrationRepository {
  readonly executed: string[] = [];
  private applied: AppliedMigration[];

  constructor(
    applied: MigrationScript[] = [],
    private readonly failing: ReadonlySet<string> = new Set(),
  ) {
    this.applied = applied.map(({ name, checksum }) => ({ name, checksum }));
  }

  inWriteTransaction<T>(work: (session: MigrationSession) => T): T {
    const staged = [...this.applied];
    const session: MigrationSession = {
      ensureTable: () => undefined,
      listApplied: () => [...staged],
      apply: (script) => {
        if (this.failing.has(script.name)) throw new Error(`syntax error in ${script.name}`);
        staged.push({ name: script.name, checksum: script.checksum });
      },
    };
    const result = work(session);
    this.executed.push(...staged.slice(this.applied.length).map((row) => row.name));
    this.applied = staged;
    return result;
  }
}
