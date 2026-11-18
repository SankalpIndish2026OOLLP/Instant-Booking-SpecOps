# Tasks

Each task is at most 2 hours, lists its RQ IDs and ends with its done check. Before ticking a task, run `bun run typecheck`, `bun run lint` and the tests it names; runtime changes also need `docker compose up --build`.

## 1. Architecture, config and living docs

- [x] 1.1 Stop the old stack with `docker compose down -v` (removes the PostgreSQL volume), then edit `openspec/config.yaml` sections 2, 3, 4, 6, 10 and the header decision line as listed in design D10 [all RQ IDs]. Done: `openspec validate migrate-to-bun-sqlite --strict` passes and `config.yaml` no longer mentions PostgreSQL, Express, Vite, Vitest, Supertest, nginx or `--scale`.
- [x] 1.2 Rewrite the `project.md` architecture for the new stack (system overview, containers, layers and folders, type hierarchy, main flow, data model, scaling and state, decisions) with Mermaid diagrams, and set RQ-OPS-001, 002, 003, 006, 007, 010, RQ-WEB-001 to IN PROGRESS in `scope.md` [RQ-OPS-001, RQ-OPS-002, RQ-OPS-003, RQ-OPS-006, RQ-OPS-007, RQ-OPS-010, RQ-WEB-001, RQ-WEB-005]. Done: every design decision D1 to D10 has a home in `project.md` or a link to it.

## 2. Workspace and tooling on Bun

- [x] 2.1 Switch to Bun workspaces: set `"packageManager": "bun@1.4.2"` and `engines.bun`, delete `package-lock.json`, `.nvmrc`, `.npmrc` and `node_modules`, add root `bunfig.toml` (`exact = true`), remove the dependencies listed as removed in design.md, add `@types/bun@1.4.2`, `happy-dom@21.0.4` and `@happy-dom/global-registrator@21.0.4`, and update `tsconfig.base.json` (`moduleResolution: Bundler`, `types: ["bun"]`) [all RQ IDs]. Done: `bun install` writes `bun.lock`, and `bun pm ls` lists none of the removed packages.
- [x] 2.2 Rewrite root scripts for Bun (`typecheck` with `bun --bun tsc`, `lint` with `bun --bun eslint .`, `test`, `test:coverage`, `contract:check`, `contract:update`, `check:bundle`, `smoke:compose`, `test:e2e`, `test:perf`, `check`), add `bunfig.toml` coverage thresholds per workspace (server and shared 0.8, client 0.7), and delete `vitest.config.ts` [all RQ IDs]. Done: `bun run lint` passes, and `bun test` runs in each workspace (finding no tests is allowed at this point).

## 3. Shared contract

- [x] 3.1 Point `shared/package.json` exports at `./src/index.ts`, delete `shared/tsconfig.build.json`, and port the shared tests and `scripts/contract.ts` and its test to `bun:test` (design D2) [RQ-API-002, RQ-API-008]. Done: `bun test` passes in `shared` with coverage at least 80%, and `bun run contract:check` prints "No changes detected".

## 4. Server on Bun

