# Issue 30: Recipe Grinder Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to specify one or more grinders with dial settings for brew recipes across Web and Mobile, supporting inline creation of the first grinder when none exist, gracefully filtering erased grinders, and defaulting the primary grinder for brew review pre-fill.

**Architecture:** Add `grinder_settings JSONB` column to the `recipes` table and `grinderSettings?: RecipeGrinderSetting[]` to domain `BrewRecipe` with legacy sync to `recommended_grinder_id`. Update Web and Mobile Recipe Builders to support adding grinder settings (or adding an initial grinder inline if none exist), update Detail screens to display active grinder settings while filtering erased grinders, and prefill reviews from the primary grinder.

**Tech Stack:** React, TypeScript, React Native (Expo), Supabase PostgreSQL, Vitest, Tailwind CSS, Lucide Icons.

**Spec:** `docs/superpowers/specs/2026-10-05-issue-30-recipe-grinder-settings-design.md`

## Global Constraints
- Target workspace: `/Users/greglawrence/orca/workspaces/brewlog/Issue-30`
- Monorepo package paths: `packages/core`, `packages/supabase`, `apps/web`, `apps/mobile`
- If 0 grinders exist in equipment, show inline option to create first grinder. If 1+ grinders exist, do NOT offer inline creation in recipe builder — only select from existing grinders.
- Filter out erased/deleted grinders in UI displays so missing equipment is gracefully hidden.
- The first grinder in `grinderSettings` is the primary default for review pre-filling.
- Do not run the full test suite until ready to commit and push; only run targeted tests for the specific task at hand.

---

### Task 1: Core Domain Model & Database Schema

**Files:**
- Modify: `packages/core/src/types.ts`
- Create: `packages/supabase/migrations/004_add_recipe_grinder_settings.sql`
- Modify: `packages/supabase/src/database.types.ts`

**Interfaces:**
- Consumes: Existing `BrewRecipe`, `Equipment` in `packages/core/src/types.ts`
- Produces:
  ```ts
  export interface RecipeGrinderSetting {
    grinderId: string;
    setting: string;
  }
  ```
  `BrewRecipe.grinderSettings?: RecipeGrinderSetting[];`
  `recipes.Row.grinder_settings: Json;`
  `recipes.Insert.grinder_settings?: Json;`
  `recipes.Update.grinder_settings?: Json;`

- [ ] **Step 1: Update domain types in `packages/core/src/types.ts`**
  Add `RecipeGrinderSetting` interface and add `grinderSettings?: RecipeGrinderSetting[];` to `BrewRecipe`.
- [ ] **Step 2: Create Supabase migration file `packages/supabase/migrations/004_add_recipe_grinder_settings.sql`**
  ```sql
  -- Migration 004: Add grinder_settings to recipes table
  ALTER TABLE public.recipes 
  ADD COLUMN IF NOT EXISTS grinder_settings JSONB NOT NULL DEFAULT '[]'::jsonb;
  ```
- [ ] **Step 3: Update `packages/supabase/src/database.types.ts`**
  Add `grinder_settings: Json` to `Row`, `grinder_settings?: Json` to `Insert`, and `grinder_settings?: Json` to `Update` in `recipes`.
- [ ] **Step 4: Verify core presets and types compile**
  Run: `npm run build -w @brewlog/core`
  Expected: Clean compile without errors.
- [ ] **Step 5: Commit**
  ```bash
  git add packages/core/src/types.ts packages/supabase/migrations/004_add_recipe_grinder_settings.sql packages/supabase/src/database.types.ts
  git commit -m "feat(core,supabase): define RecipeGrinderSetting and add grinder_settings column"
  ```

---

### Task 2: Supabase Recipe Mappers & Unit Tests

**Files:**
- Modify: `packages/supabase/src/mappers/recipeMappers.ts`
- Modify: `packages/supabase/src/mappers/mappers.test.ts`

