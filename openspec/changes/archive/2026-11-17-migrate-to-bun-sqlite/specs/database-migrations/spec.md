# Spec Delta

## MODIFIED Requirements

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
