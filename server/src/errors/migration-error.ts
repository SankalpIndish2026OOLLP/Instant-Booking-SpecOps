/** Why a migration run stopped (RQ-OPS-004, RQ-OPS-005). */
export type MigrationErrorCode = "MIGRATION_MISSING" | "MIGRATION_CHECKSUM_MISMATCH" | "MIGRATION_FAILED";

/** Stops startup when migrations cannot be applied safely. */
export class MigrationError extends Error {
  /** Creates the error for one migration file. */
  constructor(
    readonly code: MigrationErrorCode,
    readonly migration: string,
    options?: { cause?: unknown },
  ) {
    super(`${code}: ${migration}`, options);
    this.name = "MigrationError";
  }
}
