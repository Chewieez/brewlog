# 📖 Devlog: Web Stash Persistence, Core Resting Engine & Recipe Studio Flow Alignment

- **Date**: 2026-10-01
- **Milestone**: Issue #32 Fix & Web Flow Alignment (Stash & Recipe Studio)
- **Status**: Completed & Verified ✅
- **Branch**: `fix/issue-32-bean-persistence-and-flow-alignment` (PR #33)
- **Tech Stack**: React 19.2.8, React Router v8, Tailwind CSS v4, TypeScript 5.7+, `@brewlog/core`, `@brewlog/supabase`, Vitest, Testing Library, Chrome DevTools MCP

---

## 🎯 Executive Summary

Following the mobile Phase 4 (Recipe Studio) and Phase 5 (Stash Cellar) implementations, the web application (`apps/web`) exhibited notable feature drift and persistence discrepancies:
1. **Supabase Schema Gap & Silent Sync Failure**: Remote Supabase database tables lacked newly introduced columns (`recommended_rest_days`, `is_frozen`, `frozen_date`, `is_archived`, `flavor`, etc.), causing PostgREST insertions to fail with PostgreSQL `42703` errors. Furthermore, when sync failed, pending offline items were silently wiped from local cache.
2. **Duplicated / Fragmented Resting Engine**: The pure resting status and thaw calculation logic lived exclusively inside `apps/mobile/src/features/stash/utils/restingUtils.ts`, forcing the web application to either reimplement or omit resting curves and freezer math.
3. **Web Stash Editing & Attribute Gaps**: Web's Add Bean modal lacked essential attributes (origin country, terroir, altitude, process methods, roast levels, bag presets, freezer vault toggling, and remaining weights). Bean cards lacked an `EDIT` button, and clicking `DELETE BEAN` immediately deleted records without confirmation. Editing beans also inadvertently discarded user star ratings and archive flags.
4. **Web Recipe Editing Flow Disparity (Opportunity 2)**: Users could create custom recipes on web, but could neither edit them from the catalog nor detail pane. The `RecipeBuilderModal` only supported creation mode, and `useRecipes` lacked an `updateRecipe` mutation.

This milestone resolves these disparities, promotes the resting engine to the shared `@brewlog/core` domain, hardens offline synchronization, and brings full custom recipe editing parity to the web client.

---

## 🏗️ Architecture & Changes Across Packages

### 1. Database Migrations (`@brewlog/supabase`)
- Executed migration `002_align_sca_cupping_attributes.sql` to activate missing SCA attributes (`flavor`, `uniformity`, `clean_cup`) on `cupping_sessions`.
- Executed migration `003_add_bean_cellar_status.sql` adding `recommended_rest_days`, `is_frozen`, `frozen_date`, and `is_archived` to the `beans` table in remote Supabase.

### 2. Core Domain Promotion (`@brewlog/core`)
- Promoted `calculateBeanRestingInfo` and `offsetRoastDateForThaw` into `packages/core/src/domain/stash/resting.ts`.
- Re-exported from `@brewlog/core` in `apps/mobile/src/features/stash/utils/restingUtils.ts` to preserve zero-breakage backwards compatibility.
- Added a 12-case unit test suite in `packages/core/src/restingUtils.test.ts` testing peak window thresholds, edge-case leap years, non-standard dates, freezer pauses, and thaw offsets.

### 3. Web Stash Manager (`apps/web/src/features/stash`)
- **Full Attribute Modal**: Expanded the modal with Roaster, Lot Name, Origin Country, Region, Farm, Variety, Altitude, Process Method (9 types), Roast Level (5 levels), HTML5 Date, Recommended Rest Days, Bag Presets (250g, 340g, 1kg), Remaining Weight, and Freezer Vault storage checkbox.
- **Adaptive Resting Badges**: Displays dynamic badge status (`peak`, `resting`, `aging`, `past-peak`) and frozen state (`Frozen at Day X`). Undated beans receive neutral gray badges (`bg-zinc-700 text-zinc-300`) instead of active amber "Needs Rest".
- **Freezer Thaw Offset**: Invokes `offsetRoastDateForThaw(editingBean.roastDate, editingBean.frozenDate)` when unfreezing a bean so days-off-roast accurately resume without artificial aging.
- **Bean Editing & Flag Preservation**: Added `updateBean` to `useBeans.ts` with optimistic caching. Preserves `rating`, `isFavorite`, and `isArchived` across edits.
- **Safe Deletion with Confirmation**: Added `deleteBean` in `useBeans.ts` and connected the danger-variant `ConfirmationModal` before executing deletions.
- **Offline Resilience & State Rollback**:
  - `syncedIds` tracking retains pending offline beans (`local-bean-*`) in `localStorage` on cloud insertion failures.
  - Snapshots state before optimistic mutation and reverts both React state and `localStorage` on network rejections.
- **Form Ergonomics & A11y**: Numeric inputs enforce `min="0"`, labels have `htmlFor` pairings, modal supports `Escape` key dismissal with nested confirmation isolation, strict `!== undefined` fallback ensures `0g` displays accurately, and brew buttons provide `aria-label="Brew with {bean.name}"`.

### 4. Web Recipe Studio Editing (`apps/web/src/features/recipes`)
- **`useRecipes.updateRecipe`**: Guarded against mutating built-in presets (`preset-*`), optimistically mutates local state and `brewlog_custom_recipes` cache, deletes old stages, and inserts updated stages in Supabase.
- **Atomic Rollback on Network Rejection**: Snapshots previous recipe state; if stage deletion or insertion fails, local state and `localStorage` are automatically restored and errors rethrown.
- **`RecipeBuilderModal` in Edit Mode**: Supports `initialRecipe` prop, dynamic titles ("Edit Recipe" vs "Create New Custom Recipe"), pre-filled form fields, and dynamic submit button labels ("SAVE CHANGES" vs "SAVE RECIPE").
- **Double-Invocation Prevention**:
  - Added `if (isSaving) return;` guard to `handleSubmit`.
  - Removed duplicate `onClick={handleSubmit}` on `<button type="submit">`, delegating submission solely to `<form onSubmit={handleSubmit}>`.
  - Adjusted ratio input step to `step="any"` to prevent HTML constraint validation (`stepMismatch`) on valid 2-decimal brew ratios (e.g. `16.67`).
- **Catalog & Detail Pane Integration**: Added `EDIT` action buttons to `RecipeCatalogList.tsx` and `RecipeDetailPane.tsx` (with event bubbling isolation) allowing baristas to edit recipes directly.

---

## 🧪 Quality Checks & Verification

- **TypeScript Typecheck**: Passed with 0 errors across all 5 workspaces (`npm run typecheck`).
- **Unit & Integration Tests**: 144 unit tests passing monorepo-wide across 20 test files (`npm test`), including dedicated test suites in:
  - `apps/web/src/features/stash/StashView.test.tsx` (23 tests)
  - `apps/web/src/features/stash/useBeans.test.ts` (8 tests)
  - `apps/web/src/features/recipes/RecipeBuilderModal.test.tsx` (4 tests)
  - `apps/web/src/features/recipes/useRecipes.test.ts` (11 tests)
  - `packages/core/src/restingUtils.test.ts` (12 tests)
- **Live Browser Verification (Chrome DevTools MCP)**:
  - Validated `/stash` and `/recipes` at `http://localhost:3000`.
  - Verified bean creation, pre-filled editing, thaw calculations, accessible button labels, and deletion confirmation modal prompt.
  - Verified recipe catalog method filter bar, custom recipe edit modal pre-population, and double-invocation guards.
