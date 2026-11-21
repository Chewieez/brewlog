# Devlog: Issue #89 — Mobile `@brewlog/ui` `FilterPills` Adoption & Dynamic Active Filter Tags

**Date:** 2026-11-20
**Issue:** [#89](https://github.com/Chewieez/brewlog/issues/89)
**PR:** [#93](https://github.com/Chewieez/brewlog/pull/93)
**Design Spec:** [`docs/superpowers/specs/2026-11-20-filter-pills-adoption-design.md`](../superpowers/specs/2026-11-20-filter-pills-adoption-design.md)
**Implementation Plan:** [`docs/superpowers/plans/2026-11-20-filter-pills-adoption.md`](../superpowers/plans/2026-11-20-filter-pills-adoption.md)

## Executive Summary
Migrated all four mobile catalog filter bars onto the shared `@brewlog/ui` `FilterPills` primitive (`FilterPills.native.tsx`) and standardized dynamic active-only filter tags across mobile catalogs and web `EquipmentView`, matching the behavior already established in web `StashView`, `ReviewsView`, and `RecipeCatalogList`.

## Problem Statement
1. Mobile catalog screens (`StashCatalogScreen`, `MethodFilterBar`, `EquipmentCatalogScreen`, `ReviewsCatalogScreen`) still rendered bespoke `ScrollView`/`View` + `Pressable` filter loops instead of `@brewlog/ui` `FilterPills`, causing duplicated chip styling, inconsistent touch-target workarounds (`hitSlop` on Reviews), and dead filter pills for categories/methods/processes with zero items.
2. On web, `EquipmentView.tsx` still rendered a static `CATEGORY_FILTER_OPTIONS` list even when equipment was empty or only a subset of categories was populated.

## Architecture & Cross-Package Deliverables
- **Stateless Primitive Preserved (`@brewlog/ui`):** Kept `FilterPills` stateless with zero public API changes. Each catalog screen derives `availableOptions` via `useMemo`, computes `effectiveFilter` synchronously on the same render pass (preventing one-frame empty flashes), syncs state via `useEffect`, and hides `<FilterPills>` when `availableOptions.length <= 1`.
- **Mobile (`apps/mobile`):**
  - `StashCatalogScreen.tsx`: Replaced bespoke process chips with `<FilterPills testID="stash-process-filters" />`, deriving present processes (`washed`, `natural`, `honey`, `anaerobic` including `anaerobic-*` sub-processes) from `currentShelfBeans` with automatic reset on shelf switch.
  - `MethodFilterBar.tsx` & `RecipesCatalogScreen.tsx`: Replaced bespoke method pills with `<FilterPills testID="recipe-method-filters" />`, showing `CUSTOM` only when non-preset custom recipes exist, hiding when `<= 1` option, and auto-resetting `selectedFilter` when an active filter disappears.
  - `EquipmentCatalogScreen.tsx`: Replaced bespoke category chips with `<FilterPills testID="equipment-category-filters" />`, deriving present categories from `equipment` with `<= 1` hiding and auto-reset.
  - `ReviewsCatalogScreen.tsx`: Replaced both bespoke Method and Rating chip rows with `<FilterPills testID="reviews-method-filters" />` and `<FilterPills testID="reviews-rating-filters" />` (removing the `hitSlop` workaround in favor of `FilterPills.native`'s built-in `minHeight: 44`). Method pills derive dynamically from `reviews` with curated labels plus formatted fallbacks (`formatFallbackMethodLabel`); Rating pills (`5 Stars`, `4+ Stars`) dynamically hide when no reviews qualify and auto-reset on dataset changes.
- **Web (`apps/web`):**
  - `EquipmentView.tsx`: Added `availableCategoryOptions` derivation from `equipment`, `effectiveCategory` synchronous fallback, `useEffect` state reset, and conditional rendering when `availableCategoryOptions.length > 1`.
  - Updated `EquipmentView.test.tsx` and `e2e/context-features.spec.ts` to verify dynamic category visibility, hiding when empty, keyboard parity, and auto-reset.

## Accessibility & UX Safeguards
- Preserved all screen-reader `Filter by ...` accessibility labels via `FilterPillsOption.accessibilityLabel`.
- `ReviewsCatalogScreen` gains proper `accessibilityState={{ selected }}` and `minHeight: 44` touch targets via `FilterPills.native.tsx`.
- Synchronous `effective*` filter fallback guarantees no single-frame empty state flash when switching shelves or deleting the last item in a filtered bucket.

## Automated Verification Evidence
- `npm run typecheck`: Passed across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`).
- Unit tests (`npm run test`):
  - `@brewlog/core`: 6 files, 89/89 passed
  - `@brewlog/supabase`: 4 files, 29/29 passed
  - `@brewlog/ui`: 14 files passed
  - `@brewlog/mobile`: 61 files, 538/538 passed
  - `@brewlog/web`: 29 files, 297/297 passed
- Playwright E2E (`npm run test:e2e`): 19/19 passed (9.4s).
