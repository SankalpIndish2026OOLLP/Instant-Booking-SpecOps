import type { HealthResponse, ReadyResponse } from "@app/shared";
import { ServiceUnavailableError } from "../errors/app-error.js";
import { withTimeout } from "../lib/timeout.js";
import type { LifecycleState } from "../lifecycle/state.js";
import type { DatabaseHealthRepository } from "../repositories/database-health.repository.js";

/** Liveness and readiness checks used by the health controller. */
export interface HealthChecks {
  /** Always answers while the process runs (RQ-OPS-001). */
  liveness(): HealthResponse;
  /** Answers only when the server can serve traffic (RQ-OPS-002). */
  readiness(): Promise<ReadyResponse>;
}

/** Dependencies of {@link HealthService}. */
export interface HealthServiceDependencies {
  repository: DatabaseHealthRepository;
  lifecycle: LifecycleState;
  timeoutMs: number;
}

/** Default {@link HealthChecks} implementation. */
export class HealthService implements HealthChecks {
  /** Creates the service. */
  constructor(private readonly deps: HealthServiceDependencies) {}

  /** Returns `{ status: "ok" }` without touching the database. */
  liveness(): HealthResponse {
    return { status: "ok" };
  }

  /**
   * Returns `{ status: "ready" }` when not draining and the database answers within `timeoutMs`.
   * @throws ServiceUnavailableError `SHUTTING_DOWN` or `DATABASE_UNAVAILABLE`.
   */
  async readiness(): Promise<ReadyResponse> {
    if (this.deps.lifecycle.shuttingDown) throw new ServiceUnavailableError("SHUTTING_DOWN");
    try {
      await withTimeout(this.deps.repository.ping(), this.deps.timeoutMs);
    } catch {
      throw new ServiceUnavailableError("DATABASE_UNAVAILABLE");
    }
    return { status: "ready" };
  }
}
