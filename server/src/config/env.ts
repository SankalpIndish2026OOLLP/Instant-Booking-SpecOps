import { z } from "zod";
import { LOG_LEVELS, type LogLevel } from "../logging/logger.js";

const DEFAULT_PORT = 3000;
const MAX_PORT = 65_535;
const DEFAULT_BODY_LIMIT_BYTES = 102_400;
const DEFAULT_READY_DB_TIMEOUT_MS = 2_000;
const DEFAULT_SHUTDOWN_GRACE_MS = 10_000;

/** Compose passes `NAME=` as an empty string; treat it as unset so defaults apply. */
const emptyToUndefined = (value: unknown): unknown => (value === "" ? undefined : value);

const positiveInt = (fallback: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(fallback));

const commaList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

/** Every environment variable the server reads (RQ-OPS-003). Each one is listed in `.env.example`. */
export const EnvSchema = z.object({
  /** SQLite database file, created on first start (Compose: /data/app.db). */
  DATABASE_PATH: z.string().trim().min(1),
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT)),
  NODE_ENV: z.preprocess(emptyToUndefined, z.enum(["development", "production", "test"]).default("production")),
  LOG_LEVEL: z.preprocess(emptyToUndefined, z.enum(LOG_LEVELS).default("info")),
  CORS_ORIGINS: z.string().default("").transform(commaList),
  BODY_LIMIT_BYTES: positiveInt(DEFAULT_BODY_LIMIT_BYTES),
  READY_DB_TIMEOUT_MS: positiveInt(DEFAULT_READY_DB_TIMEOUT_MS),
  SHUTDOWN_GRACE_MS: positiveInt(DEFAULT_SHUTDOWN_GRACE_MS),
});

/** Names of all environment variables in {@link EnvSchema}. */
export const ENV_VARIABLES = Object.keys(EnvSchema.shape);

/** Validated server configuration. */
export interface Config {
  databasePath: string;
  port: number;
  nodeEnv: "development" | "production" | "test";
  logLevel: LogLevel;
  corsOrigins: string[];
  bodyLimitBytes: number;
  readyDbTimeoutMs: number;
  shutdownGraceMs: number;
}

/** One invalid variable: its name and why. Never contains the value. */
export interface ConfigIssue {
  name: string;
  reason: string;
}

/** Thrown when the environment is incomplete or invalid. */
export class ConfigError extends Error {
  /** Creates the error from the list of invalid variables. */
  constructor(readonly issues: readonly ConfigIssue[]) {
    super(`Invalid configuration: ${issues.map((issue) => issue.name).join(", ")}`);
    this.name = "ConfigError";
  }
}

function toIssues(error: z.ZodError, env: Record<string, string | undefined>): ConfigIssue[] {
  return error.issues.map((issue) => {
    const name = String(issue.path[0] ?? "unknown");
    // Zod messages describe the expected type only; they never include the received value.
    return { name, reason: env[name] === undefined ? "required" : issue.message };
  });
}

/**
 * Validates `env` and returns the configuration, applying documented defaults (RQ-OPS-003).
 * @throws ConfigError listing each invalid variable by name, never by value.
 */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) throw new ConfigError(toIssues(parsed.error, env));
  const values = parsed.data;
  return {
    databasePath: values.DATABASE_PATH,
    port: values.PORT,
    nodeEnv: values.NODE_ENV,
    logLevel: values.LOG_LEVEL,
    corsOrigins: values.CORS_ORIGINS,
    bodyLimitBytes: values.BODY_LIMIT_BYTES,
    readyDbTimeoutMs: values.READY_DB_TIMEOUT_MS,
    shutdownGraceMs: values.SHUTDOWN_GRACE_MS,
  };
}
