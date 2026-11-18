# Context

## Current focus

No change in progress. `migrate-to-bun-sqlite` is archived (specs synced). README.md documents the project and the remaining work (2026-11-18). Next: `add-instant-booking`, once the business scope arrives (open item 1).

## Open items queue

Unanswered questions stay first and are asked one at a time.

1. **Business scope for instant booking (blocker).** `scope.md` has no markets, user flow, rules or RQ items, so `add-instant-booking` cannot be specified. Needed from the business.
2. **Product name** shown in the client shell. Until supplied, the UI strings module uses the placeholder "Untitled product".
3. **Markets in scope** (locales, currencies, time zones, privacy laws). Needed before any user-facing data or formatting work.
4. **Continuous integration.** The repository is on GitHub (SankalpIndish2026OOLLP/Instant-Booking-SpecOps) but has no CI pipeline; `bun run check`, `smoke:compose` and `test:e2e` run locally only.
5. **Spec wording.** The `service-lifecycle` Purpose still mentions scaling; reword it in the next change that touches that spec.

## QA review: migrate-to-bun-sqlite (2026-11-17)

| Check | Result |
|-------|--------|
| RQ tests pass | Pass: 87 `bun test` tests (shared 12, client 6, server 69), 4 contract tests, 8 Playwright tests in Docker, `smoke:compose` (12 checks), `test:perf`; every live RQ ID has a test or smoke check named with it |
| No duplication | Pass: one error hierarchy, one header set per response kind (`http/security.ts`), shared test factories |
| Layering respected | Pass: ESLint layering rules clean (`http/` replaces `middleware/`); SQL only in `server/src/repositories/`, plus the connection PRAGMAs in the SQLite provider |
| oasdiff passes | Pass: `contract:check` reports no changes; the HTTP contract is unchanged |
| Loading, empty, error states | Error state: ErrorBoundary. Loading and empty: not applicable, the shell makes no server calls |
| Keyboard-only | Pass: Tab/Enter on the reload button (component test); visible focus outline (e2e) |
| 360 px and desktop | Pass: zero WCAG 2.1 AA violations and no horizontal scroll at 360 px and 1280 px |
| Locales, currencies, time zones | Not applicable yet: none in scope.md (open item 3) |
| No personal data in logs | Pass: test proves email and bearer token never reach logs |
| Docker dev and prod healthy | Pass: both modes healthy from `down -v`; multi-arch runtime image builds. Note: dev hot reload inside Docker does not work on Windows/macOS hosts (no file events through bind mounts); `bun run dev` on the host is the documented hot-reload path |
| Migrations clean on an empty database | Pass: `down -v` then `up` re-applies `0001_baseline.sql`; 10 parallel processes apply it exactly once |
| Architecture matches code | Pass: project.md rewritten; design.md D5 and D6 updated where implementation differed |
| Coverage | Pass: server 97.7% functions / 99.7% lines; shared and client 100% |

## Decisions log

- 2026-11-17: Readiness uses its own SQLite connection with `busy_timeout = 0` and retries asynchronously until `READY_DB_TIMEOUT_MS`; SQLite's own busy wait overshot on Windows (2000 ms became 3186 ms) and blocked the event loop. See [design D5](openspec/changes/archive/2026-11-17-migrate-to-bun-sqlite/design.md#d5-readiness-on-sqlite-rq-ops-001-rq-ops-002).
- 2026-11-17: Hot reload runs on the host with `bun run dev`; Bun's watcher has no polling mode and sees no bind-mount changes from Windows/macOS hosts.
- 2026-11-17: Client is built with `bun build --production` (sets NODE_ENV for React's production build; `--minify` alone shipped the 129 kB development build).
- 2026-11-17: Playwright runs in `mcr.microsoft.com/playwright:v1.65.1-noble` as Compose profile `e2e`; its runner does not support Bun.
- 2026-11-17: Backend moves to Bun 1.4.2 (installed locally) with SQLite (`bun:sqlite`), one server instance, no nginx web container; client keeps React with one plain stylesheet and Bun's bundler. User decision; supersedes the 2026-11-16 PostgreSQL decision and the scaling design. See [migrate-to-bun-sqlite](openspec/changes/archive/2026-11-17-migrate-to-bun-sqlite/proposal.md).
- 2026-11-17 (superseded by the Bun move): nginx upstream pool; per-mode image tags (kept for the server image); configurable web host ports (kept); jsdom 29.1.1; perf against 127.0.0.1 (kept); Node 22.22.0; TypeScript 6.0.3 (kept); Vitest projects; in-process shutdown tests (kept, now on `Bun.serve`).
- 2026-11-17: Foundation went in its own first change, `setup-project-foundation` (archived).
- 2026-11-17: No dotenv package; Docker Compose `env_file` supplies env vars.
- 2026-11-17: OpenAPI built with Zod's native JSON Schema export; no generator dependency.
- 2026-11-16: MVP = minimum viable product. (The database choice of this date was replaced on 2026-11-17 by SQLite.)

## Assumptions

Technical defaults (not business values), each overridable by env var:

- Request body limit 102400 bytes (`BODY_LIMIT_BYTES`); Bun's own hard cap sits 1 MiB above it.
- Readiness database check timeout 2000 ms (`READY_DB_TIMEOUT_MS`), also the busy timeout of the main SQLite connection.
- Shutdown grace period 10000 ms (`SHUTDOWN_GRACE_MS`), below the 15 s Compose stop timeout.
- CORS allowlist empty by default (`CORS_ORIGINS`); the server serves client and API on one origin.
- SQLite file `/data/app.db` (`DATABASE_PATH`) in the `db-data` volume; `.data/app.db` for `bun run dev`.

## Blockers

- `add-instant-booking`: blocked on open item 1.
