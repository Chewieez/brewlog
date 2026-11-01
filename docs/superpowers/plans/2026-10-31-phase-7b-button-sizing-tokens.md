# Phase 7B: Standardize Sizing Tokens and Button Heights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize design system button and form input heights across `@brewlog/ui` and `apps/web` to a strict 3-tier rem scale (`h-8` 32px, `h-10` 40px, `h-12` 48px), clean up duplicated Tailwind CSS v4 `text-text-*` typography tokens to `text-foreground*`, and establish an automated Playwright regression gate.

**Architecture:** 
1. Introduce semantic foreground tokens (`foreground`, `foregroundSecondary`, `foregroundMuted`) across all theme definitions in `@brewlog/core` with backward-compatible aliases for mobile, and map them to single-prefix CSS variables in `apps/web/src/index.css`.
2. Refactor `@brewlog/ui`'s `Button` primitive to standardize sizes (`sm: h-8`, `md: h-10`, `lg: h-12`), add native form submission and layout props, and standardize `Input` container height to `h-10`.
3. Systematically migrate modal footers (`h-10`) and view header controls (`h-8`) across `apps/web` to `@brewlog/ui` `Button`, eliminate `text-text-*` utility classes, and implement `apps/web/e2e/button-sizing-tokens.spec.ts` in Playwright.

**Tech Stack:** React 19, TypeScript 5.7+, Tailwind CSS v4, Playwright, Vitest, `@brewlog/core`, `@brewlog/ui`.

