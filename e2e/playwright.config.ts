import { defineConfig, devices } from "@playwright/test";

/** Runs inside the e2e Compose service against the prod server: BASE_URL=http://server:3000. */
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.e2e.ts",
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://server:3000",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
