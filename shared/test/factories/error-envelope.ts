import type { ErrorEnvelope } from "../../src/schemas/error.js";

/** Builds a valid error envelope; override any field of `error`. */
export function buildErrorEnvelope(overrides: Partial<ErrorEnvelope["error"]> = {}): ErrorEnvelope {
  return {
    error: { code: "NOT_FOUND", message: "Not found", requestId: "req-1", ...overrides },
  };
}
