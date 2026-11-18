# History

Newest entry first. Past entries are never edited.

## 2026-11-17: Archive migrate-to-bun-sqlite

- **Summary:** Synced the change's delta specs into `openspec/specs` (7 requirements modified, RQ-WEB-005 added, RQ-OPS-009 and RQ-WEB-003 removed) and moved the change to `openspec/changes/archive/2026-11-17-migrate-to-bun-sqlite`.
- **RQ IDs:** RQ-OPS-001, RQ-OPS-002, RQ-OPS-003, RQ-OPS-006, RQ-OPS-007, RQ-OPS-010, RQ-WEB-001, RQ-WEB-005; retired RQ-OPS-009, RQ-WEB-003.
- **Files:** `openspec/specs/{service-health,runtime-configuration,database-migrations,service-lifecycle,web-shell}/spec.md`, change folder moved.
- **Docs changed:** `history.md`, `project.md` (status, review line, links), `context.md` (focus, links).
- **Reason:** All 23 tasks done and verified; archive guidance checks passed. API contract unchanged (no additive API changes).

## 2026-11-17: Move the stack to Bun + SQLite

- **Summary:** Applied `migrate-to-bun-sqlite` (23/23 tasks). Server on `Bun.serve` with Request/Response helpers instead of Express, SQLite via `bun:sqlite` with one immediate transaction per migration, single `server` container serving client and API, client bundled by Bun with one plain stylesheet, `bun test` with happy-dom, Playwright in its Docker image, `openspec/config.yaml` stack updated.
- **RQ IDs:** DONE RQ-OPS-001, RQ-OPS-002, RQ-OPS-003, RQ-OPS-006, RQ-OPS-007, RQ-OPS-010, RQ-WEB-001, RQ-WEB-005; RETIRED RQ-OPS-009, RQ-WEB-003.
- **Files:** `package.json`, `bun.lock`, `bunfig.toml` (root and per workspace), `tsconfig*.json`, `eslint.config.js`, `compose*.yaml`, `.env.example`, `.dockerignore`, `.gitignore`, `server/**` (new `http/`, SQLite repositories, tests), `shared/package.json`, `client/**` (`styles.css`, Bun build, tests), `scripts/**`, `e2e/**`, `openspec/config.yaml`. Removed: `package-lock.json`, `.nvmrc`, `.npmrc`, `vitest.config.ts`, `playwright.config.ts` (root), `client/Dockerfile`, `client/nginx.conf`, `client/vite.config.ts`, CSS Modules, `server/src/middleware`, `lock-keys.ts`, `scripts/smoke-scale.ts`.
- **Docs changed:** `project.md` (architecture, run instructions, performance), `scope.md` (statuses), `context.md` (QA review, decisions, assumptions), `history.md`; change `design.md` D5, D6 and `tasks.md` 5.2 updated to match the code.
- **Reason:** User decision (Bun, SQLite, single server, simpler client). Found while verifying: readiness needed its own non-blocking connection (Windows busy-wait overshoot), `bun build --production` was needed for React's production build, Bun's watcher cannot see Docker bind-mount changes on Windows, and the runtime image needed each workspace's `node_modules`.

## 2026-11-17: Archive the foundation and plan the move to Bun + SQLite

- **Summary:** Archived `setup-project-foundation` (6 specs, 22 requirements now in `openspec/specs/`). Created the change `migrate-to-bun-sqlite` (proposal, specs, design, tasks).
- **RQ IDs:** added RQ-WEB-005 (PLANNED); changing RQ-OPS-001, RQ-OPS-002, RQ-OPS-003, RQ-OPS-006, RQ-OPS-007, RQ-OPS-010, RQ-WEB-001; retiring RQ-OPS-009, RQ-WEB-003.
- **Files:** `openspec/changes/migrate-to-bun-sqlite/*`, `openspec/specs/*` (archive).
- **Docs changed:** `history.md`, `context.md` (focus, decision, open item), `project.md` (status line), `scope.md` (new row).
- **Reason:** The user asked for SQLite, a Bun backend and a simpler frontend; answers: single server, Bun serves the client, plain CSS and fewer tools.

## 2026-11-17: Implement the project foundation

- **Summary:** Applied `setup-project-foundation` (26/26 tasks): npm workspaces, strict TypeScript, ESLint layering rules, Vitest projects with coverage gates, shared Zod schemas and OpenAPI with an oasdiff gate, Express server (config validation, migrations, health and readiness, error envelope, request IDs, security headers, CORS, body limit, JSON logs, graceful shutdown), React shell with error boundary, Dockerfiles and Compose for dev and prod, Playwright + axe, autocannon, Docker smoke tests.
- **RQ IDs:** RQ-OPS-001 to RQ-OPS-010, RQ-API-001 to RQ-API-008, RQ-WEB-001 to RQ-WEB-004 (all DONE).
- **Files:** `package.json`, `tsconfig*.json`, `eslint.config.js`, `vitest.config.ts`, `playwright.config.ts`, `compose*.yaml`, `.env.example`, `.nvmrc`, `.npmrc`, `.gitignore`, `.gitattributes`, `.dockerignore`, `shared/**`, `server/**`, `client/**`, `scripts/**`, `e2e/**`.
- **Docs changed:** `project.md` (architecture, run instructions, performance), `scope.md` (statuses), `context.md` (QA review, decisions), `history.md`; `design.md` D10, folders and test plan updated to match the code.
- **Reason:** Build the foundation every feature needs. Fixes found while verifying: nginx upstream keep-alive pool (port exhaustion under load), per-mode image tags (wrong image after a mode switch), configurable web host ports.

## 2026-11-17: Plan the project foundation

- **Summary:** Created the OpenSpec change `setup-project-foundation` (proposal, specs, design, tasks) covering everything `openspec/config.yaml` prescribes, and created the four living docs.
- **RQ IDs:** RQ-OPS-001 to RQ-OPS-010, RQ-API-001 to RQ-API-008, RQ-WEB-001 to RQ-WEB-004 (all PLANNED).
- **Files:** `openspec/changes/setup-project-foundation/*`.
- **Docs changed:** `history.md`, `project.md`, `scope.md`, `context.md` (all new).
- **Reason:** The config defines how to build but there is no code or business scope yet; the foundation is needed by every feature. `add-instant-booking` stays blocked until the business supplies its scope.