- [x] 4.1 Port the config schema to `DATABASE_PATH` (required, non-empty path) and update `.env.example` (remove `DATABASE_URL`, `POSTGRES_*`, `DB_HOST_PORT` and `TEST_DATABASE_URL`; add `DATABASE_PATH=/data/app.db`), porting `env.test.ts` and `logger.test.ts` to `bun:test` [RQ-OPS-003, RQ-API-007]. Done: tests for defaults, missing `DATABASE_PATH` (`required`), an invalid value not echoed with `secret-name` absent, and `.env.example` completeness pass.
- [x] 4.2 Add the SQLite provider (directory creation, WAL, `busy_timeout`, `foreign_keys`, `synchronous`) and `server/test/database.ts` creating a fresh temporary database file per test file (design D3, D7) [RQ-OPS-010, RQ-OPS-007]. Done: a harness test opens its own file and reads `PRAGMA journal_mode` = `wal`, and a test shows that opening under an unwritable directory throws.
- [x] 4.3 Rewrite `MigrationRepository` as `SqliteMigrationRepository.inWriteTransaction` and the `runMigrations` loop with one immediate transaction per file; delete `lock-keys.ts`; port the in-memory repository and unit tests (design D4) [RQ-OPS-004, RQ-OPS-005]. Done: unit tests for order, skip, `MIGRATION_FAILED`, `MIGRATION_CHECKSUM_MISMATCH` and `MIGRATION_MISSING` pass, and an integration test applies a two-statement file and rolls back a failing one with nothing recorded.
- [x] 4.4 Add `server/test/run-migrations.ts` and the cross-process tests: 10 parallel `Bun.spawn` runs on one file, and a killed process that held an immediate transaction (design D7) [RQ-OPS-006]. Done: the migration is executed and recorded exactly once with all 10 processes exiting 0, and after the kill the next run applies the pending file.
- [x] 4.5 Replace the Express middleware with Request/Response helpers (request ID, request logging, API security headers, CORS with preflight, draining `Connection: close`, `readJsonBody` with the 413 check, `toErrorResponse`) and the API route table, and port `app.test.ts` to `app.fetch` (design D1) [RQ-API-001, RQ-API-002, RQ-API-003, RQ-API-004, RQ-API-005, RQ-API-006, RQ-API-007]. Done: every former `app.test.ts` behaviour passes (404 path and method, `INVALID_JSON`, generic 500, request ID reuse and replacement, 102400 vs 102401 bytes, the three CORS cases plus preflight, headers on 200 and 404, no email or token in logs).
- [x] 4.6 Add `SqliteDatabaseHealthRepository`, wire the health routes, and port the health service and integration tests (design D5) [RQ-OPS-001, RQ-OPS-002, RQ-API-008]. Done: tests pass for 200 ok and ready on a fresh file, liveness 200 with a closed connection, 503 `DATABASE_UNAVAILABLE` with a closed connection and within timeout + 500 ms under an exclusive lock, 503 `SHUTTING_DOWN`, and every documented OpenAPI path answering with a body that matches its schema.
- [x] 4.7 Rewrite `main.ts` for Bun (config, open database or exit 1, migrate or exit 1, `Bun.serve` with API routes, dev HTML import and prod static handler, SIGTERM/SIGINT) and `lifecycle/shutdown.ts` for `server.stop()` (design D1, D6) [RQ-OPS-008, RQ-OPS-007]. Done: in-process tests on a real `Bun.serve` show exit 0 after a 1000 ms in-flight request and exit 1 within 1500 ms with a 1000 ms grace, and `bun server/src/main.ts` with a temp `DATABASE_PATH` answers `/api/v1/ready` with 200.
- [x] 4.8 Add `serveStatic(publicDir)` with the page headers, path-traversal protection and 404 for missing files (design D6) [RQ-WEB-001, RQ-WEB-005]. Done: tests show a file is served with the page CSP and nosniff, `/assets/missing.js` and `/../package.json` give 404, and `/api/v1/does-not-exist` still returns the API envelope with `default-src 'none'`.

## 5. Client

- [x] 5.1 Replace CSS Modules with `client/src/styles.css` linked from `index.html`, switch components to plain class names, set `document.title` in `main.tsx`, delete `vite.config.ts` and the `*.module.css` files, and port client tests to `bun:test` with happy-dom, React Testing Library and jest-dom matchers (design D6, D7) [RQ-WEB-001, RQ-WEB-002, RQ-WEB-004]. Done: banner, product name, main, error fallback, Tab/Enter on reload and default reload tests pass with client coverage at least 70%.
- [x] 5.2 Rewrite `client/scripts/check-bundle` to build with `bun build client/index.html --outdir dist/public --production` and measure the module scripts referenced by the built `index.html` [RQ-WEB-004]. Done: `bun run check:bundle` passes under 200 kB gzipped and fails when the limit argument is lowered below the current size.

