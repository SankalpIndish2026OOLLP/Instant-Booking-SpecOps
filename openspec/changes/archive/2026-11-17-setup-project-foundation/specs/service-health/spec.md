# Spec Delta

## Purpose

Lets orchestrators and operators tell whether a server process is alive and whether it is ready to serve API traffic.

## ADDED Requirements

### Requirement: RQ-OPS-001 Liveness probe
The server SHALL answer `GET /api/v1/health` with HTTP 200 and body `{"status":"ok"}` whenever its process is running, without contacting the database. The response SHALL contain no personal data.

#### Scenario: Process is running
- **GIVEN** a running server
- **WHEN** a client sends `GET /api/v1/health`
- **THEN** the response status is 200
- **AND** the body is `{"status":"ok"}`

#### Scenario: Database is unreachable
- **GIVEN** a running server whose database is stopped
- **WHEN** a client sends `GET /api/v1/health`
- **THEN** the response status is still 200 with body `{"status":"ok"}`

### Requirement: RQ-OPS-002 Readiness probe
The server SHALL answer `GET /api/v1/ready` with HTTP 200 and body `{"status":"ready"}` only when its configuration is loaded and the database answers a query within `READY_DB_TIMEOUT_MS` (default 2000 ms). Otherwise it SHALL answer 503 with the standard error envelope.

#### Scenario: Ready
- **GIVEN** a server with valid configuration and a reachable database
- **WHEN** a client sends `GET /api/v1/ready`
- **THEN** the response status is 200
- **AND** the body is `{"status":"ready"}`

#### Scenario: Database unreachable
- **GIVEN** a running server whose database is stopped
- **WHEN** a client sends `GET /api/v1/ready`
- **THEN** the response status is 503
- **AND** the body is an error envelope with code `DATABASE_UNAVAILABLE`

#### Scenario: Database too slow
- **GIVEN** a database that does not answer within `READY_DB_TIMEOUT_MS`
- **WHEN** a client sends `GET /api/v1/ready`
- **THEN** the response status is 503 with code `DATABASE_UNAVAILABLE`
- **AND** the response is sent no later than `READY_DB_TIMEOUT_MS` plus 500 ms after the request

#### Scenario: Shutting down
- **GIVEN** a server that has received SIGTERM and is draining requests
- **WHEN** a client sends `GET /api/v1/ready`
- **THEN** the response status is 503 with code `SHUTTING_DOWN`
