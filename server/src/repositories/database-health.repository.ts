import type { Database } from "bun:sqlite";

const RETRY_INTERVAL_MS = 25;
const READINESS_SQL = "SELECT count(*) AS applied FROM schema_migrations";

/** Checks that the database answers queries (RQ-OPS-002). */
export interface DatabaseHealthRepository {
  /** Resolves when the database answered; rejects otherwise. */
  ping(): Promise<void>;
}

function isBusy(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "SQLITE_BUSY";
}

/**
 * SQLite implementation of {@link DatabaseHealthRepository}. Give it a dedicated connection opened with
 * `busy_timeout = 0`: a locked database then fails at once, and `ping` retries asynchronously until `retryForMs`,
 * so readiness never blocks the event loop and its response time is bounded on every OS.
 */
export class SqliteDatabaseHealthRepository implements DatabaseHealthRepository {
  /** Creates the repository over its own connection. */
  constructor(
    private readonly db: Database,
    private readonly retryForMs: number,
  ) {}

  /** Reads `schema_migrations`; a closed connection or a lock still held after `retryForMs` rejects. */
  async ping(): Promise<void> {
    const deadline = performance.now() + this.retryForMs;
    for (;;) {
      try {
        this.db.query(READINESS_SQL).get();
        return;
      } catch (error) {
        if (!isBusy(error) || performance.now() >= deadline) throw error;
        await Bun.sleep(RETRY_INTERVAL_MS);
      }
    }
  }
}
