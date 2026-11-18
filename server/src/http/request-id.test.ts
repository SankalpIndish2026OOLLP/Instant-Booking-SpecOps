import { describe, expect, it } from "bun:test";
import { resolveRequestId } from "./request-id.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("resolveRequestId", () => {
  it("RQ-API-003 reuses a valid incoming ID", () => {
    // Given a valid ID / When resolved / Then it is kept
    expect(resolveRequestId("abc-123.x_y")).toBe("abc-123.x_y");
  });

  it("RQ-API-003 generates a UUID when the header is missing", () => {
    // Given no ID / When resolved / Then a UUID is generated
    expect(resolveRequestId(null)).toMatch(UUID);
  });

  it("RQ-API-003 replaces an ID that is too long or contains a space", () => {
    // Given invalid IDs / When resolved / Then new UUIDs replace them
    expect(resolveRequestId("a".repeat(200))).toMatch(UUID);
    expect(resolveRequestId("has space")).toMatch(UUID);
    expect(resolveRequestId("")).toMatch(UUID);
  });

  it("RQ-API-003 accepts exactly 128 characters", () => {
    // Given a 128-character ID / When resolved / Then it is kept
    const id = "a".repeat(128);
    expect(resolveRequestId(id)).toBe(id);
  });
});
