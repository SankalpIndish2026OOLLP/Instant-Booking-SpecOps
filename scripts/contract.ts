/**
 * API contract gate (RQ-API-008).
 *   tsx scripts/contract.ts check [--revision <file>]   fail on breaking changes vs the committed document
 *   tsx scripts/contract.ts update                      check, then overwrite the committed document
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildOpenApiDocument } from "../shared/src/openapi/build.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const COMMITTED_DOCUMENT = join(ROOT, "shared", "openapi", "openapi.json");
const OASDIFF_IMAGE = "tufin/oasdiff:v1.38.0";

/** Serializes the generated document exactly as it is committed. */
export function generatedDocumentText(): string {
  return `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`;
}

/**
 * Runs oasdiff in Docker and returns its exit code: 0 when `revision` has no breaking change against `base`.
 */
export function runOasdiff(base: string, revision: string): number {
  const dir = mkdtempSync(join(tmpdir(), "contract-"));
  try {
    copyFileSync(base, join(dir, "base.json"));
    copyFileSync(revision, join(dir, "revision.json"));
    const result = spawnSync(
      "docker",
      ["run", "--rm", "-v", `${dir}:/specs`, OASDIFF_IMAGE, "breaking", "--fail-on", "ERR", "/specs/base.json", "/specs/revision.json"],
      { stdio: "inherit" },
    );
    return result.status ?? 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function checkAgainstBaseline(revisionPath?: string): number {
  if (!existsSync(COMMITTED_DOCUMENT)) {
    console.error(`No committed contract at ${COMMITTED_DOCUMENT}. Run "npm run contract:update" to create the baseline.`);
    return 1;
  }
  if (revisionPath) return runOasdiff(COMMITTED_DOCUMENT, resolve(revisionPath));
  const dir = mkdtempSync(join(tmpdir(), "contract-gen-"));
  try {
    const generated = join(dir, "generated.json");
    writeFileSync(generated, generatedDocumentText());
    return runOasdiff(COMMITTED_DOCUMENT, generated);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main(argv: string[]): number {
  const [mode, flag, value] = argv;
  if (mode === "check") return checkAgainstBaseline(flag === "--revision" ? value : undefined);
  if (mode === "update") {
    const status = existsSync(COMMITTED_DOCUMENT) ? checkAgainstBaseline() : 0;
    if (status !== 0) return status;
    mkdirSync(dirname(COMMITTED_DOCUMENT), { recursive: true });
    writeFileSync(COMMITTED_DOCUMENT, generatedDocumentText());
    console.log(`Contract written to ${COMMITTED_DOCUMENT}`);
    return 0;
  }
  console.error("Usage: tsx scripts/contract.ts check [--revision <file>] | update");
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
