/**
 * Performance check (RQ-OPS-001, RQ-OPS-002): p95 < 500 ms on the running prod server.
 * autocannon reports p97.5 but not p95; p97.5 < 500 ms implies p95 < 500 ms.
 * Usage: bun run test:perf
 */
import autocannon from "autocannon";

// 127.0.0.1, not localhost: on Windows, localhost can resolve to ::1 and go through a different
// Docker port relay that drops a few connections under load, which would measure the host, not the stack.
const WEB = `http://127.0.0.1:${process.env.WEB_PROD_PORT ?? "8080"}`;
const PATHS = ["/api/v1/health", "/api/v1/ready"];
const P95_LIMIT_MS = 500;
const CONNECTIONS = 10;
const DURATION_S = 10;

async function measure(path: string): Promise<boolean> {
  const result = await autocannon({ url: `${WEB}${path}`, connections: CONNECTIONS, duration: DURATION_S });
  const p975 = result.latency.p97_5;
  const passed = p975 < P95_LIMIT_MS && result.non2xx === 0 && result.errors === 0;
  console.log(
    `${passed ? "ok  " : "FAIL"} ${path}: ${result.requests.total} requests, p50 ${result.latency.p50} ms, ` +
      `p97.5 ${p975} ms, p99 ${result.latency.p99} ms, non-2xx ${result.non2xx}, errors ${result.errors}`,
  );
  return passed;
}

async function main(): Promise<void> {
  const results = [];
  for (const path of PATHS) results.push(await measure(path));
  if (results.includes(false)) process.exit(1);
}

await main();
