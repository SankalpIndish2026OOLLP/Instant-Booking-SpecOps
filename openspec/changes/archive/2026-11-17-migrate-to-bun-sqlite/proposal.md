# Proposal: migrate-to-bun-sqlite

## Why

The user wants a simpler stack: Bun instead of Node, SQLite instead of PostgreSQL, and no separate web container or extra client tooling. One Bun process can serve the API, the client and the database file, removing two containers, the nginx proxy and about fifteen dependencies.

## What Changes

- **BREAKING (operational):** the backend runtime moves from Node 22 + Express to Bun 1.4.2 with `Bun.serve`; `npm` workspaces move to Bun workspaces (`bun.lock`).
- **BREAKING (operational):** PostgreSQL and the `db` container are replaced by SQLite (`bun:sqlite`) in a named volume. `DATABASE_URL` is replaced by `DATABASE_PATH`.
- **BREAKING (operational):** the API runs as a single server instance; `--scale server=N` is no longer supported.
- **BREAKING (operational):** the nginx `web` container is removed; the Bun server serves the client and the API on one origin (dev: host port 5173 with hot reload; prod: host port 8080).
- Client: React stays; Vite and CSS Modules are replaced by Bun's bundler and one plain stylesheet.
- Tooling: Vitest, jsdom, Supertest and tsx are replaced by `bun test` and happy-dom; Playwright runs in its pinned Docker image.
- `openspec/config.yaml` stack, Docker, data and testing sections are updated to match (approved by the user on 2026-11-17).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `service-health`: RQ-OPS-001 and RQ-OPS-002 describe an in-process SQLite database instead of a reachable server.
- `runtime-configuration`: RQ-OPS-003 validates `DATABASE_PATH` instead of `DATABASE_URL`.
- `database-migrations`: RQ-OPS-006 serializes runs with a SQLite write transaction across processes.
- `service-lifecycle`: RQ-OPS-007 and RQ-OPS-010 change to one container and an SQLite volume; RQ-OPS-009 is removed.
- `web-shell`: RQ-WEB-001 is served by the server; RQ-WEB-003 (proxy) is removed and replaced by RQ-WEB-005 (single origin).

## Affected user flow steps

None. `scope.md` has no business user flow yet.

## RQ IDs

- Added: RQ-WEB-005.
- Changed: RQ-OPS-001, RQ-OPS-002, RQ-OPS-003, RQ-OPS-006, RQ-OPS-007, RQ-OPS-010, RQ-WEB-001.
- Retired: RQ-OPS-009, RQ-WEB-003.

## Out of scope

- Any business feature (instant booking stays blocked on `scope.md`).
- Changing the HTTP API: paths, bodies, error codes and headers stay identical.
- Moving existing data: the database only holds `schema_migrations`, which is rebuilt from the migration files.
- High availability; scaling is vertical only from now on.

## Backward compatibility

The public HTTP contract is unchanged, so oasdiff must report no changes. The breaking items are operational: env var, containers, ports per service, and scaling. config.yaml section 7 forbids breaks unless the user approves; the user explicitly asked for this stack change and the single-server trade-off on 2026-11-17. No deployment or business data exists yet.

## Architecture impact

`project.md`: System overview, Containers, Layers and folders, Type hierarchy, Main flow, Data model, Scaling and state, Decisions. API surface is unchanged.

## Impact

- `server/**` rewritten for `Bun.serve` and `bun:sqlite`; `client/**` loses Vite and CSS Modules; `compose*.yaml`, Dockerfiles, `.env.example`, `.nvmrc` → `.bun-version`, root scripts and tests updated.
- Removed dependencies: express, helmet, cors, pg, vite, @vitejs/plugin-react, vitest, @vitest/coverage-v8, jsdom, supertest, tsx and their type packages. Added: @types/bun, happy-dom.