**Spec:** [`docs/superpowers/specs/2026-10-31-phase-7b-design-system-tokens-spec.md`](file:///Users/greglawrence/orca/workspaces/brewlog/59-feature-phase-7b-standardize-design-syst/docs/superpowers/specs/2026-10-31-phase-7b-design-system-tokens-spec.md)

## Global Constraints
- Zero buttons styled solely with `py-*` without an explicit height token.
- Sizing tiers: Small (`h-8` / 32px), Medium (`h-10` / 40px), Large (`h-12` / 48px).
- Zero emoji in code, styles, tests, or commit messages.
- Do not run the full monorepo test suite until ready to commit and push. Never run broad test suites for small intermediate edits.

---

### Task 1: Semantic Foreground Tokens in `@brewlog/core`

**Files:**
- Modify: `packages/core/src/theme.ts:1-125`
- Test: `packages/core/src/theme.test.ts:1-75`

**Interfaces:**
- Consumes: Existing `ThemeColors` and `ThemeTokens` definitions.
- Produces: `foreground`, `foregroundSecondary`, and `foregroundMuted` on all registered themes (`TACTILE_DARK_THEME`, `CRISP_STUDIO_LIGHT_THEME`, `INDUSTRIAL_PRECISION_THEME`), with backward-compatible getters for `textPrimary`, `textSecondary`, and `textMuted`. Exports `DEFAULT_THEME` and `darkTheme` aliases.

- [ ] **Step 1: Write failing unit test verifying semantic foreground tokens and theme aliases**

Add test assertions in `packages/core/src/theme.test.ts`:
```ts
it('exports semantic foreground tokens on all registered themes', () => {
  Object.values(THEMES).forEach((theme) => {
    expect(theme.colors.foreground).toBeDefined();
    expect(theme.colors.foregroundSecondary).toBeDefined();
    expect(theme.colors.foregroundMuted).toBeDefined();
    expect(theme.colors.textPrimary).toBe(theme.colors.foreground);
    expect(theme.colors.textSecondary).toBe(theme.colors.foregroundSecondary);
    expect(theme.colors.textMuted).toBe(theme.colors.foregroundMuted);
  });
});

it('exports DEFAULT_THEME and darkTheme aliases', () => {
  expect(DEFAULT_THEME).toBe(TACTILE_DARK_THEME);
  expect(darkTheme).toBe(TACTILE_DARK_THEME);
});
```

- [ ] **Step 2: Run targeted core theme test to verify failure**

Run: `npm test -w @brewlog/core -- packages/core/src/theme.test.ts`
Expected: FAIL due to missing `foreground*` properties and aliases.

- [ ] **Step 3: Implement semantic foreground tokens in `packages/core/src/theme.ts`**

Update `ThemeColors` interface:
```ts
export interface ThemeColors {
  canvas: string;
  panel: string;
  panelRecessed: string;
  borderSubtle: string;
  borderActive: string;
  accent: string;
  accentHover: string;

  // Semantic foreground tokens
  foreground: string;
  foregroundSecondary: string;
  foregroundMuted: string;

  // Backward compatibility for existing mobile consumers
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  statusSuccess: string;
  statusWarning: string;
  statusError: string;
  statusInfo: string;
}
```

Add `foreground`, `foregroundSecondary`, `foregroundMuted`, and getters for `textPrimary`, `textSecondary`, `textMuted` to `TACTILE_DARK_THEME`, `CRISP_STUDIO_LIGHT_THEME`, and `INDUSTRIAL_PRECISION_THEME`:
- `TACTILE_DARK_THEME`: `foreground: '#f5f0eb'`, `foregroundSecondary: '#a8a29e'`, `foregroundMuted: '#78716c'`.
- `CRISP_STUDIO_LIGHT_THEME`: `foreground: '#0f172a'`, `foregroundSecondary: '#475569'`, `foregroundMuted: '#64748b'`.
- `INDUSTRIAL_PRECISION_THEME`: `foreground: '#f4f4f5'`, `foregroundSecondary: '#a1a1aa'`, `foregroundMuted: '#71717a'`.
Export aliases:
```ts
export const DEFAULT_THEME = TACTILE_DARK_THEME;
export const darkTheme = TACTILE_DARK_THEME;
```

- [ ] **Step 4: Run targeted core theme test to verify it passes**

Run: `npm test -w @brewlog/core -- packages/core/src/theme.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/theme.ts packages/core/src/theme.test.ts
git commit -m "feat(core): add semantic foreground tokens and theme aliases to theme.ts"
```

---

### Task 2: CSS Variable & Tailwind v4 `@theme` Configuration in `apps/web`

**Files:**
- Modify: `apps/web/src/index.css:1-120`

**Interfaces:**
- Consumes: `foreground*` tokens emitted by theme injection in `RootLayout` and `SettingsContext`.
- Produces: CSS variables `--color-foreground`, `--color-foreground-secondary`, `--color-foreground-muted` and Tailwind utility classes `text-foreground`, `text-foreground-secondary`, `text-foreground-muted`.

- [ ] **Step 1: Add `--color-foreground*` tokens to `index.css`**

In `apps/web/src/index.css`:
- In `:root`:
  ```css
  --color-foreground: #f5f0eb;
  --color-foreground-secondary: #a8a29e;
  --color-foreground-muted: #78716c;

  /* Legacy fallback during migration */
  --color-text-primary: var(--color-foreground);
  --color-text-secondary: var(--color-foreground-secondary);
  --color-text-muted: var(--color-foreground-muted);
  ```
- In `html.theme-studio-light`:
  ```css
  --color-foreground: #0f172a;
  --color-foreground-secondary: #475569;
  --color-foreground-muted: #64748b;

  --color-text-primary: var(--color-foreground);
  --color-text-secondary: var(--color-foreground-secondary);
  --color-text-muted: var(--color-foreground-muted);
  ```
- In `@theme`:
  ```css
  --color-foreground: var(--color-foreground);
  --color-foreground-secondary: var(--color-foreground-secondary);
  --color-foreground-muted: var(--color-foreground-muted);
  ```

- [ ] **Step 2: Verify CSS builds cleanly via web typecheck / build**

Run: `npm run build -w @brewlog/web`
Expected: Build succeeds without CSS syntax errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/index.css
git commit -m "feat(web): register semantic foreground tokens in index.css"
```

---

### Task 3: Button & Input Sizing Standardization in `@brewlog/ui`

**Files:**
- Modify: `packages/ui/src/button/Button.types.ts:1-25`
- Modify: `packages/ui/src/button/Button.web.tsx:1-60`
- Modify: `packages/ui/src/button/Button.web.test.tsx:1-75`
- Modify: `packages/ui/src/input/Input.web.tsx:1-65`
- Modify: `packages/ui/src/index.web.ts:1-15`
- Modify: `packages/ui/src/index.native.ts:1-15`

**Interfaces:**
- Consumes: `ButtonProps`, `InputProps`, `theme` tokens.
- Produces: `Button.web.tsx` compiled to `h-8` (`sm`), `h-10` (`md`), `h-12` (`lg`) with `type`, `className`, and `onClick` support; `Input.web.tsx` wrapper compiled to `h-10`; re-exports theme from `@brewlog/ui`.

- [ ] **Step 1: Write failing tests in `Button.web.test.tsx` for `h-10` medium height and form props**

Update `packages/ui/src/button/Button.web.test.tsx`:
```tsx
it('renders medium button with h-10 (40px) height by default', () => {
  render(<Button label="Submit" />);
  const btn = screen.getByRole('button', { name: 'Submit' });
  expect(btn.className).toContain('h-10');
  expect(btn.className).not.toContain('h-11');
});

it('renders button with type="submit" when specified', () => {
  render(<Button label="Save" type="submit" />);
  const btn = screen.getByRole('button', { name: 'Save' });
  expect(btn.getAttribute('type')).toBe('submit');
});

it('applies custom className to button', () => {
  render(<Button label="Custom" className="shrink-0" />);
  const btn = screen.getByRole('button', { name: 'Custom' });
  expect(btn.className).toContain('shrink-0');
});
```

- [ ] **Step 2: Run targeted button test to verify failure**

Run: `npm test -w @brewlog/ui -- packages/ui/src/button/Button.web.test.tsx`
Expected: FAIL due to `h-11` instead of `h-10`.

- [ ] **Step 3: Update `Button.types.ts` and `Button.web.tsx`**

In `packages/ui/src/button/Button.types.ts`:
```ts
export interface ButtonProps {
  label?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  testID?: string;
  accessibilityLabel?: string;
}
```

In `packages/ui/src/button/Button.web.tsx`:
- Update `sizeClasses`:
  ```ts
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-xs gap-2',
    lg: 'h-12 px-6 text-sm gap-2.5',
  }[size];
  ```
- Support `type = 'button'`, `className = ''`, and `onClick`:
  ```tsx
  export const Button: React.FC<ButtonProps> = ({
    label,
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    className = '',
    onClick,
    onPress,
    disabled = false,
    loading = false,
    icon,
    iconPosition = 'left',
    testID,
    accessibilityLabel,
  }) => {
    // ...
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onPress?.();
    };
  ```
- Update variant classes: `text-text-primary` -> `text-foreground`, `text-text-secondary` -> `text-foreground-secondary`.
- In the return JSX: `<button type={type} onClick={handleClick} className={`... ${sizeClasses} ${variantClasses} ${className}`}>`.

- [ ] **Step 4: Update `Input.web.tsx` wrapper to explicit `h-10`**

In `packages/ui/src/input/Input.web.tsx`:
Add `h-10` to line 33 wrapper:
```tsx
<div className={`relative flex items-center bg-panel-recessed border rounded-md px-3 h-10 transition-colors ${borderClasses}`}>
```
Update text classes from `text-text-primary` to `text-foreground` and `text-text-muted` to `text-foreground-muted`.

- [ ] **Step 5: Re-export theme tokens from `@brewlog/ui`**

In `packages/ui/src/index.web.ts` and `packages/ui/src/index.native.ts`:
```ts
export { THEMES, resolveTheme, DEFAULT_THEME, darkTheme, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
```

- [ ] **Step 6: Update remaining `@brewlog/ui` primitives to `text-foreground*`**

Update `Card.web.tsx`, `Badge.web.tsx`, `SegmentedControl.web.tsx`, `MetricTile.web.tsx`, `UiShowcase.web.tsx` from `text-text-*` to `text-foreground*`.

- [ ] **Step 7: Run `@brewlog/ui` tests to verify they pass**

Run: `npm test -w @brewlog/ui`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/ui/
git commit -m "feat(ui): standardize button height to h-10, add form props, and update typography tokens"
```

---

### Task 4: Standardize Modal Footers in `apps/web`

**Files:**
- Modify: `apps/web/src/features/recipes/RecipeBuilderModal.tsx`
- Modify: `apps/web/src/features/stash/StashView.tsx`
- Modify: `apps/web/src/features/equipment/EquipmentView.tsx`
- Modify: `apps/web/src/components/shared/ConfirmationModal.tsx`

**Interfaces:**
- Consumes: `@brewlog/ui` `Button` (`size="md"` / `h-10`).
- Produces: Modal footers with consistent 40px buttons and zero raw `py-*` padding.

- [ ] **Step 1: Refactor `RecipeBuilderModal.tsx` footer**

Import `Button` from `@brewlog/ui`:
Replace lines 1151-1165 in `apps/web/src/features/recipes/RecipeBuilderModal.tsx`:
```tsx
<Button
  type="button"
  variant="secondary"
  size="md"
  onClick={onClose}
  label="CANCEL"
/>
<Button
  type="submit"
  variant="primary"
  size="md"
  disabled={isSaving}
  loading={isSaving}
  label={isSaving ? 'SAVING...' : isEditing ? 'UPDATE RECIPE' : 'SAVE RECIPE'}
/>
```

- [ ] **Step 2: Refactor `ConfirmationModal.tsx` footer**

Import `Button` from `@brewlog/ui`:
Replace lines 65-79 in `apps/web/src/components/shared/ConfirmationModal.tsx`:
```tsx
<div className="flex justify-end space-x-3 pt-2">
  <Button
    type="button"
    variant="secondary"
    size="md"
    onClick={onClose}
    label={cancelLabel}
  />
  <Button
    type="button"
    variant={variant === 'danger' ? 'danger' : 'primary'}
    size="md"
    onClick={onConfirm}
    label={confirmLabel}
  />
</div>
```

- [ ] **Step 3: Refactor Add/Edit Bean modal footer in `StashView.tsx`**

Import `Button` from `@brewlog/ui`:
Replace lines 846-860 in `apps/web/src/features/stash/StashView.tsx`:
- Delete button: `<Button type="button" variant="danger" size="md" onClick={() => setIsDeleteConfirmOpen(true)} label="DELETE" />`
- Cancel button: `<Button type="button" variant="secondary" size="md" onClick={() => setIsModalOpen(false)} label="CANCEL" />`
- Save button: `<Button type="submit" variant="primary" size="md" disabled={isSaving || isDeleting} loading={isSaving} label={isSaving ? 'SAVING...' : editingBean ? 'SAVE CHANGES' : 'SAVE BEAN'} />`

- [ ] **Step 4: Refactor Add/Edit Equipment modal footer in `EquipmentView.tsx`**

Import `Button` from `@brewlog/ui`:
Replace lines 565-587 in `apps/web/src/features/equipment/EquipmentView.tsx`:
- Delete button: `<Button type="button" variant="danger" size="md" onClick={() => setIsDeleteConfirmOpen(true)} label="DELETE" />`
- Cancel button: `<Button type="button" variant="secondary" size="md" onClick={() => setIsModalOpen(false)} label="CANCEL" />`
- Save button: `<Button type="submit" variant="primary" size="md" label={editingEquipment ? 'SAVE CHANGES' : 'SAVE EQUIPMENT'} />`

- [ ] **Step 5: Verify modal components build cleanly**

Run: `npm run build -w @brewlog/web`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/recipes/RecipeBuilderModal.tsx \
        apps/web/src/components/shared/ConfirmationModal.tsx \
        apps/web/src/features/stash/StashView.tsx \
        apps/web/src/features/equipment/EquipmentView.tsx
git commit -m "feat(web): standardize modal footers to @brewlog/ui Button with h-10"
```

---

### Task 5: Standardize View Controls & Detail Action Buttons in `apps/web`

**Files:**
- Modify: `apps/web/src/features/stash/StashView.tsx`
- Modify: `apps/web/src/features/equipment/EquipmentView.tsx`
- Modify: `apps/web/src/routes/RecipesRoute.tsx`
- Modify: `apps/web/src/features/recipes/RecipeDetailPane.tsx`
- Modify: `apps/web/src/features/reviews/ReviewsView.tsx`

**Interfaces:**
- Consumes: `@brewlog/ui` `Button` (`size="sm"` / `h-8` and `size="md"` / `h-10`).
- Produces: Header triggers and pane actions standardized to 32px (`h-8`), eliminating all 28px/30px/36px discrepancies.

- [ ] **Step 1: Standardize header triggers in Stash, Equipment, Recipes, and Reviews**

- In `apps/web/src/features/stash/StashView.tsx` (line 280):
  Replace raw `ADD BEAN` button with:
  `<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAddModal} label="ADD BEAN" />`
- In `apps/web/src/features/equipment/EquipmentView.tsx` (line 229):
  Replace raw `ADD EQUIPMENT` button with:
  `<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAddModal} label="ADD EQUIPMENT" />`
- In `apps/web/src/routes/RecipesRoute.tsx` (line 100):
  Replace raw `NEW RECIPE` button with:
  `<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setEditingRecipe(null); setIsBuilderModalOpen(true); }} label="NEW RECIPE" />`
- In `apps/web/src/features/reviews/ReviewsView.tsx` (line 540):
  Replace raw `LOG REVIEW` button with:
  `<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleStartCreate} label="LOG REVIEW" />`

- [ ] **Step 2: Standardize Review Editor header and bottom actions in `ReviewsView.tsx`**

- In `ReviewsView.tsx` top header actions (lines 804-815):
  - Cancel: `<Button variant="secondary" size="sm" onClick={handleCancelEditor} label="Cancel" />`
  - Save: `<Button variant="primary" size="sm" type="submit" disabled={isSaving} loading={isSaving} label="Save Review" />`
- In `ReviewsView.tsx` bottom actions (lines 1399-1410):
  - Cancel: `<Button variant="secondary" size="md" onClick={handleCancelEditor} label="Cancel" />`
  - Save: `<Button variant="primary" size="md" type="submit" disabled={isSaving} loading={isSaving} label="Save Review" />`

- [ ] **Step 3: Standardize `RecipeDetailPane.tsx` action cluster to uniform 32px (`h-8`)**

In `apps/web/src/features/recipes/RecipeDetailPane.tsx`:
- Edit Recipe: `<button type="button" onClick={() => onEditRecipe(recipe)} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-foreground-secondary hover:text-foreground hover:bg-panel-recessed border border-border-subtle transition-colors cursor-pointer" ...><Pencil className="w-4 h-4" /></button>`
- Delete Recipe: `<button type="button" onClick={() => setIsDeleteModalOpen(true)} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-status-error/80 hover:text-status-error hover:bg-panel-recessed border border-border-subtle transition-colors cursor-pointer" ...><Trash2 className="w-4 h-4" /></button>`
- "BREW WITH THIS RECIPE":
  `<Button variant="primary" size="sm" icon={<Play className="w-4 h-4 fill-current" />} onClick={() => onSelectRecipeForTimer(scaledRecipe)} label="BREW WITH THIS RECIPE" />`

