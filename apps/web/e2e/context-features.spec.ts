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

    // Verify Free Brew mode by default (no Switch recipe button or brew method badge)
    await expect(page.getByText("Free Brew Stopwatch")).toBeVisible();
    await expect(page.getByText("MANUAL STOPWATCH")).toBeVisible();
    await expect(page.getByRole("button", { name: /switch recipe/i })).not.toBeVisible();
    await expect(page.getByText("V60", { exact: true })).not.toBeVisible();

    // Verify MANUAL STOPWATCH and SPLIT LOG column headers align vertically on desktop
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      const manualBox = await page.getByText("MANUAL STOPWATCH").boundingBox();
      const splitHeadingBox = await page.getByRole("heading", { name: /split log/i }).boundingBox();
      expect(manualBox).not.toBeNull();
      expect(splitHeadingBox).not.toBeNull();
      expect(Math.abs(manualBox!.y - splitHeadingBox!.y)).toBeLessThanOrEqual(2);
    }

    // Switch to Guided Recipe mode (Switch recipe button and brew method badge are visible)
    await page.getByRole("button", { name: "GUIDED RECIPE" }).click();
    await expect(page.getByRole("button", { name: /switch recipe/i })).toBeVisible();
    await expect(page.getByText("V60", { exact: true })).toBeVisible();

    // Switch back to Free Brew mode (Switch recipe button and brew method badge are hidden again)
    await page.getByRole("button", { name: "FREE BREW" }).click();
    await expect(page.getByText("Free Brew Stopwatch")).toBeVisible();
    await expect(page.getByText("MANUAL STOPWATCH")).toBeVisible();
    await expect(page.getByRole("button", { name: /switch recipe/i })).not.toBeVisible();
    await expect(page.getByText("V60", { exact: true })).not.toBeVisible();

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

    // Switch back to Guided Recipe and verify SWITCH navigates to /recipes
    await page.getByRole("button", { name: "GUIDED RECIPE" }).click();
    const switchBtn = page.getByRole("button", { name: /switch recipe/i });
    await expect(switchBtn).toBeVisible();
    await switchBtn.click();
    await expect(page).toHaveURL(/.*\/recipes/);
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

  test("Stash: adds a new coffee bean, updates summary metrics, filters by process pills, switches shelves, and archives a bean", async ({ page }) => {
    await page.goto("/stash");
    await expect(page.getByRole("heading", { name: /stash/i })).toBeVisible();
    const summaryBar = page.getByTestId("cellar-summary-bar");
    await expect(summaryBar).toBeVisible();
    await expect(summaryBar.getByText("ACTIVE BAGS")).toBeVisible();
    await expect(summaryBar.getByText("AT PEAK")).toBeVisible();
    await expect(summaryBar.getByText("TOTAL STASH")).toBeVisible();
    await expect(summaryBar).toHaveAttribute(
      "aria-label",
      "Cellar summary: 1 active bags, 1 at peak, 180g total stash"
    );

    // Open Add Bean modal
    await page.getByRole("button", { name: /add bean/i }).click();
    await expect(page.getByRole("heading", { name: "Add New Whole Bean" })).toBeVisible();

    // Fill form (defaults to washed process and 340g remaining)
    await page.locator("#add-bean-roaster").fill("Onyx Coffee Lab");
    await page.locator("#add-bean-name").fill("Tropical Weather");

    // Save
    await page.getByRole("button", { name: "SAVE BEAN" }).click();

    // Verify modal closes, item is present, and summary bar increments
    await expect(page.getByRole("heading", { name: "Add New Whole Bean" })).not.toBeVisible();
    await expect(page.getByText("Tropical Weather").first()).toBeVisible();
    await expect(page.getByText("Onyx Coffee Lab").first()).toBeVisible();
    await expect(summaryBar).toHaveAttribute(
      "aria-label",
      "Cellar summary: 2 active bags, 1 at peak, 520g total stash"
    );

    // Dynamic process pills include All, Washed, Anaerobic (not Honey)
    const filterGroup = page.getByRole("group", { name: "Filter by process method" });
    await expect(filterGroup.getByRole("button", { name: "All" })).toBeVisible();
    await expect(filterGroup.getByRole("button", { name: "Washed" })).toBeVisible();
    await expect(filterGroup.getByRole("button", { name: "Anaerobic" })).toBeVisible();
    await expect(filterGroup.getByRole("button", { name: "Honey" })).not.toBeVisible();

    await filterGroup.getByRole("button", { name: "Washed" }).click();
    await expect(page.getByText("Tropical Weather")).toBeVisible();
    await expect(page.getByText("Worka Sakaro Anaerobic")).not.toBeVisible();

    // Search mismatch triggers CLEAR FILTERS recovery
    await page.getByLabel("Search coffees").fill("NoSuchLot");
    await expect(page.getByText(/No coffee beans found matching your search/i)).toBeVisible();
    await page.getByRole("button", { name: "CLEAR FILTERS" }).click();
    await expect(page.getByText("Worka Sakaro Anaerobic")).toBeVisible();

    // Switch to Freezer Vault and verify empty state
    await page.getByRole("tab", { name: "Freezer Vault" }).click();
    await expect(page.getByText("Freezer Vault is Empty")).toBeVisible();

    // Switch back to Active Cellar, archive Tropical Weather, and verify it moves to Archived and updates summary bar
    await page.getByRole("tab", { name: "Active Cellar" }).click();
    await page.getByRole("button", { name: "Edit Tropical Weather" }).click();
    await page.locator("#add-bean-is-archived").check();
    await page.getByRole("button", { name: "SAVE CHANGES" }).click();

    await expect(page.getByText("Tropical Weather")).not.toBeVisible();
    await expect(summaryBar).toHaveAttribute(
      "aria-label",
      "Cellar summary: 1 active bags, 1 at peak, 180g total stash"
    );
    await page.getByRole("tab", { name: "Archived" }).click();
    await expect(page.getByText("Tropical Weather")).toBeVisible();
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

  test("Settings: renders live preview tiles without truncation or ellipsis across desktop and mobile", async ({ page }) => {
    const previewTestIds = [
      "preview-dose",
      "preview-water",
      "preview-temp",
      "preview-timer-mode",
      "preview-date",
      "preview-theme",
    ];

    const assertPreviewTiles = async (viewportLabel: string, requireSingleLine: boolean) => {
      for (const id of previewTestIds) {
        const tile = page.getByTestId(id);
        await expect(tile).toBeVisible();
        const metrics = await tile.evaluate((el) => {
          const cs = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
          return {
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            textOverflow: cs.textOverflow,
            height: rect.height,
            lineHeight,
          };
        });
        expect(
          metrics.scrollWidth,
          `${id} (${viewportLabel}) should not overflow horizontally`
        ).toBeLessThanOrEqual(metrics.clientWidth);
        expect(
          metrics.textOverflow,
          `${id} (${viewportLabel}) should not truncate with ellipsis`
        ).not.toBe("ellipsis");
        if (requireSingleLine) {
          expect(
            metrics.height,
            `${id} (${viewportLabel}) should fit on a single line`
          ).toBeLessThanOrEqual(metrics.lineHeight + 2);
        }
      }
    };

    const viewports = [
      { label: "1280x800", width: 1280, height: 800, requireSingleLine: true },
      { label: "375x812", width: 375, height: 812, requireSingleLine: true },
      { label: "320x568", width: 320, height: 568, requireSingleLine: false },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/settings");
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      // Default values
      await expect(page.getByTestId("preview-dose")).toHaveText("18.0 g");
      await expect(page.getByTestId("preview-water")).toHaveText("300.0 g");
      await expect(page.getByTestId("preview-temp")).toHaveText("94°C");
      await expect(page.getByTestId("preview-timer-mode")).toHaveText("FREE BREW");
      await expect(page.getByTestId("preview-theme")).toHaveText("SYSTEM");
      await assertPreviewTiles(`${vp.label} defaults`, vp.requireSingleLine);

      // Light mode + ISO date format
      await page.getByRole("button", { name: "LIGHT", exact: true }).click();
      await page.getByRole("button", { name: "YYYY-MM-DD", exact: true }).click();
      await expect(page.getByTestId("preview-theme")).toHaveText("LIGHT");
      await expect(page.getByTestId("preview-date")).toHaveText("2026-10-18");
      await assertPreviewTiles(`${vp.label} light+iso`, vp.requireSingleLine);

      // Alternate date formats
      await page.getByRole("button", { name: "MM/DD/YYYY", exact: true }).click();
      await expect(page.getByTestId("preview-date")).toHaveText("10/18/2026");
      await assertPreviewTiles(`${vp.label} mm/dd/yyyy`, vp.requireSingleLine);

      await page.getByRole("button", { name: "DD/MM/YYYY", exact: true }).click();
      await expect(page.getByTestId("preview-date")).toHaveText("18/10/2026");
      await assertPreviewTiles(`${vp.label} dd/mm/yyyy`, vp.requireSingleLine);

      // Dark mode + Guided Recipe + Imperial + Fahrenheit + Locale date
      await page.getByRole("button", { name: "LOCALE", exact: true }).click();
      await page.getByRole("button", { name: "GUIDED RECIPE", exact: true }).click();
      await page.getByRole("button", { name: "IMPERIAL (oz)", exact: true }).click();
      await page.getByRole("button", { name: "FAHRENHEIT (°F)", exact: true }).click();
      await page.getByRole("button", { name: "DARK", exact: true }).click();

      await expect(page.getByTestId("preview-dose")).toHaveText("0.63 oz");
      await expect(page.getByTestId("preview-water")).toHaveText("10.58 oz");
      await expect(page.getByTestId("preview-temp")).toHaveText("201°F");
      await expect(page.getByTestId("preview-timer-mode")).toHaveText("GUIDED RECIPE");
      await expect(page.getByTestId("preview-theme")).toHaveText("DARK");
      await assertPreviewTiles(`${vp.label} dark+guided`, vp.requireSingleLine);
    }
  });

  test("Recipes, Reviews & Equipment: FilterPills support keyboard navigation and activation", async ({ page }) => {
    const verifyFilterBar = async (
      route: string,
      testId: string,
      secondLabel: string,
      lastLabel: string
    ) => {
      await page.goto(route);
      const group = page.getByTestId(testId);
      await expect(group).toBeVisible();

      const allBtn = group.getByRole("button", { name: "All", exact: true });
      const secondBtn = group.getByRole("button", { name: secondLabel, exact: true });
      const lastBtn = group.getByRole("button", { name: lastLabel, exact: true });

      await expect(allBtn).toHaveAttribute("aria-pressed", "true");
      await allBtn.focus();
      await expect(allBtn).toBeFocused();

      await page.keyboard.press("ArrowRight");
      await expect(secondBtn).toBeFocused();

      await page.keyboard.press("End");
      await expect(lastBtn).toBeFocused();

      await page.keyboard.press("ArrowRight");
      await expect(allBtn).toBeFocused();

      await page.keyboard.press("ArrowLeft");
      await expect(lastBtn).toBeFocused();

      await page.keyboard.press("Home");
      await expect(allBtn).toBeFocused();

      await page.keyboard.press("ArrowRight");
      await expect(secondBtn).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(secondBtn).toHaveAttribute("aria-pressed", "true");
      await expect(allBtn).toHaveAttribute("aria-pressed", "false");

      await page.keyboard.press("Home");
      await expect(allBtn).toBeFocused();
      await page.keyboard.press("Space");
      await expect(allBtn).toHaveAttribute("aria-pressed", "true");
      await expect(secondBtn).toHaveAttribute("aria-pressed", "false");

      await page.keyboard.press("End");
      await expect(lastBtn).toBeFocused();
      await page.keyboard.press("Tab");
      const focusedInsideGroup = await group.evaluate((el) =>
        el.contains(document.activeElement)
      );
      expect(focusedInsideGroup).toBe(false);
    };

    await verifyFilterBar("/recipes", "recipe-method-filters", "V60", "Kalita Wave");
    const initialRecipeCount = await page.getByTestId("recipe-catalog-card").count();
    expect(initialRecipeCount).toBeGreaterThan(2);
    const recipesGroup = page.getByTestId("recipe-method-filters");
    await recipesGroup.getByRole("button", { name: "All", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    const v60RecipeCount = await page.getByTestId("recipe-catalog-card").count();
    expect(v60RecipeCount).toBeGreaterThan(0);
    expect(v60RecipeCount).toBeLessThan(initialRecipeCount);
    await page.keyboard.press("Home");
    await page.keyboard.press("Space");
    await expect(page.getByTestId("recipe-catalog-card")).toHaveCount(initialRecipeCount);

    await verifyFilterBar("/reviews", "reviews-method-filters", "V60", "Other");
    const reviewsGroup = page.getByTestId("reviews-method-filters");
    const masterFeed = page.getByTestId("master-feed");
    await expect(masterFeed.getByText("Worka Sakaro Anaerobic")).toBeVisible();
    await reviewsGroup.getByRole("button", { name: "V60", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(masterFeed.getByText("Worka Sakaro Anaerobic")).not.toBeVisible();
    await expect(masterFeed.getByText("No cupping logs match your search.")).toBeVisible();
    await page.keyboard.press("Home");
    await page.keyboard.press("Space");
    await expect(masterFeed.getByText("Worka Sakaro Anaerobic")).toBeVisible();

    await verifyFilterBar("/equipment", "equipment-category-filters", "Grinders", "Other");
    const equipmentGroup = page.getByTestId("equipment-category-filters");
    await expect(page.getByRole("heading", { name: /Grinders/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Brewers & Drippers/i })).toBeVisible();
    await equipmentGroup.getByRole("button", { name: "All", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: /Grinders/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Brewers & Drippers/i })).not.toBeVisible();
    await page.keyboard.press("Home");
    await page.keyboard.press("Space");
    await expect(page.getByRole("heading", { name: /Brewers & Drippers/i })).toBeVisible();
  });
});
