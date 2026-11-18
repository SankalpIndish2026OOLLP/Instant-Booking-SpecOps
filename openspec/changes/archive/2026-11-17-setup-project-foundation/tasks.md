# Tasks

Each task is at most 2 hours, lists its RQ IDs and ends with its done check. Before ticking a task, run `npm run typecheck`, `npm run lint` and the tests it names; runtime changes also need `docker compose up --build`.

## 1. Architecture and living docs

- [x] 1.1 Finalize `project.md` architecture from design.md (system overview, containers, layers and folders, type hierarchy, main flow, API surface, data model, scaling and state, decisions) with Mermaid diagrams [all RQ IDs]. Done: every design decision D1 to D12 has a home in `project.md` or a link to it, and the "Architecture last reviewed" line is dated today.
- [x] 1.2 Set RQ-OPS-001 to RQ-OPS-010, RQ-API-001 to RQ-API-008 and RQ-WEB-001 to RQ-WEB-004 to IN PROGRESS in `scope.md`, and set the current focus in `context.md` [all RQ IDs]. Done: the register matches the requirement headings in `specs/`.

## 2. Workspace and tooling

- [x] 2.1 Create root npm workspaces (`client`, `server`, `shared`) with `.nvmrc` (exact Node Active LTS), `.npmrc` (`save-exact=true`), `.gitignore` (`.env`, `node_modules`, `dist`, `coverage`) and a strict `tsconfig.base.json` [all RQ IDs]. Done: `npm install` succeeds and `npm run typecheck` passes on all three packages.
- [x] 2.2 Add ESLint flat config with typescript-eslint: `no-explicit-any`, `max-lines-per-function` 40, `no-magic-numbers`, and per-folder `no-restricted-imports` layering rules (design D12) [all RQ IDs]. Done: `npm run lint` passes, and a temporary file in `server/src/routes` importing from `repositories` fails lint (then deleted).
- [x] 2.3 Add Vitest workspace config (server and shared: node; client: jsdom with jest-dom), v8 coverage thresholds (80% server and shared, 70% client), a `test/factories` folder per package and `npm test` / `npm run test:coverage` scripts [all RQ IDs]. Done: `npm test -- --passWithNoTests` exits 0 and the threshold config is shown in `npm run test:coverage` output.

## 3. Shared contract

- [x] 3.1 Add Zod schemas `ErrorCodeSchema`, `ErrorEnvelopeSchema`, `HealthResponseSchema` and `ReadyResponseSchema` with TSDoc and unit tests for valid and invalid shapes (design D1) [RQ-API-002, RQ-OPS-001, RQ-OPS-002]. Done: shared tests pass with at least 80% coverage.
- [x] 3.2 Add `shared/src/openapi/build.ts` using `z.toJSONSchema()`, plus `contract:check` (pinned `tufin/oasdiff` image, `breaking --fail-on ERR`) and `contract:update` scripts; commit the first `shared/openapi/openapi.json` baseline (design D6) [RQ-API-008]. Done: `npm run contract:check` passes, and a fixture document missing the `status` field makes it fail with the breaking change named.

## 4. Server foundation

- [x] 4.1 Add `EnvSchema` and config loader (defaults, names-only error reporting, exit 1) and `.env.example` listing every variable (design D4), with unit tests [RQ-OPS-003]. Done: tests for defaults, missing `DATABASE_URL`, non-echoed bad value, and `.env.example` completeness pass.
- [x] 4.2 Add JSON logger and request-ID middleware (design D3), with unit tests [RQ-API-003, RQ-API-007]. Done: tests prove valid IDs are reused, missing and invalid ones are replaced with UUIDs, and log lines are single JSON objects with a `Z` timestamp and the request ID.
- [x] 4.3 Add `AppError` hierarchy, not-found handler and error handler (body-parser mapping, generic 500), and `createApp(deps)` with `express.json({ limit })`, helmet, CORS allowlist and request logging (design D2) [RQ-API-001, RQ-API-002, RQ-API-004, RQ-API-005, RQ-API-006, RQ-API-007]. Done: Supertest tests cover 404 path and method, `INVALID_JSON`, 500 without stack, 102400 vs 102401 bytes, the three CORS cases, security headers on 200 and 404, and no email or token in captured logs.
- [x] 4.4 Add the database provider (pg Pool with `connectionTimeoutMillis` and `query_timeout`), the `db` service in `compose.yaml` (pinned `postgres:18.x-alpine`, `db-data` volume, `pg_isready` healthcheck), and a Vitest global setup that creates and drops a `test_<random>` database per file (design D11) [RQ-OPS-010]. Done: `docker compose up -d --wait db` is healthy and a harness test connects to its own fresh database.
- [x] 4.5 Add the migration runner: `schema_migrations` bootstrap, `MIGRATION_LOCK_KEY` advisory lock, sorted files, SHA-256 checksums, transaction per file, `MIGRATION_MISSING` and `MIGRATION_CHECKSUM_MISMATCH` (design D5) [RQ-OPS-004, RQ-OPS-005, RQ-OPS-006]. Done: integration tests for order, skip, rollback, mismatch and missing file pass, and the 10-parallel-run concurrency test records the migration exactly once.
- [x] 4.6 Add health route, controller, service and `DatabaseHealthRepository.ping()` with readiness timeout and shutting-down flag (design D8) [RQ-OPS-001, RQ-OPS-002]. Done: Supertest tests on a fresh database pass for ok, ready, `DATABASE_UNAVAILABLE` (closed port and stubbed slow provider with fake timers) and `SHUTTING_DOWN`; a test checks each documented OpenAPI path answers with a body matching its schema.
- [x] 4.7 Add `main.ts` bootstrap (config, migrate, listen) and SIGTERM handling with `SHUTDOWN_GRACE_MS` (design D7) [RQ-OPS-008, RQ-OPS-004]. Done: in-process tests with an injected exit function (Windows cannot deliver SIGTERM to a Node child process) show exit 0 after a 1000 ms in-flight request completes, and exit 1 within 1500 ms with a 1000 ms grace and a 5000 ms request; `docker compose stop server` then shows exit code 0 for the real signal.

