/** Small helpers shared by the Docker smoke and performance scripts. */

export const DEV_FILES = ["compose.yaml", "compose.override.yaml"];
export const PROD_FILES = ["compose.yaml", "compose.prod.yaml"];

/** Runs a command and returns its exit code and stdout; prints stderr on failure. */
export function run(command: string, args: string[]): { status: number; stdout: string } {
  const result = Bun.spawnSync([command, ...args], { stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) process.stderr.write(result.stderr.toString());
  return { status: result.exitCode, stdout: result.stdout.toString() };
}

/** Runs `docker compose -f ... <args>`. */
export function compose(files: string[], ...args: string[]): { status: number; stdout: string } {
  return run("docker", ["compose", ...files.flatMap((file) => ["-f", file]), ...args]);
}

/** Runs `docker compose` and throws when it fails. */
export function composeOk(files: string[], ...args: string[]): string {
  const result = compose(files, ...args);
  if (result.status !== 0) throw new Error(`docker compose ${args.join(" ")} failed (${result.status})`);
  return result.stdout;
}

/** Runs one read-only SQL query against the server's SQLite file inside the container; returns rows as JSON text. */
export function sql(files: string[], query: string): string {
  const script =
    'const { Database } = require("bun:sqlite");' +
    "const db = new Database(process.env.DATABASE_PATH, { readonly: true });" +
    `console.log(JSON.stringify(db.query(${JSON.stringify(query)}).all()));`;
  return composeOk(files, "exec", "-T", "server", "bun", "-e", script).trim();
}

/** Lists compose services with state, health and exit code. */
export function services(files: string[]): { Service: string; State: string; Health: string; ExitCode: number }[] {
  return composeOk(files, "ps", "--all", "--format", "json")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as { Service: string; State: string; Health: string; ExitCode: number });
}

/** Fails the script with a message when `condition` is false; prints a check mark otherwise. */
export function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAILED: ${message}`);
  console.log(`  ok  ${message}`);
}
