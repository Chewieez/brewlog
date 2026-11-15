# Devlog: Web Settings Live Preview Typography & User Avatar Contrast Fix (Issue #67)

- **Date**: 2026-11-15
- **Issue**: [#67](https://github.com/Chewieez/brewlog/issues/67)
- **Pull Request**: [#79](https://github.com/Chewieez/brewlog/pull/79)
- **Branch**: `Chewieez/Issue-67`
- **Status**: Completed & Verified
- **Tech Stack**: React 19.3, Tailwind CSS v4, TypeScript, Playwright, Vitest

---

## Executive Summary

Two web UI accessibility and layout issues were addressed for Issue #67:

1. **Settings Live Preview Typography & Truncation (`apps/web/src/routes/SettingsRoute.tsx`)**: On `/settings`, the **Live Preview** calibration gauge rendered all 6 preview tiles inside a `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` grid within `max-w-4xl`, pairing `text-lg sm:text-xl font-light` values with `truncate` on `DEFAULT MODE`, `DATE STAMP`, and `THEME`. On desktop (`lg`), each tile had ~102px of inner content width, causing standard preview values (`FREE BREW`, `GUIDED RECIPE`, `Oct 18, 2026`) to truncate with ellipses while `THEME` (`LIGHT`, `DARK`, `SYSTEM`) appeared disproportionately large. Re-balancing the grid to `grid-cols-2 sm:grid-cols-3` and standardizing all 6 preview values on `text-sm sm:text-base font-medium` without `truncate` eliminates truncation across desktop and mobile viewports.
2. **User Avatar Initial Contrast (`apps/web/src/features/auth/UserMenu.tsx`, `apps/web/src/index.css`)**: PR #63 (`56028d8f`) previously replaced `text-zinc-950` with `text-canvas`. While `#0e0d0c` on `#d97736` passes WCAG AA in dark mode (`6.14:1`), `#f8fafc` on `#c25412` in `[data-theme="studio-light"]` measured `4.39:1` (below `4.5:1` for `12px` bold text), whereas pure `#ffffff` passes in light mode (`4.59:1`) but fails in dark mode (`3.16:1`). Introducing `--color-accent-foreground` (`#ffffff` in `studio-light`, `#0e0d0c` in `tactile-dark`) and applying `text-accent-foreground` on `UserMenu.tsx` ensures WCAG AA compliance in both themes (and satisfies the existing `text-accent-foreground` usage in `SentryFeedbackFallback.tsx`).

---

## Deliverables

### 1. Settings Live Preview Layout & Typography (`apps/web/src/routes/SettingsRoute.tsx`)
- Replaced `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4` with `grid-cols-2 sm:grid-cols-3 gap-4`.
- Standardized all 6 Live Preview value containers (`preview-dose`, `preview-water`, `preview-temp`, `preview-timer-mode`, `preview-date`, `preview-theme`) from `text-lg sm:text-xl font-light` (and `truncate`) to `text-sm sm:text-base font-medium` while preserving `tabular-nums` on dose, water, temperature, and date values.

### 2. Theme-Aware Accent Foreground Token (`apps/web/src/index.css`, `apps/web/src/features/auth/UserMenu.tsx`)
- Added `--color-accent-foreground` to `:root` / `[data-theme="tactile-dark"]` (`#0e0d0c`), `[data-theme="studio-light"]` (`#ffffff`), and `@theme` (`var(--color-accent-foreground)`), matching `--btn-primary-text`.
- Updated the `UserMenu.tsx` avatar initial container from `text-canvas` to `text-accent-foreground`.
- Added unit test assertions in `apps/web/src/routes/SettingsRoute.test.tsx` verifying `bg-accent` and `text-accent-foreground` on the `UserMenu` avatar badge.

### 3. Playwright E2E Regression Coverage (`apps/web/e2e/context-features.spec.ts`)
- Expanded `"Settings: renders live preview tiles without truncation or ellipsis across desktop and mobile"` to isolate `localStorage` before each viewport (`1280x800`, `375x812`, `320x568`), verify default values (`18.0 g`, `300.0 g`, `94°C`, `FREE BREW`, `SYSTEM`), `LIGHT` theme, `DARK` theme, `GUIDED RECIPE`, imperial/Fahrenheit conversions, and all date formats (`YYYY-MM-DD`, `MM/DD/YYYY`, `DD/MM/YYYY`, `LOCALE`).
- Asserts `scrollWidth <= clientWidth` and `getComputedStyle(el).textOverflow !== "ellipsis"` across all viewports, plus single-line height fit (`height <= lineHeight + 2`) at `1280x800` and `375x812`.

---

## Safeguards

- **WCAG AA Contrast**: `UserMenu` avatar initial achieves `4.59:1` in light mode (`#ffffff` on `#c25412`) and `6.14:1` in dark mode (`#0e0d0c` on `#d97736`).
- **Zero Emoji**: Confirmed no emoji characters in modified files, devlog, or commit messages.
- **Privacy & Security**: Presentation-only styling, theme token, and E2E test updates; no auth, storage, or telemetry data flow changes.

---

## Automated Test & Verification Evidence

- **Typecheck (`npm run typecheck`)**: Passed across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`).
- **Unit Tests (`npm test`)**:
  - `@brewlog/core`: 6 files, 89 tests passed
  - `@brewlog/supabase`: 4 files, 29 tests passed
  - `@brewlog/ui`: 12 files, 63 tests passed
  - `@brewlog/mobile`: 59 files, 510 tests passed
  - `@brewlog/web`: 28 files, 273 tests passed
- **Playwright E2E (`npm run test:e2e`)**: 13/13 tests passed (`5.9s`), including isolated desktop (`1280x800`) and mobile (`375x812`, `320x568`) Live Preview regression checks.
- **Production Build (`npm run build`)**: `@brewlog/web` `tsc -b && vite build` succeeded in `1.30s` and emitted `.text-accent-foreground{color:var(--color-accent-foreground)}`.
