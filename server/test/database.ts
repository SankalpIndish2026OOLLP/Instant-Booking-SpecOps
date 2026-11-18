import type { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../src/providers/database.provider.js";

/** Busy timeout used by test databases; short so lock tests stay fast. */
export const TEST_BUSY_TIMEOUT_MS = 2_000;

/** A fresh SQLite file in its own temporary directory. */
export interface TestDatabase {
  dir: string;
  path: string;
  db: Database;
  /** Closes the connection and deletes the directory. */
  drop(): void;
}

/** Creates a fresh, empty database file opened like production (WAL, busy timeout, foreign keys). */
export function createTestDatabase(busyTimeoutMs = TEST_BUSY_TIMEOUT_MS): TestDatabase {
  const dir = mkdtempSync(join(tmpdir(), "app-test-db-"));
  const path = join(dir, "app.db");
  const db = openDatabase({ path, busyTimeoutMs });
  return {
    dir,
    path,
    db,
    drop() {
      db.close(false);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
