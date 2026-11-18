import type { HealthController } from "../controllers/health.controller.js";
import type { RouteTable } from "../http/types.js";

/** Base path of every API endpoint (RQ-API-001). */
export const API_BASE_PATH = "/api/v1";

/** Controllers the API routes need. */
export interface ApiControllers {
  health: HealthController;
}

/** Builds the `/api/v1` route table. Unmatched paths and methods give 404 `NOT_FOUND`. */
export function apiRoutes(controllers: ApiControllers): RouteTable {
  return {
    [`${API_BASE_PATH}/health`]: { GET: controllers.health.health },
    [`${API_BASE_PATH}/ready`]: { GET: controllers.health.ready },
  };
}