**Interfaces:**
- Consumes: `RecipeGrinderSetting`, `BrewRecipe` from `@brewlog/core`, `RecipeRow`, `RecipeInsert` from `database.types.ts`
- Produces: Updated `mapRecipeRowToDomain` and `mapRecipeDomainToInsert` handling `grinder_settings` and legacy fallbacks.

- [ ] **Step 1: Write failing mapper unit tests in `packages/supabase/src/mappers/mappers.test.ts`**
  Add tests for:
  - Mapping a `RecipeRow` with `grinder_settings: [{ grinderId: "eq-grinder-1", setting: "5.1" }]` to domain `grinderSettings`.
  - Mapping a legacy `RecipeRow` without `grinder_settings` but with `recommended_grinder_id: "eq-ode"` and `grind_size: "Medium-Fine"` to domain `grinderSettings` fallback.
  - Mapping domain `BrewRecipe` with `grinderSettings` to `RecipeInsert`, asserting `grinder_settings` contains JSON and `recommended_grinder_id` is synced to the first grinder ID.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run packages/supabase/src/mappers/mappers.test.ts`
  Expected: FAIL on new `grinderSettings` assertions.
- [ ] **Step 3: Implement mapper logic in `packages/supabase/src/mappers/recipeMappers.ts`**
  - In `mapRecipeRowToDomain`: parse `row.grinder_settings` array if valid; if empty/missing and `row.recommended_grinder_id` exists, provide fallback array with `{ grinderId: row.recommended_grinder_id, setting: row.grind_size || '' }`.
  - In `mapRecipeDomainToInsert`: write `grinder_settings: recipe.grinderSettings || []`, and set `recommended_grinder_id: recipe.grinderSettings?.[0]?.grinderId || recipe.recommendedGrinderId || null`.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run packages/supabase/src/mappers/mappers.test.ts`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add packages/supabase/src/mappers/recipeMappers.ts packages/supabase/src/mappers/mappers.test.ts
  git commit -m "feat(supabase): map grinder_settings and sync primary recommended_grinder_id"
  ```

---

### Task 3: Web Recipe Builder Grinder Settings & Inline Creation

**Files:**
- Modify: `apps/web/src/features/recipes/RecipeBuilderModal.tsx`
- Modify: `apps/web/src/features/recipes/RecipeBuilderModal.test.tsx`

**Interfaces:**
- Consumes: `useEquipment()` from `apps/web/src/features/equipment/useEquipment.ts`, `RecipeGrinderSetting` from `@brewlog/core`
- Produces: Enhanced `RecipeBuilderModal` with grinder settings management and inline initial grinder creation.

- [ ] **Step 1: Write failing tests in `apps/web/src/features/recipes/RecipeBuilderModal.test.tsx`**
  Add tests for:
  - When user has 0 grinders in equipment, renders inline "+ Add Grinder" trigger and creation card.
  - Adding first grinder inline adds it to equipment and populates the first grinder setting row.
  - When user already has grinders, displays grinder selector and setting input, allowing adding another grinder setting.
  - Displays "Primary" badge on the first grinder row.
  - Removes a grinder row on trash click.
  - Saves recipe with `grinderSettings` payload.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -w @brewlog/web -- apps/web/src/features/recipes/RecipeBuilderModal.test.tsx`
  Expected: FAIL
- [ ] **Step 3: Implement grinder settings UI and inline creation in `RecipeBuilderModal.tsx`**
  - Import `useEquipment()`. Filter `userGrinders = equipment.filter(e => e.type === 'grinder')`.
  - Manage state `grinderSettings: RecipeGrinderSetting[]`.
  - If `userGrinders.length === 0`: render prompt with "+ Add Grinder" button that expands inline form (brand, model, settingScaleType). Submitting calls `addEquipment` and adds to `grinderSettings`.
  - If `userGrinders.length > 0`: do NOT render inline new grinder creation. Render configured rows with dropdown of `userGrinders`, setting input, primary indicator on first row, and remove button. Provide "+ Add Another Grinder" button.
  - Include `grinderSettings` in `onSaveRecipe` payload.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -w @brewlog/web -- apps/web/src/features/recipes/RecipeBuilderModal.test.tsx`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/src/features/recipes/RecipeBuilderModal.tsx apps/web/src/features/recipes/RecipeBuilderModal.test.tsx
  git commit -m "feat(web): add grinder settings and initial inline grinder creation to RecipeBuilderModal"
  ```

