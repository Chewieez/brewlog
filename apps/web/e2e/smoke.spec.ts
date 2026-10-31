import { test, expect } from "@playwright/test";

test.describe("BrewLog Web Smoke Tests", () => {
  test("loads the application and mounts React layout with /timer redirect", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/.*\/timer/);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  });
});
