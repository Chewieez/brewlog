# Devlog: Clean Up Free Brew Header, Move Switch Inline, and Pull Timer Above the Fold

- **Date**: 2026-11-15
- **Status**: Completed & Verified
- **Pull Request**: [#80](https://github.com/Chewieez/brewlog/pull/80)
- **Related Issue**: [#81](https://github.com/Chewieez/brewlog/issues/81)
- **Spec**: [`docs/superpowers/specs/2026-11-15-remove-change-recipe-free-brew-design.md`](../superpowers/specs/2026-11-15-remove-change-recipe-free-brew-design.md)
- **Plan**: [`docs/superpowers/plans/2026-11-15-remove-change-recipe-free-brew.md`](../superpowers/plans/2026-11-15-remove-change-recipe-free-brew.md)
- **Tech Stack**: React 19, TypeScript, Tailwind CSS, Vitest, React Testing Library, Playwright

---

## Executive Summary

On the web Timer page (`apps/web/src/features/timer/TimerView.tsx`), Free Brew mode previously rendered both the `CHANGE RECIPE` button and a hardcoded `V60` brew-method badge, while stacked context-bar rows and a top-mounted `RATIO CALCULATOR` row pushed the stopwatch readout and primary controls down the page.

This update:
1. Omits both the recipe-switch button and the `V60` brew-method badge in `free_brew` mode.
2. Replaces `CHANGE RECIPE` with a compact inline `ArrowLeftRight` + `SWITCH` button at the end of the recipe title in `recipe` mode, and right-justifies the `Bean:` selector in the context bar across both modes.
3. Moves Free Brew quick tags (`+ BLOOM`, `+ POUR 1`, `+ POUR 2`, `+ DRAWDOWN`) under the `SPLIT LOG` header in the right column and repositions `RATIO CALCULATOR` below the timer controls as an inset drawer toggle (`Scale dose`), pulling the `MANUAL STOPWATCH` header flush with `SPLIT LOG` and bringing the stopwatch + controls above the fold.

Additionally, `apps/web/e2e/context-features.spec.ts` was aligned with `DEFAULT_USER_SETTINGS.defaultTimerMode === 'free_brew'`.

---

## Architecture & Deliverables

### 1. Context Bar & Layout Refinement (`apps/web/src/features/timer/TimerView.tsx`)
- Gated `renderBrewMethodBadge(currentRecipe.brewMethod)` and the inline `SWITCH` button (`ArrowLeftRight` + `SWITCH`, `aria-label="Switch recipe"`, `h-8 px-2.5 text-[11px]`) behind `mode === 'recipe'`.
- Right-aligned the `Bean:` selector inside the Top Device Context Bar (`pb-4 mb-6`) to eliminate the extra vertical row above the faceplate.
- Moved Free Brew quick tags directly below the `SPLIT LOG` header in the right column and moved `<WebRatioTranslator />` below the left-column controls so `MANUAL STOPWATCH` starts flush at the top of the grid alongside `SPLIT LOG`.
- Verified mobile parity (`apps/mobile/app/(tabs)/index.tsx` and `apps/mobile/src/components/timer/TimerHero.tsx`): mobile renders neither a recipe-switch button nor a `V60` badge in Free Brew mode.

### 2. Ratio Calculator Drawer Affordance (`apps/web/src/features/timer/WebRatioTranslator.tsx`)
- Unified the collapsed toggle and expanded drawer body into a single bordered `bg-panel-recessed` container (`rounded-lg border border-border-subtle`) with a hairline `border-t` separator when open, an `h-10` trigger (`40px` button-sizing token), and a right-aligned `Scale dose` + chevron cue.

### 3. Unit & E2E Test Updates
- **`apps/web/src/features/timer/TimerView.test.tsx`**: Added 5 unit tests covering cold-start default (`free_brew`), cold-start `initialMode="recipe"`, toggling `free_brew` <-> `recipe`, active-brew confirmation cancellation, and `recipe` prop updates for `SWITCH` and the `V60` badge.
- **`apps/web/e2e/context-features.spec.ts`**: Updated `"Timer: switches between Guided Recipe and Free Brew, controls stopwatch"` to assert `free_brew` cold-start (`SWITCH` and `V60` hidden in Free Brew, visible in Guided Recipe) and desktop vertical alignment between `MANUAL STOPWATCH` and `SPLIT LOG`.

---

## Safeguards & Accessibility

- `SWITCH` button uses `aria-label="Switch recipe"` (matching visible label `"SWITCH"` per WCAG 2.5.3 Label in Name) and omits from the DOM in `free_brew` mode.
- Button heights comply with the design system's `[32px, 40px, 48px]` token suite (`h-8` for `SWITCH` and quick tags, `h-10` for `RATIO CALCULATOR`, `h-12` for `START BREW`).
- Zero emoji used in code, tests, or documentation.

---

## Automated Test & Verification Evidence

- **Typecheck (`npm run typecheck`)**: Passed across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`).
- **Unit Tests (`npm test`)**:
  - `@brewlog/core`: 6 files, 89 tests passed
  - `@brewlog/supabase`: 4 files, 29 tests passed
  - `@brewlog/ui`: 12 files, 63 tests passed
  - `@brewlog/mobile`: 59 files, 510 tests passed
  - `@brewlog/web`: 28 files, 278 tests passed (including 20 tests in `TimerView.test.tsx`)
- **Playwright E2E (`npm run test:e2e`)**: 12/12 web E2E tests passed (`3.7s`), including desktop `MANUAL STOPWATCH` / `SPLIT LOG` alignment and button-sizing token checks.
