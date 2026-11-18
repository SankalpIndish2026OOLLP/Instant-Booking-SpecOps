import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/** Options for {@link openDatabase}. */
export interface DatabaseOptions {
  /** SQLite file path; its directory is created when missing. */
  path: string;
  /** How long a statement waits for another connection's lock before failing with SQLITE_BUSY. */
  busyTimeoutMs: number;
}

/**
 * Opens the SQLite database (RQ-OPS-010): WAL journal, busy timeout, foreign keys on.
 * The busy timeout is set first so that switching to WAL waits instead of failing when another process opens the file.
 * @throws when the directory cannot be created or the file cannot be opened (RQ-OPS-007).
 */
export function openDatabase(options: DatabaseOptions): Database {
  mkdirSync(dirname(options.path), { recursive: true });
  const db = new Database(options.path, { create: true, strict: true });
  db.run(`PRAGMA busy_timeout = ${Math.trunc(options.busyTimeoutMs)}`);
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");
  db.run("PRAGMA synchronous = NORMAL");
  return db;
}
