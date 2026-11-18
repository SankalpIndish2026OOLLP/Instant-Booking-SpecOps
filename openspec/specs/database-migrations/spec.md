# database-migrations Specification

## Purpose
Keeps the PostgreSQL schema in step with the code by applying forward-only SQL migrations in order, exactly once, even when several server instances start together.

## Requirements

### Requirement: RQ-OPS-004 Ordered migrations at startup
At startup, before it reports ready, the server SHALL apply every pending SQL migration file in ascending file-name order, each in its own transaction, and record each applied file with its checksum and UTC timestamp. A failing migration SHALL be rolled back, left unrecorded, and SHALL stop the server with a non-zero exit code.

#### Scenario: Pending migrations applied in order
- **GIVEN** an empty database and migration files `0001_a.sql` and `0002_b.sql`
- **WHEN** the server starts
- **THEN** `0001_a.sql` is applied before `0002_b.sql`
- **AND** both are recorded as applied
- **AND** `GET /api/v1/ready` returns 200 only after both are applied

#### Scenario: Already applied migrations are skipped
- **GIVEN** a database where `0001_a.sql` is recorded as applied with a matching checksum
- **WHEN** the server starts
- **THEN** `0001_a.sql` is not executed again

#### Scenario: Failing migration
- **GIVEN** a pending migration containing invalid SQL
- **WHEN** the server starts
- **THEN** none of that migration's changes remain in the database
- **AND** it is not recorded as applied
- **AND** the process exits with a non-zero code without listening for requests

### Requirement: RQ-OPS-005 Applied migrations are immutable
The server SHALL refuse to start when the checksum of a migration file differs from the checksum recorded when it was applied, or when a recorded migration file is missing. It SHALL exit with a non-zero code and log the code `MIGRATION_CHECKSUM_MISMATCH` or `MIGRATION_MISSING` with the file name.

#### Scenario: Unchanged files
- **GIVEN** every recorded migration file is present and unchanged
- **WHEN** the server starts
- **THEN** startup continues

#### Scenario: Edited applied migration
- **GIVEN** `0001_a.sql` was applied and its content has since changed
- **WHEN** the server starts
- **THEN** the process exits with a non-zero code
- **AND** the log contains `MIGRATION_CHECKSUM_MISMATCH` and `0001_a.sql`

#### Scenario: Deleted applied migration
- **GIVEN** `0001_a.sql` was applied and the file has since been removed
- **WHEN** the server starts
- **THEN** the process exits with a non-zero code
- **AND** the log contains `MIGRATION_MISSING` and `0001_a.sql`

### Requirement: RQ-OPS-006 Concurrency-safe migrations
When several processes run migrations against the same SQLite database file at the same time, each pending migration SHALL be applied exactly once, enforced by an immediate write transaction that covers both the check for applied migrations and the apply, and every process SHALL then finish without error.

#### Scenario: Parallel startup
- **GIVEN** an empty database file and one pending migration
- **WHEN** 10 migration runs start in parallel against it, each in its own process
- **THEN** the migration is executed exactly once
- **AND** it is recorded exactly once
- **AND** all 10 runs complete without error

#### Scenario: Instance stops while holding the lock
- **GIVEN** one process is applying migrations and is killed while holding the write lock
- **WHEN** another process starts
- **THEN** that process obtains the lock, finds the interrupted migration unrecorded, and applies the pending migrations
