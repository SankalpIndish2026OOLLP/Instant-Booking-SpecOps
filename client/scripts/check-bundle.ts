// Fails when the initial JavaScript (module scripts and modulepreloads in the built index.html) is 200 kB gzipped or more (RQ-WEB-004).
// Usage: bun client/scripts/check-bundle.ts [limitBytes]   (run after `bun run --filter @app/client build`)
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const KIB = 1024;
const DEFAULT_LIMIT_BYTES = 200 * KIB;
const limit = Number(process.argv[2] ?? DEFAULT_LIMIT_BYTES);
const dist = resolve(import.meta.dir, "../dist/public");
const html = readFileSync(join(dist, "index.html"), "utf8");

const scriptSources = [...html.matchAll(/<script[^>]*\bsrc="([^"]+\.js)"/g)].map((match) => match[1] ?? "");
const preloads = [...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)].map((match) => match[1] ?? "");
const files = [...new Set([...scriptSources, ...preloads])];
if (files.length === 0) throw new Error("No module scripts found in the built index.html");

const total = files.reduce((sum, file) => sum + gzipSync(readFileSync(join(dist, file))).length, 0);
const report = `initial JS: ${(total / KIB).toFixed(1)} kB gzipped (limit ${(limit / KIB).toFixed(1)} kB) in ${files.join(", ")}`;

if (total >= limit) {
  console.error(`FAIL ${report}`);
  process.exit(1);
}
console.log(`OK ${report}`);
