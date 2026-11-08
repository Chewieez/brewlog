import { test, expect } from "@playwright/test";

test.describe("Core Web App End-to-End Context Flows", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto("/timer");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("Timer: switches between Guided Recipe and Free Brew, controls stopwatch", async ({ page }) => {
    await page.goto("/timer");
    await expect(page.getByRole("heading", { name: "Timer" })).toBeVisible();

    // Verify Guided mode by default
    await expect(page.getByRole("button", { name: /change recipe/i })).toBeVisible();

    // Switch to Free Brew mode
    await page.getByRole("button", { name: "FREE BREW" }).click();
    await expect(page.getByText("Free Brew Stopwatch")).toBeVisible();
    await expect(page.getByText("MANUAL STOPWATCH")).toBeVisible();

    // Start brew
    const startBtn = page.getByRole("button", { name: "START" });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Verify running state (shows PAUSE button)
    const pauseBtn = page.getByRole("button", { name: "PAUSE" });
    await expect(pauseBtn).toBeVisible();

    // Pause and Reset
    await pauseBtn.click();
    const resetBtn = page.getByRole("button", { name: "RESET" });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Switch back to Guided Recipe
    await page.getByRole("button", { name: "GUIDED RECIPE" }).click();
    await expect(page.getByRole("button", { name: /change recipe/i })).toBeVisible();
  });

  test("Recipes Studio: selects recipe, views details, and brews with recipe", async ({ page }) => {
    await page.goto("/recipes");
    await expect(page.getByRole("heading", { name: "Recipe Studio" })).toBeVisible();

    // Select the first recipe from catalog
    const firstRecipeCard = page.locator('a[href^="/recipes/"]').first();
    await expect(firstRecipeCard).toBeVisible();
    const recipeName = (await firstRecipeCard.innerText()).split("\n")[0].trim();
    await firstRecipeCard.click();

    // Verify detail pane
    const brewBtn = page.getByRole("button", { name: /brew with this recipe/i }).first();
    await expect(brewBtn).toBeVisible();

    // Click brew with this recipe
    await brewBtn.click();

    // Should redirect to /timer
    await expect(page).toHaveURL(/.*\/timer/);
    if (recipeName) {
      await expect(page.getByRole("heading", { name: recipeName })).toBeVisible();
    }
  });

  test("Stash: adds a new coffee bean and renders it in stash list", async ({ page }) => {
    await page.goto("/stash");
    await expect(page.getByRole("heading", { name: /stash/i })).toBeVisible();

    // Open Add Bean modal
    await page.getByRole("button", { name: /add bean/i }).click();
    await expect(page.getByRole("heading", { name: "Add New Whole Bean" })).toBeVisible();

    // Fill form
    await page.locator("#add-bean-roaster").fill("Onyx Coffee Lab");
    await page.locator("#add-bean-name").fill("Tropical Weather");

    // Save
    await page.getByRole("button", { name: "SAVE BEAN" }).click();

    // Verify modal closes and item is present in list
    await expect(page.getByRole("heading", { name: "Add New Whole Bean" })).not.toBeVisible();
    await expect(page.getByText("Tropical Weather").first()).toBeVisible();
    await expect(page.getByText("Onyx Coffee Lab").first()).toBeVisible();
  });

  test("Equipment: adds new equipment and verifies card display", async ({ page }) => {
    await page.goto("/equipment");
    await expect(page.getByRole("heading", { name: "Equipment", exact: true })).toBeVisible();

    // Open Add Equipment modal
    await page.getByRole("button", { name: /add equipment/i }).click();
    await expect(page.getByRole("heading", { name: "Add Equipment" })).toBeVisible();

    // Fill brand and model
    await page.getByPlaceholder(/e\.g\. Fellow, Comandante/i).fill("Comandante");
    await page.getByPlaceholder(/e\.g\. Ode Gen 2, C40 MK4/i).fill("C40 MK4");

    // Save
    await page.getByRole("button", { name: "SAVE EQUIPMENT" }).click();

    // Verify modal closes and equipment appears
    await expect(page.getByRole("heading", { name: "Add Equipment" })).not.toBeVisible();
    await expect(page.getByText("Comandante").first()).toBeVisible();
    await expect(page.getByText("C40 MK4").first()).toBeVisible();
  });

  test("Settings: modifies temperature unit and persists across navigation", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Toggle temperature to Fahrenheit
    const fahrenheitBtn = page.getByRole("button", { name: /fahrenheit/i });
    await expect(fahrenheitBtn).toBeVisible();
    await fahrenheitBtn.click();
    await expect(fahrenheitBtn).toHaveAttribute("aria-pressed", "true");

    // Navigate to Timer and back
    await page.goto("/timer");
    await page.goto("/settings");

    // Verify still Fahrenheit
    const persistedFahrenheitBtn = page.getByRole("button", { name: /fahrenheit/i });
    await expect(persistedFahrenheitBtn).toHaveAttribute("aria-pressed", "true");
  });
});
