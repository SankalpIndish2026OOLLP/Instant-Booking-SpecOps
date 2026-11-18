import { afterEach, describe, expect, it } from "bun:test";
import type { Database } from "bun:sqlite";
import { createTestDatabase, type TestDatabase } from "../../test/database.js";
import { buildCapturingLogger } from "../../test/factories/logger.js";
import { buildScript } from "../../test/factories/migrations.js";
import { runMigrations } from "../services/migration.service.js";
import { SqliteMigrationRepository, type MigrationScript } from "./migration.repository.js";

const databases: TestDatabase[] = [];
afterEach(() => {
  for (const database of databases.splice(0)) database.drop();
});

function freshDatabase(): Database {
  const database = createTestDatabase();
  databases.push(database);
  return database.db;
}

function migrate(db: Database, scripts: MigrationScript[]): string[] {
  return runMigrations({ repository: new SqliteMigrationRepository(db), scripts, logger: buildCapturingLogger().logger });
}

function appliedNames(db: Database): string[] {
  return db.query<{ name: string }, []>("SELECT name FROM schema_migrations ORDER BY applied_at, name").all().map((row) => row.name);
}

describe("SqliteMigrationRepository + runMigrations", () => {
  it("RQ-OPS-004 applies pending migrations in order, including multi-statement files", () => {
    // Given an empty database and two scripts, the second depending on the first and holding two statements
    const db = freshDatabase();
    const scripts = [
      buildScript("0002_b.sql", "INSERT INTO t VALUES (1); INSERT INTO t VALUES (2);"),
      buildScript("0001_a.sql", "CREATE TABLE t (id INTEGER);"),
    ];
    // When migrated
    migrate(db, scripts);
    // Then both ran in order, every statement ran, and both are recorded with a UTC timestamp
    expect(appliedNames(db)).toEqual(["0001_a.sql", "0002_b.sql"]);
    expect(db.query<{ n: number }, []>("SELECT count(*) AS n FROM t").get()?.n).toBe(2);
    const row = db.query<{ applied_at: string }, []>("SELECT applied_at FROM schema_migrations LIMIT 1").get();
    expect(row?.applied_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("RQ-OPS-004 does not execute an applied migration again", () => {
    // Given 0001 applied / When migrated again / Then nothing runs
    const db = freshDatabase();
    const scripts = [buildScript("0001_a.sql", "CREATE TABLE t (id INTEGER);")];
    migrate(db, scripts);
    expect(migrate(db, scripts)).toEqual([]);
  });

  it("RQ-OPS-004 rolls back a failing migration and leaves it unrecorded", () => {
    // Given a good first file and a second that creates a table and then fails
    const db = freshDatabase();
    const scripts = [buildScript("0001_ok.sql", "CREATE TABLE ok (id INTEGER);"), buildScript("0002_bad.sql", "CREATE TABLE partial (id INTEGER); SELEC broken;")];
    // When migrated / Then it fails with MIGRATION_FAILED
    expect(() => migrate(db, scripts)).toThrow(expect.objectContaining({ code: "MIGRATION_FAILED", migration: "0002_bad.sql" }));
    // And the failing file left nothing behind, while the earlier file's own transaction stays committed
    expect(db.query<{ t: string | null }, []>("SELECT (SELECT name FROM sqlite_master WHERE name = 'partial') AS t").get()?.t).toBeNull();
    expect(appliedNames(db)).toEqual(["0001_ok.sql"]);
  });

  it("RQ-OPS-005 fails on a changed checksum and on a missing file", () => {
    // Given 0001 applied
    const db = freshDatabase();
    migrate(db, [buildScript("0001_a.sql", "SELECT 1;")]);
    // When its content changes / Then MIGRATION_CHECKSUM_MISMATCH
    expect(() => migrate(db, [buildScript("0001_a.sql", "SELECT 2;")])).toThrow(
      expect.objectContaining({ code: "MIGRATION_CHECKSUM_MISMATCH", migration: "0001_a.sql" }),
    );
    // When the file is gone / Then MIGRATION_MISSING
    expect(() => migrate(db, [])).toThrow(expect.objectContaining({ code: "MIGRATION_MISSING", migration: "0001_a.sql" }));
  });

  it("RQ-OPS-005 the checksum column only accepts 64-character SHA-256 values", () => {
    // Given the migrations table / When a short checksum is inserted / Then the CHECK constraint rejects it
    const db = freshDatabase();
    migrate(db, []);
    expect(() => db.run("INSERT INTO schema_migrations (name, checksum) VALUES ('x', 'short')")).toThrow();
  });
});
