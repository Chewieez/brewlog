# Devlog: Align Web Stash Bean Filters, Shelves & Summary Metrics with Mobile (Issue #65)

- **Date**: 2026-11-16
- **Issue**: [#65](https://github.com/Chewieez/brewlog/issues/65)
- **Follow-Up Issue**: [#84](https://github.com/Chewieez/brewlog/issues/84) (Adopt `@brewlog/ui` `FilterPills` in `ReviewsView.tsx` and `RecipeCatalogList.tsx`)
- **Branch**: `Chewieez/65-align-web-stash-bean-filters-and-shelves`
- **Status**: Completed & Verified
- **Tech Stack**: React 19.3, Tailwind CSS v4, TypeScript, Vitest, Playwright, Lucide React

---

## Executive Summary

Web's Stash view (`apps/web/src/features/stash/StashView.tsx`) previously rendered a flat bean catalog with a native `<select>` dropdown for process filtering, no shelf separation for frozen or archived lots, no cellar summary metrics, and no UI toggle for archiving beans. For Issue #65, web Stash was aligned with mobile (`apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx`) by introducing a reusable `@brewlog/ui` `FilterPills` primitive, upgrading `@brewlog/ui` `SegmentedControl` with keyboard arrow-key parity and `MetricTile` with a `success` variant, adding a web `CellarSummaryBar`, partitioning beans across three shelves (`Active Cellar`, `Freezer Vault`, `Archived`), dynamically rendering process pills for processes present on the active shelf, and adding an Edit modal `Archive Bean` toggle.

---

## Architecture & Cross-Package Deliverables

### 1. `@brewlog/ui` Shared Primitives (`packages/ui/src/`)
- **`FilterPills` (`packages/ui/src/filter-pills/`)**: Created `FilterPills.types.ts`, `FilterPills.web.tsx`, `FilterPills.native.tsx`, `FilterPills.web.test.tsx`, and `FilterPills.native.test.tsx`, exported from both `index.web.ts` and `index.native.ts`. Renders `32px` (`h-8`, `sm`) or `40px` (`h-10`, `md`) pills with `rounded-lg` radius, full interactive token states (`btn-tactile-primary`, `btn-tactile-secondary`, hover, focus-visible ring with `p-1 -m-1 sm:overflow-visible` ring clearance, active scale, disabled, `aria-pressed`), ref-array trimming when `options` shrinks, `ArrowLeft` / `ArrowRight` / `Home` / `End` focus navigation skipping disabled options, and consistent uppercase `foregroundSecondary` styling on native.
- **Shared Keyboard Navigation Helper (`packages/ui/src/utils/keyboardNavigation.ts`)**: Extracted `handleHorizontalOptionKeyDown` shared between `FilterPills.web.tsx` and `SegmentedControl.web.tsx`.
- **`SegmentedControl.web.tsx`**: Added `ArrowLeft`, `ArrowRight`, `Home`, and `End` wrapping focus navigation, ref-array trimming when `options` shrinks, responsive mobile padding/tracking (`px-1.5 sm:px-3 text-[11px] sm:text-xs tracking-wider sm:tracking-[0.12em] leading-tight`), active press feedback, `focus-visible` ring styling, and strict WAI-ARIA role-appropriate attributes (`aria-selected` restricted to `role="tablist"`, `aria-checked` on `role="radiogroup"`, and `aria-pressed` on `role="group"` — updating `apps/mobile/src/features/settings/screens/SettingsModalScreen.test.tsx` to assert `aria-pressed`).
- **`MetricTile` (`MetricTile.types.ts`, `MetricTile.web.tsx`, `MetricTile.native.tsx`)**: Added `'success'` variant mapping to `text-status-success` (web) / `colors.statusSuccess` (native) and `justify-between h-full` layout alignment so side-by-side metric values stay level on narrow mobile viewports.

### 2. Web Stash Feature (`apps/web/src/features/stash/`)
- **`CellarSummaryBar.tsx`**: Renders `ACTIVE BAGS`, `AT PEAK` (`success` variant when `> 0`), and `TOTAL STASH` (`g` unit) using `@brewlog/ui` `MetricTile` inside a `rounded-xl bg-panel border border-border-subtle` chassis computed strictly from active (`!isArchived && !isFrozen`) beans.
- **`StashView.tsx`**:
  - Partitions `beans` into `activeBeans`, `frozenBeans`, and `archivedBeans` matching mobile `StashContext.tsx`.
  - Adds a full-width `SegmentedControl<ShelfType>` (`role="tablist"`) for `Active Cellar`, `Freezer Vault`, and `Archived`.
  - Replaces the catalog `<select>` filter with dynamic `FilterPills<ProcessFilter>` capped to the 5 mobile process options (`All`, `Washed`, `Natural`, `Honey`, `Anaerobic`, matching `anaerobic-natural` / `anaerobic-washed` under `Anaerobic` and hiding pills whose processes do not exist on the active shelf). Derives `effectiveProcess` during render (with `useEffect` state sync) so switching shelves never flashes a one-frame empty state.
  - Adds a `32px` (`h-8 w-8`) clear search button with `focus-visible` ring, expands search matching to include `farm`, `variety`, and `flavorNotes`, and adds shelf/filter-specific empty states (`No coffee beans found matching your search.` with `CLEAR FILTERS`, `Freezer Vault is Empty`, `No Archived Coffees`, and `Cellar is Empty` with `ADD YOUR FIRST BEAN`).
  - Adds an `Archive Bean` checkbox (`#add-bean-is-archived`) inside the Edit Bean modal (leaving modal form `<select>` fields `#add-bean-process` and `#add-bean-roast-level` unchanged).

### 3. Follow-Up Issue
- Filed [#84](https://github.com/Chewieez/brewlog/issues/84) to migrate existing bespoke filter pill bars in `apps/web/src/features/reviews/ReviewsView.tsx` and `apps/web/src/features/recipes/RecipeCatalogList.tsx` onto `@brewlog/ui` `FilterPills`.

---

## Safeguards, Accessibility & Visual Verification

- **Keyboard Parity**: Verified `Tab`, `Enter`/`Space`, and `ArrowLeft` / `ArrowRight` / `Home` / `End` focus movement across both `SegmentedControl` shelf tabs and `FilterPills` process buttons.
- **Design Doctrine & Token Gates**:
  - `check_no_emoji.py`: Scanned 21 files across `packages/ui`, `apps/web/src/features/stash`, and this devlog; 0 emoji found.
  - `lint_hardcodes.py`: Scanned 6 files across `packages/ui/src/filter-pills` and `CellarSummaryBar.tsx`; 0 hardcoded values found.
- **Visual Inspection**: Captured Playwright screenshots across desktop (`1280x800`) and mobile (`320x640`) in dark and light themes, confirming baseline-aligned metrics at `320px`, zero horizontal overflow in the Stash `<main>` container (`stashOverflow: false`), and clean shelf/empty-state transitions.

---

## Automated Test & Verification Evidence

- **Typecheck (`npm run typecheck`)**: Passed across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`).
- **Unit Tests (`npm test`)**:
  - `@brewlog/core`: 6 files, 89 tests passed
  - `@brewlog/supabase`: 4 files, 29 tests passed
  - `@brewlog/ui`: 14 files, 81 tests passed (including `FilterPills.web.test.tsx`, `FilterPills.native.test.tsx`, `SegmentedControl.web.test.tsx`, and `MetricTile.web.test.tsx`)
  - `@brewlog/mobile`: 59 files, 510 tests passed
  - `@brewlog/web`: 29 files, 291 tests passed (including `CellarSummaryBar.test.tsx` and 31 tests in `StashView.test.tsx`)
- **Production Build (`npm run build`)**: `@brewlog/web` `tsc -b && vite build` succeeded in `1.34s`.
- **Playwright E2E (`npm run test:e2e --workspace=@brewlog/web`)**: 18/18 tests passed (`7.3s`), including updated `corner-radius-hierarchy.spec.ts`, `button-sizing-tokens.spec.ts`, and `context-features.spec.ts`.
