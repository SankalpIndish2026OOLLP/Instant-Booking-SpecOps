import { describe, expect, it } from "bun:test";
import { ErrorEnvelopeSchema } from "@app/shared";
import { buildTestApp, healthyChecks, TEST_BODY_LIMIT_BYTES } from "../test/factories/app.js";

const UUID = /^[0-9a-f-]{36}$/;
const JSON_HEADERS = { "Content-Type": "application/json" };

function jsonBodyOfSize(bytes: number): string {
  const prefix = '{"a":"';
  const suffix = '"}';
  return `${prefix}${"x".repeat(bytes - prefix.length - suffix.length)}${suffix}`;
}

async function codeOf(response: Response): Promise<string> {
  return ErrorEnvelopeSchema.parse(await response.json()).error.code;
}

describe("RQ-API-001 versioned base path", () => {
  it("RQ-API-001 serves known endpoints under /api/v1", async () => {
    // Given the app / When GET /api/v1/health / Then 200
    const response = await buildTestApp().request("/api/v1/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("RQ-API-001 answers unknown paths and methods with 404 NOT_FOUND", async () => {
    // Given the app / When an unknown path or method is requested / Then 404 NOT_FOUND
    const { request } = buildTestApp();
    for (const response of [await request("/api/v1/does-not-exist"), await request("/api/v1/health", { method: "DELETE" })]) {
      expect(response.status).toBe(404);
      expect(await codeOf(response)).toBe("NOT_FOUND");
    }
  });
});

describe("RQ-API-002 error envelope", () => {
  it("RQ-API-002 rejects malformed JSON with 400 INVALID_JSON and a schema-valid envelope", async () => {
    // Given a truncated JSON body / When posted
    const response = await buildTestApp().request("/api/v1/health", { method: "POST", headers: JSON_HEADERS, body: '{"a":' });
    // Then 400 INVALID_JSON, and requestId matches the header
    expect(response.status).toBe(400);
    const envelope = ErrorEnvelopeSchema.parse(await response.json());
    expect(envelope.error.code).toBe("INVALID_JSON");
    expect(envelope.error.requestId).toBe(response.headers.get("x-request-id") ?? "");
  });

  it("RQ-API-002 hides details of unexpected failures behind 500 INTERNAL_ERROR", async () => {
    // Given a handler that throws an error carrying internal details
    const failing = {
      ...healthyChecks,
      liveness: () => {
        throw new Error("boom at /srv/secret/file.ts SELECT * FROM users");
      },
    };
    const { request, log } = buildTestApp({ healthChecks: failing });
    // When it is called
    const response = await request("/api/v1/health");
    const text = await response.text();
    // Then the client sees a generic 500 and the details only reach the log
    expect(response.status).toBe(500);
    expect(JSON.parse(text).error.code).toBe("INTERNAL_ERROR");
    for (const leak of ["boom", "/srv/secret", "SELECT", "at "]) expect(text).not.toContain(leak);
    expect(log.lines.join("\n")).toContain("boom");
  });
});

describe("RQ-API-003 request ID", () => {
  it("RQ-API-003 reuses a valid incoming ID in the header and every log line", async () => {
    // Given a request with X-Request-Id abc-123
    const { request, log } = buildTestApp();
    // When it is answered
    const response = await request("/api/v1/health", { headers: { "X-Request-Id": "abc-123" } });
    // Then the header and log lines carry it
    expect(response.headers.get("x-request-id")).toBe("abc-123");
    expect(log.records().length).toBeGreaterThan(0);
    for (const record of log.records()) expect(record.requestId).toBe("abc-123");
  });

  it("RQ-API-003 replaces an invalid incoming ID with a UUID", async () => {
    // Given an ID with a space / When answered / Then a new UUID is returned
    const response = await buildTestApp().request("/api/v1/health", { headers: { "X-Request-Id": "has space" } });
    expect(response.headers.get("x-request-id")).toMatch(UUID);
  });
});

describe("RQ-API-004 body size limit", () => {
  it("RQ-API-004 accepts a body exactly at the limit", async () => {
    // Given a 102400-byte JSON body / When posted to an unknown path / Then it reaches routing (404)
    const body = jsonBodyOfSize(TEST_BODY_LIMIT_BYTES);
    const response = await buildTestApp().request("/api/v1/does-not-exist", { method: "POST", headers: JSON_HEADERS, body });
    expect(response.status).toBe(404);
  });

  it("RQ-API-004 rejects a body one byte over the limit with 413", async () => {
    // Given a 102401-byte JSON body / When posted / Then 413 PAYLOAD_TOO_LARGE
    const body = jsonBodyOfSize(TEST_BODY_LIMIT_BYTES + 1);
    const response = await buildTestApp().request("/api/v1/does-not-exist", { method: "POST", headers: JSON_HEADERS, body });
    expect(response.status).toBe(413);
    expect(await codeOf(response)).toBe("PAYLOAD_TOO_LARGE");
  });

  it("RQ-API-004 rejects an oversized body sent without Content-Length", async () => {
    // Given a streamed body over the limit / When posted / Then 413 PAYLOAD_TOO_LARGE
    const chunk = new TextEncoder().encode(jsonBodyOfSize(TEST_BODY_LIMIT_BYTES + 1));
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk);
        controller.close();
      },
    });
    const response = await buildTestApp().app.fetch(
      new Request("http://test.local/api/v1/x", { method: "POST", headers: JSON_HEADERS, body: stream }),
    );
    expect(response.status).toBe(413);
  });
});

