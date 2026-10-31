import { test, expect } from "@playwright/test";

test.describe("BrewLog Web Smoke Tests", () => {
  test("loads the application successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/BrewLog/);
    await expect(page.locator("#root")).toBeVisible();
  });
});
