# Devlog: Issue #91 — Recipes Catalog Search Input (Web & Mobile)

**Date:** 2026-11-21
**Issue:** [#91](https://github.com/Chewieez/brewlog/issues/91)
**Design Spec:** [`docs/superpowers/specs/2026-11-21-issue-91-recipes-search-design.md`](../superpowers/specs/2026-11-21-issue-91-recipes-search-design.md)
**Implementation Plan:** [`docs/superpowers/plans/2026-11-21-issue-91-recipes-search.md`](../superpowers/plans/2026-11-21-issue-91-recipes-search.md)

## Executive Summary
Added a keyword search input with inline clear control and `CLEAR SEARCH` empty-state recovery to the Recipes catalog on both web (`RecipeCatalogList`) and mobile (`RecipesCatalogScreen`), backed by a shared pure `matchesRecipeSearch` helper in `@brewlog/core`.

## Problem Statement
Stash, Equipment, and Reviews catalogs on both web and mobile already provided keyword search alongside filter chips, whereas Recipes only offered brew-method filter pills (`FilterPills` / `MethodFilterBar`), forcing users to scan long recipe lists by eye when searching for a recipe name, author, description keyword, or method.

## Architecture & Cross-Package Deliverables
- **Shared Core Search Helper (`packages/core/src/recipeSearch.ts`, exported via `packages/core/src/index.ts`):**
  - Implemented `matchesRecipeSearch(recipe: BrewRecipe, query: string): boolean`.
  - Trims and lowercases the query, treats empty/whitespace-only queries as matching all recipes, safely handles optional `author` and empty `description`, and matches both raw hyphenated `brewMethod` slugs (e.g. `"french-press"`) and space-normalized forms (e.g. `"french press"`).
- **Web (`apps/web/src/features/recipes/RecipeCatalogList.tsx`):**
  - Added a `rounded-lg` search input (`aria-label="Search recipes"`) above `FilterPills` matching `StashView.tsx`, with an `h-8 w-8 rounded-lg` inline clear button (`aria-label="Clear search"`) conforming to the `32px` button-sizing token scale.
  - Derived `availableMethodOptions` from the full `recipes` list so method filter pills remain stable while typing, and combined `effectiveMethodFilter` with `matchesRecipeSearch`.
  - Added a `rounded-xl` search-empty state with `<Button variant="secondary" size="sm" label="CLEAR SEARCH" />` that resets `searchQuery` while preserving the active method filter (and keeping the existing empty-catalog message when `recipes.length === 0`).
- **Mobile (`apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx`):**
  - Added a `minHeight: 44`, `borderRadius: 8` search bar (`accessibilityLabel="Search recipes"`, `returnKeyType="search"`) above `MethodFilterBar` with a `44x44` clear `Pressable` (`accessibilityLabel="Clear search text"`, omitting iOS `clearButtonMode` to prevent duplicate clear icons).
  - Added `keyboardShouldPersistTaps="handled"` to `ScrollView`, combined `effectiveFilter` (`'all'`, `'custom'`, or `brewMethod`) with `matchesRecipeSearch`, and rendered a `CLEAR SEARCH` recovery button when search yields zero matches while preserving the active method filter.
- **E2E Design Token Coverage (`apps/web/e2e/corner-radius-hierarchy.spec.ts`):**
  - Added assertions on `/recipes` verifying `8px` (`rounded-lg`) border radius on the search input, inline clear button, and empty-state `CLEAR SEARCH` button.

## Accessibility & UX Safeguards
- Preserved accessible labels across platforms (`aria-label="Search recipes"`, `aria-label="Clear search"`, `accessibilityLabel="Search recipes"`, `accessibilityLabel="Clear search text"`, `accessibilityLabel="Clear search input"`).
- Compliant with web button-sizing tokens (`32px` for inline clear and `CLEAR SEARCH` button) and mobile `44pt` touch targets.
- `CLEAR SEARCH` clears only the search query and preserves the selected brew method filter (follow-up ticket planned to align Stash/Reviews `CLEAR FILTERS` -> `CLEAR SEARCH` across the app).

## Automated Verification Evidence
- `npm run typecheck`: Passed across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`).
- Unit tests (`npm test`):
  - `@brewlog/core`: 7 files, 94/94 passed (`recipeSearch.test.ts` 5/5)
  - `@brewlog/supabase`: 4 files, 29/29 passed
  - `@brewlog/ui`: 14 files, 81/81 passed
  - `@brewlog/mobile`: 61 files, 556/556 passed (`RecipesCatalogScreen.test.tsx` 11/11)
  - `@brewlog/web`: 29 files, 300/300 passed (`RecipeCatalogList.test.tsx` 13/13)
- Playwright E2E (`npm run test:e2e`): 19/19 passed (8.8s), including `e2e/button-sizing-tokens.spec.ts` and `e2e/corner-radius-hierarchy.spec.ts`.
