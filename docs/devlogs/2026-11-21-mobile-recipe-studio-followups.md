# Devlog: Mobile Recipe Studio Follow-Up Fixes

**Date:** 2026-11-21
**Branch:** `fix/mobile-recipe-studio-followups`
**Base:** `main` (following up on [Phase 4 Devlog](./2026-09-21-phase-4-mobile-recipe-studio.md))

---

## Executive Summary & Problem Statement

Seven post-PR #6 review-fix commits on the local `feature/mobile-recipe-studio` branch (`4f3f537..17091fc`) were never pushed before PR #6 merged `c5164ec` into `main`. Because `main` had since evolved significantly (dynamic theming via `@brewlog/ui` `makeStyles`/`useTheme`, Sentry `captureSyncError` telemetry, `SegmentedControl` timer modes, and `KeyboardAwareScrollView` form containers), those fixes were audited against current `main` and the remaining unmerged gaps were cleanly re-integrated onto `main` patterns.

---

## Deliverables & Integrated Fixes

### 1. Controlled Input & Numeric State Hardening
- **`DoseRescaler.tsx`**: Replaced uncontrolled `defaultValue` + `key={String(currentDose)}` remounting with local `doseText` string state synced via `useEffect`, committing valid `1g`–`100g` entries and reverting invalid/out-of-bounds values to `currentDose` on blur/end-editing.
- **`RecipeBuilderScreen.tsx` (`StageCardItem`)**: Extracted `StageCardItem` with local `durationText` and `waterText` string state so decimal keystrokes (`50.`) and temporary empty values do not immediately snap to `0`, restoring the last valid stage value on blur. Switched newly added stage IDs to `crypto.randomUUID()` (with fallback).
- **`RecipeDetailScreen.tsx`**: Removed `Math.round` from initial `customDose` and `<DoseRescaler baseDose={...} />` so decimal doses are preserved, and added a `useEffect` synchronizing `customDose` when `recipe?.coffeeDoseGrams` updates after editing.

### 2. Cloud Stage Integrity & Preset Mutation Guards (`RecipeContext.tsx`, `RecipeBuilderScreen.tsx`)
- **Offline Sync & Orphan Prevention**: `fetchRecipes` now marks an offline `local-rec-*` recipe as synced only when `recipe_stages` insertion succeeds and preserves cached local stages if a cloud row returns empty `recipe_stages`. `addRecipe` cleans up orphaned parent `recipes` rows and returns the local `fallback` when `recipe_stages` insertion fails or returns empty.
- **Built-in Preset Edit Guard**: `RecipeContext.updateRecipe` now throws an `Error` on built-in preset IDs, and `RecipeBuilderScreen` automatically pivots a preset `editId` (`preset-*` or matching `DEFAULT_PRESET_RECIPES`) into duplicate mode (`Duplicate Recipe`, `(Copy)` name suffix, `addRecipe` on save).

### 3. Active Brew Guard, Timer Reset Synchronization & Hydration Spinners
- **`RecipeContext.tsx` & `app/(tabs)/index.tsx`**: Added `isBrewActive`, `setIsBrewActive`, and `timerResetTrigger` to `RecipeContext`. `TimerScreen` syncs active-brew state (resetting to `false` on unmount) and resets the timer when `timerResetTrigger` increments (excluding inline `handleApplyDose` / `handleApplyWater` adjustments via `{ skipReset: true }`). Deleting the active timer recipe in `deleteRecipe` also increments `timerResetTrigger`.
- **`RecipeDetailScreen.tsx` & `RecipesCatalogScreen.tsx`**: Guarded `handleBrew` with an `Alert.alert` confirmation prompt when `isBrewActive` is `true`, and rendered `ActivityIndicator` hydration states (`recipe-detail-loading`, `recipe-catalog-loading`) when loading with no available items.

---

## Safeguards
- Preserved `main`'s dynamic theme architecture (`makeStyles`, `useTheme`), Sentry `captureSyncError` instrumentation, `{ pathname: '/(tabs)', params: { mode: 'recipe' } }` timer handoff routing, and `initialValues`/`isDirty` dirty-form tracking.
- Added `{ skipReset: true }` option on `setActiveTimerRecipe` for inline `TimerHero` dose/water adjustments so idle adjustments do not trigger extra `reset()` haptic feedback.

---

## Verification Evidence
- `npm --prefix apps/mobile run typecheck`: Passed (0 errors).
- `npm --prefix apps/mobile test`: Passed — **61 test files passed (61), 541 tests passed (541)**, including updated/added assertions in:
  - `src/features/recipes/components/DoseRescaler.test.tsx` (6 tests)
  - `src/features/recipes/RecipeContext.test.tsx` (21 tests)
  - `src/features/recipes/screens/RecipeBuilderScreen.test.tsx` (33 tests)
  - `src/features/recipes/screens/RecipeDetailScreen.test.tsx` (15 tests)
  - `src/features/recipes/screens/RecipesCatalogScreen.test.tsx` (7 tests)
  - `__tests__/tabs/index.test.tsx` (15 tests)
