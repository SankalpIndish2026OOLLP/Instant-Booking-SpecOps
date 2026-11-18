import type { RouteHandler } from "../http/types.js";
import type { HealthChecks } from "../services/health.service.js";

/** Handlers for the health endpoints. */
export interface HealthController {
  health: RouteHandler;
  ready: RouteHandler;
}

/** Creates the health controller over `checks` (RQ-OPS-001, RQ-OPS-002). */
export function createHealthController(checks: HealthChecks): HealthController {
  return {
    health: () => Response.json(checks.liveness()),
    ready: async () => Response.json(await checks.readiness()),
  };
}
