# Remove "Change Recipe" Button in Free Brew Mode & Timer Header Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Omit the recipe-switch button and `V60` brew-method badge on the web Timer page whenever `mode === 'free_brew'`, refine the header/drawer layout (`SWITCH` inline, `Bean:` right-aligned, quick tags under `SPLIT LOG`, unified `bg-panel` Ratio Calculator below controls), and align unit and E2E tests with Free Brew being the default cold-start timer mode.

**Architecture:** In `apps/web/src/features/timer/TimerView.tsx`, gate both `renderBrewMethodBadge(currentRecipe.brewMethod)` and the compact inline `SWITCH` button (`ArrowLeftRight` + `SWITCH`, `aria-label="Switch recipe"`) behind `mode === 'recipe'`, right-align the `Bean:` selector, move Free Brew quick tags below `SPLIT LOG`, and place `<WebRatioTranslator />` below the left-column controls. In `apps/web/src/features/timer/WebRatioTranslator.tsx`, unify the `h-10` trigger and expanded body in a single `bg-panel` bordered card with `bg-panel-recessed` inputs. Update `TimerView.test.tsx`, `context-features.spec.ts`, and `button-sizing-tokens.spec.ts`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest + React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-15-remove-change-recipe-free-brew-design.md`

## Post-Plan Scope Revision

After initial Task 1–3 completion, interactive PR #80 UI review added:
- Hiding `renderBrewMethodBadge(currentRecipe.brewMethod)` (`V60`) in `free_brew` mode.
- Replacing `CHANGE RECIPE` with compact inline `ArrowLeftRight` + `SWITCH` (`aria-label="Switch recipe"`, `h-8 px-2.5 text-[11px]`), moving `Bean:` right (`rounded-lg`, bounded width, `<label htmlFor>`), moving quick tags under `SPLIT LOG` (explicitly kept in right column on all viewports per user decision), and unifying `WebRatioTranslator` as a `bg-panel` drawer below controls.
- Addressing code-review findings: `min-w-0` / `max-w` bounds and label association on `Bean:`, `aria-hidden="true"` on `ArrowLeftRight`, redundant `mode === 'free_brew'` cleanup, `focus-visible` ring on `WebRatioTranslator`, clicking `SWITCH` in `context-features.spec.ts`, and including `/timer?mode=recipe` in `button-sizing-tokens.spec.ts`.

## Global Constraints

- Omit the recipe-switch button and brew-method badge from the DOM when `mode === 'free_brew'` (do not use `disabled` or CSS `invisible`).
- Keep `onSelectOtherRecipe` navigation to `/recipes` intact in `'recipe'` mode and keep `TimerViewProps.onSelectOtherRecipe` unchanged.
- Comply with `[32px, 40px, 48px]` button-sizing tokens (`h-8` for `SWITCH` and quick tags, `h-10` for `WebRatioTranslator`).
- Zero emoji anywhere in code, tests, comments, or docs.

## Review Focus

- **Cold-start default mode (`free_brew`):** `TimerView` defaults to `settings.defaultTimerMode` (`'free_brew'` in `DEFAULT_USER_SETTINGS`), so `SWITCH` and `V60` badge must NOT render on initial default mount. (Covered in Task 1 & Task 2)
- **Mode switching (`free_brew` <-> `recipe`):** Toggling via `SegmentedControl` between `FREE BREW` and `GUIDED RECIPE` must immediately hide and restore `SWITCH` and the brew-method badge without stale state, including when an active-brew `window.confirm` is cancelled. (Covered in Task 1 & Task 2)
- **URL query parameter entry (`?mode=recipe` / `?mode=free_brew` / `initialMode`):** Opening with `initialMode="recipe"` (or `/timer?mode=recipe`) shows `SWITCH`; opening with `initialMode="free_brew"` omits it. (Covered in Task 1 & Task 2)
- **Clicking `SWITCH` in Guided Recipe mode:** `onSelectOtherRecipe` fires once and navigates to `/recipes`. (Covered in Task 1 & Task 2)
- **Recipe prop change auto-switch:** When `initialRecipe` changes (e.g. user selects a recipe from `/recipes`), `TimerView` switches `mode` to `'recipe'`, so `SWITCH` becomes visible. (Covered in Task 1)

---

### Task 1: Conditionally render `SWITCH` & brew-method badge and update Timer/Calculator layout (`TimerView`, `WebRatioTranslator`)

**Files:**
- Modify: `apps/web/src/features/timer/TimerView.tsx`
- Modify: `apps/web/src/features/timer/WebRatioTranslator.tsx`
- Test: `apps/web/src/features/timer/TimerView.test.tsx`

**Interfaces:**
- Consumes: `mode: TimerMode` (`'recipe' | 'free_brew'`), `onSelectOtherRecipe: () => void` in `TimerView`
- Produces: Conditional rendering of brew-method badge and `<button ... aria-label="Switch recipe">SWITCH</button>` strictly when `mode === 'recipe'`, accessible right-aligned `Bean:` selector, quick tags under `SPLIT LOG`, and unified `bg-panel` `WebRatioTranslator` drawer below controls.

- [x] **Step 1: Add unit tests to `apps/web/src/features/timer/TimerView.test.tsx`**
- [x] **Step 2: Run targeted unit test file to verify new tests fail before the fix**
- [x] **Step 3: Implement changes in `apps/web/src/features/timer/TimerView.tsx` and `apps/web/src/features/timer/WebRatioTranslator.tsx`**
- [x] **Step 4: Run targeted unit test file to verify all tests in `TimerView.test.tsx` pass**

---

### Task 2: Update Playwright E2E flows (`context-features.spec.ts`, `button-sizing-tokens.spec.ts`)

**Files:**
- Modify: `apps/web/e2e/context-features.spec.ts`
- Modify: `apps/web/e2e/button-sizing-tokens.spec.ts`

- [x] **Step 1: Update `"Timer: switches between Guided Recipe and Free Brew, controls stopwatch"` in `apps/web/e2e/context-features.spec.ts` to assert `free_brew` cold-start (`SWITCH` and `V60` hidden), `MANUAL STOPWATCH` / `SPLIT LOG` alignment, mode switching, and clicking `SWITCH` to navigate to `/recipes`.**
- [x] **Step 2: Add `/timer?mode=recipe` to `routes` in `apps/web/e2e/button-sizing-tokens.spec.ts` so `SWITCH` (`32px`) is measured.**

---

### Task 3: Final Verification & Documentation Check (Ready to Commit)

**Files:**
- Verify: `apps/web/src/features/timer/TimerView.tsx`, `apps/web/src/features/timer/WebRatioTranslator.tsx`, `apps/web/src/features/timer/TimerView.test.tsx`, `apps/web/e2e/context-features.spec.ts`, `apps/web/e2e/button-sizing-tokens.spec.ts`
- Devlog: `docs/devlogs/2026-11-15-remove-change-recipe-free-brew.md`

- [x] **Step 1: Run workspace typecheck (`npm run typecheck`)**
- [x] **Step 2: Run full unit test suite (`npm test`)**
- [x] **Step 3: Run Playwright E2E suite (`npm run test:e2e`)**
- [x] **Step 4: Commit and push changes to PR #80**