- [ ] **Step 4: Verify web builds cleanly**

Run: `npm run build -w @brewlog/web`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/stash/StashView.tsx \
        apps/web/src/features/equipment/EquipmentView.tsx \
        apps/web/src/routes/RecipesRoute.tsx \
        apps/web/src/features/recipes/RecipeDetailPane.tsx \
        apps/web/src/features/reviews/ReviewsView.tsx
git commit -m "feat(web): standardize view header and detail actions to h-8"
```

---

### Task 6: Semantic Typography Token Migration Across `apps/web`

**Files:**
- Modify: All files in `apps/web/src` containing `text-text-*`

**Interfaces:**
- Consumes: Tailwind v4 utilities `text-foreground`, `text-foreground-secondary`, `text-foreground-muted`.
- Produces: Complete elimination of `text-text-` prefix collision across `apps/web`.

- [ ] **Step 1: Replace `text-text-*` occurrences across `apps/web/src`**

Perform migration:
- `text-text-primary` -> `text-foreground`
- `text-text-secondary` -> `text-foreground-secondary`
- `text-text-muted` -> `text-foreground-muted`

- [ ] **Step 2: Assert zero remaining occurrences of `text-text-`**

Run: `grep -rn "text-text-" apps/web/src packages/ui/src`
Expected: Zero occurrences returned.

- [ ] **Step 3: Run web typecheck and build**

Run: `npm run build -w @brewlog/web`
Expected: Build succeeds without errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/ packages/ui/src/
git commit -m "refactor(web): migrate typography tokens from text-text-* to text-foreground*"
```

