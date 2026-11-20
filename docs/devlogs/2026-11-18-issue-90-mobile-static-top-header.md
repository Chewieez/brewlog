# Devlog: Mobile Static Top App Header & Inline Tab Screen Headers (Issue #90)

**Date:** 2026-11-18
**Issue:** [#90](https://github.com/Chewieez/brewlog/issues/90)
**Spec:** [`docs/superpowers/specs/2026-11-18-mobile-static-top-header-design.md`](../superpowers/specs/2026-11-18-mobile-static-top-header-design.md)
**Plan:** [`docs/superpowers/plans/2026-11-18-mobile-static-top-header.md`](../superpowers/plans/2026-11-18-mobile-static-top-header.md)

---

## Executive Summary & Problem Statement

Previously, neither `apps/mobile/app/(tabs)/_layout.tsx` (Android/default) nor `apps/mobile/app/(tabs)/_layout.ios.tsx` (iOS `NativeTabs`) rendered a persistent top app header. Each of the 5 tab screens (`Timer`, `Stash`, `Recipes`, `Equipment`, `Reviews`) independently rendered `ProfileHeaderButton`, top safe-area inset padding (`Math.max(insets.top, 16)`), and—on the 4 catalog screens—a separate stacked `actionRow` for its primary CTA button. As a result, the account button scrolled out of view with page content, there was no persistent `BrewLog` app branding at the top of the mobile shell, and every catalog screen paid extra vertical space for the stacked CTA row.

## Architecture & Deliverables

### 1. Static Shell Header (`TopAppHeader`)
- Created `apps/mobile/src/components/navigation/TopAppHeader.tsx` and `TopAppHeader.test.tsx`.
- Renders a non-interactive web-parity brand group on the left (32x32 bordered `colors.panel` icon badge with Lucide `Coffee` in `colors.accent` + `BrewLog` wordmark in `FONTS.displayBold`) and `<ProfileHeaderButton onPress={onProfilePress} />` pinned on the right.
- Consumes `useSafeAreaInsets().top` once at the shell level (`paddingTop: insets.top`) and uses `@brewlog/ui` theme tokens (`colors.canvas`, `colors.panel`, `colors.borderSubtle`, `colors.accent`, `colors.foreground`) so `Tactile Dark` and `Crisp Studio Light` stay consistent.
- Removed the trailing `marginRight: 8` from `ProfileHeaderButton` so `TopAppHeader`'s `paddingRight: 10` + 6px internal hit-target padding aligns the 32px avatar circle flush with the 16px screen gutter while preserving the 44x44pt minimum touch target.
- Mounted `TopAppHeader` above `<Tabs>` in `apps/mobile/app/(tabs)/_layout.tsx` and above `<NativeTabs>` (inside a themed `flex: 1` container) in `apps/mobile/app/(tabs)/_layout.ios.tsx`, leaving push detail routes and modal/sheet routes untouched.

### 2. Shared Scrollable Screen Header (`TabScreenHeader`)
- Created `apps/mobile/src/components/navigation/TabScreenHeader.tsx` and `TabScreenHeader.test.tsx`.
- Renders each tab's page title inside its scrollable content (`Timer` title-only; `Stash`, `Recipes`, `Equipment`, `Reviews` with title + inline primary CTA + full-width subtitle beneath).
- Uses `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`, `flexWrap: 'wrap'`, `columnGap: 12`, `rowGap: 8` with `flexShrink: 1` on the title and `flexShrink: 0` + `marginLeft: 'auto'` on the 44pt-tall CTA button so narrow viewports and large system font scales (especially `Equipment` + `ADD EQUIPMENT`) wrap cleanly without clipping.

### 3. Tab Screen Migrations
- Migrated all 5 tab screens (`app/(tabs)/index.tsx`, `StashCatalogScreen.tsx`, `RecipesCatalogScreen.tsx`, `EquipmentCatalogScreen.tsx`, `ReviewsCatalogScreen.tsx`) onto `TabScreenHeader`.
- Removed duplicated `ProfileHeaderButton` mounts, `useAuthModal` hooks, stacked `actionRow` containers, and redundant `insets.top` padding (keeping `insets.bottom` via `getTabScreenBottomPadding(insets.bottom)`).

## Accessibility, Safe Area & Platform Safeguards
- **Safe Area**: `TopAppHeader` owns `insets.top` once at the `(tabs)` shell; individual tab screens use fixed `paddingTop: 16` inside their scroll view so top insets are never double-applied.
- **Touch Targets & Semantics**: `ProfileHeaderButton` and all catalog CTAs preserve 44x44pt minimum touch targets; `BrewLog` and each tab page title carry `accessibilityRole="header"`; `BrewLog` remains non-interactive.
- **Auth Sheet Consistency**: Tapping `Account profile` in `TopAppHeader` opens the in-tree `AuthSheet` on Android/default and navigates to the native `/auth/sheet` form sheet (with double-tap guard) on iOS.

## Verification Evidence
- `npm --prefix apps/mobile run typecheck`: Passed (0 errors).
- `npm --prefix apps/mobile test`: Passed — **61 test files passed (61), 525 tests passed (525)**, including:
  - `src/components/navigation/TopAppHeader.test.tsx` (5 tests)
  - `src/components/navigation/TabScreenHeader.test.tsx` (3 tests)
  - `__tests__/tabs/_layout.test.tsx` (7 tests)
  - `__tests__/tabs/_layout.ios.test.tsx` (7 tests)
  - `__tests__/tabs/index.test.tsx` (14 tests)
  - `src/features/stash/screens/StashCatalogScreen.test.tsx` (11 tests)
  - `src/features/recipes/screens/RecipesCatalogScreen.test.tsx` (6 tests)
  - `src/features/equipment/screens/EquipmentCatalogScreen.test.tsx` (9 tests)
  - `src/features/reviews/screens/ReviewsCatalogScreen.test.tsx` (10 tests)