describe("RQ-API-005 CORS allowlist", () => {
  const allowed = "https://app.example.test";
  const { request } = buildTestApp({ config: { corsOrigins: [allowed], bodyLimitBytes: TEST_BODY_LIMIT_BYTES } });

  it("RQ-API-005 echoes an allowed origin", async () => {
    const response = await request("/api/v1/health", { headers: { Origin: allowed } });
    expect(response.headers.get("access-control-allow-origin")).toBe(allowed);
  });

  it("RQ-API-005 answers a preflight from an allowed origin with 204", async () => {
    const response = await request("/api/v1/health", {
      method: "OPTIONS",
      headers: { Origin: allowed, "Access-Control-Request-Method": "GET" },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(allowed);
  });

  it("RQ-API-005 sends no CORS header for other origins", async () => {
    const response = await request("/api/v1/health", { headers: { Origin: "https://other.example.test" } });
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("RQ-API-005 allows no cross origin by default", async () => {
    const response = await buildTestApp().request("/api/v1/health", { headers: { Origin: allowed } });
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("RQ-API-006 security headers", () => {
  it("RQ-API-006 sets security headers on success and error responses", async () => {
    // Given the app / When a 200 and a 404 are produced / Then both carry the headers and no X-Powered-By
    const { request } = buildTestApp();
    for (const response of [await request("/api/v1/health"), await request("/api/v1/nope")]) {
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("strict-transport-security")).not.toBeNull();
      expect(response.headers.get("content-security-policy")).toBe("default-src 'none'");
      expect(response.headers.get("x-powered-by")).toBeNull();
    }
  });
});

describe("RQ-API-007 logs without personal data", () => {
  it("RQ-API-007 logs method, path, status and duration for each request", async () => {
    // Given the app / When a request is served / Then one request line has the expected fields
    const { request, log } = buildTestApp();
    await request("/api/v1/health?x=1");
    expect(log.records().find((record) => record.msg === "request")).toMatchObject({
      method: "GET",
      path: "/api/v1/health",
      status: 200,
      durationMs: expect.any(Number),
    });
  });

  it("RQ-API-007 never logs query strings, bodies or credentials", async () => {
    // Given a request carrying an email in query and body, and a bearer token
    const { request, log } = buildTestApp();
    await request("/api/v1/does-not-exist?email=a@example.test", {
      method: "POST",
      headers: { ...JSON_HEADERS, Authorization: "Bearer secret" },
      body: JSON.stringify({ email: "a@example.test" }),
    });
    // When the logs are read / Then neither value appears
    const text = log.lines.join("\n");
    expect(text).not.toContain("a@example.test");
    expect(text).not.toContain("secret");
  });
});

describe("RQ-OPS-008 draining", () => {
  it("RQ-OPS-008 asks clients to close connections while shutting down", async () => {
    // Given a draining server / When a request arrives / Then Connection: close is sent
    const { request, lifecycle } = buildTestApp();
    lifecycle.shuttingDown = true;
    expect((await request("/api/v1/health")).headers.get("connection")).toBe("close");
  });
});

describe("RQ-WEB-005 single origin without a client build", () => {
  it("RQ-WEB-005 non-API paths give 404 when no prebuilt client is configured", async () => {
    // Given no publicDir (dev and tests) / When a non-API path is requested / Then 404
    expect((await buildTestApp().request("/anything")).status).toBe(404);
  });
});
