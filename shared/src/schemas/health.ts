import { z } from "zod";

/** Body of `GET /api/v1/health` (RQ-OPS-001). */
export const HealthResponseSchema = z.object({ status: z.literal("ok") });

/** A liveness response body. */
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/** Body of a successful `GET /api/v1/ready` (RQ-OPS-002). */
export const ReadyResponseSchema = z.object({ status: z.literal("ready") });

/** A readiness response body. */
export type ReadyResponse = z.infer<typeof ReadyResponseSchema>;
