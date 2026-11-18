import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { COMMITTED_DOCUMENT, generatedDocumentText, runOasdiff } from "./contract.js";

const OASDIFF_TIMEOUT_MS = 120_000;
const dir = mkdtempSync(join(tmpdir(), "contract-test-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function writeFixture(name: string, document: unknown): string {
  const path = join(dir, name);
  writeFileSync(path, JSON.stringify(document));
  return path;
}

describe("contract gate", () => {
  it("RQ-API-008 committed document matches the generated one", () => {
    // Given the committed baseline / When the document is regenerated / Then nothing changed unnoticed
    expect(readFileSync(COMMITTED_DOCUMENT, "utf8")).toBe(generatedDocumentText());
  });

  it(
    "RQ-API-008 passes an unchanged contract",
    () => {
      // Given the generated document / When compared with the baseline / Then oasdiff passes
      const revision = writeFixture("same.json", JSON.parse(generatedDocumentText()));
      expect(runOasdiff(COMMITTED_DOCUMENT, revision)).toBe(0);
    },
    OASDIFF_TIMEOUT_MS,
  );

  it(
    "RQ-API-008 passes an additive optional response field",
    () => {
      // Given a document that adds an optional field to HealthResponse
      const document = JSON.parse(generatedDocumentText());
      document.components.schemas.HealthResponse.properties.uptime = { type: "number" };
      // When compared with the baseline / Then oasdiff passes
      expect(runOasdiff(COMMITTED_DOCUMENT, writeFixture("additive.json", document))).toBe(0);
    },
    OASDIFF_TIMEOUT_MS,
  );

  it(
    "RQ-API-008 fails when a response field is removed",
    () => {
      // Given a document whose HealthResponse lost its required status field
      const document = JSON.parse(generatedDocumentText());
      delete document.components.schemas.HealthResponse.properties.status;
      document.components.schemas.HealthResponse.required = [];
      // When compared with the baseline / Then oasdiff reports a breaking change
      expect(runOasdiff(COMMITTED_DOCUMENT, writeFixture("breaking.json", document))).not.toBe(0);
    },
    OASDIFF_TIMEOUT_MS,
  );
});
