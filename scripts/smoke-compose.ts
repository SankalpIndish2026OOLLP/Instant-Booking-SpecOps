/**
 * Docker smoke test (RQ-OPS-007, RQ-OPS-008, RQ-OPS-010, RQ-WEB-001, RQ-WEB-005).
 * Destroys the local stack and its volume. Usage: bun run smoke:compose
 */
import { rmSync, writeFileSync } from "node:fs";
import { check, compose, composeOk, DEV_FILES, PROD_FILES, run, services, sql } from "./docker.js";

const MODES = [
  { name: "dev", files: DEV_FILES, url: `http://127.0.0.1:${process.env.WEB_DEV_PORT ?? "5173"}` },
  { name: "prod", files: PROD_FILES, url: `http://127.0.0.1:${process.env.WEB_PROD_PORT ?? "8080"}` },
] as const;
const MIGRATIONS_QUERY = "SELECT name, applied_at FROM schema_migrations ORDER BY name";

async function checkServed(url: string): Promise<void> {
  const shell = await fetch(`${url}/`);
  check(shell.status === 200 && (await shell.text()).includes('<div id="root">'), `RQ-OPS-007 RQ-WEB-001 ${url}/ serves the client shell`);
  const health = await fetch(`${url}/api/v1/health`, { headers: { "X-Request-Id": "smoke-1" } });
  const body = (await health.json()) as { status?: string };
  check(
    health.status === 200 && body.status === "ok" && health.headers.get("x-request-id") === "smoke-1",
    `RQ-WEB-005 ${url}/api/v1/health answers on the same origin and keeps X-Request-Id`,
  );
}

async function startFromClean(mode: (typeof MODES)[number]): Promise<void> {
  console.log(`\n[${mode.name}] down -v, then up --build --wait`);
  composeOk(mode.files, "down", "-v", "--remove-orphans");
  composeOk(mode.files, "up", "-d", "--build", "--wait");
  for (const service of services(mode.files)) check(service.Health === "healthy", `RQ-OPS-007 ${service.Service} is healthy`);
  await checkServed(mode.url);
}

function checkPersistence(files: string[]): void {
  console.log("\n[persistence] down/up keeps data; down -v resets it");
  const before = sql(files, MIGRATIONS_QUERY);
  check(before.includes("0001_baseline.sql"), "RQ-OPS-010 baseline migration recorded");
  composeOk(files, "down");
  composeOk(files, "up", "-d", "--wait");
  check(sql(files, MIGRATIONS_QUERY) === before, "RQ-OPS-010 restart keeps rows and re-applies nothing");
  composeOk(files, "down", "-v");
  composeOk(files, "up", "-d", "--wait");
  const after = sql(files, MIGRATIONS_QUERY);
  check(after.includes("0001_baseline.sql") && after !== before, "RQ-OPS-010 reset starts empty and applies migrations again");
}

function checkGracefulStop(files: string[]): void {
  console.log("\n[shutdown] docker compose stop server sends SIGTERM");
  const id = composeOk(files, "ps", "-q", "server").trim();
  composeOk(files, "stop", "server");
  const exitCode = run("docker", ["inspect", "-f", "{{.State.ExitCode}}", id]).stdout.trim();
  check(exitCode === "0", `RQ-OPS-008 server exited with code 0 after SIGTERM (got ${exitCode})`);
}

function checkUnwritableDatabase(): void {
  console.log("\n[start] a database directory the server cannot write keeps it unhealthy");
  const failing = "compose.smoke-readonly.yaml";
  writeFileSync(failing, 'services:\n  server:\n    environment:\n      DATABASE_PATH: /readonly/app.db\n    volumes:\n      - "db-data:/readonly:ro"\n');
  try {
    const files = ["compose.yaml", failing];
    composeOk(files, "down", "-v");
    check(compose(files, "up", "-d", "--wait").status !== 0, "RQ-OPS-007 up fails when the database cannot be opened");
    const server = services(files).find((entry) => entry.Service === "server");
    check(server?.Health !== "healthy" && server?.ExitCode !== 0, `RQ-OPS-007 server exited non-zero and never became healthy (state ${server?.State}, exit ${server?.ExitCode})`);
    composeOk(files, "down", "-v");
  } finally {
    rmSync(failing, { force: true });
  }
}

async function main(): Promise<void> {
  for (const mode of MODES) await startFromClean(mode);
  checkPersistence(PROD_FILES);
  checkGracefulStop(PROD_FILES);
  composeOk(PROD_FILES, "down");
  checkUnwritableDatabase();
  console.log("\nsmoke:compose passed");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
