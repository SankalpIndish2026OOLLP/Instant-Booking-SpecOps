import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { MigrationScript } from "../repositories/migration.repository.js";

/** Reads every `*.sql` file in `dir`, sorted by name, with the SHA-256 checksum of its raw bytes (RQ-OPS-004). */
export async function readMigrationScripts(dir: string): Promise<MigrationScript[]> {
  const names = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
  return Promise.all(
    names.map(async (name) => {
      const bytes = await readFile(join(dir, name));
      return { name, sql: bytes.toString("utf8"), checksum: createHash("sha256").update(bytes).digest("hex") };
    }),
  );
}
