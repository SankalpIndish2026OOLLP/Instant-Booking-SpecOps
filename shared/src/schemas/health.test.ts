import { describe, expect, it } from "bun:test";
import { HealthResponseSchema, ReadyResponseSchema } from "./health.js";

describe("health schemas", () => {
  it("RQ-OPS-001 accepts the liveness body", () => {
    // Given the liveness body / When parsed / Then it is accepted
    expect(HealthResponseSchema.parse({ status: "ok" })).toEqual({ status: "ok" });
  });

  it("RQ-OPS-001 rejects any other liveness status", () => {
    // Given a different status / When parsed / Then it is rejected
    expect(HealthResponseSchema.safeParse({ status: "ready" }).success).toBe(false);
  });

  it("RQ-OPS-002 accepts the readiness body", () => {
    // Given the readiness body / When parsed / Then it is accepted
    expect(ReadyResponseSchema.parse({ status: "ready" })).toEqual({ status: "ready" });
  });

  it("RQ-OPS-002 rejects a readiness body without status", () => {
    // Given an empty body / When parsed / Then it is rejected
    expect(ReadyResponseSchema.safeParse({}).success).toBe(false);
  });
});
