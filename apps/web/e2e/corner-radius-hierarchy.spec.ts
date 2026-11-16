import { test, expect, type Locator } from "@playwright/test";

const RADIUS_XL = "12px"; // rounded-xl (0.75rem)
const RADIUS_LG = "8px";  // rounded-lg (0.5rem)
const RADIUS_MD = "6px";  // rounded-md (0.375rem)

async function expectBorderRadius(locator: Locator, expected: string, label: string) {
  await expect(locator, `${label} should be visible`).toBeVisible();
  const radius = await locator.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
  expect(radius, `${label} expected border-radius ${expected}, got ${radius}`).toBe(expected);
}

test.describe("Design System Corner Radius Hierarchy", () => {
  test("Timer: segmented track/thumbs, action buttons, select, and method badge match hierarchy", async ({ page }) => {
    await page.goto("/timer?mode=recipe");

    const track = page.getByRole("group", { name: "Timer mode switcher" });
    const guidedThumb = page.getByRole("button", { name: "GUIDED RECIPE" });
    const freeBrewThumb = page.getByRole("button", { name: "FREE BREW" });
    const startBtn = page.getByRole("button", { name: "START" });
    const beanSelect = page.getByLabel("Active coffee bean");
    const methodBadge = page.getByText("V60", { exact: true }).first();

    await expectBorderRadius(track, RADIUS_LG, "Timer segmented track");
    await expectBorderRadius(guidedThumb, RADIUS_MD, "Timer GUIDED RECIPE thumb");
    await expectBorderRadius(freeBrewThumb, RADIUS_MD, "Timer FREE BREW thumb");
    await expectBorderRadius(startBtn, RADIUS_LG, "Timer START button");
    if (await beanSelect.isVisible()) {
      await expectBorderRadius(beanSelect, RADIUS_LG, "Timer bean select");
    }
    await expectBorderRadius(methodBadge, RADIUS_MD, "Timer brew method badge");
  });

  test("Stash: bean cards, modals, nested resting sub-panel, inputs, and static tags match hierarchy", async ({ page }) => {
    await page.goto("/stash");

    const searchInput = page.getByPlaceholder(/search by coffee name/i);
    const processSelect = page.locator("select").first();
    const editBtn = page.getByRole("button", { name: /^Edit /i }).first();

    await expectBorderRadius(searchInput, RADIUS_LG, "Stash search input");
    await expectBorderRadius(processSelect, RADIUS_LG, "Stash process select");
    await expectBorderRadius(editBtn, RADIUS_LG, "Stash EDIT button");

    const beanCard = editBtn.locator("xpath=ancestor::div[contains(@class, 'bg-panel')][1]");
    await expectBorderRadius(beanCard, RADIUS_XL, "Stash bean card container");

    const restingPanel = beanCard.locator("div.bg-panel-recessed").filter({
      hasText: /days off roast|Frozen at Day|No roast date/i,
    }).first();
    await expectBorderRadius(restingPanel, RADIUS_LG, "Stash nested resting sub-panel");

    const restingBadge = restingPanel.locator("span").last();
    await expectBorderRadius(restingBadge, RADIUS_MD, "Stash resting status badge");

    await page.getByRole("button", { name: /add bean/i }).click();
    const modalDialog = page.locator("[role='dialog'] > div").first();
    const roasterInput = page.locator("#add-bean-roaster");
    const cancelBtn = page.getByRole("button", { name: "Cancel" });

    await expectBorderRadius(modalDialog, RADIUS_XL, "Stash Add Bean modal container");
    await expectBorderRadius(roasterInput, RADIUS_LG, "Stash modal roaster input");
    await expectBorderRadius(cancelBtn, RADIUS_LG, "Stash modal Cancel button");
  });

  test("Recipes: filter chips, recipe cards, static badges, detail pane, and nested tiles match hierarchy", async ({ page }) => {
    await page.goto("/recipes");

    const allFilterChip = page.getByRole("button", { name: /^all$/i });
    await expectBorderRadius(allFilterChip, RADIUS_LG, "Recipes All filter chip");

    const firstRecipeLink = page.locator('a[href^="/recipes/"]').first();
    const recipeCard = firstRecipeLink.locator("xpath=..");
    await expectBorderRadius(recipeCard, RADIUS_XL, "Recipe catalog card");

    const presetOrCustomBadge = recipeCard.getByText(/^(Preset|Custom)$/).first();
    await expectBorderRadius(presetOrCustomBadge, RADIUS_MD, "Recipe catalog status badge");

    await firstRecipeLink.click();
    const brewBtn = page.getByRole("button", { name: /brew with this recipe/i }).first();
    await expectBorderRadius(brewBtn, RADIUS_LG, "Recipe detail Brew button");

    const detailPane = brewBtn.locator("xpath=ancestor::div[contains(@class, 'bg-panel')][1]");
    await expectBorderRadius(detailPane, RADIUS_XL, "Recipe detail pane container");

    const totalWaterLabel = detailPane.getByText("Total Water", { exact: true });
    const specTile = totalWaterLabel.locator("xpath=ancestor::div[contains(@class, 'bg-panel')][1]");
    await expectBorderRadius(specTile, RADIUS_LG, "Recipe detail spec sub-tile");
  });

  test("Reviews & Settings: filter chips, flavor tag buttons, segmented controls, and preview tiles match hierarchy", async ({ page }) => {
    await page.goto("/reviews");

    const allReviewsChip = page.getByRole("button", { name: "All", exact: true });
    await expectBorderRadius(allReviewsChip, RADIUS_LG, "Reviews All filter chip");

    await page.getByRole("button", { name: /log review/i }).click();
    const descriptorsThumb = page.getByRole("button", { name: /descriptors/i });
    const wheelThumb = page.getByRole("button", { name: /wheel/i });
    await expectBorderRadius(descriptorsThumb, RADIUS_MD, "Reviews Descriptors segmented thumb");
    await expectBorderRadius(wheelThumb, RADIUS_MD, "Reviews Wheel segmented thumb");

    const firstDescriptorTag = page.getByTestId("detail-pane").getByRole("button", { name: "Jasmine", exact: true });
    await expectBorderRadius(firstDescriptorTag, RADIUS_LG, "Reviews interactive flavor tag button");

    await page.goto("/settings");
    const previewDose = page.getByTestId("preview-dose");
    const previewTile = previewDose.locator("xpath=..");
    await expectBorderRadius(previewTile, RADIUS_LG, "Settings nested Live Preview tile");

    const previewSection = previewTile.locator("xpath=ancestor::section[1]");
    await expectBorderRadius(previewSection, RADIUS_XL, "Settings Live Preview section card");

    const lightThemeBtn = page.getByRole("button", { name: "LIGHT" });
    await expectBorderRadius(lightThemeBtn, RADIUS_MD, "Settings LIGHT segmented thumb");
  });
});
