# Scope

Owned by the business. Engineering only updates RQ statuses and adds rules the user has confirmed. Rows are never deleted.

## Business scope

Not yet provided. Needed: product summary, markets (locales, currencies, time zones, privacy laws), user flow steps and business rules. See [context.md](context.md) open item 1.

## User flow

Not yet provided.

## Business rules

None confirmed yet.

## RQ areas

| Area | Covers |
|------|--------|
| OPS | Runtime, health, configuration, migrations, containers |
| API | Cross-cutting HTTP API conventions |
| WEB | Client shell and browser-facing behaviour |

Business areas will be added when the business scope is provided.

## RQ register

| ID | Title | Status | Change |
|----|-------|--------|--------|
| RQ-OPS-001 | Liveness probe | DONE | migrate-to-bun-sqlite |
| RQ-OPS-002 | Readiness probe | DONE | migrate-to-bun-sqlite |
| RQ-OPS-003 | Startup configuration validation | DONE | migrate-to-bun-sqlite |
| RQ-OPS-004 | Ordered migrations at startup | DONE | setup-project-foundation |
| RQ-OPS-005 | Applied migrations are immutable | DONE | setup-project-foundation |
| RQ-OPS-006 | Concurrency-safe migrations | DONE | migrate-to-bun-sqlite |
| RQ-OPS-007 | One-command start and start order | DONE | migrate-to-bun-sqlite |
| RQ-OPS-008 | Graceful shutdown | DONE | setup-project-foundation |
| RQ-OPS-009 | Horizontal scaling | RETIRED | migrate-to-bun-sqlite |
| RQ-OPS-010 | Data persistence and reset | DONE | migrate-to-bun-sqlite |
| RQ-API-001 | Versioned base path | DONE | setup-project-foundation |
| RQ-API-002 | Error envelope | DONE | setup-project-foundation |
| RQ-API-003 | Request ID | DONE | setup-project-foundation |
| RQ-API-004 | Request body size limit | DONE | setup-project-foundation |
| RQ-API-005 | CORS allowlist | DONE | setup-project-foundation |
| RQ-API-006 | Security headers | DONE | setup-project-foundation |
| RQ-API-007 | Logs without personal data | DONE | setup-project-foundation |
| RQ-API-008 | API contract compatibility gate | DONE | setup-project-foundation |
| RQ-WEB-001 | Client shell is served | DONE | migrate-to-bun-sqlite |
| RQ-WEB-002 | Render error fallback | DONE | setup-project-foundation |
| RQ-WEB-003 | Same-origin API proxy | RETIRED | migrate-to-bun-sqlite |
| RQ-WEB-004 | Accessible, mobile-first shell | DONE | setup-project-foundation |
| RQ-WEB-005 | Single origin for client and API | DONE | migrate-to-bun-sqlite |
