# Issue #89: Adopt `@brewlog/ui` `FilterPills` on Mobile & Dynamic Active Filter Tags

**Date:** 2026-11-20
**Size:** Small change

## Intent & Why
Unify mobile catalog filter bars onto the shared `@brewlog/ui` `FilterPills` primitive (`FilterPills.native.tsx`) and eliminate empty/dead filter tags across mobile and web catalogs by only showing filter options present in the active dataset.

## Goals
- Replace bespoke `ScrollView`/`View` + `Pressable` filter chip loops on mobile (`StashCatalogScreen`, `MethodFilterBar`, `EquipmentCatalogScreen`, `ReviewsCatalogScreen`) with `@brewlog/ui` `FilterPills`.
- Apply consistent dynamic option filtering across all target catalogs (4 mobile screens + web `EquipmentView`; web `StashView`, `ReviewsView`, and `RecipeCatalogList` already implement this):
  - Show only options matching at least one item in the active dataset, prefixed with the `All` option.
  - Hide the filter bar when `availableOptions.length <= 1`.
  - Compute `effectiveFilter` synchronously (falling back to `'all'` if the selected option disappears) and sync state via `useEffect` to avoid empty-frame flashes.
- Keep all mobile/web unit tests, E2E tests, and typechecks green, updating tests that asserted old static behavior or `hitSlop` workarounds.

## Non-Goals & Anti-Goals
- Do not modify `@brewlog/ui`'s `FilterPills` API or bake state-reset side effects into the primitive.
- Do not refactor the 3 web views (`StashView`, `ReviewsView`, `RecipeCatalogList`) that already implement dynamic `FilterPills`.
- Do not change existing search input or empty-state copy/behavior outside of filter option derivation.

## Constraints
- Preserve existing accessibility labels (`Filter by ...`) where tests or screen readers rely on them, using `FilterPillsOption.accessibilityLabel`.
- `FilterPills.native.tsx` natively provides `minHeight: 44` (and `48` for `md`) with uppercase monospace labels, removing the need for per-screen chip styles or `hitSlop` hacks.
- `MethodFilterBar` keeps its horizontal `paddingHorizontal: 16` / `paddingVertical: 8` wrapper layout inside `RecipesCatalogScreen`.

## Approaches Considered
- **Approach A — Screen-local derivation matching existing web views (Selected):** Keep `FilterPills` stateless; each of the 5 target screens derives `availableOptions`, `effectiveFilter`, and `useEffect` reset locally, matching `StashView`, `ReviewsView`, and `RecipeCatalogList`. Chosen for zero public API churn in `@brewlog/ui` and clean per-catalog matching predicates.
- **Approach B — Shared `useFilterSelection` hook in `@brewlog/ui`:** Extracts `effectiveValue` + `useEffect` reset into a shared hook exported from `@brewlog/ui`. Rejected to avoid expanding `@brewlog/ui` surface area and churning 3 already-working web views.
- **Approach C — Auto-reset inside `FilterPills`:** Rejected because parent screens still need `effectiveValue` on the same render pass to avoid a one-frame empty flash.

## Screen-by-Screen Decisions
- **Mobile `StashCatalogScreen`:** Derive present processes (`washed`, `natural`, `honey`, `anaerobic` with `includes('anaerobic')`) from `currentShelfBeans` (matching web `StashView`). Hide when `<= 1`; reset on shelf switch or data change.
- **Mobile `MethodFilterBar` + `RecipesCatalogScreen`:** Replace bespoke chips with `FilterPills`. Include `'custom'` only when at least one custom recipe (`!r.isPreset && !r.id.startsWith('preset-')`) exists; derive remaining unique `brewMethod` values from `recipes`. Hide when `<= 1` and auto-reset `selectedMethod` to `'all'` if the active option disappears.
- **Mobile `EquipmentCatalogScreen`:** Derive present categories from `equipment` (`grinder`, `brewer`, `scale`, `kettle`, `other`). Hide when `<= 1`; auto-reset to `'all'`.
- **Mobile `ReviewsCatalogScreen`:** Migrate both **Method** and **Rating** (`5 Stars`, `4+ Stars`) rows onto `FilterPills` with dynamic filtering, `<= 1` hiding, and auto-reset. Derive present methods dynamically from `reviews` using known friendly labels plus a formatted fallback for any other `brewMethod` (e.g., `kalita-wave`, `flair`).
- **Web `EquipmentView`:** Derive `availableCategoryOptions` from `equipment`, compute `effectiveCategory`, reset via `useEffect`, and hide `FilterPills` when `availableCategoryOptions.length <= 1`.

## Left to the Builder
- Exact `testID` strings on mobile `FilterPills` instances (following web naming conventions such as `stash-process-filters`, `equipment-category-filters`, `reviews-method-filters`, `reviews-rating-filters`, `recipe-method-filters`).
- Updating unit tests across mobile and web to cover dynamic visibility, hiding when `<= 1`, and auto-reset on dataset/shelf changes.
