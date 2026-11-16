# Remove "Change Recipe" Button in Free Brew Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Omit the `CHANGE RECIPE` button on the web Timer page whenever `mode === 'free_brew'`, and align unit and E2E tests with Free Brew being the default cold-start timer mode.

**Architecture:** In `apps/web/src/features/timer/TimerView.tsx`, gate the Top Device Context Bar's `CHANGE RECIPE` button container behind `mode === 'recipe'`. No mobile changes are needed because `apps/mobile` has no "Change recipe" button on its Timer screen. Update `TimerView.test.tsx` (Vitest) and `apps/web/e2e/context-features.spec.ts` (Playwright) to verify visibility in Guided Recipe mode and absence in Free Brew mode.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest + React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-15-remove-change-recipe-free-brew-design.md`

## Global Constraints

- Omit the `CHANGE RECIPE` button and its wrapper `div` from the DOM when `mode === 'free_brew'` (do not use `disabled` or CSS `invisible`).
- Keep `CHANGE RECIPE` rendering, classes (`btn-tactile-secondary h-8 px-3.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold inline-flex items-center justify-center cursor-pointer`), and `onClick={onSelectOtherRecipe}` unchanged in `'recipe'` mode.
- Keep `TimerViewProps.onSelectOtherRecipe` unchanged.
- Zero emoji anywhere in code, tests, comments, or docs.
- Note on test execution during implementation: follow user rule to avoid running broad/full test suites on small intermediate edits; run full typecheck, unit tests, and Playwright E2E checks as the final verification gate before committing.

## Review Focus

- **Cold-start default mode (`free_brew`):** `TimerView` defaults to `settings.defaultTimerMode` (`'free_brew'` in `DEFAULT_USER_SETTINGS`), so `CHANGE RECIPE` must NOT render on initial default mount. (Covered in Task 1 & Task 2)
- **Mode switching (`free_brew` <-> `recipe`):** Toggling via `SegmentedControl` between `FREE BREW` and `GUIDED RECIPE` must immediately hide and restore `CHANGE RECIPE` without stale state, including when an active-brew `window.confirm` is cancelled (button stays hidden/visible matching the retained mode). (Covered in Task 1 & Task 2)
- **URL query parameter entry (`?mode=recipe` / `?mode=free_brew` / `initialMode`):** Opening with `initialMode="recipe"` shows `CHANGE RECIPE`; opening with `initialMode="free_brew"` omits it. (Covered in Task 1)
- **Clicking `CHANGE RECIPE` in Guided Recipe mode:** `onSelectOtherRecipe` still fires once clicked after switching from Free Brew to Guided Recipe. (Covered in Task 1)
- **Recipe prop change auto-switch:** When `initialRecipe` changes (e.g. user selects a recipe from `/recipes`), `TimerView` switches `mode` to `'recipe'`, so `CHANGE RECIPE` becomes visible. (Covered in Task 1)

---

### Task 1: Conditionally render `CHANGE RECIPE` only in Guided Recipe mode (`TimerView`)

**Files:**
- Modify: `apps/web/src/features/timer/TimerView.tsx:519-527`
- Test: `apps/web/src/features/timer/TimerView.test.tsx`

**Interfaces:**
- Consumes: `mode: TimerMode` (`'recipe' | 'free_brew'`), `onSelectOtherRecipe: () => void` in `TimerView` (`apps/web/src/features/timer/TimerView.tsx`)
- Produces: Conditional rendering of `<button type="button" onClick={onSelectOtherRecipe} ...>CHANGE RECIPE</button>` strictly when `mode === 'recipe'`

- [ ] **Step 1: Add unit tests to `apps/web/src/features/timer/TimerView.test.tsx`**

Add tests in the `describe('TimerView', ...)` block covering:
1. Cold-start default (`DEFAULT_USER_SETTINGS.defaultTimerMode === 'free_brew'`): `screen.queryByRole('button', { name: /change recipe/i })` is `null`.
2. `initialMode="free_brew"`: `screen.queryByRole('button', { name: /change recipe/i })` is `null`.
3. `initialMode="recipe"`: `CHANGE RECIPE` button is rendered and clicking it calls `onSelectOtherRecipe` once.
4. Mode switching (`recipe` -> `free_brew` -> `recipe`): `CHANGE RECIPE` disappears on `FREE BREW` click and reappears on `GUIDED RECIPE` click (and still calls `onSelectOtherRecipe` when clicked).
5. `initialRecipe` prop update while in `free_brew` mode switches to `'recipe'` mode and renders `CHANGE RECIPE` again.

