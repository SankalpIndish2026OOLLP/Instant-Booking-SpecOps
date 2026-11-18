import { afterEach, describe, expect, it } from "bun:test";
import { connect } from "node:net";
import { buildTestApp } from "../../test/factories/app.js";
import { createShutdown } from "./shutdown.js";

const SLOW_REQUEST_MS = 1_000;
const GRACE_MS = 1_000;
const DEFAULT_GRACE_MS = 10_000;
const SETTLE_MS = 100;

let server: ReturnType<typeof Bun.serve> | undefined;
afterEach(() => {
  void server?.stop(true);
});

function startServer(): { port: number; shutdown: (graceMs: number) => Promise<number> } {
  const { app, lifecycle, log } = buildTestApp();
  const started = Bun.serve({ port: 0, fetch: (request) => app.fetch(request) });
  server = started;
  const shutdown = (graceMs: number) =>
    new Promise<number>((resolve) => {
      createShutdown({ server: started, lifecycle, graceMs, logger: log.logger, closeResources: () => undefined, exit: resolve })();
    });
  return { port: started.port ?? 0, shutdown };
}

/** Opens a JSON POST whose 2-byte body arrives after `delayMs`, keeping a request in flight. */
function slowRequest(port: number, delayMs: number): Promise<string> {
  return new Promise((resolve) => {
    const socket = connect(port, "127.0.0.1", () => {
      socket.write("POST /api/v1/slow HTTP/1.1\r\nHost: test\r\nContent-Type: application/json\r\nContent-Length: 2\r\n\r\n");
      setTimeout(() => socket.write("{}"), delayMs);
    });
    let response = "";
    socket.on("data", (chunk) => {
      response += chunk.toString();
      if (response.includes("\r\n\r\n")) socket.end();
    });
    socket.on("close", () => resolve(response));
    socket.on("error", () => resolve(response));
  });
}

const settle = () => new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

describe("createShutdown on Bun.serve", () => {
  it("RQ-OPS-008 lets an in-flight request finish, then exits 0", async () => {
    // Given a request that completes after 1000 ms
    const { port, shutdown } = startServer();
    const response = slowRequest(port, SLOW_REQUEST_MS);
    await settle();
    // When SIGTERM is handled with the default grace period
    const exitCode = await shutdown(DEFAULT_GRACE_MS);
    // Then the request got its normal response and the exit code is 0
    expect(await response).toContain("404");
    expect(exitCode).toBe(0);
  });

  it("RQ-OPS-008 forces exit 1 within 1500 ms when the grace period is exceeded", async () => {
    // Given a request that would take 5000 ms
    const { port, shutdown } = startServer();
    void slowRequest(port, 5_000);
    await settle();
    // When SIGTERM is handled with a 1000 ms grace period
    const started = performance.now();
    const exitCode = await shutdown(GRACE_MS);
    // Then the process exits 1 no later than 1500 ms after the signal
    expect(exitCode).toBe(1);
    expect(performance.now() - started).toBeLessThan(1_500);
  });

  it("RQ-OPS-008 exits 0 immediately when no request is running", async () => {
    const { shutdown } = startServer();
    expect(await shutdown(GRACE_MS)).toBe(0);
  });

  it("RQ-OPS-008 exits 1 when closing resources fails", async () => {
    // Given resources that fail to close / When shutdown completes / Then the exit code is 1
    const { app, lifecycle, log } = buildTestApp();
    const started = Bun.serve({ port: 0, fetch: (request) => app.fetch(request) });
    server = started;
    const exitCode = await new Promise<number>((resolve) => {
      createShutdown({
        server: started,
        lifecycle,
        graceMs: GRACE_MS,
        logger: log.logger,
        closeResources: () => {
          throw new Error("close failed");
        },
        exit: resolve,
      })();
    });
    expect(exitCode).toBe(1);
  });
});
