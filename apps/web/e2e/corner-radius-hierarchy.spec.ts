import { test, expect, type Locator } from "@playwright/test";

const RADIUS_XL = "12px"; // rounded-xl (0.75rem)
const RADIUS_LG = "8px";  // rounded-lg (0.5rem)
const RADIUS_MD = "6px";  // rounded-md (0.375rem)

type CornerRadii = string | [string, string, string, string];

async function expectBorderRadius(locator: Locator, expected: CornerRadii, label: string) {
  await expect(locator, `${label} should be visible`).toBeVisible();
  const corners = await locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return [
      s.borderTopLeftRadius,
      s.borderTopRightRadius,
      s.borderBottomRightRadius,
      s.borderBottomLeftRadius,
    ];
  });
  const expectedCorners = Array.isArray(expected)
    ? expected
    : [expected, expected, expected, expected];
  expect(
    corners,
    `${label} expected border-radius [${expectedCorners.join(", ")}], got [${corners.join(", ")}]`
  ).toEqual(expectedCorners);
}

test.describe("Design System Corner Radius Hierarchy", () => {
  test("Timer: segmented track/thumbs, action buttons, select, method badge, and ratio translator match hierarchy", async ({ page }) => {
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
    await expectBorderRadius(beanSelect, RADIUS_LG, "Timer bean select");
    await expectBorderRadius(methodBadge, RADIUS_MD, "Timer brew method badge");

    const translatorCard = page.getByTestId("ratio-translator-card");
    const translatorToggle = translatorCard.getByRole("button", { name: /ratio calculator/i });
    await expectBorderRadius(translatorCard, RADIUS_XL, "Ratio translator outer container");
    await expectBorderRadius(translatorToggle, RADIUS_XL, "Ratio translator collapsed toggle");

    await translatorToggle.click();
    await expectBorderRadius(
      translatorToggle,
      [RADIUS_XL, RADIUS_XL, "0px", "0px"],
      "Ratio translator expanded toggle"
    );
    await expectBorderRadius(
      translatorCard.getByLabel(/source coffee/i),
      RADIUS_LG,
      "Ratio translator source coffee input"
    );
    await expectBorderRadius(
      translatorCard.getByRole("button", { name: /apply dose/i }),
      RADIUS_LG,
      "Ratio translator APPLY DOSE button"
    );
  });

  test("Stash: summary bar, shelves, process pills, bean cards, modals, nested resting sub-panel, inputs, and static tags match hierarchy", async ({ page }) => {
    await page.goto("/stash");

    const summaryBar = page.getByTestId("cellar-summary-bar");
    const searchInput = page.getByPlaceholder(/search by coffee name/i);
    const shelfTrack = page.getByTestId("stash-shelf-selector");
    const activeShelfThumb = page.getByRole("tab", { name: "Active Cellar" });
    const allProcessPill = page.getByRole("group", { name: "Filter by process method" }).getByRole("button", { name: "All" });
    const editBtn = page.getByRole("button", { name: /^Edit /i }).first();

    await expectBorderRadius(summaryBar, RADIUS_XL, "Stash cellar summary bar");
    await expectBorderRadius(searchInput, RADIUS_LG, "Stash search input");
    await expectBorderRadius(shelfTrack, RADIUS_LG, "Stash shelf segmented track");
    await expectBorderRadius(activeShelfThumb, RADIUS_MD, "Stash Active Cellar segmented thumb");
    await expectBorderRadius(allProcessPill, RADIUS_LG, "Stash All process filter pill");
    await expectBorderRadius(editBtn, RADIUS_LG, "Stash EDIT button");

    const beanCard = page.getByTestId("stash-bean-card").first();
    await expectBorderRadius(beanCard, RADIUS_XL, "Stash bean card container");

    const restingPanel = beanCard.getByTestId("stash-resting-panel");
    await expectBorderRadius(restingPanel, RADIUS_LG, "Stash nested resting sub-panel");

    const restingBadge = beanCard.getByTestId("stash-resting-badge");
    await expectBorderRadius(restingBadge, RADIUS_MD, "Stash resting status badge");

    await page.getByRole("button", { name: /add bean/i }).click();
    const modalDialog = page.getByTestId("stash-bean-modal");
    const roasterInput = page.getByLabel(/roaster name/i);
    const cancelBtn = page.getByRole("button", { name: "Cancel" });

    await expectBorderRadius(modalDialog, RADIUS_XL, "Stash Add Bean modal container");
    await expectBorderRadius(roasterInput, RADIUS_LG, "Stash modal roaster input");
    await expectBorderRadius(cancelBtn, RADIUS_LG, "Stash modal Cancel button");
  });

  test("Recipes: filter chips, recipe cards, static badges, detail pane, and nested tiles match hierarchy", async ({ page }) => {
    await page.goto("/recipes");

    const allFilterChip = page.getByRole("button", { name: /^all$/i });
    await expectBorderRadius(allFilterChip, RADIUS_LG, "Recipes All filter chip");

    const recipeCard = page.getByTestId("recipe-catalog-card").first();
    await expectBorderRadius(recipeCard, RADIUS_XL, "Recipe catalog card");

    const presetOrCustomBadge = recipeCard.getByText(/^(Preset|Custom)$/).first();
    await expectBorderRadius(presetOrCustomBadge, RADIUS_MD, "Recipe catalog status badge");

    await recipeCard.getByRole("link").click();
    const detailPane = page.getByTestId("recipe-detail-pane");
    const brewBtn = detailPane.getByRole("button", { name: /brew with this recipe/i });

    await expectBorderRadius(detailPane, RADIUS_XL, "Recipe detail pane container");
    await expectBorderRadius(brewBtn, RADIUS_LG, "Recipe detail Brew button");

    const specTile = detailPane.getByTestId("recipe-spec-tile");
    await expectBorderRadius(specTile, RADIUS_LG, "Recipe detail spec sub-tile");
  });

  test("Equipment: search input, category chips, cards, badges, empty state, and modal match hierarchy", async ({ page }) => {
    await page.goto("/equipment");

    const searchInput = page.getByLabel("Search equipment");
    const allChip = page.getByRole("button", { name: "All", exact: true });
    const equipmentCard = page.getByTestId("equipment-card").first();
    const equipmentBadge = equipmentCard.getByTestId("equipment-badge").first();
    const emptyState = page.getByTestId("equipment-empty-state");

    await expectBorderRadius(searchInput, RADIUS_LG, "Equipment search input");
    await expectBorderRadius(allChip, RADIUS_LG, "Equipment All filter chip");
    await expectBorderRadius(equipmentCard, RADIUS_XL, "Equipment card container");
    await expectBorderRadius(equipmentBadge, RADIUS_MD, "Equipment static badge");
    await expectBorderRadius(emptyState, RADIUS_XL, "Equipment empty state container");

    await page.getByRole("button", { name: /add equipment/i }).click();
    const modal = page.getByTestId("equipment-modal");
    const closeBtn = modal.getByRole("button", { name: "Close dialog" });
    const typeSelect = modal.getByRole("combobox").first();
    const brandInput = modal.getByPlaceholder(/e\.g\. Fellow, Comandante/i);
    const cancelBtn = modal.getByRole("button", { name: "Cancel" });

    await expectBorderRadius(modal, RADIUS_XL, "Equipment modal container");
    await expectBorderRadius(closeBtn, RADIUS_LG, "Equipment modal close button");
    await expectBorderRadius(typeSelect, RADIUS_LG, "Equipment modal type select");
    await expectBorderRadius(brandInput, RADIUS_LG, "Equipment modal brand input");
    await expectBorderRadius(cancelBtn, RADIUS_LG, "Equipment modal Cancel button");
  });

  test("Reviews & Settings: filter chips, flavor tag buttons, segmented controls, preview tiles, and studio-light theme match hierarchy", async ({ page }) => {
    await page.goto("/reviews");

    const allReviewsChip = page.getByRole("button", { name: "All", exact: true });
    await expectBorderRadius(allReviewsChip, RADIUS_LG, "Reviews All filter chip");

    await page.getByRole("button", { name: /log review/i }).click();
    const descriptorsThumb = page.getByRole("button", { name: /descriptors/i });
    const wheelThumb = page.getByRole("button", { name: /wheel/i });
    await expectBorderRadius(descriptorsThumb, RADIUS_MD, "Reviews Descriptors segmented thumb");
    await expectBorderRadius(wheelThumb, RADIUS_MD, "Reviews Wheel segmented thumb");

    const firstDescriptorTag = page
      .getByTestId("detail-pane")
      .getByRole("button", { name: "Jasmine", exact: true });
    await expectBorderRadius(firstDescriptorTag, RADIUS_LG, "Reviews interactive flavor tag button");

    await page.goto("/settings");
    const lightThemeBtn = page.getByRole("button", { name: "LIGHT", exact: true });
    await lightThemeBtn.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "studio-light");

    const previewCard = page.getByTestId("settings-live-preview-card");
    const previewTile = page.getByTestId("settings-preview-tile");
    await expectBorderRadius(previewCard, RADIUS_XL, "Settings Live Preview section card (studio-light)");
    await expectBorderRadius(previewTile, RADIUS_LG, "Settings nested Live Preview tile (studio-light)");
    await expectBorderRadius(lightThemeBtn, RADIUS_MD, "Settings LIGHT segmented thumb (studio-light)");

    await page.goto("/equipment");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "studio-light");
    await expectBorderRadius(
      page.getByTestId("equipment-card").first(),
      RADIUS_XL,
      "Equipment card container (studio-light)"
    );
    await expectBorderRadius(
      page.getByRole("button", { name: "All", exact: true }),
      RADIUS_LG,
      "Equipment filter chip (studio-light)"
    );
  });
});
