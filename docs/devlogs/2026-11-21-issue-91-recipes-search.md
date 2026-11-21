# Devlog: Issue #91 — Recipes Catalog Search Input (Web & Mobile)

**Date:** 2026-11-21
**Issue:** [#91](https://github.com/Chewieez/brewlog/issues/91)
**Design Spec:** [`docs/superpowers/specs/2026-11-21-issue-91-recipes-search-design.md`](../superpowers/specs/2026-11-21-issue-91-recipes-search-design.md)
**Implementation Plan:** [`docs/superpowers/plans/2026-11-21-issue-91-recipes-search.md`](../superpowers/plans/2026-11-21-issue-91-recipes-search.md)

## Executive Summary
Added a keyword search input with inline clear control, focus restoration on clear, and `CLEAR SEARCH` empty-state recovery to the Recipes catalog on both web (`RecipeCatalogList`) and mobile (`RecipesCatalogScreen`), backed by a shared pure `matchesRecipeSearch` helper in `@brewlog/core`. Also aligned catalog recipe card press feedback across web and mobile and polished mobile Equipment and Bean modal headers and favorite/notes controls.

## Problem Statement
Stash, Equipment, and Reviews catalogs on both web and mobile already provided keyword search alongside filter chips, whereas Recipes only offered brew-method filter pills (`FilterPills` / `MethodFilterBar`), forcing users to scan long recipe lists by eye when searching for a recipe name, author, description keyword, or method. While iterating on the catalog PR, card press feedback diverged between web and mobile (`opacity` + accent border on mobile vs. panel color/border + tactile scale on web), and several UI inconsistencies surfaced in the mobile Equipment and Bean modals (`ALL CAPS` nav titles, a boxed favorite card with an `OFF` pill and `sansMedium` label, dynamic switch accessibility labeling, and a verbose `NOTES & CALIBRATION` header).

## Architecture & Cross-Package Deliverables
- **Shared Core Search Helper (`packages/core/src/recipeSearch.ts`, exported via `packages/core/src/index.ts`):**
  - Implemented `matchesRecipeSearch(recipe: BrewRecipe, query: string): boolean`.
  - Trims, collapses internal whitespace (`.replace(/\s+/g, " ")`), and lowercases the query, treats empty/whitespace-only queries as matching all recipes, safely handles optional `author`, nullish `name`, and empty `description`, and matches both raw hyphenated `brewMethod` slugs (e.g. `"french-press"`) and space-normalized forms (e.g. `"french press"`).
- **Web (`apps/web/src/features/recipes/RecipeCatalogList.tsx`):**
  - Added a `rounded-lg` search input (`aria-label="Search recipes"`, backed by `searchInputRef`) above `FilterPills` matching `StashView.tsx`, with a `pointer-events-none` / `aria-hidden="true"` search icon and an `h-8 w-8 rounded-lg` inline clear button (`aria-label="Clear search"`) conforming to the `32px` button-sizing token scale.
  - Derived `availableMethodOptions` from the full `recipes` list so method filter pills remain stable while typing, and combined `effectiveMethodFilter` with `matchesRecipeSearch`.
  - Added a `rounded-xl` search-empty state (`data-testid="recipe-search-empty-state"`) with `<Button variant="secondary" size="sm" label="CLEAR SEARCH" />` that clears `searchQuery` and restores focus to `searchInputRef` while preserving the active method filter (and keeping the existing empty-catalog message when `recipes.length === 0`).
  - Added tactile card press feedback scoped to card navigation links (`has-[a:active]:scale-[0.99]`, `motion-reduce:has-[a:active]:scale-100`, `duration-150`, `ease-[cubic-bezier(0.23,1,0.32,1)]`) so nested Edit/Delete button presses do not scale the outer card container.
- **Mobile (`apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx` & `apps/mobile/src/features/recipes/components/RecipeCard.tsx`):**
  - Added a `minHeight: 44`, `borderRadius: 8` search bar (`accessibilityLabel="Search recipes"`, `returnKeyType="search"`) above `MethodFilterBar` with a `44x44` clear `Pressable` (`accessibilityLabel="Clear search text"`, omitting iOS `clearButtonMode` to prevent duplicate clear icons).
  - Added `keyboardShouldPersistTaps="handled"` to `ScrollView`, combined `effectiveFilter` (`'all'`, `'custom'`, or `brewMethod`) with `matchesRecipeSearch`, avoided masking search-empty states behind custom loading spinners when no custom recipes match, and rendered a `CLEAR SEARCH` recovery button that clears only the search query.
  - Updated `RecipeCard` with `Animated.View` (`testID="recipe-card-surface"`) and Reanimated CSS-like transitions (`transitionDuration: '120ms'`, `CSS_EASE_OUT` via `cubicBezier(0.23, 1, 0.32, 1)`, `useReducedMotion()` guard) transitioning to `colors.panelRecessed`, `colors.borderActive`, and `scale(0.99)` on press instead of `opacity: 0.85` / `colors.accent`.
- **Mobile Modal Polish (`apps/mobile/src/features/equipment/screens/EquipmentModalScreen.tsx` & `apps/mobile/src/features/stash/screens/BeanModalScreen.tsx`):**
  - Standardized navigation titles to Title Case (`Edit Equipment` / `New Equipment` and `Edit Bean` / `New Bean`).
  - Made the favorite gear row cardless (`minHeight: 44`) without the `FAVORITE`/`OFF` status pill, updated its label to `MARK AS FAVORITE GEAR` styled with `FONTS.monoBold` (`12px`), changed the accessibility contract to `accessibilityRole="switch"`, `accessibilityState={{ checked: isFavorite }}`, and a stable `accessibilityLabel="Mark as favorite gear"`, and simplified the notes header from `NOTES & CALIBRATION` to `NOTES`.
- **E2E Design Token Coverage (`apps/web/e2e/corner-radius-hierarchy.spec.ts`):**
  - Added assertions on `/recipes` verifying `8px` (`rounded-lg`) border radius on the search input, inline clear button, and empty-state `CLEAR SEARCH` button, plus `12px` (`rounded-xl`) border radius on `recipe-search-empty-state`.

## Accessibility & UX Safeguards
- Preserved accessible labels across platforms (`aria-label="Search recipes"`, `aria-label="Clear search"`, `accessibilityLabel="Search recipes"`, `accessibilityLabel="Clear search text"`, `accessibilityLabel="Clear search input"`).
- Restores keyboard focus to the web search input (`searchInputRef.current?.focus()`) when clearing via either `Clear search` or `CLEAR SEARCH`.
- Uses a stable `accessibilityLabel="Mark as favorite gear"` paired with `accessibilityRole="switch"` and `accessibilityState={{ checked: isFavorite }}` on mobile Equipment modals.
- Compliant with web button-sizing tokens (`32px` for inline clear and `CLEAR SEARCH` button) and mobile `44pt` touch targets.
- `CLEAR SEARCH` clears only the search query and preserves the selected brew method filter (follow-up ticket planned to align Stash/Reviews `CLEAR FILTERS` -> `CLEAR SEARCH` across the app).

## Automated Verification Evidence
Verified on code commit `ccbecd7`:
- `npm run typecheck`: Passed across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`).
- Unit tests (`npm test`):
  - `@brewlog/core`: 7 files, 94/94 passed (`recipeSearch.test.ts` 5/5)
  - `@brewlog/supabase`: 4 files, 29/29 passed
  - `@brewlog/ui`: 14 files, 81/81 passed
  - `@brewlog/mobile`: 61 files, 559/559 passed
  - `@brewlog/web`: 29 files, 300/300 passed (`RecipeCatalogList.test.tsx` 13/13)
- Playwright E2E (`npm run test:e2e`): 19 passed (11.2s), including `e2e/button-sizing-tokens.spec.ts` and `e2e/corner-radius-hierarchy.spec.ts`.
