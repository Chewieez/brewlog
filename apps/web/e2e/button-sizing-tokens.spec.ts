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
    const closeBtn = page.getByRole("button", { name: /close dialog/i });
    await expect(cancelBtn).toBeVisible();
    await expect(saveBtn).toBeVisible();
    await expect(closeBtn).toBeVisible();

    const cancelBox = await cancelBtn.boundingBox();
    const saveBox = await saveBtn.boundingBox();
    const closeBox = await closeBtn.boundingBox();
    expect(isValidHeight(cancelBox!.height)).toBe(true);
    expect(isValidHeight(saveBox!.height)).toBe(true);
    expect(isValidHeight(closeBox!.height)).toBe(true);
    expect(Math.abs(cancelBox!.height - 40)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(saveBox!.height - 40)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(closeBox!.height - 32)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(closeBox!.width - 32)).toBeLessThanOrEqual(TOLERANCE);
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

    const presetBtn = page.getByRole("button", { name: /single \(15g\)/i });
    await expect(presetBtn).toBeVisible();
    const presetBox = await presetBtn.boundingBox();
    expect(presetBox).not.toBeNull();
    expect(Math.abs(presetBox!.height - 32)).toBeLessThanOrEqual(TOLERANCE);
  });

  test("timer hero controls conform to 48px (h-12)", async ({ page }) => {
    await page.goto("/timer");
    const startBtn = page.getByRole("button", { name: /start/i });
    await expect(startBtn).toBeVisible();
    const box = await startBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.height - 48)).toBeLessThanOrEqual(TOLERANCE);
  });

  test("review editor sensory toggle conforms to 32px (h-8)", async ({ page }) => {
    await page.goto("/reviews");
    const logReviewBtn = page.getByRole("button", { name: /log review/i });
    await expect(logReviewBtn).toBeVisible();
    await logReviewBtn.click();

    const descriptorsBtn = page.getByRole("button", { name: /descriptors/i });
    const wheelBtn = page.getByRole("button", { name: /wheel/i });
    await expect(descriptorsBtn).toBeVisible();
    await expect(wheelBtn).toBeVisible();

    const descBox = await descriptorsBtn.boundingBox();
    const wheelBox = await wheelBtn.boundingBox();
    expect(descBox).not.toBeNull();
    expect(wheelBox).not.toBeNull();
    expect(Math.abs(descBox!.height - 32)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(wheelBox!.height - 32)).toBeLessThanOrEqual(TOLERANCE);
  });

  test("all interactive buttons across primary views conform to [32px, 40px, 48px]", async ({ page }) => {
    const routes = ["/timer", "/stash", "/recipes", "/equipment", "/reviews", "/settings"];
    for (const route of routes) {
      await page.goto(route);
      const buttons = await page.locator("button:visible, a[role='button']:visible").all();
      for (const btn of buttons) {
        const box = await btn.boundingBox();
        if (box && box.height > 10 && box.width > 10) {
          const valid = isValidHeight(box.height);
          const text = (await btn.innerText()).trim();
          expect(
            valid,
            `Button "${text}" on route ${route} has height ${box.height}px (expected 32, 40, or 48px)`
          ).toBe(true);
        }
      }
    }
  });
});
