import { test, expect } from "@playwright/test";

const VALID_HEIGHTS = [32, 40, 48];
const TOLERANCE = 1.0;

function isValidHeight(height: number): boolean {
  return VALID_HEIGHTS.some((target) => Math.abs(height - target) <= TOLERANCE);
}

test.describe("Design System Button Sizing Tokens", () => {
  test("header triggers and navigation actions conform to 32px (h-8) or 40px (h-10)", async ({ page }) => {
    await page.goto("/stash");
    const addBeanBtn = page.getByRole("button", { name: /add bean/i });
    await expect(addBeanBtn).toBeVisible();
    const box = await addBeanBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(isValidHeight(box!.height)).toBe(true);
    expect(Math.abs(box!.height - 32)).toBeLessThanOrEqual(TOLERANCE);
  });

  test("modal footer actions conform to 40px (h-10)", async ({ page }) => {
    await page.goto("/stash");
    await page.getByRole("button", { name: /add bean/i }).click();
    const cancelBtn = page.getByRole("button", { name: /cancel/i });
    const saveBtn = page.getByRole("button", { name: /save bean/i });
    await expect(cancelBtn).toBeVisible();
    await expect(saveBtn).toBeVisible();

    const cancelBox = await cancelBtn.boundingBox();
    const saveBox = await saveBtn.boundingBox();
    expect(isValidHeight(cancelBox!.height)).toBe(true);
    expect(isValidHeight(saveBox!.height)).toBe(true);
    expect(Math.abs(cancelBox!.height - 40)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(saveBox!.height - 40)).toBeLessThanOrEqual(TOLERANCE);
  });

  test("recipe detail pane action cluster aligns uniformly to 32px (h-8)", async ({ page }) => {
    await page.goto("/recipes");
    const firstRecipeCard = page.locator('a[href^="/recipes/"]').first();
    await expect(firstRecipeCard).toBeVisible();
    await firstRecipeCard.click();

    const brewBtn = page.getByRole("button", { name: /brew with this recipe/i }).first();
    await expect(brewBtn).toBeVisible();
    const box = await brewBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.height - 32)).toBeLessThanOrEqual(TOLERANCE);
  });

  test("timer hero controls conform to 48px (h-12)", async ({ page }) => {
    await page.goto("/timer");
    const startBtn = page.getByRole("button", { name: /start/i });
    if (await startBtn.isVisible()) {
      const box = await startBtn.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.abs(box!.height - 48)).toBeLessThanOrEqual(TOLERANCE);
    }
  });

  test("all interactive buttons across primary views conform to [32px, 40px, 48px]", async ({ page }) => {
    const routes = ["/stash", "/recipes", "/equipment", "/reviews", "/settings"];
    for (const route of routes) {
      await page.goto(route);
      const buttons = await page.locator("button:visible, a[role='button']:visible").all();
      for (const btn of buttons) {
        const box = await btn.boundingBox();
        if (box && box.height > 10 && box.width > 10) {
          const valid = isValidHeight(box.height);
          if (!valid) {
            const text = (await btn.innerText()).trim();
            console.error(`Invalid button height: ${box.height}px on route ${route} ("${text}")`);
          }
          expect(valid).toBe(true);
        }
      }
    }
  });
});
