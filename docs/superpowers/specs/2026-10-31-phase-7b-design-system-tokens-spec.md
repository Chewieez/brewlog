# Phase 7B: Design System Sizing Tokens and Button Height Standardization Spec

## 1. Overview and Problem Statement

During an automated Playwright UI audit across the web application (`apps/web`), significant button height divergence was identified:
- Review Form Header: Cancel button was 28px, Save Review button was 30px.
- Review Form Footer: Action buttons were 36px and 38px.
- Modal Footers (`RecipeBuilderModal`, `AddBeanModal`, `AddEquipmentModal`, `ConfirmationModal`): Heights ranged from 34px to 36px.
- Recipe Detail Pane: "BREW THIS RECIPE" button was 36px, directly adjacent to 32px Edit and Delete buttons.

### Root Cause
Buttons and form inputs across `apps/web` have predominantly been constructed using ad-hoc vertical padding utility classes (`py-1.5`, `py-2`, `py-2.5`) combined with varying font sizes, line heights, and borders, rather than utilizing strict tokenized height classes or consuming `@brewlog/ui` primitives. This results in subtle 2px-4px height misalignments that degrade visual polish and create layout jitter.

---

## 2. Standardized Sizing Scale (rem-based)

All sizing tokens are expressed in `rem` units (assuming standard root `1rem = 16px`) to preserve accessibility and browser font scaling:

| Size Token | rem Value | Target Height | Tailwind Class | Primary Use Cases |
| :--- | :--- | :--- | :--- | :--- |
| **Small (`sm`)** | `2rem` | 32px | `h-8` (`btn-size-sm`) | Header actions, secondary utility buttons, compact list/table actions, filter toggles, badge selectors |
| **Medium (`md`)** | `2.5rem` | 40px | `h-10` (`btn-size-md`) | Standard form inputs, modal footer primary/secondary actions, card call-to-actions, dialog controls |
| **Large (`lg`)** | `3rem` | 48px | `h-12` (`btn-size-lg`) | Hero brew timer controls (Start, Pause, Resume, Reset), primary onboarding CTAs, mobile thumb targets (>= 44pt) |

### Rejection of the 36px Intermediate Step
A 4px jump from 32px to 36px (or 36px to 40px) falls into the "uncanny valley" of UI design: it is only 2px of top/bottom margin difference, which reads to users as an accidental layout bug rather than an intentional hierarchical distinction. Sizing tiers must advance in noticeable 8px steps (32px -> 40px -> 48px).

---

## 3. Package Updates (`@brewlog/ui`)

### 3.1 Button Primitive (`packages/ui/src/button/Button.web.tsx`)
Update `sizeClasses` mapping in `@brewlog/ui`:
```typescript
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};
```
Ensure focus rings, tactile pseudo-classes (`btn-tactile-primary`, `btn-tactile-secondary`), and disabled states remain consistent across all sizes.

### 3.2 Form Input Primitives (`packages/ui/src/input/Input.web.tsx`)
Ensure text, number, and select inputs align with button sizing:
- Default input height: `h-10` (`2.5rem` / 40px).
- Compact input height: `h-8` (`2rem` / 32px) for search filters and dense table editing.

---

## 4. Web Application Refactoring Scope (`apps/web`)

### 4.1 Modal Dialogs
Replace arbitrary button styling in all modal footers with explicit `h-10` (`2.5rem`) controls:
- `apps/web/src/features/recipes/RecipeBuilderModal.tsx`
- `apps/web/src/features/stash/AddBeanModal.tsx`
- `apps/web/src/features/stash/EditBeanModal.tsx`
- `apps/web/src/features/equipment/AddEquipmentModal.tsx`
- `apps/web/src/components/shared/ConfirmationModal.tsx`

### 4.2 Views and Panes
- **Recipes (`apps/web/src/features/recipes/RecipeDetailPane.tsx`)**:
  - Unify action button cluster: adjust "BREW THIS RECIPE" and secondary actions (Edit / Delete) to share consistent tokenized heights.
- **Reviews (`apps/web/src/features/reviews/ReviewsView.tsx` & `ReviewDetailPane.tsx`)**:
  - Retain `h-8` for header actions (`Cancel`, `Save Review`).
  - Upgrade form submit/cancel in bottom pane to `h-10`.
- **Stash (`apps/web/src/features/stash/StashView.tsx`)**:
  - Standardize "+ ADD BEAN", filter pills, and Freeze/Thaw actions to `h-8`.
- **Equipment (`apps/web/src/features/equipment/EquipmentView.tsx`)**:
  - Standardize "+ ADD EQUIPMENT" and category filter chips to `h-8`.
- **Timer (`apps/web/src/features/timer/TimerView.tsx`)**:
  - Preserve hero timer button at `h-12` (`3rem` / 48px).
  - Standardize method selector pills and dose input controls.

---

## 5. Automated Verification and Regression Gate

### Playwright Automated Gate (`apps/web/e2e/button-sizing-tokens.spec.ts`)
Implement an end-to-end verification spec:
1. Navigate across all primary routes: `/timer`, `/stash`, `/recipes`, `/equipment`, `/reviews`, `/settings`.
2. Inspect every rendered `<button>` and `<a role="button">` element.
3. Assert that element `clientHeight` equals `32px`, `40px`, or `48px` within a 1px sub-pixel tolerance (`[31, 33]`, `[39, 41]`, or `[47, 49]`).
4. Fail immediately if any button renders at 28px, 30px, 34px, 36px, or arbitrary heights.

---

## 6. Semantic Color Token Renaming (Eliminate `text-text-*` Collision)

### Background & Collision
In Tailwind CSS v4, any CSS variable named `--color-<name>` automatically exposes a utility color identifier matching `<name>`. Because design tokens currently name typography colors `--color-text-primary`, `--color-text-secondary`, and `--color-text-muted`, Tailwind generates utility classes by prepending property prefixes, resulting in duplicated `text-text-*` classes (e.g., `text-` + `text-primary` = `text-text-primary`, `bg-text-primary`, etc.). Across `apps/web`, there are currently over 550 usages of this duplicated syntax.

### Migration Objective
During the Phase 7B token pass, rename typography color tokens to eliminate the double prefix:
- **Option A (Standard Design System Convention - Recommended)**:
  - `--color-foreground` -> generates `text-foreground`
  - `--color-foreground-muted` -> generates `text-foreground-muted`
  - `--color-foreground-subtle` -> generates `text-foreground-subtle`
- **Option B (Content-based Convention)**:
  - `--color-content-primary` -> generates `text-content-primary`
  - `--color-content-secondary` -> generates `text-content-secondary`
  - `--color-content-muted` -> generates `text-content-muted`

### Scope
- Update `ThemeColors` in `packages/core/src/theme.ts`.
- Update CSS variable definitions in `apps/web/src/index.css`.
- Update `SettingsContext.tsx` dynamic theme injector.
- Run a coordinated monorepo migration to replace all existing `text-text-*` references with the clean token class.

---

## 7. Acceptance Criteria

- [ ] All `@brewlog/ui` button size variants compile to `h-8` (32px), `h-10` (40px), and `h-12` (48px).
- [ ] All modal dialog footers use standardized `h-10` (40px) action buttons.
- [ ] All page header utility buttons and filter chips use standardized `h-8` (32px) buttons.
- [ ] Playwright button sizing test suite passes with zero non-standard height violations.
- [ ] Semantic typography color tokens are migrated to eliminate duplicated `text-text-*` classes.
- [ ] Monorepo unit and integration tests maintain 100% pass rate.
- [ ] Zero emoji present in code, styles, tests, or documentation.
