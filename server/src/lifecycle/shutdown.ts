import type { Logger } from "../logging/logger.js";
import type { LifecycleState } from "./state.js";

/** The part of a Bun server that shutdown needs. */
export interface StoppableServer {
  /** `false` waits for in-flight requests; `true` closes every connection now. */
  stop(closeActiveConnections?: boolean): Promise<void>;
}

/** Dependencies of {@link createShutdown}. */
export interface ShutdownOptions {
  server: StoppableServer;
  lifecycle: LifecycleState;
  graceMs: number;
  logger: Logger;
  /** Closes the database and other resources after the last request. */
  closeResources: () => void | Promise<void>;
  /** Ends the process; injected so tests can observe the exit code. */
  exit: (code: number) => void;
}

/**
 * Returns the SIGTERM handler (RQ-OPS-008): stop accepting connections, mark readiness as shutting down,
 * let in-flight requests finish within `graceMs`, close resources and exit 0; force-close and exit 1 after the grace period.
 */
export function createShutdown(options: ShutdownOptions): () => void {
  const { server, lifecycle, graceMs, logger } = options;
  let started = false;
  let finished = false;
  const finish = (code: number): void => {
    if (finished) return;
    finished = true;
    options.exit(code);
  };
  return () => {
    if (started) return;
    started = true;
    lifecycle.shuttingDown = true;
    logger.info("shutdown started", { graceMs });
    const timer = setTimeout(() => {
      logger.error("forced shutdown: requests still running after grace period", { graceMs });
      void server.stop(true);
      finish(1);
    }, graceMs);
    server.stop(false).then(
      async () => {
        clearTimeout(timer);
        try {
          await options.closeResources();
          finish(0);
        } catch {
          finish(1);
        }
      },
      () => finish(1),
    );
  };
}
