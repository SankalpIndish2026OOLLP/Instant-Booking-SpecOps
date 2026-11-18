import { describe, expect, it } from "bun:test";
import { buildCapturingLogger } from "../../test/factories/logger.js";
import { createLogger, errorFields } from "./logger.js";

describe("createLogger", () => {
  it("RQ-API-007 writes one JSON object per line with a UTC timestamp", () => {
    // Given a logger with a fixed clock
    const lines: string[] = [];
    const logger = createLogger({ level: "info", write: (line) => lines.push(line), now: () => new Date(0) });
    // When it logs
    logger.info("hello", { a: 1 });
    // Then the line is JSON with a Z timestamp
    expect(JSON.parse(lines[0] ?? "")).toEqual({ time: "1970-01-01T00:00:00.000Z", level: "info", msg: "hello", a: 1 });
  });

  it("RQ-API-007 drops lines below the configured level", () => {
    // Given a warn-level logger / When it logs debug and info / Then nothing is written
    const lines: string[] = [];
    const logger = createLogger({ level: "warn", write: (line) => lines.push(line) });
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    expect(lines).toHaveLength(2);
  });

  it("RQ-API-003 child loggers add their fields to every line", () => {
    // Given a child logger with a request ID / When it logs / Then the ID is on the line
    const log = buildCapturingLogger();
    log.logger.child({ requestId: "abc" }).warn("x");
    expect(log.records()[0]).toMatchObject({ requestId: "abc", level: "warn" });
  });

  it("RQ-API-007 turns errors and other values into loggable fields", () => {
    // Given an Error and a string / When converted / Then name and message are kept
    expect(errorFields(new TypeError("bad"))).toMatchObject({ errorName: "TypeError", errorMessage: "bad" });
    expect(errorFields("plain")).toEqual({ errorMessage: "plain" });
  });
});
