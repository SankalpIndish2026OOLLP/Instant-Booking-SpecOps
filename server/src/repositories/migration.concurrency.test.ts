import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createTestDatabase, type TestDatabase } from "../../test/database.js";

const RUNNER = resolve(import.meta.dir, "../../test/run-migrations.ts");
const PARALLEL_RUNS = 10;
const SPAWN_TIMEOUT_MS = 60_000;

const databases: TestDatabase[] = [];
afterEach(() => {
  for (const database of databases.splice(0)) database.drop();
});

/** A fresh database file plus a migrations directory holding one counting migration. */
function setup(): { database: TestDatabase; migrationsDir: string } {
  const database = createTestDatabase();
  databases.push(database);
  const migrationsDir = join(database.dir, "migrations");
  mkdirSync(migrationsDir);
  writeFileSync(join(migrationsDir, "0001_counter.sql"), "CREATE TABLE runs (n INTEGER); INSERT INTO runs VALUES (1);");
  return { database, migrationsDir };
}

async function runInSubprocess(dbPath: string, migrationsDir: string): Promise<{ exitCode: number; applied: string[] }> {
  const child = Bun.spawn(["bun", RUNNER, dbPath, migrationsDir], { stdout: "pipe", stderr: "inherit" });
  const output = await new Response(child.stdout).text();
  const exitCode = await child.exited;
  return { exitCode, applied: exitCode === 0 ? (JSON.parse(output.trim()) as string[]) : [] };
}

describe("migrations across processes", () => {
  it(
    "RQ-OPS-006 applies a migration exactly once across 10 parallel processes",
    async () => {
      // Given an empty database file and one pending migration
      const { database, migrationsDir } = setup();
      // When 10 processes migrate it at the same time
      const results = await Promise.all(
        Array.from({ length: PARALLEL_RUNS }, () => runInSubprocess(database.path, migrationsDir)),
      );
      // Then all exit 0, exactly one applied it, and it ran and was recorded once
      expect(results.map((result) => result.exitCode)).toEqual(Array(PARALLEL_RUNS).fill(0));
      expect(results.flatMap((result) => result.applied)).toEqual(["0001_counter.sql"]);
      expect(database.db.query<{ n: number }, []>("SELECT count(*) AS n FROM runs").get()?.n).toBe(1);
      expect(database.db.query<{ n: number }, []>("SELECT count(*) AS n FROM schema_migrations").get()?.n).toBe(1);
    },
    SPAWN_TIMEOUT_MS,
  );

  it(
    "RQ-OPS-006 a process killed while holding the lock leaves nothing recorded and the next run applies",
    async () => {
      // Given a process that took the write lock and created part of the schema
      const { database, migrationsDir } = setup();
      const holder = Bun.spawn(["bun", RUNNER, database.path, "--hold-lock", "CREATE TABLE half_done (x INTEGER);"], {
        stdout: "pipe",
        stderr: "inherit",
      });
      const reader = holder.stdout.getReader();
      const { value } = await reader.read();
      expect(new TextDecoder().decode(value)).toContain("LOCKED");
      // When it is killed abruptly
      holder.kill(9);
      await holder.exited;
      // Then its work was rolled back, and the next process applies the pending migration
      const next = await runInSubprocess(database.path, migrationsDir);
      expect(next).toEqual({ exitCode: 0, applied: ["0001_counter.sql"] });
      expect(database.db.query<{ t: string | null }, []>("SELECT (SELECT name FROM sqlite_master WHERE name = 'half_done') AS t").get()?.t).toBeNull();
    },
    SPAWN_TIMEOUT_MS,
  );
});
