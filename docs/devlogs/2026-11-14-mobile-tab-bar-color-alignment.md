# Devlog: Mobile Bottom Tab Bar Color Alignment (iOS & Android)

- **Date**: 2026-11-14
- **Status**: Completed & Verified
- **Branch**: `fix/mobile-tab-bar-colors`
- **Pull Request**: [#78](https://github.com/Chewieez/brewlog/pull/78)
- **Plan**: [`docs/superpowers/plans/2026-11-14-mobile-tab-bar-color-alignment.md`](../superpowers/plans/2026-11-14-mobile-tab-bar-color-alignment.md)
- **Tech Stack**: React Native 0.88 (Expo SDK 58), `expo-router/native-tabs`, `@brewlog/ui` (`useTheme`, `makeStyles`), TypeScript 6, Vitest, Playwright E2E

---

## Executive Summary

iOS and Android rendered the mobile bottom navigation bar with inconsistent color semantics:

1. **Selected Tab Inconsistency**: On iOS (`TabLayoutIOS` using `NativeTabs`), the active tab used `colors.accent` (orange) for both icon and label, matching web's `Header.tsx`. On Android (`FloatingPillTabBar`), the active icon used `colors.accent` (orange) while `styles.labelActive` used `colors.foreground` (white), creating a split active state.
2. **Unselected Tab Contrast & Prop Gap**: On Android, unselected icons and labels used `colors.foregroundMuted` (`#78716c` on `#171513` panel, ~3.8:1 contrast—below WCAG AA 4.5:1 for `10px` labels). On iOS, `NativeTabs` set `labelStyle.default.color` to `colors.foregroundSecondary` without specifying `iconColor`.

This fix aligns both platforms on `colors.accent` (orange) for the selected tab icon and label, and `colors.foregroundSecondary` (secondary grey) for unselected tab icons and labels.

---

## Architecture & Deliverables

### 1. Android Custom Tab Bar (`apps/mobile/src/components/navigation/FloatingPillTabBar.tsx`)
- Changed `styles.labelActive.color` from `colors.foreground` to `colors.accent` so active labels match active icons and web navigation.
- Upgraded unselected icon color, `options.tabBarLabel(...)` inactive `color` argument, and `styles.label.color` from `colors.foregroundMuted` to `colors.foregroundSecondary`.
- Verified both dark (`TACTILE_DARK_THEME`) and light (`CRISP_STUDIO_LIGHT_THEME`) theme resolution in `FloatingPillTabBar.test.tsx`.

### 2. iOS Native Tabs (`apps/mobile/app/(tabs)/_layout.ios.tsx`)
- Added `iconColor={{ default: colors.foregroundSecondary, selected: colors.accent }}` on `<NativeTabs>` alongside `tintColor={colors.accent}` and `labelStyle`.
- Verified `NativeTabs` color props under both dark and light themes in `apps/mobile/__tests__/tabs/_layout.test.tsx`.

---

## Accessibility & Safeguards

- **WCAG Contrast**: Switching unselected tabs on Android's opaque `panel` surface from `colors.foregroundMuted` (`#78716c`) to `colors.foregroundSecondary` (`#a8a29e` dark / `#475569` light) raises contrast to >7:1 on both themes while maintaining clear visual separation from `colors.accent`.
- **Zero Hardcoded Colors**: All tab colors remain dynamically resolved through `@brewlog/ui` (`useTheme` and `makeStyles`).
- **Privacy & Security**: UI styling change only; no telemetry, auth, or storage paths modified.

---

## Automated Test & Verification Evidence

- **Typecheck (`npm run typecheck`)**: Passed across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`).
- **Unit Tests (`npm test`)**:
  - `@brewlog/core`: 6 files, 89 tests passed
  - `@brewlog/supabase`: 4 files, 29 tests passed
  - `@brewlog/ui`: 12 files, 63 tests passed
  - `@brewlog/mobile`: 56 files, 488 tests passed (including 16 tests in `FloatingPillTabBar.test.tsx` and 5 tests in `_layout.test.tsx`)
  - `@brewlog/web`: 28 files, 273 tests passed
- **Playwright E2E (`npm run test:e2e`)**: 12/12 web E2E tests passed (`5.4s`).
