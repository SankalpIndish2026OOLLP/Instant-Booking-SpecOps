import { createLogger, type Logger, type LogLevel } from "../../src/logging/logger.js";

/** A logger that keeps every line in memory. */
export interface CapturingLogger {
  logger: Logger;
  lines: string[];
  /** Parsed log lines. */
  records(): Record<string, unknown>[];
}

/** Builds a logger whose output tests can inspect. */
export function buildCapturingLogger(level: LogLevel = "debug"): CapturingLogger {
  const lines: string[] = [];
  return {
    logger: createLogger({ level, write: (line) => lines.push(line) }),
    lines,
    records: () => lines.map((line) => JSON.parse(line) as Record<string, unknown>),
  };
}
