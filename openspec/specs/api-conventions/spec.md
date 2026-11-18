# api-conventions Specification

## Purpose
Sets the cross-cutting rules every HTTP API endpoint follows: base path, error format, request tracing, input limits, browser security, logging and contract stability.

## Requirements

### Requirement: RQ-API-001 Versioned base path
Every API endpoint SHALL be served under `/api/v1`. A request to any path or method that matches no endpoint SHALL receive HTTP 404 with an error envelope whose code is `NOT_FOUND`.

#### Scenario: Known endpoint
- **GIVEN** a running server
- **WHEN** a client sends `GET /api/v1/health`
- **THEN** the response status is 200

#### Scenario: Unknown path
- **GIVEN** a running server
- **WHEN** a client sends `GET /api/v1/does-not-exist`
- **THEN** the response status is 404
- **AND** the body is an error envelope with code `NOT_FOUND`

#### Scenario: Unsupported method
- **GIVEN** a running server
- **WHEN** a client sends `DELETE /api/v1/health`
- **THEN** the response status is 404 with code `NOT_FOUND`

### Requirement: RQ-API-002 Error envelope
Every API error response SHALL have a JSON body `{"error":{"code","message","requestId"}}`, where `code` is UPPER_SNAKE_CASE, `requestId` equals the response's `X-Request-Id`, and the HTTP status matches the code. Unexpected failures SHALL return 500 `INTERNAL_ERROR` with a generic message and no stack trace or internal detail.

#### Scenario: Malformed JSON body
- **GIVEN** a running server
- **WHEN** a client sends a request under `/api/v1` with `Content-Type: application/json` and the body `{"a":`
- **THEN** the response status is 400
- **AND** the body is an error envelope with code `INVALID_JSON`

#### Scenario: Unexpected failure
- **GIVEN** a handler that throws an unexpected error
- **WHEN** a client calls it
- **THEN** the response status is 500 with code `INTERNAL_ERROR`
- **AND** the body contains no stack trace, file path or SQL text

#### Scenario: Envelope matches its schema
- **GIVEN** any error response from the API
- **WHEN** its body is parsed with the shared error envelope schema
- **THEN** parsing succeeds
- **AND** `error.requestId` equals the `X-Request-Id` response header

### Requirement: RQ-API-003 Request ID
Every API response SHALL carry an `X-Request-Id` header. When the request has an `X-Request-Id` of 1 to 128 characters from `A-Z a-z 0-9 . _ -`, the server SHALL reuse it; otherwise it SHALL generate a new random UUID. Every log line written for the request SHALL include that ID.

#### Scenario: Valid incoming ID reused
- **GIVEN** a request with header `X-Request-Id: abc-123`
- **WHEN** the server answers it
- **THEN** the response header `X-Request-Id` is `abc-123`
- **AND** every log line for that request contains `abc-123`

#### Scenario: Missing ID generated
- **GIVEN** a request without `X-Request-Id`
- **WHEN** the server answers it
- **THEN** the response header `X-Request-Id` is a UUID

#### Scenario: Invalid incoming ID replaced
- **GIVEN** a request whose `X-Request-Id` is 200 characters long or contains a space
- **WHEN** the server answers it
- **THEN** the response header `X-Request-Id` is a newly generated UUID, not the incoming value

### Requirement: RQ-API-004 Request body size limit
The server SHALL reject any request body larger than `BODY_LIMIT_BYTES` (default 102400 bytes) with HTTP 413 and code `PAYLOAD_TOO_LARGE`, before routing the request.

#### Scenario: Body within the limit
- **GIVEN** the default limit
- **WHEN** a client sends a 102400-byte JSON body to `/api/v1/does-not-exist`
- **THEN** the response status is 404 with code `NOT_FOUND`, showing the body was accepted

#### Scenario: Body over the limit
- **GIVEN** the default limit
- **WHEN** a client sends a 102401-byte JSON body to any `/api/v1` path
- **THEN** the response status is 413 with code `PAYLOAD_TOO_LARGE`

### Requirement: RQ-API-005 CORS allowlist
The server SHALL send CORS headers only for request origins listed in `CORS_ORIGINS` (comma-separated, default empty). For any other origin it SHALL send no `Access-Control-Allow-Origin` header.

#### Scenario: Allowed origin
- **GIVEN** `CORS_ORIGINS` is `https://app.example.test`
- **WHEN** a request arrives with `Origin: https://app.example.test`
- **THEN** the response has `Access-Control-Allow-Origin: https://app.example.test`

#### Scenario: Origin not allowed
- **GIVEN** `CORS_ORIGINS` is `https://app.example.test`
- **WHEN** a request arrives with `Origin: https://other.example.test`
- **THEN** the response has no `Access-Control-Allow-Origin` header

#### Scenario: Default allows no cross origin
- **GIVEN** `CORS_ORIGINS` is unset
- **WHEN** a request arrives with any `Origin` header
- **THEN** the response has no `Access-Control-Allow-Origin` header

### Requirement: RQ-API-006 Security headers
Every API response, including error responses, SHALL include `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, a `Content-Security-Policy` of `default-src 'none'`, and SHALL NOT include `X-Powered-By`.

#### Scenario: Successful response
- **GIVEN** a running server
- **WHEN** a client sends `GET /api/v1/health`
- **THEN** the response includes the three headers above and no `X-Powered-By`

#### Scenario: Error response
- **GIVEN** a running server
- **WHEN** a client sends `GET /api/v1/does-not-exist`
- **THEN** the 404 response also includes the three headers and no `X-Powered-By`

### Requirement: RQ-API-007 Logs without personal data
The server SHALL write one JSON object per log line with a UTC ISO 8601 timestamp ending in `Z`, a level, a message and the request ID when one exists. It SHALL NOT log request or response bodies, query strings, or the `Authorization` and `Cookie` headers.

#### Scenario: Request is logged
- **GIVEN** a running server
- **WHEN** a client sends `GET /api/v1/health`
- **THEN** a JSON log line records the method, path without query string, status, duration in ms and request ID

#### Scenario: Personal data is not logged
- **GIVEN** a request to `/api/v1/does-not-exist?email=a@example.test` with header `Authorization: Bearer secret` and body `{"email":"a@example.test"}`
- **WHEN** the server handles it
- **THEN** no log line contains `a@example.test` or `secret`

### Requirement: RQ-API-008 API contract compatibility gate
The project SHALL generate an OpenAPI document from the shared schemas and compare it with the last committed document. The check SHALL fail on any breaking change and pass on additive changes.

#### Scenario: Unchanged or additive contract
- **GIVEN** the committed OpenAPI document
- **WHEN** the generated document is identical or only adds an optional response field
- **THEN** the contract check passes

#### Scenario: Breaking change
- **GIVEN** the committed OpenAPI document
- **WHEN** a change removes a response field or makes a request field required
- **THEN** the contract check fails and names the breaking change
