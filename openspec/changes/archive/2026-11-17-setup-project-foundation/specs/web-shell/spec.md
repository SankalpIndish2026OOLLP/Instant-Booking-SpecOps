# Spec Delta

## Purpose

Provides the browser-facing client shell that every feature screen will live in, served from the same origin as the API and meeting the accessibility and mobile-first baseline.

## ADDED Requirements

### Requirement: RQ-WEB-001 Client shell is served
`web` SHALL serve the client shell at `/`: a page with a header showing the product name from the UI strings module and a main region. The shell makes no API calls. All user-visible text SHALL come from the UI strings module.

#### Scenario: Shell loads
- **GIVEN** the stack is running in prod mode
- **WHEN** a browser opens http://localhost:8080/
- **THEN** the page shows a banner containing the product name and a main region
- **AND** the browser console has no errors

#### Scenario: Unknown asset path
- **GIVEN** the stack is running in prod mode
- **WHEN** a browser requests http://localhost:8080/assets/missing.js
- **THEN** the response status is 404

### Requirement: RQ-WEB-002 Render error fallback
When rendering the shell or any screen inside it throws an error, the client SHALL replace the failed part with a message from the UI strings module telling the user something went wrong and offering a reload button, instead of a blank page.

#### Scenario: No error
- **GIVEN** the shell renders without error
- **WHEN** the page loads
- **THEN** the error message is not shown

#### Scenario: A component throws
- **GIVEN** a component inside the shell throws while rendering
- **WHEN** the page loads
- **THEN** the error message and a reload button are shown
- **AND** activating the reload button reloads the page

### Requirement: RQ-WEB-003 Same-origin API proxy
`web` SHALL forward every request under `/api/` to a healthy `server` instance unchanged, including the `X-Request-Id` header, so the browser calls the API on its own origin in both dev and prod mode. When no server instance answers, `web` SHALL return HTTP 502.

#### Scenario: API reached through web
- **GIVEN** the stack is running in dev or prod mode
- **WHEN** a client sends `GET /api/v1/health` to the web port
- **THEN** the response status is 200 with body `{"status":"ok"}`

#### Scenario: No server available
- **GIVEN** `web` is running and every server container is stopped
- **WHEN** a client sends `GET /api/v1/health` to the web port
- **THEN** the response status is 502

### Requirement: RQ-WEB-004 Accessible, mobile-first shell
The shell SHALL meet WCAG 2.1 AA with zero axe violations, declare the page language, keep every interactive element reachable and operable by keyboard with a visible focus indicator, and show no horizontal scrolling at viewport widths from 360 px upward. The initial JavaScript SHALL be under 200 kB gzipped.

#### Scenario: Mobile and desktop
- **GIVEN** viewports 360 px and 1280 px wide
- **WHEN** the shell loads
- **THEN** axe reports zero WCAG 2.1 AA violations
- **AND** the document is no wider than the viewport

#### Scenario: Keyboard only
- **GIVEN** the error fallback is shown
- **WHEN** the user presses Tab
- **THEN** the reload button receives a visible focus indicator
- **AND** pressing Enter reloads the page

#### Scenario: Accessibility regression
- **GIVEN** a change introduces an element that violates WCAG 2.1 AA, such as an image without alt text
- **WHEN** the end-to-end suite runs
- **THEN** the suite fails and names the violation

#### Scenario: Bundle too large
- **GIVEN** a change pushes the initial JavaScript to 200 kB gzipped or more
- **WHEN** the client build check runs
- **THEN** the check fails
