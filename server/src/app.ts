import type { Config } from "./config/env.js";
import { createHealthController } from "./controllers/health.controller.js";
import { createApiHandler } from "./http/api-handler.js";
import { createStaticHandler } from "./http/static.js";
import type { LifecycleState } from "./lifecycle/state.js";
import type { Logger } from "./logging/logger.js";
import { apiRoutes } from "./routes/index.js";
import type { HealthChecks } from "./services/health.service.js";

const API_PREFIX = "/api/";
const HTTP_NOT_FOUND = 404;

/** Everything {@link createApp} needs; built in `main.ts` or by tests. */
export interface AppDependencies {
  config: Pick<Config, "corsOrigins" | "bodyLimitBytes">;
  logger: Logger;
  lifecycle: LifecycleState;
  healthChecks: HealthChecks;
  /** Prebuilt client to serve (prod); omitted in dev, where Bun's HTML import serves `/`. */
  publicDir?: string;
}

/** The server's request handler, usable directly by `Bun.serve` and by tests. */
export interface App {
  fetch(request: Request): Promise<Response>;
}

/** Composes the API pipeline and, in prod, the static client on one origin (RQ-WEB-005). */
export function createApp(deps: AppDependencies): App {
  const api = createApiHandler({
    config: deps.config,
    logger: deps.logger,
    lifecycle: deps.lifecycle,
    routes: apiRoutes({ health: createHealthController(deps.healthChecks) }),
  });
  const client = deps.publicDir ? createStaticHandler(deps.publicDir) : undefined;
  return {
    fetch: async (request) => {
      if (new URL(request.url).pathname.startsWith(API_PREFIX)) return api(request);
      return client ? client(request) : new Response("Not found", { status: HTTP_NOT_FOUND });
    },
  };
}
