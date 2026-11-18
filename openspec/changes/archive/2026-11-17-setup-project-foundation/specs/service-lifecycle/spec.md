# Spec Delta

## Purpose

Defines how the whole system starts, stops, scales and keeps its data, so that one command brings it up and no request or data is lost on routine operations.

## ADDED Requirements

### Requirement: RQ-OPS-007 One-command start and start order
`docker compose up --build` SHALL start `db`, `server` and `web` in dev mode with the client on port 5173. Adding `-f compose.yaml -f compose.prod.yaml` SHALL start prod mode with the client on port 8080. `server` SHALL start only after `db` is healthy, and `web` only after `server` is healthy.

#### Scenario: Dev mode from a clean state
- **GIVEN** a clean checkout, a copied `.env.example`, and no existing volumes
- **WHEN** the user runs `docker compose up --build`
- **THEN** all three services report healthy
- **AND** http://localhost:5173 serves the client shell

#### Scenario: Prod mode from a clean state
- **GIVEN** a clean checkout, a copied `.env.example`, and no existing volumes
- **WHEN** the user runs `docker compose -f compose.yaml -f compose.prod.yaml up --build`
- **THEN** all three services report healthy
- **AND** http://localhost:8080 serves the client shell

#### Scenario: Database never becomes healthy
- **GIVEN** the `db` service fails its healthcheck
- **WHEN** the stack starts
- **THEN** `server` is not started
- **AND** `web` is not started

### Requirement: RQ-OPS-008 Graceful shutdown
On SIGTERM the server SHALL stop accepting new connections, answer readiness with 503 `SHUTTING_DOWN`, let in-flight requests finish within `SHUTDOWN_GRACE_MS` (default 10000 ms), close its database connections and exit with code 0. Requests still running after the grace period SHALL be closed and the process SHALL exit with code 1.

#### Scenario: In-flight request completes
- **GIVEN** a request that takes 1000 ms is in progress
- **WHEN** the server receives SIGTERM
- **THEN** that request completes with its normal response
- **AND** the process exits with code 0 after it completes

#### Scenario: Grace period exceeded
- **GIVEN** `SHUTDOWN_GRACE_MS` is 1000 and a request that takes 5000 ms is in progress
- **WHEN** the server receives SIGTERM
- **THEN** the process exits with code 1 no later than 1500 ms after the signal
- **AND** a log line records that the shutdown was forced

### Requirement: RQ-OPS-009 Horizontal scaling
The server SHALL keep no request or session state in its process, so that `docker compose up --scale server=N` runs N interchangeable instances behind `web`. API requests through `web` SHALL succeed while at least one instance is healthy.

#### Scenario: Three instances
- **GIVEN** the stack is started with `--scale server=3`
- **WHEN** 30 `GET /api/v1/ready` requests are sent through `web`
- **THEN** all 30 return 200
- **AND** the logs of more than one server container contain request lines for those requests

#### Scenario: One instance stops
- **GIVEN** the stack runs with `--scale server=3`
- **WHEN** one server container is stopped and 30 `GET /api/v1/ready` requests are sent through `web`
- **THEN** all 30 return 200

### Requirement: RQ-OPS-010 Data persistence and reset
PostgreSQL data SHALL live in a named Docker volume that survives `docker compose down` and container rebuilds. `docker compose down -v` SHALL delete it, and the next start SHALL rebuild the schema from the migrations.

#### Scenario: Restart keeps data
- **GIVEN** the stack has started and applied its migrations
- **WHEN** the user runs `docker compose down` and then `docker compose up --build`
- **THEN** the recorded migrations are still present and none is re-applied

#### Scenario: Reset deletes data
- **GIVEN** the stack has started and applied its migrations
- **WHEN** the user runs `docker compose down -v` and then `docker compose up --build`
- **THEN** the database starts empty
- **AND** every migration is applied again before the server reports ready