## 5. Client shell

- [x] 5.1 Scaffold the Vite + React + TypeScript client with CSS Modules, `src/strings/en.ts`, an `App` with header (product-name placeholder) and main region, `lang="en"` in `index.html`, mobile-first base styles and a Vite dev proxy for `/api` (design D9, D10) [RQ-WEB-001, RQ-WEB-003, RQ-WEB-004]. Done: RTL tests find the banner, product name and main by role, and `npm run build -w client` succeeds.
- [x] 5.2 Add the `ErrorBoundary` component with a strings-module message and a native reload button with a visible focus style [RQ-WEB-002, RQ-WEB-004]. Done: RTL tests show no fallback normally, and fallback plus button (calling a mocked `location.reload`) when a child throws; client coverage is at least 70%.
- [x] 5.3 Add a `check:bundle` script that gzips the built entry chunk with `node:zlib` and fails at 200 kB or more [RQ-WEB-004]. Done: the script passes on the shell and fails when the limit is temporarily lowered below the current size.

## 6. Docker

- [x] 6.1 Add the server multi-stage Dockerfile (pinned Node LTS alpine, amd64 and arm64, non-root `node` user, prod deps only) and the `server` service (`init: true`, `stop_grace_period` 15s, `env_file`, `/api/v1/ready` healthcheck, waits for healthy `db`, no host port) [RQ-OPS-007, RQ-OPS-008, RQ-OPS-009]. Done: `docker buildx build --platform linux/amd64,linux/arm64` succeeds, and `docker compose exec server id -u` is not 0.
- [x] 6.2 Add the web Dockerfile (Node build stage, pinned `nginxinc/nginx-unprivileged`), `nginx.conf` (static files, 404 for missing assets, `/api/` proxy with Docker resolver and `proxy_next_upstream`) and the `web` service waiting for healthy `server` (design D10) [RQ-WEB-001, RQ-WEB-003, RQ-OPS-009]. Done: the image builds and `curl localhost:8080/api/v1/health` returns 200 through it.
- [x] 6.3 Add `compose.override.yaml` (dev: bind mounts, `tsx watch`, Vite on 5173 with HMR) and `compose.prod.yaml` (prod: built images, port 8080, `restart: unless-stopped`) [RQ-OPS-007, RQ-OPS-010]. Done: a smoke script runs `down -v` then `up --build --wait` for both modes, checks all three services are healthy and the shell is served, then checks `down`/`up` keeps rows and `down -v` re-applies migrations.
- [x] 6.4 Add a scaling smoke script for `--scale server=3` [RQ-OPS-009, RQ-WEB-003]. Done: 30/30 ready requests through web succeed with log lines in more than one container; after stopping one container, 30/30 succeed again; with all servers stopped, `/api/v1/health` through web returns 502.

## 7. End-to-end and performance

- [x] 7.1 Add Playwright + `@axe-core/playwright` tests against prod compose: shell at 360 px and 1280 px, zero WCAG 2.1 AA violations, no horizontal overflow, no console errors, keyboard focus and Enter on the reload button, 404 for a missing asset [RQ-WEB-001, RQ-WEB-002, RQ-WEB-004]. Done: `npm run test:e2e` passes.
- [x] 7.2 Add autocannon checks for `/api/v1/health` and `/api/v1/ready` through web, asserting p95 < 500 ms [RQ-OPS-001, RQ-OPS-002]. Done: `npm run test:perf` passes and the results are recorded in `project.md`.
- [x] 7.3 Add a root `npm run check` that runs typecheck, lint, test with coverage, `contract:check` and `check:bundle` [all RQ IDs]. Done: `npm run check` exits 0 and every RQ ID has at least one passing test whose name starts with that ID.

## 8. QA and living docs

- [x] 8.1 Run the QA review checklist from config.yaml section 11 (RQ tests, duplication, layering, oasdiff, states, keyboard, 360 px and desktop, locales or "none in scope yet", no personal data in logs, Docker dev and prod healthy, migrations clean on an empty database, architecture matches code) [all RQ IDs]. Done: each item is recorded as pass in `context.md`, or the failure is fixed and re-checked.
- [x] 8.2 Update all four living docs per config.yaml section 12: new top entry in `history.md`, `project.md` "Architecture last reviewed" line and run instructions, RQ statuses to DONE in `scope.md`, and focus, decisions and open items in `context.md` [all RQ IDs]. Done: no doc contradicts the code, and the open items left are only those that need business input.

## Workflow follow-up

- Archive the change after the config.yaml archive guidance is satisfied (all test levels, coverage, oasdiff, QA checklist, both Docker modes, current living docs).
- Then return to `add-instant-booking` once `scope.md` holds its business scope.
