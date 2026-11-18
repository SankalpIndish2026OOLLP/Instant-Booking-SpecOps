import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "bun:test";
import { readMigrationScripts } from "./migration-files.provider.js";

const dir = mkdtempSync(join(tmpdir(), "migrations-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("readMigrationScripts", () => {
  it("RQ-OPS-004 reads .sql files sorted by name with SHA-256 checksums", async () => {
    // Given files written out of order plus a non-SQL file
    writeFileSync(join(dir, "0002_b.sql"), "SELECT 2;");
    writeFileSync(join(dir, "0001_a.sql"), "SELECT 1;");
    writeFileSync(join(dir, "README.md"), "ignored");
    // When read
    const scripts = await readMigrationScripts(dir);
    // Then only SQL files, in order, with checksums of their bytes
    expect(scripts.map((script) => script.name)).toEqual(["0001_a.sql", "0002_b.sql"]);
    expect(scripts[0]?.checksum).toBe(createHash("sha256").update("SELECT 1;").digest("hex"));
  });
});
