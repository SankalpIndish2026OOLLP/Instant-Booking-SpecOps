import { afterAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildTestApp } from "../../test/factories/app.js";

const PAGE_CSP = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'";
const publicDir = mkdtempSync(join(tmpdir(), "public-"));
mkdirSync(join(publicDir, "assets"));
writeFileSync(join(publicDir, "index.html"), "<!doctype html><title></title>");
writeFileSync(join(publicDir, "assets", "app.js"), "console.log(1)");
writeFileSync(join(publicDir, "..", "outside-secret.txt"), "secret");
afterAll(() => {
  rmSync(publicDir, { recursive: true, force: true });
  rmSync(join(publicDir, "..", "outside-secret.txt"), { force: true });
});

const { request } = buildTestApp({ publicDir });

describe("static client", () => {
  it("RQ-WEB-001 RQ-WEB-005 serves the shell at / with the page headers", async () => {
    // Given a prebuilt client / When / is requested / Then index.html is served with the page CSP and nosniff
    const response = await request("/");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-security-policy")).toBe(PAGE_CSP);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("RQ-WEB-001 serves an existing asset", async () => {
    const response = await request("/assets/app.js");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("console.log(1)");
  });

  it("RQ-WEB-001 returns 404 for a missing asset and for paths outside the client", async () => {
    // Given paths that are missing or try to leave the public directory / When requested / Then 404
    for (const path of ["/assets/missing.js", "/../outside-secret.txt", "/%2e%2e/outside-secret.txt", "/%E0%A4%A"]) {
      const response = await request(path);
      expect(`${path} ${response.status}`).toBe(`${path} 404`);
    }
  });

  it("RQ-WEB-005 API responses keep the API headers on the client origin", async () => {
    // Given the same app serves page and API / When an unknown API path is requested
    const response = await request("/api/v1/does-not-exist");
    // Then the API envelope and API CSP are used, not the page ones
    expect(response.status).toBe(404);
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'");
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe("NOT_FOUND");
  });
});
