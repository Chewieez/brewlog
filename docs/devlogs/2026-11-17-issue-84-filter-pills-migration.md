# Devlog: Migrate ReviewsView and RecipeCatalogList Filter Pills to `@brewlog/ui` `FilterPills` (Issue #84)

- **Date**: 2026-11-17
- **Issue**: [#84](https://github.com/Chewieez/brewlog/issues/84) (Follow-up from [#65](https://github.com/Chewieez/brewlog/issues/65))
- **Branch**: `Chewieez/84-refactor-reviewsview-and-recipecatalogli`
- **Status**: Completed & Verified
- **Tech Stack**: React 19.3, TypeScript, `@brewlog/ui`, Vitest, Playwright

---

## Executive Summary

Following Issue #65's introduction of `@brewlog/ui` `FilterPills`, two web feature views (`apps/web/src/features/reviews/ReviewsView.tsx` and `apps/web/src/features/recipes/RecipeCatalogList.tsx`) still rendered ad-hoc `<button>` loops for brew-method filter bars. Those local loops lacked `role="group"`, `aria-pressed`, `focus-visible` ring styling, and horizontal arrow-key navigation parity. Both views were migrated directly onto `@brewlog/ui` `FilterPills` (`size="sm"`), standardizing sizing (`h-8` / `32px`), corner radius (`rounded-lg` / `8px`), typography (`font-mono uppercase tracking-wider`), ARIA semantics, and keyboard focus navigation.

---

## Architecture & Deliverables

### 1. `ReviewsView.tsx` (`apps/web/src/features/reviews/ReviewsView.tsx`)
- Replaced `METHOD_FILTERS` (`{ id, label }`) and its local `<button>` loop with `METHOD_FILTER_OPTIONS: FilterPillsOption<ReviewMethodFilter>[]` and `<FilterPills<ReviewMethodFilter> size="sm" value={selectedMethodFilter} onChange={setSelectedMethodFilter} options={METHOD_FILTER_OPTIONS} ariaLabel="Filter reviews by brew method" testID="reviews-method-filters" />`.
- Preserved the `'other'` filter bucket semantics (`!['v60', 'aeropress', 'chemex', 'espresso', 'french-press', 'kalita-wave'].includes(method)`).
- Standardized the bar onto `FilterPills`'s `sm:flex-wrap` wrapping and `p-1 -m-1` focus-ring clearance instead of a horizontally clipped single-row strip.

### 2. `RecipeCatalogList.tsx` (`apps/web/src/features/recipes/RecipeCatalogList.tsx`)
- Replaced `METHODS` (`string[]`) and its inline `<button>` loop with `METHOD_FILTER_OPTIONS: FilterPillsOption<string>[]` and `<FilterPills size="sm" value={selectedMethodFilter} onChange={onSelectMethodFilter} options={METHOD_FILTER_OPTIONS} ariaLabel="Filter recipes by brew method" testID="recipe-method-filters" />`.
- Mapped hyphenated method slugs (`'french-press'`, `'kalita-wave'`) to Title Case accessible labels (`'French Press'`, `'Kalita Wave'`) while keeping exact `BrewMethodType` slug values and preserving `RecipeCatalogListProps` (`selectedMethodFilter: string`, `onSelectMethodFilter: (method: string) => void`) for `RecipesRoute.tsx` compatibility.

### 3. Accessibility & Keyboard Parity Tests
- Updated `apps/web/src/features/reviews/ReviewsView.test.tsx` to verify `role="group"`, `aria-pressed`, `'other'` bucket and `'all'` reset filtering, `ArrowLeft`/`ArrowRight`/`Home`/`End` focus wrapping, and non-blocked `Tab`/`Enter`/`Space` keys.
- Updated `apps/web/src/features/recipes/RecipeCatalogList.test.tsx` to verify `role="group"`, `aria-pressed`, hyphenated slug mapping (`'french-press'`, `'kalita-wave'`), empty-list visibility, and `Tab`/`Enter`/`Space`/`ArrowLeft`/`ArrowRight`/`Home`/`End` keyboard parity.
- Added `"Recipes & Reviews: FilterPills support keyboard navigation and activation"` in `apps/web/e2e/context-features.spec.ts` to verify real browser arrow-key wrapping, `Enter`/`Space` selection, and `Tab` exit on both `/recipes` and `/reviews`.

---

## Automated Test & Verification Evidence

- **Typecheck (`npm run typecheck`)**: Passed across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`).
- **Unit Tests (`npm test`)**:
  - `@brewlog/core`: 6 files, 89 tests passed
  - `@brewlog/supabase`: 4 files, 29 tests passed
  - `@brewlog/ui`: 14 files, 81 tests passed
  - `@brewlog/mobile`: 59 files, 510 tests passed
  - `@brewlog/web`: 29 files, 294 tests passed (including 24 tests in `ReviewsView.test.tsx` and 10 tests in `RecipeCatalogList.test.tsx`)
- **Playwright E2E (`npm run test:e2e --workspace=@brewlog/web`)**: 19/19 tests passed, including `button-sizing-tokens.spec.ts`, `corner-radius-hierarchy.spec.ts`, `context-features.spec.ts`, and `smoke.spec.ts`.
