import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { strings } from "../client/src/strings";

const VIEWPORTS = [
  { name: "mobile", width: 360, height: 740 },
  { name: "desktop", width: 1280, height: 800 },
];
const WCAG_21_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const PAGE_CSP = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'";

async function openShell(page: Page): Promise<string[]> {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();
  return consoleErrors;
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} ${viewport.width}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("RQ-WEB-001 shows the banner with the product name and the main region, without console errors", async ({ page }) => {
      const consoleErrors = await openShell(page);
      await expect(page.getByRole("banner")).toContainText(strings.app.name);
      await expect(page.getByRole("heading", { level: 1, name: strings.app.name })).toBeVisible();
      await expect(page).toHaveTitle(strings.app.name);
      expect(consoleErrors).toEqual([]);
    });

    test("RQ-WEB-004 has zero WCAG 2.1 AA violations and no horizontal scrolling", async ({ page }) => {
      await openShell(page);
      const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    });
  });
}

test("RQ-WEB-004 keyboard focus on a button shows a visible outline", async ({ page }) => {
  // Given the shell's global focus style and a native button like the reload button
  await openShell(page);
  await page.evaluate(() => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "probe";
    document.querySelector("main")?.prepend(button);
  });
  // When the user tabs to it
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => {
    const focused = document.activeElement as HTMLElement;
    const style = getComputedStyle(focused);
    return { tag: focused.tagName, style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  // Then it has focus and a visible outline
  expect(outline.tag).toBe("BUTTON");
  expect(outline.style).not.toBe("none");
  expect(outline.width).toBeGreaterThanOrEqual(2);
});

test("RQ-WEB-001 a missing asset returns 404", async ({ request }) => {
  const response = await request.get("/assets/missing.js");
  expect(response.status()).toBe(404);
});

test("RQ-WEB-005 the API is reachable on the page origin and keeps X-Request-Id", async ({ request }) => {
  const response = await request.get("/api/v1/health", { headers: { "X-Request-Id": "e2e-check-1" } });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers()["x-request-id"]).toBe("e2e-check-1");
});

test("RQ-WEB-005 page and API responses on one origin keep their own security headers", async ({ request }) => {
  // Given the prod stack / When the page and an unknown API path are requested on the same origin
  const page = await request.get("/");
  const api = await request.get("/api/v1/does-not-exist");
  // Then the page carries the page CSP and the API a 404 envelope with the API CSP
  expect(page.headers()["content-security-policy"]).toBe(PAGE_CSP);
  expect(page.headers()["x-content-type-options"]).toBe("nosniff");
  expect(api.status()).toBe(404);
  expect(((await api.json()) as { error: { code: string } }).error.code).toBe("NOT_FOUND");
  expect(api.headers()["content-security-policy"]).toBe("default-src 'none'");
});
