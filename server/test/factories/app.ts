import { createApp, type App, type AppDependencies } from "../../src/app.js";
import type { LifecycleState } from "../../src/lifecycle/state.js";
import type { HealthChecks } from "../../src/services/health.service.js";
import { buildCapturingLogger, type CapturingLogger } from "./logger.js";

/** Default body limit used by tests; matches the documented default. */
export const TEST_BODY_LIMIT_BYTES = 102_400;

/** Health checks that always succeed. */
export const healthyChecks: HealthChecks = {
  liveness: () => ({ status: "ok" }),
  readiness: async () => ({ status: "ready" }),
};

/** An app wired with test doubles, plus what tests need to inspect it. */
export interface TestApp {
  app: App;
  log: CapturingLogger;
  lifecycle: LifecycleState;
  /** Sends a request to `path` on the app. */
  request(path: string, init?: RequestInit): Promise<Response>;
}

/** Builds the real app with in-memory doubles; override any dependency. */
export function buildTestApp(overrides: Partial<AppDependencies> = {}): TestApp {
  const log = buildCapturingLogger();
  const lifecycle = overrides.lifecycle ?? { shuttingDown: false };
  const app = createApp({
    config: { corsOrigins: [], bodyLimitBytes: TEST_BODY_LIMIT_BYTES },
    logger: log.logger,
    lifecycle,
    healthChecks: healthyChecks,
    ...overrides,
  });
  return {
    app,
    log,
    lifecycle,
    request: (path, init) => app.fetch(new Request(`http://test.local${path}`, init)),
  };
}