---

### Task 4: Web Recipe Detail Pane & Reviews Integration

**Files:**
- Modify: `apps/web/src/features/recipes/RecipeDetailPane.tsx`
- Modify: `apps/web/src/features/recipes/RecipeDetailPane.test.tsx`
- Modify: `apps/web/src/features/reviews/ReviewsView.tsx`
- Modify: `apps/web/src/features/reviews/ReviewsView.test.tsx`

**Interfaces:**
- Consumes: `recipe.grinderSettings`, `useEquipment()`
- Produces:
  - `RecipeDetailPane`: Grinder settings section with erased grinder filtering.
  - `ReviewsView`: Auto-prefill of grinder and dial setting from recipe's primary grinder.

- [ ] **Step 1: Write failing tests in `RecipeDetailPane.test.tsx` and `ReviewsView.test.tsx`**
  - In `RecipeDetailPane.test.tsx`:
    - Tests that recipe with `grinderSettings` renders grinder brand, model, and dial setting.
    - Tests that an erased grinder (grinder ID not present in equipment) is filtered out and hidden.
    - Tests fallback to general `grindSize` when no valid grinder settings exist.
  - In `ReviewsView.test.tsx`:
    - Tests that pending brew session with a recipe having `grinderSettings` pre-fills `grinderId` with primary grinder ID and `grindSetting` with primary grinder setting.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npm test -w @brewlog/web -- apps/web/src/features/recipes/RecipeDetailPane.test.tsx apps/web/src/features/reviews/ReviewsView.test.tsx`
  Expected: FAIL
- [ ] **Step 3: Implement detail pane and review integration**
  - In `RecipeDetailPane.tsx`: Consume `useEquipment()`. Filter `recipe.grinderSettings` against existing equipment grinders. Render "Grinder Settings" card showing active grinders and their dial settings. Fallback to `recipe.grindSize` if no active grinder settings.
  - In `ReviewsView.tsx`: When initializing/setting state from `pendingBrewSession`, extract `primary = pendingBrewSession.recipe.grinderSettings?.[0]`. If `primary` exists and is present in `equipment`, prefill `grinderId` with `primary.grinderId` and `grindSetting` with `primary.setting || pendingBrewSession.recipe.grindSize`.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npm test -w @brewlog/web -- apps/web/src/features/recipes/RecipeDetailPane.test.tsx apps/web/src/features/reviews/ReviewsView.test.tsx`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/src/features/recipes/RecipeDetailPane.tsx apps/web/src/features/recipes/RecipeDetailPane.test.tsx apps/web/src/features/reviews/ReviewsView.tsx apps/web/src/features/reviews/ReviewsView.test.tsx
  git commit -m "feat(web): display grinder settings on recipe detail and prefill reviews from primary grinder"
  ```

---

### Task 5: Mobile Recipe Builder Grinder Settings & Inline Creation

**Files:**
- Modify: `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.tsx`
- Modify: `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.test.tsx`

**Interfaces:**
- Consumes: `EquipmentContext` (`grinders`, `addEquipment`), `RecipeGrinderSetting`
- Produces: Enhanced mobile `RecipeBuilderScreen` supporting multi-grinder dial settings and initial inline grinder creation.

- [ ] **Step 1: Write failing tests in `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.test.tsx`**
  - Tests rendering inline "+ Add Grinder" prompt when user has 0 grinders in equipment.
  - Tests selecting existing grinders and entering dial settings when grinders exist.
  - Tests badging the first grinder as Primary.
  - Tests saving recipe with `grinderSettings` array in payload.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -w @brewlog/mobile -- apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.test.tsx`
  Expected: FAIL