## 6. Docker

- [x] 6.1 Rewrite `server/Dockerfile` on `oven/bun:1.4.2-alpine` with `deps`, `dev`, `build` and `runtime` stages, the `/data` directory owned by `bun`, and `USER bun`; delete `client/Dockerfile` and `client/nginx.conf` (design D8) [RQ-OPS-007, RQ-OPS-008, RQ-OPS-010]. Done: `docker buildx build --platform linux/amd64,linux/arm64 --target runtime -f server/Dockerfile .` succeeds and `docker compose exec server id -un` prints `bun`.
- [x] 6.2 Rewrite `compose.yaml`, `compose.override.yaml` and `compose.prod.yaml` for the single `server` service (ports, volume `db-data:/data`, healthcheck, `init`, `stop_grace_period`, per-mode image tags) and check dev hot reload through the bind mounts [RQ-OPS-007, RQ-OPS-010, RQ-WEB-005]. Done: both modes report healthy and serve the shell, and an edited server file restarts the server and an edited client file triggers HMR; if `bun --watch` cannot see bind-mount changes, `project.md` documents host-side `bun run dev` instead.
- [x] 6.3 Rewrite `scripts/smoke-compose.ts` for one service (both modes from `down -v`, shell and API on one origin, persistence and reset, SIGTERM exit 0, read-only `/data` keeps the server unhealthy) and delete `scripts/smoke-scale.ts` [RQ-OPS-007, RQ-OPS-008, RQ-OPS-010, RQ-WEB-001, RQ-WEB-005]. Done: `bun run smoke:compose` passes with every check message starting with its RQ ID.

## 7. End-to-end and performance

- [x] 7.1 Move Playwright into `e2e/package.json` and `e2e/Dockerfile` (`mcr.microsoft.com/playwright:v1.65.1-noble`), add the `e2e` Compose profile service, and extend the tests for RQ-WEB-005 (page CSP vs API CSP on one origin) (design D9) [RQ-WEB-001, RQ-WEB-002, RQ-WEB-004, RQ-WEB-005]. Done: `bun run test:e2e` runs the container against prod mode and all tests pass with zero axe violations at 360 px and 1280 px.
- [x] 7.2 Point `scripts/perf.ts` at the single server and run it on Bun, falling back to the Playwright image if autocannon fails on Bun (design D9) [RQ-OPS-001, RQ-OPS-002]. Done: `bun run test:perf` reports p97.5 under 500 ms with zero errors and non-2xx for both endpoints; results recorded in `project.md`.
- [x] 7.3 Make `bun run check` run typecheck, lint, all workspace tests with coverage, `contract:check` and `check:bundle` [all RQ IDs]. Done: `bun run check` exits 0, `contract:check` reports no changes, and every RQ ID in `openspec/specs` (minus RQ-OPS-009 and RQ-WEB-003) has a passing test or smoke check whose name starts with that ID.

## 8. QA and living docs

- [x] 8.1 Run the QA review checklist from config.yaml section 11 against the new stack and record each result in `context.md` [all RQ IDs]. Done: every item is recorded as pass or not applicable with a reason, and failures are fixed and re-checked.
- [x] 8.2 Update all four living docs per config.yaml section 12: new top entry in `history.md`; `project.md` run instructions, performance and "Architecture last reviewed" line; `scope.md` (changed RQ items DONE, RQ-OPS-009 and RQ-WEB-003 RETIRED, RQ-WEB-005 DONE); `context.md` focus, decisions and open items [all RQ IDs]. Done: no doc mentions Node, PostgreSQL, nginx or Vite as current, and no doc contradicts the code.

## Workflow follow-up

- Archive the change after the config.yaml archive guidance is satisfied (all test levels, coverage, oasdiff, QA checklist, both Docker modes, current living docs).
