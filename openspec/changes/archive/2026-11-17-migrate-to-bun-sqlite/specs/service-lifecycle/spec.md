# Spec Delta

## MODIFIED Requirements

### Requirement: RQ-OPS-007 One-command start and start order
`docker compose up --build` SHALL start the single `server` service in dev mode, serving the client and the API on host port 5173 (`WEB_DEV_PORT`) with hot reload. Adding `-f compose.yaml -f compose.prod.yaml` SHALL start prod mode on host port 8080 (`WEB_PROD_PORT`). The service SHALL report healthy only after its migrations ran and readiness passes.

#### Scenario: Dev mode from a clean state
- **GIVEN** a clean checkout, a copied `.env.example`, and no existing volumes
- **WHEN** the user runs `docker compose up --build`
- **THEN** the `server` service reports healthy
- **AND** http://localhost:5173 serves the client shell

#### Scenario: Prod mode from a clean state
- **GIVEN** a clean checkout, a copied `.env.example`, and no existing volumes
- **WHEN** the user runs `docker compose -f compose.yaml -f compose.prod.yaml up --build`
- **THEN** the `server` service reports healthy
- **AND** http://localhost:8080 serves the client shell

#### Scenario: Database never becomes healthy
- **GIVEN** `DATABASE_PATH` points into a directory the server cannot write
- **WHEN** the stack starts
- **THEN** the server exits with a non-zero code before listening
- **AND** the `server` service never reports healthy

### Requirement: RQ-OPS-010 Data persistence and reset
The SQLite database file and its WAL files SHALL live in a named Docker volume that survives `docker compose down` and container rebuilds. `docker compose down -v` SHALL delete it, and the next start SHALL rebuild the schema from the migrations.

#### Scenario: Restart keeps data
- **GIVEN** the stack has started and applied its migrations
- **WHEN** the user runs `docker compose down` and then `docker compose up --build`
- **THEN** the recorded migrations are still present and none is re-applied

#### Scenario: Reset deletes data
- **GIVEN** the stack has started and applied its migrations
- **WHEN** the user runs `docker compose down -v` and then `docker compose up --build`
- **THEN** the database starts empty
- **AND** every migration is applied again before the server reports ready

## REMOVED Requirements

### Requirement: RQ-OPS-009 Horizontal scaling
**Reason**: SQLite allows one writer per database file; the user chose a single server instance (2026-11-17) over sharing one file between containers.
**Migration**: Run one `server` instance and scale vertically (CPU, memory). `docker compose up --scale server=N` is no longer supported; the server keeps no request or session state, so a later move to a networked database can restore horizontal scaling.