- [ ] **Step 3: Implement grinder settings UI in `RecipeBuilderScreen.tsx`**
  - Consume `useContext(EquipmentContext)`.
  - State: `grinderSettings: RecipeGrinderSetting[]` initialized from `sourceRecipe?.grinderSettings || []` (or fallback from `sourceRecipe?.recommendedGrinderId`).
  - If `grinders.length === 0`: render prompt card with "+ Add Grinder" button expanding inline form (Brand, Model, Setting scale). Calling `addEquipment` appends to equipment and adds as first grinder setting row.
  - If `grinders.length > 0`: only permit selecting existing grinders. Render row list with picker/action sheet, setting input, Primary badge, and delete button. "+ Add Grinder Setting" button to add another row.
  - Include `grinderSettings` in `handleSave` payload.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -w @brewlog/mobile -- apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.test.tsx`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.tsx apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.test.tsx
  git commit -m "feat(mobile): add grinder settings and initial inline grinder creation to RecipeBuilderScreen"
  ```

---

### Task 6: Mobile Recipe Detail Screen & Brew Timer Integration

**Files:**
- Modify: `apps/mobile/src/features/recipes/screens/RecipeDetailScreen.tsx`
- Modify: `apps/mobile/src/features/recipes/screens/RecipeDetailScreen.test.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/src/features/recipes/RecipeContext.test.tsx`

**Interfaces:**
- Consumes: `recipe.grinderSettings`, `EquipmentContext`
- Produces:
  - `RecipeDetailScreen`: Grinder settings card displaying active grinders and settings while filtering erased grinders.
  - `apps/mobile/app/(tabs)/index.tsx`: Passes primary grinder ID and setting to `reviewParams`.

- [ ] **Step 1: Write failing tests in `RecipeDetailScreen.test.tsx` and `RecipeContext.test.tsx`**
  - Tests `RecipeDetailScreen` displays grinder settings and filters out erased grinders.
  - Tests timer/recipe prefill passes primary grinder and setting.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -w @brewlog/mobile -- apps/mobile/src/features/recipes/screens/RecipeDetailScreen.test.tsx`
  Expected: FAIL
- [ ] **Step 3: Implement detail card and timer prefill**
  - In `RecipeDetailScreen.tsx`: Consume `EquipmentContext`. Match `recipe.grinderSettings` against `grinders`. Filter out any erased grinders. Render "Grinder Settings" card showing brand, model, and dial setting. Fallback to `recipe.grindSize`.
  - In `apps/mobile/app/(tabs)/index.tsx`:
    ```ts
    const primaryGrinder = activeRecipe.grinderSettings?.[0];
    if (primaryGrinder?.grinderId) {
      reviewParams.grinderId = primaryGrinder.grinderId;
      reviewParams.grind = primaryGrinder.setting || activeRecipe.grindSize;
    } else {
      if (activeRecipe.recommendedGrinderId) {
        reviewParams.grinderId = activeRecipe.recommendedGrinderId;
      }
      if (activeRecipe.grindSize) {
        reviewParams.grind = activeRecipe.grindSize;
      }
    }
    ```
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npm test -w @brewlog/mobile -- apps/mobile/src/features/recipes/screens/RecipeDetailScreen.test.tsx apps/mobile/src/features/recipes/RecipeContext.test.tsx`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add apps/mobile/src/features/recipes/screens/RecipeDetailScreen.tsx apps/mobile/src/features/recipes/screens/RecipeDetailScreen.test.tsx apps/mobile/app/(tabs)/index.tsx apps/mobile/src/features/recipes/RecipeContext.test.tsx
  git commit -m "feat(mobile): display grinder settings on detail screen and prefill review from primary grinder"
  ```
