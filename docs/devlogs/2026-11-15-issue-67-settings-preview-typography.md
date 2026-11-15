# Devlog: Web Settings Live Preview Grid & Typography Fix (Issue #67)

- **Date**: 2026-11-15
- **Issue**: [#67](https://github.com/Chewieez/brewlog/issues/67)
- **Branch**: `Chewieez/Issue-67`
- **Status**: Completed & Verified
- **Tech Stack**: React 19.3, Tailwind CSS v4, TypeScript, Playwright, Vitest

---

## Executive Summary

On `/settings`, the **Live Preview** calibration gauge rendered all 6 preview tiles inside a `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` grid within `max-w-4xl`, pairing `text-lg sm:text-xl font-light` values with `truncate` on `DEFAULT MODE`, `DATE STAMP`, and `THEME`. On desktop (`lg`), each tile had ~102px of inner content width, causing standard preview values (`FREE BREW`, `GUIDED RECIPE`, `Oct 18, 2026`) to truncate with ellipses, while `THEME` (`LIGHT`, `DARK`, `SYSTEM`) appeared disproportionately large relative to the tile dimensions.

This change re-balances the preview grid to two 3-column rows on tablet/desktop (`grid-cols-2 sm:grid-cols-3`) and standardizes all 6 preview value tiles on `text-sm sm:text-base font-medium` without `truncate`, eliminating clipping and truncation across desktop and mobile viewports.

> **Scope Note**: The `UserMenu.tsx` avatar initial contrast item from Issue #67 was intentionally skipped for this PR after verifying that PR #63 (`56028d8f`) already replaced `text-zinc-950` with `text-canvas`, and that forcing `text-white` in dark mode (`#d97736`) fails WCAG AA (`3.16:1`).

---

## Deliverables

### 1. Settings Live Preview Layout & Typography (`apps/web/src/routes/SettingsRoute.tsx`)
- Replaced `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4` with `grid-cols-2 sm:grid-cols-3 gap-4`.
- Standardized all 6 Live Preview value containers (`preview-dose`, `preview-water`, `preview-temp`, `preview-timer-mode`, `preview-date`, `preview-theme`) from `text-lg sm:text-xl font-light` (and `truncate`) to `text-sm sm:text-base font-medium` while preserving `tabular-nums` on dose, water, temperature, and date values.

### 2. Playwright E2E Regression Coverage (`apps/web/e2e/context-features.spec.ts`)
- Added `"Settings: renders live preview tiles without horizontal truncation on desktop and mobile"` verifying at `1280x800` and `375x812` that `GUIDED RECIPE`, `DARK`, imperial dose/water, Fahrenheit temperature, and locale date stamp render with `scrollWidth <= clientWidth` across all 6 preview tiles.

---

## Safeguards

- **Zero Emoji**: Confirmed no emoji characters in modified files, devlog, or commit messages.
- **Privacy & Security**: Presentation-only layout and typography change; no auth, storage, or telemetry code modified.
- **Responsive Overflow**: Verified in Chromium at `1280x800`, `375x812`, and `320x568` (`GUIDED RECIPE` wraps cleanly at 320px with `scrollWidth === clientWidth`).

---

## Automated Test & Verification Evidence

- **Typecheck (`npm run typecheck`)**: Passed across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`).
- **Unit Tests (`npm test`)**:
  - `@brewlog/core`: 6 files, 89 tests passed
  - `@brewlog/supabase`: 4 files, 29 tests passed
  - `@brewlog/ui`: 12 files, 63 tests passed
  - `@brewlog/mobile`: 59 files, 510 tests passed
  - `@brewlog/web`: 28 files, 273 tests passed
- **Playwright E2E (`npm run test:e2e`)**: 13/13 tests passed (`4.8s`), including the new Settings Live Preview no-truncation regression test.
- **Production Build (`npm run build`)**: `@brewlog/web` `tsc -b && vite build` succeeded in `1.30s`.
