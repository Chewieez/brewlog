# Devlog: Mobile Static Top App Header & Inline Tab Screen Headers (Issue #90)

**Date:** 2026-11-18
**Issue:** [#90](https://github.com/Chewieez/brewlog/issues/90)
**PR:** [#92](https://github.com/Chewieez/brewlog/pull/92)
**Spec:** [`docs/superpowers/specs/2026-11-18-mobile-static-top-header-design.md`](../superpowers/specs/2026-11-18-mobile-static-top-header-design.md)
**Plan:** [`docs/superpowers/plans/2026-11-18-mobile-static-top-header.md`](../superpowers/plans/2026-11-18-mobile-static-top-header.md)

---

## Executive Summary & Problem Statement

Previously, neither `apps/mobile/app/(tabs)/_layout.tsx` (Android/default) nor `apps/mobile/app/(tabs)/_layout.ios.tsx` (iOS `NativeTabs`) rendered a persistent top app header. Each of the 5 tab screens (`Timer`, `Stash`, `Recipes`, `Equipment`, `Reviews`) independently rendered `ProfileHeaderButton`, top safe-area inset padding (`Math.max(insets.top, 16)`), and—on the 4 catalog screens—a separate stacked `actionRow` for its primary CTA button. As a result, the account button scrolled out of view with page content, there was no persistent `BrewLog` app branding at the top of the mobile shell, and every catalog screen paid extra vertical space for the stacked CTA row.

## Architecture & Deliverables

### 1. Static Shell Header (`TopAppHeader`)
- Created `apps/mobile/src/components/navigation/TopAppHeader.tsx` and `TopAppHeader.test.tsx`.
- Renders a non-interactive web-parity brand group on the left (32x32 bordered `colors.panel` icon badge with Lucide `Coffee` in `colors.accent` + `BrewLog` wordmark in `FONTS.displayBold`) and `<ProfileHeaderButton onPress={onProfilePress} />` pinned on the right.
- Consumes `useSafeAreaInsets().top` once at the shell level (`paddingTop: insets.top`), uses `@brewlog/ui` theme tokens (`colors.canvas`, `colors.panel`, `colors.borderSubtle`, `colors.accent`, `colors.foreground`), and adds `gap: 12`, `flexShrink: 1`, and `numberOfLines={1}` so large Dynamic Type / font scales do not crowd `ProfileHeaderButton`.
- Removed the trailing `marginRight: 8` from `ProfileHeaderButton` so `TopAppHeader`'s `paddingRight: 10` + 6px internal hit-target padding aligns the 32px avatar circle flush with the 16px screen gutter while preserving the 44x44pt minimum touch target.
- Mounted `TopAppHeader` above `<Tabs>` in `apps/mobile/app/(tabs)/_layout.tsx` (with `animation: 'none'` to eliminate directional slide transitions and match iOS `NativeTabs`) and above `<NativeTabs>` (inside a themed `flex: 1` container) in `apps/mobile/app/(tabs)/_layout.ios.tsx`, leaving push detail routes and modal/sheet routes untouched.

### 2. Shared Scrollable Screen Header (`TabScreenHeader`)
- Created `apps/mobile/src/components/navigation/TabScreenHeader.tsx` and `TabScreenHeader.test.tsx`.
- Renders each tab's page title inside its scrollable content (`Timer` title-only; `Stash`, `Recipes`, `Equipment`, `Reviews` with title + inline primary CTA). During simulator review, catalog screen subtitles were intentionally omitted from the 4 catalog screens for a cleaner, tighter header, while `TabScreenHeader` retains its optional `subtitle?: string` prop for reusability.
- Uses `minHeight: 44`, `flexDirection: 'row'`, `alignItems: 'center'`, `alignContent: 'center'`, `justifyContent: 'space-between'`, `flexWrap: 'wrap'`, `columnGap: 12`, `rowGap: 8`, and `paddingBottom: 6` with `flexShrink: 1` on the title/button label and `flexShrink: 0` + `maxWidth: '100%'` + `marginLeft: 'auto'` on the 44pt-tall CTA button so `Timer` aligns vertically with CTA-bearing catalog titles and narrow viewports / large font scales wrap cleanly without clipping.

### 3. Tab Screen Migrations
- Migrated all 5 tab screens (`app/(tabs)/index.tsx`, `StashCatalogScreen.tsx`, `RecipesCatalogScreen.tsx`, `EquipmentCatalogScreen.tsx`, `ReviewsCatalogScreen.tsx`) onto `TabScreenHeader`.
- Removed duplicated `ProfileHeaderButton` mounts, `useAuthModal` hooks, stacked `actionRow` containers, catalog subtitles, and redundant `insets.top` padding (keeping `insets.bottom` via `getTabScreenBottomPadding(insets.bottom)`).

## Accessibility, Safe Area & Platform Safeguards
- **Safe Area & iOS `NativeTabs` Verification**: `TopAppHeader` owns `insets.top` once at the `(tabs)` shell; individual tab screens use fixed `paddingTop: 16` inside their scroll view so top insets are never double-applied. Visually verified on `iPhone 18 Pro` (iOS Simulator) and `Pixel_10_Pro` (Android Emulator) that iOS `NativeTabs` does not double-apply top safe-area insets below `TopAppHeader` and all 5 tab titles sit at identical vertical offsets.
- **Touch Targets & Semantics**: `ProfileHeaderButton` and all catalog CTAs preserve 44x44pt minimum touch targets; `BrewLog` and each tab page title carry `accessibilityRole="header"`; `BrewLog` remains non-interactive.
- **Auth Sheet Consistency**: Tapping `Account profile` in `TopAppHeader` opens the in-tree `AuthSheet` on Android/default and navigates to the native `/auth/sheet` form sheet (with double-tap guard) on iOS.

## Verification Evidence
- `npm --prefix apps/mobile run typecheck`: Passed (0 errors).
- `npm --prefix apps/mobile test`: Passed — **61 test files passed (61), 526 tests passed (526)**, including:
  - `src/components/navigation/TopAppHeader.test.tsx` (5 tests)
  - `src/components/navigation/TabScreenHeader.test.tsx` (4 tests)
  - `__tests__/tabs/_layout.test.tsx` (7 tests)
  - `__tests__/tabs/_layout.ios.test.tsx` (7 tests)
  - `__tests__/tabs/index.test.tsx` (14 tests)
  - `src/features/stash/screens/StashCatalogScreen.test.tsx` (11 tests)
  - `src/features/recipes/screens/RecipesCatalogScreen.test.tsx` (6 tests)
  - `src/features/equipment/screens/EquipmentCatalogScreen.test.tsx` (9 tests)
  - `src/features/reviews/screens/ReviewsCatalogScreen.test.tsx` (10 tests)
- Runtime visual spot-check completed on iOS Simulator (`iPhone 18 Pro`) and Android Emulator (`Pixel_10_Pro`).
