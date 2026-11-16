# Devlog: Remove "Change Recipe" Button in Free Brew Mode

- **Date**: 2026-11-15
- **Status**: Completed & Verified
- **Spec**: [`docs/superpowers/specs/2026-11-15-remove-change-recipe-free-brew-design.md`](../superpowers/specs/2026-11-15-remove-change-recipe-free-brew-design.md)
- **Plan**: [`docs/superpowers/plans/2026-11-15-remove-change-recipe-free-brew.md`](../superpowers/plans/2026-11-15-remove-change-recipe-free-brew.md)
- **Tech Stack**: React 19, TypeScript, Tailwind CSS, Vitest, React Testing Library, Playwright

---

## Executive Summary

On the web Timer page (`apps/web/src/features/timer/TimerView.tsx`), the Top Device Context Bar previously rendered the `CHANGE RECIPE` button unconditionally across both `recipe` and `free_brew` modes. Because Free Brew mode intentionally runs as a recipe-free manual stopwatch, displaying `CHANGE RECIPE` contradicted the mode's purpose.

Additionally, `apps/web/e2e/context-features.spec.ts` previously assumed Guided Recipe was the default cold-start mode and only passed because `CHANGE RECIPE` was mistakenly visible in Free Brew mode (despite `DEFAULT_USER_SETTINGS.defaultTimerMode` being `'free_brew'`).

---

## Architecture & Deliverables

### 1. Conditional Context-Bar Action (`apps/web/src/features/timer/TimerView.tsx`)
- Gated the `CHANGE RECIPE` button container behind `{mode === 'recipe' && (...)}`, omitting it from the DOM in `free_brew` mode instead of disabling or CSS-hiding it.
- Verified mobile parity (`apps/mobile/app/(tabs)/index.tsx` and `apps/mobile/src/components/timer/TimerHero.tsx`): mobile does not render a "Change recipe" button on the Timer screen.

### 2. Unit & E2E Test Updates
- **`apps/web/src/features/timer/TimerView.test.tsx`**: Added 5 unit tests covering:
  - Cold-start default (`free_brew`) omits `CHANGE RECIPE`
  - Cold-start `initialMode="recipe"` renders `CHANGE RECIPE` and invokes `onSelectOtherRecipe`
  - Toggling `free_brew` <-> `recipe` hides and restores `CHANGE RECIPE`
  - Cancelling an active-brew mode-switch `window.confirm` keeps `CHANGE RECIPE` hidden
  - Updating the `recipe` prop while in `free_brew` mode switches to `recipe` mode and surfaces `CHANGE RECIPE`
- **`apps/web/e2e/context-features.spec.ts`**: Updated `"Timer: switches between Guided Recipe and Free Brew, controls stopwatch"` to align cold-start assertions with `free_brew` default (`not.toBeVisible()` in Free Brew, `toBeVisible()` after switching to `GUIDED RECIPE`).

---

## Safeguards & Accessibility

- Omitting the button from the DOM in `free_brew` mode ensures assistive technology and keyboard navigation do not encounter an inapplicable or disabled recipe control, and avoids empty layout space on narrow viewports.
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
- **Playwright E2E (`CI=true npm run test:e2e`)**: 12/12 web E2E tests passed (`9.8s`), verifying `CHANGE RECIPE` is hidden in Free Brew mode and visible in Guided Recipe mode.
