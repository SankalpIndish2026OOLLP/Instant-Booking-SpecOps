# Spec Delta

## MODIFIED Requirements

### Requirement: RQ-WEB-001 Client shell is served
The server SHALL serve the client shell at `/`: a page with a header showing the product name from the UI strings module and a main region. The shell makes no API calls. All user-visible text SHALL come from the UI strings module. A path that matches no page, asset or API endpoint SHALL return HTTP 404.

#### Scenario: Shell loads
- **GIVEN** the stack is running in prod mode
- **WHEN** a browser opens http://localhost:8080/
- **THEN** the page shows a banner containing the product name and a main region
- **AND** the browser console has no errors

#### Scenario: Unknown asset path
- **GIVEN** the stack is running in prod mode
- **WHEN** a browser requests http://localhost:8080/assets/missing.js
- **THEN** the response status is 404

## ADDED Requirements

### Requirement: RQ-WEB-005 Single origin for client and API
The server SHALL serve the client and every `/api/` endpoint on the same origin in dev and prod, so the browser calls its API without CORS. API responses SHALL keep the API headers (RQ-API-006). In prod mode, client page responses SHALL include `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'`.

#### Scenario: API reached on the client origin
- **GIVEN** the stack is running in dev or prod mode
- **WHEN** a client sends `GET /api/v1/health` with `X-Request-Id: e2e-check-1` to the port that serves the shell
- **THEN** the response status is 200 with body `{"status":"ok"}`
- **AND** the response header `X-Request-Id` is `e2e-check-1`

#### Scenario: Page and API headers stay separate
- **GIVEN** the stack is running in prod mode
- **WHEN** a client requests `/` and then `/api/v1/does-not-exist` on the same origin
- **THEN** the page response carries the page Content-Security-Policy above
- **AND** the API response is a 404 `NOT_FOUND` envelope with `Content-Security-Policy: default-src 'none'`

## REMOVED Requirements

### Requirement: RQ-WEB-003 Same-origin API proxy
**Reason**: The nginx `web` container is removed (user decision, 2026-11-17); there is no proxy left to forward requests or to return 502.
**Migration**: The server serves the client and the API itself on one origin; see RQ-WEB-005. Clients keep calling `/api/v1/...` on the page's own origin, unchanged.
