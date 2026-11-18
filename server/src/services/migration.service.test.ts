import { describe, expect, it } from "bun:test";
import { buildCapturingLogger } from "../../test/factories/logger.js";
import { buildScript, InMemoryMigrationRepository } from "../../test/factories/migrations.js";
import { runMigrations } from "./migration.service.js";

function run(repository: InMemoryMigrationRepository, scripts = [buildScript("0001_a.sql"), buildScript("0002_b.sql")]) {
  return runMigrations({ repository, scripts, logger: buildCapturingLogger().logger });
}

describe("runMigrations", () => {
  it("RQ-OPS-004 applies pending scripts in ascending name order", () => {
    // Given scripts supplied out of order / When run
    const repository = new InMemoryMigrationRepository();
    run(repository, [buildScript("0002_b.sql"), buildScript("0001_a.sql")]);
    // Then they are applied in name order
    expect(repository.executed).toEqual(["0001_a.sql", "0002_b.sql"]);
  });

  it("RQ-OPS-004 skips scripts already applied", () => {
    // Given 0001 already applied / When run / Then only 0002 is executed
    const repository = new InMemoryMigrationRepository([buildScript("0001_a.sql")]);
    expect(run(repository)).toEqual(["0002_b.sql"]);
    expect(repository.executed).toEqual(["0002_b.sql"]);
  });

  it("RQ-OPS-004 wraps a failing script in MIGRATION_FAILED and stops", () => {
    // Given a failing first script / When run / Then it stops with MIGRATION_FAILED and nothing is applied
    const repository = new InMemoryMigrationRepository([], new Set(["0001_a.sql"]));
    expect(() => run(repository)).toThrow(expect.objectContaining({ code: "MIGRATION_FAILED", migration: "0001_a.sql" }));
    expect(repository.executed).toEqual([]);
  });

  it("RQ-OPS-005 refuses to start when an applied script changed", () => {
    // Given 0001 applied with other content / When run / Then MIGRATION_CHECKSUM_MISMATCH
    const repository = new InMemoryMigrationRepository([buildScript("0001_a.sql", "SELECT 'old';")]);
    expect(() => run(repository)).toThrow(
      expect.objectContaining({ code: "MIGRATION_CHECKSUM_MISMATCH", migration: "0001_a.sql" }),
    );
  });

  it("RQ-OPS-005 refuses to start when an applied script is missing", () => {
    // Given an applied script with no file / When run / Then MIGRATION_MISSING
    const repository = new InMemoryMigrationRepository([buildScript("0000_gone.sql")]);
    expect(() => run(repository)).toThrow(expect.objectContaining({ code: "MIGRATION_MISSING", migration: "0000_gone.sql" }));
  });
});
