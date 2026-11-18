/** Supported log levels, lowest first. */
export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

/** A log level. */
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Structured fields attached to a log line. Never put personal data here (RQ-API-007). */
export type LogFields = Record<string, unknown>;

/** Writes one JSON object per line. */
export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  /** Returns a logger that adds `fields` to every line. */
  child(fields: LogFields): Logger;
}

/** Options for {@link createLogger}. */
export interface LoggerOptions {
  level: LogLevel;
  fields?: LogFields;
  write?: (line: string) => void;
  now?: () => Date;
}

const writeStdout = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

/**
 * Creates a JSON-lines logger: `{ time, level, msg, ...fields }` with a UTC ISO 8601 `time` (RQ-API-007).
 */
export function createLogger(options: LoggerOptions): Logger {
  const threshold = LOG_LEVELS.indexOf(options.level);
  const write = options.write ?? writeStdout;
  const now = options.now ?? (() => new Date());
  const base = options.fields ?? {};
  const at =
    (level: LogLevel) =>
    (msg: string, fields: LogFields = {}): void => {
      if (LOG_LEVELS.indexOf(level) < threshold) return;
      write(JSON.stringify({ time: now().toISOString(), level, msg, ...base, ...fields }));
    };
  return {
    debug: at("debug"),
    info: at("info"),
    warn: at("warn"),
    error: at("error"),
    child: (fields) => createLogger({ ...options, fields: { ...base, ...fields } }),
  };
}

/** Turns an unknown thrown value into loggable fields (name, message, stack). */
export function errorFields(error: unknown): LogFields {
  if (error instanceof Error) {
    return { errorName: error.name, errorMessage: error.message, stack: error.stack };
  }
  return { errorMessage: String(error) };
}
