import type { Database } from "bun:sqlite";
import { resolve } from "node:path";
import { createApp } from "./app.js";
import { ConfigError, loadConfig, type Config } from "./config/env.js";
import { MigrationError } from "./errors/migration-error.js";
import { createShutdown } from "./lifecycle/shutdown.js";
import type { LifecycleState } from "./lifecycle/state.js";
import { createLogger, errorFields, type Logger } from "./logging/logger.js";
import { openDatabase } from "./providers/database.provider.js";
import { readMigrationScripts } from "./providers/migration-files.provider.js";
import { SqliteDatabaseHealthRepository } from "./repositories/database-health.repository.js";
import { SqliteMigrationRepository } from "./repositories/migration.repository.js";
import { HealthService } from "./services/health.service.js";
import { runMigrations } from "./services/migration.service.js";

const MIGRATIONS_DIR = resolve(import.meta.dir, "../migrations");
const PUBLIC_DIR = resolve(import.meta.dir, "../../client/dist/public");
/** Bun rejects larger bodies outright; the API's own 413 check (RQ-API-004) runs below this backstop. */
const BODY_BACKSTOP_BYTES = 1_048_576;

function loadConfigOrExit(): Config {
  try {
    return loadConfig(process.env);
  } catch (error) {
    const fields = error instanceof ConfigError ? { variables: error.issues } : errorFields(error);
    createLogger({ level: "info" }).error("invalid configuration", fields);
    return process.exit(1);
  }
}

function openDatabaseOrExit(config: Config, logger: Logger): Database {
  try {
    return openDatabase({ path: config.databasePath, busyTimeoutMs: config.readyDbTimeoutMs });
  } catch (error) {
    logger.error("cannot open database", errorFields(error));
    return process.exit(1);
  }
}

async function migrateOrExit(db: Database, logger: Logger): Promise<void> {
  try {
    const scripts = await readMigrationScripts(MIGRATIONS_DIR);
    runMigrations({ repository: new SqliteMigrationRepository(db), scripts, logger });
  } catch (error) {
    const fields = error instanceof MigrationError ? { code: error.code, migration: error.migration } : {};
    logger.error("migrations failed", { ...fields, ...errorFields(error) });
    db.close();
    process.exit(1);
  }
}

/** Dev serves `/` through Bun's HTML import with hot reload; prod serves the prebuilt client instead. */
async function devRoutes(config: Config): Promise<Record<string, Bun.HTMLBundle> | undefined> {
  if (config.nodeEnv !== "development") return undefined;
  const shell = await import("../../client/index.html");
  return { "/": shell.default };
}

/** Bootstrap: validate config, open SQLite, migrate, serve, then drain gracefully on SIGTERM/SIGINT. */
async function main(): Promise<void> {
  const config = loadConfigOrExit();
  const logger = createLogger({ level: config.logLevel });
  const db = openDatabaseOrExit(config, logger);
  await migrateOrExit(db, logger);
  const lifecycle: LifecycleState = { shuttingDown: false };
  // Readiness uses its own connection without a busy timeout; the repository retries asynchronously instead.
  const healthDb = openDatabase({ path: config.databasePath, busyTimeoutMs: 0 });
  const healthChecks = new HealthService({
    repository: new SqliteDatabaseHealthRepository(healthDb, config.readyDbTimeoutMs),
    lifecycle,
    timeoutMs: config.readyDbTimeoutMs,
  });
  const publicDir = config.nodeEnv === "production" ? PUBLIC_DIR : undefined;
  const app = createApp({ config, logger, lifecycle, healthChecks, publicDir });
  const server = Bun.serve({
    port: config.port,
    maxRequestBodySize: config.bodyLimitBytes + BODY_BACKSTOP_BYTES,
    development: config.nodeEnv === "development" ? { hmr: true } : false,
    routes: await devRoutes(config),
    fetch: (request) => app.fetch(request),
  });
  logger.info("server listening", { port: server.port, mode: config.nodeEnv });
  const shutdown = createShutdown({
    server,
    lifecycle,
    graceMs: config.shutdownGraceMs,
    logger,
    closeResources: () => {
      healthDb.close();
      db.close();
    },
    exit: (code) => process.exit(code),
  });
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

await main();
