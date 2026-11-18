import type { Database } from "bun:sqlite";

/** A migration file: its name, SQL text and SHA-256 hex checksum of its bytes. */
export interface MigrationScript {
  name: string;
  sql: string;
  checksum: string;
}

/** A row of `schema_migrations`. */
export interface AppliedMigration {
  name: string;
  checksum: string;
}

/** Operations available inside the migration write transaction. */
export interface MigrationSession {
  /** Creates `schema_migrations` when it does not exist. */
  ensureTable(): void;
  /** Lists applied migrations ordered by name. */
  listApplied(): AppliedMigration[];
  /** Runs one script and records it; the surrounding transaction makes both atomic. */
  apply(script: MigrationScript): void;
}

/** Runs work inside one write transaction that excludes every other writer (RQ-OPS-006). */
export interface MigrationRepository {
  inWriteTransaction<T>(work: (session: MigrationSession) => T): T;
}

class SqliteMigrationSession implements MigrationSession {
  constructor(private readonly db: Database) {}

  ensureTable(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        checksum   TEXT NOT NULL CHECK (length(checksum) = 64),
        applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ) STRICT`);
  }

  listApplied(): AppliedMigration[] {
    return this.db.query<AppliedMigration, []>("SELECT name, checksum FROM schema_migrations ORDER BY name").all();
  }

  apply(script: MigrationScript): void {
    this.db.run(script.sql);
    this.db.run("INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)", [script.name, script.checksum]);
  }
}

/** SQLite implementation: each call is one `BEGIN IMMEDIATE` transaction, rolled back if `work` throws. */
export class SqliteMigrationRepository implements MigrationRepository {
  private readonly session: MigrationSession;

  /** Creates the repository over an open database. */
  constructor(private readonly db: Database) {
    this.session = new SqliteMigrationSession(db);
  }

  /** Takes the write lock (waiting up to the busy timeout), runs `work`, then commits. */
  inWriteTransaction<T>(work: (session: MigrationSession) => T): T {
    return this.db.transaction(() => work(this.session)).immediate();
  }
}
