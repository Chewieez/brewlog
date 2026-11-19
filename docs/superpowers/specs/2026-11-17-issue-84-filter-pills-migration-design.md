# Design Spec: Migrate ReviewsView, RecipeCatalogList, and EquipmentView Filter Pills to `@brewlog/ui` `FilterPills`

**Issue:** [#84](https://github.com/Chewieez/brewlog/issues/84) (Follow-up from #65)
**Date:** 2026-11-17
**Status:** Approved

## Intent & Why

Issue #65 introduced `@brewlog/ui` `FilterPills` (`packages/ui/src/filter-pills/`) with standardized design-system sizing (`h-8` / `32px`), `rounded-lg` (`8px`) corner radius, `btn-tactile-*` tokens, `aria-pressed` semantics, `focus-visible` ring styling, and horizontal arrow-key navigation parity (`ArrowLeft`, `ArrowRight`, `Home`, `End`). The remaining web feature filter bars—`ReviewsView`, `RecipeCatalogList`, and `EquipmentView`—still render ad-hoc `<button>` loops that lack `role="group"`, `aria-pressed`, focus rings, and arrow-key navigation. Migrating all three to `FilterPills` consolidates behavior and styling into one shared primitive across the web app.

## Goals, Non-Goals, and Anti-Goals

- **Goals:**
  - Replace the local `<button>` loop (`METHOD_FILTERS`) in `apps/web/src/features/reviews/ReviewsView.tsx` with `@brewlog/ui` `FilterPills` (`size="sm"`, `ariaLabel="Filter reviews by brew method"`, `testID="reviews-method-filters"`).
  - Replace the local `<button>` loop (`METHODS`) in `apps/web/src/features/recipes/RecipeCatalogList.tsx` with `@brewlog/ui` `FilterPills` (`size="sm"`, `ariaLabel="Filter recipes by brew method"`, `testID="recipe-method-filters"`).
  - Replace the local `<button>` loop (`CATEGORIES`) in `apps/web/src/features/equipment/EquipmentView.tsx` with `@brewlog/ui` `FilterPills` (`size="sm"`, `ariaLabel="Filter equipment by category"`, `testID="equipment-category-filters"`).
  - Use clean Title Case labels (`All`, `V60`, `AeroPress`, `Flair`, `Chemex`, `French Press`, `Kalita Wave`) in `RecipeCatalogList` while keeping `FilterPillsOption.value` (`'all'`, `'v60'`, `'aeropress'`, `'flair'`, `'chemex'`, `'french-press'`, `'kalita-wave'`) and `RecipeCatalogListProps` (`selectedMethodFilter: string`, `onSelectMethodFilter: (method: string) => void`) unchanged for `RecipesRoute.tsx` compatibility.
  - Add unit tests verifying keyboard parity (`Tab`, `Enter`, `Space`, `ArrowLeft`, `ArrowRight`, `Home`, `End`), `role="group"`, and `aria-pressed` in `ReviewsView.test.tsx`, `RecipeCatalogList.test.tsx`, and `EquipmentView.test.tsx`.
  - Keep all existing unit tests and Playwright E2E design token gates (`button-sizing-tokens.spec.ts`, `corner-radius-hierarchy.spec.ts`) green.
- **Non-Goals:**
  - Do not modify `packages/ui/src/filter-pills/` (`FilterPills.web.tsx`, `FilterPills.native.tsx`, `FilterPills.types.ts`) or add per-screen override props.
  - Do not migrate `RecipeCatalogList.tsx` or `EquipmentView.tsx` to dynamic active-only pills in this issue (tracked in [#89](https://github.com/Chewieez/brewlog/issues/89)); `ReviewsView.tsx` dynamically shows only methods present in `logs` (plus `All`) and hides the bar when `<= 1` option exists.
- **Anti-Goals:**
  - Do not reintroduce bespoke `<button>` filter loops or per-page CSS overrides for `ReviewsView` (the shared `FilterPills` `font-mono uppercase tracking-wider` typography and `sm:flex-wrap` wrapping are intentional design-system standardization).
  - Do not break existing accessible-name selectors used in E2E and unit tests (`"All"` exact in `corner-radius-hierarchy.spec.ts` on `/reviews` and `/equipment`, `/^all$/i` on `/recipes`, `/^AeroPress$/i` in `ReviewsView.test.tsx`).

## Constraints

- All three views use `size="sm"` (`h-8`, `32px` height) and `rounded-lg` (`8px` radius), matching `button-sizing-tokens.spec.ts` and `corner-radius-hierarchy.spec.ts`.
- `ReviewsView` preserves its existing `'other'` filter matching semantics (`!EXPLICIT_FILTER_METHODS.has(method)`).
- Respect repository rules: zero emoji in code, tests, docs, or commits; preserve unrelated comments/docstrings; update `README.md`, `docs/ROADMAP.md`, and add a dated devlog under `docs/devlogs/` before PR completion.

## Approaches Considered

1. **Direct Adoption of `FilterPills` as-is — Picked:** Drop `<FilterPills size="sm" ... />` directly into `ReviewsView.tsx`, `RecipeCatalogList.tsx`, and `EquipmentView.tsx` using the existing `@brewlog/ui` contract. On desktop, `ReviewsView`'s 8 method pills wrap cleanly (`sm:flex-wrap`) inside the 38% master pane with `p-1 -m-1` focus-ring clearance instead of clipping in a horizontal scroll strip, and adopt `font-mono uppercase tracking-wider` to match `StashView`, `RecipeCatalogList`, and `EquipmentView`.
2. **Extend `FilterPills` with layout/typography override props — Rejected:** Adds unnecessary API surface across `.web.tsx` and `.native.tsx` just to preserve ad-hoc `font-sans` / non-wrapping divergence in `ReviewsView`, working against design-system consolidation.
