import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { ConfigError, ENV_VARIABLES, loadConfig } from "./env.js";

const VALID_PATH = "/data/app.db";

function issuesOf(env: Record<string, string | undefined>): ConfigError["issues"] {
  try {
    loadConfig(env);
  } catch (error) {
    if (error instanceof ConfigError) return error.issues;
    throw error;
  }
  throw new Error("expected loadConfig to throw");
}

describe("loadConfig", () => {
  it("RQ-OPS-003 applies documented defaults to unset optional variables", () => {
    // Given only the required variable / When loaded
    const config = loadConfig({ DATABASE_PATH: VALID_PATH });
    // Then defaults apply
    expect(config).toEqual({
      databasePath: VALID_PATH,
      port: 3000,
      nodeEnv: "production",
      logLevel: "info",
      corsOrigins: [],
      bodyLimitBytes: 102_400,
      readyDbTimeoutMs: 2_000,
      shutdownGraceMs: 10_000,
    });
  });

  it("RQ-OPS-003 treats empty strings as unset and splits CORS origins", () => {
    // Given empty optional values and a CORS list / When loaded
    const config = loadConfig({ DATABASE_PATH: VALID_PATH, PORT: "", CORS_ORIGINS: "https://a.test, https://b.test" });
    // Then defaults apply and origins are trimmed
    expect(config.port).toBe(3000);
    expect(config.corsOrigins).toEqual(["https://a.test", "https://b.test"]);
  });

  it("RQ-OPS-003 reports a missing DATABASE_PATH as required", () => {
    // Given no DATABASE_PATH / When loaded / Then the issue names it as required
    expect(issuesOf({})).toContainEqual({ name: "DATABASE_PATH", reason: "required" });
  });

  it("RQ-OPS-003 rejects an empty DATABASE_PATH", () => {
    // Given a blank path / When loaded / Then DATABASE_PATH is invalid
    expect(issuesOf({ DATABASE_PATH: "  " }).map((issue) => issue.name)).toEqual(["DATABASE_PATH"]);
  });

  it("RQ-OPS-003 names an invalid variable without echoing its value or the database path", () => {
    // Given an invalid number and a path containing a distinctive name
    const env = { DATABASE_PATH: "/data/secret-name.db", BODY_LIMIT_BYTES: "abc" };
    // When loaded
    const issues = issuesOf(env);
    const text = JSON.stringify(issues);
    // Then only the variable name is reported
    expect(issues.map((issue) => issue.name)).toEqual(["BODY_LIMIT_BYTES"]);
    expect(text).not.toContain("abc");
    expect(text).not.toContain("secret-name");
  });

  it("RQ-OPS-003 .env.example lists every variable", () => {
    // Given .env.example / When compared with the schema / Then every variable is present
    const example = readFileSync(new URL("../../../.env.example", import.meta.url), "utf8");
    const listed = new Set([...example.matchAll(/^([A-Z_]+)=/gm)].map((match) => match[1]));
    for (const name of ENV_VARIABLES) expect(listed.has(name) ? name : `missing ${name}`).toBe(name);
  });
});
