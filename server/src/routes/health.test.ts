import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { API_ROUTES } from "@app/shared";
import { join } from "node:path";
import { createTestDatabase, type TestDatabase } from "../../test/database.js";
import { buildTestApp } from "../../test/factories/app.js";
import { buildCapturingLogger } from "../../test/factories/logger.js";
import type { LifecycleState } from "../lifecycle/state.js";
import { SqliteDatabaseHealthRepository } from "../repositories/database-health.repository.js";
import { SqliteMigrationRepository } from "../repositories/migration.repository.js";
import { HealthService } from "../services/health.service.js";
import { runMigrations } from "../services/migration.service.js";

const TIMEOUT_MS = 2_000;
const LOCK_TIMEOUT_MS = 300;
const RESPONSE_SLACK_MS = 500;

let database: TestDatabase;
beforeAll(() => {
  database = createTestDatabase();
  runMigrations({ repository: new SqliteMigrationRepository(database.db), scripts: [], logger: buildCapturingLogger().logger });
});
afterAll(() => database.drop());

function appOver(db: Database, lifecycle: LifecycleState = { shuttingDown: false }, timeoutMs = TIMEOUT_MS) {
  const repository = new SqliteDatabaseHealthRepository(db, timeoutMs);
  const healthChecks = new HealthService({ repository, lifecycle, timeoutMs });
  return buildTestApp({ healthChecks, lifecycle });
}

async function errorCode(response: Response): Promise<string> {
  return ((await response.json()) as { error: { code: string } }).error.code;
}

describe("health endpoints on SQLite", () => {
  it("RQ-OPS-001 liveness is 200 ok", async () => {
    const response = await appOver(database.db).request("/api/v1/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("RQ-OPS-002 readiness is 200 ready on a migrated database", async () => {
    const response = await appOver(database.db).request("/api/v1/ready");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready" });
  });

  it("RQ-OPS-001 RQ-OPS-002 database unreachable: liveness 200, readiness 503 DATABASE_UNAVAILABLE", async () => {
    // Given a server whose database connection was closed after startup
    const closed = createTestDatabase();
    try {
      runMigrations({ repository: new SqliteMigrationRepository(closed.db), scripts: [], logger: buildCapturingLogger().logger });
      const { request } = appOver(closed.db);
      closed.db.close(false);
      // When probed / Then liveness still passes and readiness fails
      expect((await request("/api/v1/health")).status).toBe(200);
      const ready = await request("/api/v1/ready");
      expect(ready.status).toBe(503);
      expect(await errorCode(ready)).toBe("DATABASE_UNAVAILABLE");
    } finally {
      closed.drop();
    }
  });

  it("RQ-OPS-002 readiness answers 503 within the timeout while another connection holds an exclusive lock", async () => {
    // Given a rollback-journal database (WAL readers cannot be blocked by another connection) locked exclusively
    const path = join(database.dir, "locked.db");
    const setup = new Database(path, { create: true });
    setup.run("CREATE TABLE schema_migrations (name TEXT PRIMARY KEY)");
    setup.close();
    const reader = new Database(path);
    reader.run("PRAGMA busy_timeout = 0");
    const { request } = appOver(reader, { shuttingDown: false }, LOCK_TIMEOUT_MS);
    const holder = new Database(path);
    try {
      holder.run("BEGIN EXCLUSIVE");
      // When readiness is probed
      const started = performance.now();
      const ready = await request("/api/v1/ready");
      // Then it fails with DATABASE_UNAVAILABLE no later than the timeout plus 500 ms
      expect(ready.status).toBe(503);
      expect(await errorCode(ready)).toBe("DATABASE_UNAVAILABLE");
      expect(performance.now() - started).toBeLessThan(LOCK_TIMEOUT_MS + RESPONSE_SLACK_MS);
    } finally {
      holder.close(false);
      reader.close(false);
    }
  });

  it("RQ-OPS-002 readiness is 503 SHUTTING_DOWN while draining", async () => {
    const ready = await appOver(database.db, { shuttingDown: true }).request("/api/v1/ready");
    expect(ready.status).toBe(503);
    expect(await errorCode(ready)).toBe("SHUTTING_DOWN");
  });

  it("RQ-API-008 every documented path answers with a body matching its schema", async () => {
    // Given the documented routes / When each is called / Then the body matches the schema for its status
    const { request } = appOver(database.db);
    for (const route of API_ROUTES) {
      const response = await request(route.path, { method: route.method.toUpperCase() });
      const schema = route.responses[String(response.status)];
      expect(schema === undefined ? `undocumented ${response.status}` : "documented").toBe("documented");
      expect(schema?.safeParse(await response.json()).success).toBe(true);
    }
  });
});