---

### Task 7: Playwright Automated Regression Gate (`button-sizing-tokens.spec.ts`)

**Files:**
- Create: `apps/web/e2e/button-sizing-tokens.spec.ts`

**Interfaces:**
- Consumes: Rendered DOM across `/timer`, `/stash`, `/recipes`, `/equipment`, `/reviews`, `/settings` and associated modal dialogs.
- Produces: Strict automated assertion enforcing heights within 32px (+/-1px), 40px (+/-1px), or 48px (+/-1px) and zero off-scale button heights.

- [ ] **Step 1: Implement `apps/web/e2e/button-sizing-tokens.spec.ts`**

Write the Playwright test file:
```ts
import { test, expect } from "@playwright/test";

const VALID_HEIGHTS = [32, 40, 48];
const TOLERANCE = 1.0;

function isValidHeight(height: number): boolean {
  return VALID_HEIGHTS.some((target) => Math.abs(height - target) <= TOLERANCE);
}

test.describe("Design System Button Sizing Tokens", () => {
  test("header triggers and navigation actions conform to 32px (h-8) or 40px (h-10)", async ({ page }) => {
    await page.goto("/stash");
    const addBeanBtn = page.getByRole("button", { name: /add bean/i });
    await expect(addBeanBtn).toBeVisible();
    const box = await addBeanBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(isValidHeight(box!.height)).toBe(true);
    expect(Math.abs(box!.height - 32)).toBeLessThanOrEqual(TOLERANCE);
  });

  test("modal footer actions conform to 40px (h-10)", async ({ page }) => {
    await page.goto("/stash");
    await page.getByRole("button", { name: /add bean/i }).click();
    const cancelBtn = page.getByRole("button", { name: /cancel/i });
    const saveBtn = page.getByRole("button", { name: /save bean/i });
    await expect(cancelBtn).toBeVisible();
    await expect(saveBtn).toBeVisible();

    const cancelBox = await cancelBtn.boundingBox();
    const saveBox = await saveBtn.boundingBox();
    expect(isValidHeight(cancelBox!.height)).toBe(true);
    expect(isValidHeight(saveBox!.height)).toBe(true);
    expect(Math.abs(cancelBox!.height - 40)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(saveBox!.height - 40)).toBeLessThanOrEqual(TOLERANCE);
  });

  test("recipe detail pane action cluster aligns uniformly to 32px (h-8)", async ({ page }) => {
    await page.goto("/recipes");
    const brewBtn = page.getByRole("button", { name: /brew with this recipe/i }).first();
    await expect(brewBtn).toBeVisible();
    const box = await brewBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.height - 32)).toBeLessThanOrEqual(TOLERANCE);
  });

  test("timer hero controls conform to 48px (h-12)", async ({ page }) => {
    await page.goto("/timer");
    const startBtn = page.getByRole("button", { name: /start/i });
    if (await startBtn.isVisible()) {
      const box = await startBtn.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.abs(box!.height - 48)).toBeLessThanOrEqual(TOLERANCE);
    }
  });

  test("all interactive buttons across primary views conform to [32px, 40px, 48px]", async ({ page }) => {
    const routes = ["/stash", "/recipes", "/equipment", "/reviews", "/settings"];
    for (const route of routes) {
      await page.goto(route);
      const buttons = await page.locator("button:visible, a[role='button']:visible").all();
      for (const btn of buttons) {
        const box = await btn.boundingBox();
        if (box && box.height > 10 && box.width > 10) {
          const valid = isValidHeight(box.height);
          if (!valid) {
            const text = (await btn.innerText()).trim();
            console.error(`Invalid button height: ${box.height}px on route ${route} ("${text}")`);
          }
          expect(valid).toBe(true);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run Playwright button sizing spec to verify**

Run: `npx playwright test apps/web/e2e/button-sizing-tokens.spec.ts`
Expected: 100% PASS across all assertions.

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/button-sizing-tokens.spec.ts
git commit -m "test(web): add automated Playwright button sizing verification spec"
```

---

### Task 8: Verification Gate & Monorepo Health Check

**Files:**
- Verification only

- [ ] **Step 1: Check for zero emoji**

Run: `git grep -P "[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]" packages/ apps/`
Expected: Zero occurrences.

- [ ] **Step 2: Run monorepo unit and integration tests**

Run: `npm run test`
Expected: All tests pass across `@brewlog/core`, `@brewlog/ui`, and `@brewlog/web`.

- [ ] **Step 3: Run full Playwright E2E suite**

Run: `npm run test:e2e -w @brewlog/web`
Expected: All E2E specs pass.
