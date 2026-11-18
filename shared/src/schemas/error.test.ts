import { describe, expect, it } from "bun:test";
import { buildErrorEnvelope } from "../../test/factories/error-envelope.js";
import { ErrorCodeSchema, ErrorEnvelopeSchema } from "./error.js";

describe("ErrorEnvelopeSchema", () => {
  it("RQ-API-002 accepts a complete envelope", () => {
    // Given a complete envelope
    const envelope = buildErrorEnvelope();
    // When it is parsed / Then it is accepted unchanged
    expect(ErrorEnvelopeSchema.parse(envelope)).toEqual(envelope);
  });

  it("RQ-API-002 rejects an unknown error code", () => {
    // Given an envelope with a code outside the enum
    const envelope = { error: { code: "SOMETHING_ELSE", message: "x", requestId: "r" } };
    // When it is parsed / Then parsing fails
    expect(ErrorEnvelopeSchema.safeParse(envelope).success).toBe(false);
  });

  it("RQ-API-002 rejects an envelope without a request ID", () => {
    // Given an envelope with an empty request ID
    const envelope = buildErrorEnvelope({ requestId: "" });
    // When it is parsed / Then parsing fails
    expect(ErrorEnvelopeSchema.safeParse(envelope).success).toBe(false);
  });

  it("RQ-API-002 uses UPPER_SNAKE_CASE for every code", () => {
    // Given every declared code / When checked / Then each is UPPER_SNAKE_CASE
    for (const code of ErrorCodeSchema.options) {
      expect(code).toMatch(/^[A-Z]+(_[A-Z]+)*$/);
    }
  });
});
