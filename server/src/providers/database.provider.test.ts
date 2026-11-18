import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDatabase } from "../../test/database.js";
import { openDatabase } from "./database.provider.js";

const scratch = mkdtempSync(join(tmpdir(), "db-provider-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("openDatabase", () => {
  it("RQ-OPS-010 opens a fresh file in WAL mode with foreign keys on", () => {
    // Given a fresh test database / When its settings are read / Then WAL and foreign keys are on
    const test = createTestDatabase();
    try {
      expect(test.db.query<{ journal_mode: string }, []>("PRAGMA journal_mode").get()?.journal_mode).toBe("wal");
      expect(test.db.query<{ foreign_keys: number }, []>("PRAGMA foreign_keys").get()?.foreign_keys).toBe(1);
    } finally {
      test.drop();
    }
  });

  it("RQ-OPS-010 creates a missing parent directory", () => {
    // Given a path in a directory that does not exist / When opened / Then it is created and usable
    const db = openDatabase({ path: join(scratch, "nested", "deeper", "app.db"), busyTimeoutMs: 100 });
    expect(db.query<{ one: number }, []>("SELECT 1 AS one").get()?.one).toBe(1);
    db.close();
  });

  it("RQ-OPS-007 throws when the database directory cannot be created", () => {
    // Given a path whose parent is a regular file / When opened / Then opening fails
    const blocker = join(scratch, "not-a-directory");
    writeFileSync(blocker, "x");
    expect(() => openDatabase({ path: join(blocker, "app.db"), busyTimeoutMs: 100 })).toThrow();
  });
});
