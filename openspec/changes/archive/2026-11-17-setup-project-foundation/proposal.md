# Proposal: setup-project-foundation

## Why

The repository holds only the OpenSpec config: no code, runtime, database or living docs. Every feature, starting with `add-instant-booking`, needs the stack, Docker setup, quality gates and conventions that `openspec/config.yaml` prescribes. This first change builds that foundation and adds no business behaviour.

## What Changes

- npm workspaces `/client`, `/server`, `/shared`; Node Active LTS pinned in `.nvmrc`; strict TypeScript, ESLint, Vitest, Supertest, Playwright + axe, autocannon, coverage gates.
- Docker Compose with `db` (PostgreSQL), `server` and `web`: dev mode (port 5173, hot reload) and prod mode (port 8080), healthchecks, start order, graceful shutdown, `--scale server=N`.
- Server: startup env validation, forward-only SQL migration runner, `GET /api/v1/health` and `GET /api/v1/ready`, standard error envelope, request IDs, security headers, CORS allowlist, body size limit, JSON logs without personal data.
- Shared: Zod schemas, an OpenAPI document generated from them, and an oasdiff breaking-change gate.
- Client: accessible, mobile-first app shell with a UI strings module and a render-error fallback.
- Living docs: `project.md`, `scope.md`, `context.md`, `history.md`.

## Capabilities

### New Capabilities

- `service-health`: liveness and readiness probes.
- `runtime-configuration`: environment validation at startup.
- `database-migrations`: ordered, immutable, concurrency-safe schema migrations.
- `service-lifecycle`: one-command start, start order, graceful shutdown, scaling, data persistence.
- `api-conventions`: base path, error envelope, request IDs, limits, CORS, security headers, logging, contract gate.
- `web-shell`: the served client shell, error fallback, same-origin API proxy, accessibility baseline.

### Modified Capabilities

None. No specs exist yet.

## Affected user flow steps

None. `scope.md` has no business user flow yet; this change is technical only.

## RQ IDs

- Added: RQ-OPS-001 to RQ-OPS-010, RQ-API-001 to RQ-API-008, RQ-WEB-001 to RQ-WEB-004.
- Changed: none. Retired: none.

## Out of scope

- Any business feature, including instant booking (blocked until `scope.md` holds its rules).
- Idempotency-Key storage and write-endpoint rate limits: there are no create or write endpoints yet; both arrive with the first one.
- Request-body Zod validation middleware: no endpoint accepts input yet.
- Locales, currencies, time zones and personal-data retention: set by the markets in `scope.md` later.
- CI hosting and commit conventions: the folder is not a git repository yet.

## Backward compatibility

Greenfield: no public API, database schema, config key or env var exists, so nothing can break. This change commits the first OpenAPI baseline that oasdiff guards from now on.

## Architecture impact

Creates every `project.md` architecture subsection: system overview, containers, layers and folders, type hierarchy, main flow, API surface, data model, scaling and state, decisions.

## Impact

- New: `/client`, `/server`, `/shared`, `compose.yaml`, `compose.override.yaml`, `compose.prod.yaml`, Dockerfiles, `.env.example`, `.nvmrc`.
- Dependencies are listed and justified in `design.md`.
- Ports: 8080 (prod), 5173 (dev). PostgreSQL data lives in a named volume.
