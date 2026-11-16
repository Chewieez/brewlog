# Design Spec: Remove "Change Recipe" Button in Free Brew Mode

**Date:** 2026-11-15
**Status:** Approved

## Intent & Why

Free Brew mode (`mode === 'free_brew'`) is an unguided manual stopwatch that intentionally operates without a selected recipe. Rendering the `CHANGE RECIPE` button in the Timer page header during Free Brew mode contradicts the purpose of Free Brew and misleads users into leaving for the Recipes catalog.

## Goals, Non-Goals, and Anti-Goals

- **Goal:** Hide/omit the `CHANGE RECIPE` button on the web Timer page whenever `mode === 'free_brew'`, while keeping it visible and functional when `mode === 'recipe'`.
- **Non-Goal:** No changes to mobile (`apps/mobile` does not render a "Change recipe" button on the Timer screen), no replacement button or brew-method picker in the emptied header slot, and no changes to `TimerViewProps` (`onSelectOtherRecipe` remains required for Guided Recipe mode).
- **Anti-Goal:** Do not leave a disabled or visually hidden (`visibility: hidden`) button in the DOM during Free Brew mode, as that leaves dead controls for screen readers and layout gaps on narrow viewports.

## Constraints

- Preserve existing `CHANGE RECIPE` styling (`btn-tactile-secondary h-8 px-3.5 ...`) and behavior (`onClick={onSelectOtherRecipe}`) in Guided Recipe mode (`mode === 'recipe'`).
- Update unit tests (`apps/web/src/features/timer/TimerView.test.tsx`) and Playwright E2E tests (`apps/web/e2e/context-features.spec.ts`) so cold-start assertions align with `DEFAULT_USER_SETTINGS.defaultTimerMode === 'free_brew'` (`packages/core/src/conversions.ts`).
- Respect workspace rules: zero emoji anywhere; preserve unrelated comments/docstrings.

## Approaches Considered

1. **Conditional DOM omission (`mode === 'recipe' && (...)`) — Picked:** Cleanly omits the `CHANGE RECIPE` button and its `<div className="flex items-center">` wrapper when `mode !== 'recipe'`. Screen readers, keyboard tabbing, and responsive flex layout remain clean.
2. **Disable the button in Free Brew mode — Rejected:** Leaves a visible disabled control advertising an inapplicable concept ("Change recipe").
3. **CSS-only hiding (`invisible` / `opacity-0`) — Rejected:** Preserves empty height on mobile (`flex-col`) and risks confusing assistive tech or test queries unless `aria-hidden`/`hidden` is also managed.

## Decisions & Left to Builder

- **Decided:** Wrap the `CHANGE RECIPE` container in `apps/web/src/features/timer/TimerView.tsx` (lines 519–527) with `{mode === 'recipe' && (...)}`. Update unit and E2E tests accordingly.
- **Left to Builder:** Exact test case structure and any devlog/verification pass required before committing per `AGENTS.md`.