- [ ] **Step 2: Run targeted unit test file to verify new tests fail before the fix**

Run: `npx vitest run src/features/timer/TimerView.test.tsx` (in `apps/web`)
Expected: FAIL on assertions expecting `CHANGE RECIPE` to be `null` in `free_brew` mode.

- [ ] **Step 3: Gate the `CHANGE RECIPE` button container in `apps/web/src/features/timer/TimerView.tsx`**

Wrap lines 519–527 in `{mode === 'recipe' && (...)}`:

```tsx
        {mode === 'recipe' && (
          <div className="flex items-center">
            <button
              type="button"
              onClick={onSelectOtherRecipe}
              className="btn-tactile-secondary h-8 px-3.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold inline-flex items-center justify-center cursor-pointer"
            >
              CHANGE RECIPE
            </button>
          </div>
        )}
```

- [ ] **Step 4: Run targeted unit test file to verify all tests in `TimerView.test.tsx` pass**

Run: `npx vitest run src/features/timer/TimerView.test.tsx` (in `apps/web`)
Expected: PASS (all tests in `TimerView.test.tsx` green).

---

### Task 2: Update Playwright E2E flow in `context-features.spec.ts`

**Files:**
- Modify: `apps/web/e2e/context-features.spec.ts:11-41`

**Interfaces:**
- Consumes: `/timer` route (`TimerRoute` -> `TimerView`) with default `DEFAULT_USER_SETTINGS.defaultTimerMode === 'free_brew'`

- [ ] **Step 1: Update `"Timer: switches between Guided Recipe and Free Brew, controls stopwatch"` in `apps/web/e2e/context-features.spec.ts`**

Update lines 11–41 so the test reflects the actual default mode (`free_brew`) and explicitly verifies `CHANGE RECIPE` visibility across both modes:
1. After `await page.goto("/timer")`:
   - Verify Free Brew mode is active by default (`Free Brew Stopwatch` and `MANUAL STOPWATCH` are visible).
   - Verify `page.getByRole("button", { name: /change recipe/i })` is NOT visible (`not.toBeVisible()`).
2. Switch to Guided Recipe (`page.getByRole("button", { name: "GUIDED RECIPE" }).click()`):
   - Verify `page.getByRole("button", { name: /change recipe/i })` IS visible.
3. Switch back to Free Brew (`page.getByRole("button", { name: "FREE BREW" }).click()`):
   - Verify `Free Brew Stopwatch` and `MANUAL STOPWATCH` are visible and `CHANGE RECIPE` is NOT visible.
4. Keep the existing Start -> Pause -> Reset stopwatch verification in Free Brew mode, then switch back to `GUIDED RECIPE` and verify `CHANGE RECIPE` is visible again.

---

### Task 3: Final Verification & Documentation Check (Ready to Commit)

**Files:**
- Verify: `apps/web/src/features/timer/TimerView.tsx`, `apps/web/src/features/timer/TimerView.test.tsx`, `apps/web/e2e/context-features.spec.ts`
- Check `AGENTS.md` Documentation & PR Completion Protocol (create dated devlog in `docs/devlogs/` if preparing a PR; note this is a focused bug/UX fix, not a roadmap milestone).

- [ ] **Step 1: Run workspace typecheck**

Run: `npm run typecheck` (from repo root)
Expected: Exit code 0 across all workspaces.

- [ ] **Step 2: Run full unit test suite**

Run: `npm test` (from repo root)
Expected: All workspace unit test suites pass with 0 failures.

- [ ] **Step 3: Run Playwright E2E suite**

Run: `npm run test:e2e` (from repo root)
Expected: All E2E specs pass (including `context-features.spec.ts` and `button-sizing-tokens.spec.ts`).

- [ ] **Step 4: Commit changes**

Stage modified files (`docs/superpowers/specs/2026-11-15-remove-change-recipe-free-brew-design.md`, `docs/superpowers/plans/2026-11-15-remove-change-recipe-free-brew.md`, `apps/web/src/features/timer/TimerView.tsx`, `apps/web/src/features/timer/TimerView.test.tsx`, `apps/web/e2e/context-features.spec.ts`, and any devlog if added) and commit cleanly.
