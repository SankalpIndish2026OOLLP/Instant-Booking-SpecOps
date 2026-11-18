import { describe, expect, it, mock } from "bun:test";
import { ServiceUnavailableError } from "../errors/app-error.js";
import type { DatabaseHealthRepository } from "../repositories/database-health.repository.js";
import { HealthService } from "./health.service.js";

/** Short injected timeout keeps the timeout test fast and deterministic without fake timers. */
const TIMEOUT_MS = 20;

function buildService(repository: DatabaseHealthRepository, shuttingDown = false): HealthService {
  return new HealthService({ repository, lifecycle: { shuttingDown }, timeoutMs: TIMEOUT_MS });
}

const reachable: DatabaseHealthRepository = { ping: async () => undefined };

describe("HealthService", () => {
  it("RQ-OPS-001 liveness never touches the database", () => {
    // Given a repository that would fail / When liveness is checked / Then it is ok
    const ping = mock(async () => Promise.reject(new Error("down")));
    expect(buildService({ ping }).liveness()).toEqual({ status: "ok" });
    expect(ping).not.toHaveBeenCalled();
  });

  it("RQ-OPS-002 is ready when the database answers", async () => {
    expect(await buildService(reachable).readiness()).toEqual({ status: "ready" });
  });

  it("RQ-OPS-002 reports DATABASE_UNAVAILABLE when the ping fails", async () => {
    const service = buildService({ ping: async () => Promise.reject(new Error("SQLITE_BUSY")) });
    expect(service.readiness()).rejects.toMatchObject({ code: "DATABASE_UNAVAILABLE", httpStatus: 503 });
  });

  it("RQ-OPS-002 gives up after the timeout when the database never answers", async () => {
    // Given a database that never answers / When readiness runs past the timeout
    const error = await buildService({ ping: () => new Promise<void>(() => undefined) })
      .readiness()
      .catch((caught: unknown) => caught);
    // Then it fails with DATABASE_UNAVAILABLE
    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error).toMatchObject({ code: "DATABASE_UNAVAILABLE" });
  });

  it("RQ-OPS-002 reports SHUTTING_DOWN while draining", async () => {
    expect(buildService(reachable, true).readiness()).rejects.toMatchObject({ code: "SHUTTING_DOWN" });
  });
});
