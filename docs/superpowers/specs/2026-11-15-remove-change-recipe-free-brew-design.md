# Design Spec: Remove "Change Recipe" Button in Free Brew Mode & Timer Header Polish

**Date:** 2026-11-15
**Status:** Approved & Shipped (with Scope Revision)

## Intent & Why

Free Brew mode (`mode === 'free_brew'`) is an unguided manual stopwatch that intentionally operates without a selected recipe or fixed brew method. Rendering `CHANGE RECIPE` and a hardcoded `V60` badge in the Timer page header during Free Brew mode contradicted the mode's purpose, while stacked context-bar rows and a top-mounted Ratio Calculator pushed the stopwatch readout down the page.

## Goals, Non-Goals, and Anti-Goals

- **Goals:**
  - Omit the recipe-switch button and the `V60` brew-method badge on the web Timer page whenever `mode === 'free_brew'`.
  - In Guided Recipe mode (`mode === 'recipe'`), render a compact inline `ArrowLeftRight` + `SWITCH` button (`aria-label="Switch recipe"`, `h-8 px-2.5 text-[11px]`) right after the recipe title.
  - Right-align the `Bean:` selector in the Top Device Context Bar (`min-w-0` / bounded select width + accessible `<label htmlFor>` / `aria-label` + `rounded-lg`) across both modes.
  - Move Free Brew quick tags (`+ BLOOM`, `+ POUR 1`, `+ POUR 2`, `+ DRAWDOWN`) under the `SPLIT LOG` header in the right column and reposition `WebRatioTranslator` below the timer controls as a unified `bg-panel` drawer card (`h-10` trigger) so `MANUAL STOPWATCH` aligns flush with `SPLIT LOG` and pulls the stopwatch above the fold.
- **Non-Goals:** No changes to mobile (`apps/mobile` renders neither a recipe-switch button nor a `V60` badge in Free Brew mode), no replacement brew-method picker in Free Brew mode, and no changes to `TimerViewProps` (`onSelectOtherRecipe` remains required for Guided Recipe mode).
- **Anti-Goals:** Do not leave disabled or CSS-hidden (`visibility: hidden`) controls in the DOM during Free Brew mode, and do not violate the design system's `[32px, 40px, 48px]` button-height tokens.

## Constraints

- Preserve `onClick={onSelectOtherRecipe}` navigation to `/recipes` in Guided Recipe mode (`mode === 'recipe'`).
- Update unit tests (`apps/web/src/features/timer/TimerView.test.tsx`) and Playwright E2E tests (`apps/web/e2e/context-features.spec.ts`, `apps/web/e2e/button-sizing-tokens.spec.ts`) so cold-start assertions align with `DEFAULT_USER_SETTINGS.defaultTimerMode === 'free_brew'` (`packages/core/src/conversions.ts`) and verify `SWITCH` navigation + button heights in recipe mode.
- Respect workspace rules: zero emoji anywhere; preserve unrelated comments/docstrings.

## Approaches Considered

1. **Conditional DOM omission (`mode === 'recipe' && (...)`) — Picked:** Cleanly omits the recipe-switch button and brew-method badge when `mode !== 'recipe'`. Screen readers, keyboard tabbing, and responsive flex layout remain clean.
2. **Disable the button in Free Brew mode — Rejected:** Leaves a visible disabled control advertising an inapplicable concept ("Change recipe").
3. **CSS-only hiding (`invisible` / `opacity-0`) — Rejected:** Preserves empty space and risks confusing assistive tech unless `aria-hidden`/`hidden` is also managed.

## Scope Revision Notes (Post-Initial-Approval PR Feedback)

During interactive UI review on PR #80, the scope expanded cleanly from gating `CHANGE RECIPE` alone to also:
1. Omitting the hardcoded `V60` badge in `free_brew` mode (leaving above-the-fold spacing follow-up in #81 for any further viewport tuning).
2. Replacing `CHANGE RECIPE` with a compact inline `SWITCH` button (`ArrowLeftRight` icon with `aria-hidden="true"`) next to the recipe title and moving `Bean:` to the right side of the context bar (`rounded-lg`, `min-w-0`, bounded select width, proper `<label htmlFor>`).
3. Moving Free Brew quick tags below `SPLIT LOG` (explicitly kept in the right column on all viewports per user decision) and moving `WebRatioTranslator` below the timer controls as a unified `bg-panel` drawer (`h-10` trigger with `focus-visible` ring and `bg-panel-recessed` inputs).
