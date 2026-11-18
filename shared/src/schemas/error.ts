import { z } from "zod";

/**
 * Every machine-readable error code the API can return (RQ-API-002).
 * New codes may be added; existing ones are never removed or renamed.
 */
export const ErrorCodeSchema = z.enum([
  "NOT_FOUND",
  "INVALID_JSON",
  "PAYLOAD_TOO_LARGE",
  "DATABASE_UNAVAILABLE",
  "SHUTTING_DOWN",
  "INTERNAL_ERROR",
]);

/** An API error code. */
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/**
 * Body of every API error response: `{ error: { code, message, requestId } }` (RQ-API-002).
 */
export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string().min(1),
    requestId: z.string().min(1),
  }),
});

/** An API error response body. */
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
