# Devlog: Issue #88 — Align Review Detail, Card, and Catalog Layout Order Across Mobile and Web

- **Date:** 2026-11-21
- **Issue:** [#88](https://github.com/Chewieez/brewlog/issues/88)
- **Branch:** `Chewieez/88-ui-mobile-web-align-review-detail-card-a`
- **Design Spec:** [`docs/superpowers/specs/2026-11-21-issue-88-align-review-detail-card-catalog-design.md`](../superpowers/specs/2026-11-21-issue-88-align-review-detail-card-catalog-design.md)
- **Implementation Plan:** [`docs/superpowers/plans/2026-11-21-issue-88-align-review-detail-card-catalog.md`](../superpowers/plans/2026-11-21-issue-88-align-review-detail-card-catalog.md)

---

## Executive Summary

Mobile (`apps/mobile`) and Web (`apps/web`) previously presented the Reviews subsystem with divergent section ordering, mismatched SCA tier terminology (`Commercial` vs `Below Specialty`), missing feed card notes on Web, cluttered header badges on Web `ReviewDetailPane`, an unused `ReviewsSummaryBar` on Mobile, and missing `Brew Again` + Flavor Wheel inspection on Mobile `ReviewDetailScreen`.

This milestone standardizes all three Review surfaces around a **Web-led hierarchy** backed by shared pure domain utilities in `@brewlog/core`, while preserving platform-appropriate ergonomics (sticky side-by-side header actions on Web vs. a dedicated primary `BREW AGAIN` CTA under the header and bottom `Edit`/`Delete` actions on Mobile).

---

## Architecture & Cross-Package Deliverables

### 1. Shared Domain Helpers (`packages/core/src/reviewsUtils.ts`)
- Added `getScaTierInfo(score)` unifying the 90 / 85 / 80 SCA specialty tier thresholds (`Outstanding`, `Excellent`, `Very Good`, `Commercial`) across Web and Mobile.
- Added `getAvailableReviewMethodOptions(logs)` and `matchesReviewMethodFilter(log, filter)` so both platforms derive dynamic `"All"` + present-method pills with curated labels and hyphen-split fallbacks (retiring Web's lossy `"Other"` bucket and Mobile's `"All Methods"` label).
- Added `getAvailableRatingFilterOptions(logs)`, `matchesReviewRatingFilter(log, filter)`, and `matchesReviewSearch(log, query)` for shared star-rating filtering (`All Ratings`, `5 Stars`, `4+ Stars`) and case-insensitive search across coffee name, roaster, notes, and flavor tags.

### 2. Review Feed Cards (`apps/web/src/features/reviews/ReviewCard.tsx` & `apps/mobile/src/features/reviews/components/ReviewCard.tsx`)
- Extracted Web's inline card markup from `ReviewsView.tsx` into `ReviewCard.tsx`.
- Aligned both Web and Mobile `ReviewCard` to the same 5-part visual hierarchy:
  1. **Header Row:** Star rating (`★ N`) + numeric SCA score & tier badge (`getScaTierInfo`).
  2. **Identity:** Coffee name & roaster.
  3. **Flavor Tags:** Up to 3 chips + `+N` overflow indicator.
  4. **Notes Snippet:** 2-line italic preview (`line-clamp-2` / `numberOfLines={2}`) when `notes` is non-empty.
  5. **Telemetry Footer:** Method badge • `dose:water` • brew duration on left; localized `brewDate` on right.
- Dropped the redundant Equipment Snapshot row from Mobile `ReviewCard` (kept in Detail).

### 3. Review Detail & Editor (`ReviewDetailPane.tsx`, `ReviewDetailScreen.tsx`, & `ReviewsView.tsx`)
- **Unified Single-Sheet Hierarchy & Title-First Header:** Both Web `ReviewDetailPane.tsx` and Mobile `ReviewDetailScreen.tsx` present Review Detail as a single cohesive container with section dividers instead of fragmented boxed cards, leading with the coffee title above muted `Roaster • Method • Date` metadata and moving `Would Brew Again` cleanly into the Hero Score Banner alongside the 5-star rating.
- **Web Editor Rating Streamlining (`ReviewsView.tsx`):** Moved the `Would brew again` toggle up into the top Hero Rating Banner during review creation/editing and removed the duplicate bottom overall rating row.
- **Mobile (`apps/mobile/src/features/reviews/screens/ReviewDetailScreen.tsx`, `ScaFlavorWheelSvg.tsx`, `ScaAttributeScoring.tsx`, `RecipeContext.tsx`):**
  - Reordered `ReviewDetailScreen` to the canonical 6-section hierarchy inside one unified sheet: Title-First Header -> primary `BREW AGAIN` CTA -> Hero Score & Tier Banner (with stars & `Would Brew Again`) -> Sensory Profile (`Descriptors` / `Wheel` `@brewlog/ui` `SegmentedControl`) -> 10-Attribute SCA Score Matrix -> Brew Parameters & Equipment -> Cupper's Tasting Notes -> `EDIT REVIEW` / `DELETE` footer.
  - Added `readOnly` prop to Mobile `ScaFlavorWheelSvg.tsx` so tapping flavor slices in Detail inspects descriptors without displaying `ADD`/`REMOVE` buttons.
  - Added `hideSummaryHero` prop to `ScaAttributeScoring.tsx` so Detail omits the duplicate inner `SCA SENSORY TOTAL` card while `ReviewModalScreen.tsx` retains its live scoring header during edits.
  - Exported `useOptionalRecipes` from `RecipeContext.tsx` and implemented `BREW AGAIN` timer handoff (matching linked/snapshot bean and recipe, preserving `isBrewActive` reset confirmation, and navigating to `/(tabs)` with `mode: 'recipe'`).

### 4. Reviews Catalog (`ReviewsView.tsx` & `ReviewsCatalogScreen.tsx`)
- Removed `ReviewsSummaryBar` from `ReviewsCatalogScreen.tsx` and deleted unused `ReviewsSummaryBar.tsx` / `ReviewsSummaryBar.test.tsx`.
- Aligned both catalogs to consume `@brewlog/core` search, method, and rating filter helpers (`"All"` method prefix, auto-hidden `FilterPills` when `<= 1` option qualifies, synchronous `effective*` fallback + `useEffect` reset).
- Added inline `Clear search` (`h-8 w-8 rounded-lg`) and `CLEAR FILTERS` empty-state recovery on Web `ReviewsView.tsx` alongside `reviews-rating-filters`.

### 5. Shared Web `ModalShell` Unification (`apps/web/src/components/shared/ModalShell.tsx`)
- Extracted `ModalShell.tsx` (`max-h-[90vh] flex flex-col overflow-hidden rounded-xl`) with a `shrink-0` pinned header (icon badge, title, optional subtitle, `X` close button), optional pinned alert banner, independently scrollable `flex-1 min-h-0 overflow-y-auto` form body, and `shrink-0` pinned footer (`border-t`).
- Migrated all six Web dialogs (`RecipeBuilderModal.tsx`, `StashView.tsx` Add/Edit Bean modal, `EquipmentView.tsx` Add/Edit Equipment modal, `ConfirmationModal.tsx`, `ReviewDetailPane.tsx` delete confirmation via `ConfirmationModal`, and `AuthModal.tsx`) onto `ModalShell`, eliminating scroll drift and header-overlap clipping.

---

## Safeguards & Accessibility

- **Snapshot Precedence:** `beanNameSnapshot` and `roasterSnapshot` remain authoritative in Detail and Cards, with safe fallbacks (`Specialty Coffee`, `Artisan Roaster`) when empty.
- **Web Design Token Gates:** Web search clear button (`h-8 w-8`, `rounded-lg`), `CLEAR FILTERS` (`size="sm"` = `32px`), `ReviewCard` (`rounded-xl`), and `FilterPills` spacing (`>= 12px` above first feed card) conform to existing Playwright E2E assertions.
- **Mobile Touch Targets & Hook Safety:** Primary `BREW AGAIN`, `EDIT REVIEW`, and `DELETE` `Pressable` controls maintain `minHeight: 44`; all hooks in `ReviewDetailScreen` execute unconditionally before loading/not-found returns.

---

## Automated Verification Evidence

- **Monorepo Typecheck (`npm run typecheck`):** Passed with 0 errors across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`).
- **Monorepo Unit Tests (`npm run test`):** 117 test files, **1,082 tests passed**, 0 failures:
  - `@brewlog/core`: 8 files, 102/102 passed (including 8 new tests in `reviewsUtils.test.ts`)
  - `@brewlog/supabase`: 4 files, 29/29 passed
  - `@brewlog/ui`: 14 files, 81/81 passed
  - `@brewlog/mobile`: 61 files, 559/559 passed (including `ReviewCard.test.tsx`, `ReviewDetailScreen.test.tsx`, `ReviewsCatalogScreen.test.tsx`, `ScaFlavorWheelSvg.test.tsx`, `ScaAttributeScoring.test.tsx`)
  - `@brewlog/web`: 30 files, 311/311 passed (including `ReviewCard.test.tsx`, `ReviewDetailPane.test.tsx`, `ReviewsView.test.tsx`, `RecipeBuilderModal.test.tsx`, `StashView.test.tsx`, `EquipmentView.test.tsx`, `ConfirmationModal.test.tsx`, `AuthModal.test.tsx`)
- **Playwright E2E (`npm run test:e2e`):** **19/19 passed**, covering `button-sizing-tokens.spec.ts`, `corner-radius-hierarchy.spec.ts`, `context-features.spec.ts` (including `reviews-method-filters` and `reviews-rating-filters` spacing and keyboard navigation), and `smoke.spec.ts`.
