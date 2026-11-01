# Design Spec: Phase 7B - Standardize Design System Sizing Tokens and Button Heights

- **Date**: 2026-10-31
- **Topic**: Phase 7B Design System Sizing Tokens, Button Height Standardization, and Semantic Typography Tokens
- **Issue**: [#59](https://github.com/Chewieez/brewlog/issues/59)
- **Status**: Validated / Ready for Implementation Planning
- **Targets**: `@brewlog/core`, `@brewlog/ui`, `@brewlog/web` (`apps/web`), Playwright E2E verification

---

## 1. Problem Statement & Context

During an automated Playwright UI audit across the web application (`apps/web`), significant button height divergence was identified:
- Review editor header Cancel was 28px and Save was 30px, while bottom actions were 36px and 38px.
- Modal footers (`RecipeBuilderModal`, `AddBeanModal`, `AddEquipmentModal`, `ConfirmationModal`) varied between 34px and 36px due to arbitrary `py-*` padding and differing line-heights on raw `<button>` elements.
- `RecipeDetailPane` displayed a 36px "BREW THIS RECIPE" button immediately adjacent to 32px Edit and Delete buttons.
- The 4px difference between 32px and 36px sits in an "uncanny valley" that reads as an accidental padding defect rather than an intentional visual hierarchy.
- In addition, Tailwind CSS v4's property prefixing on `--color-text-*` tokens causes duplicated utility classes (`text-text-primary`, `text-text-secondary`, `text-text-muted`) across 550+ locations.

### Root Cause
Buttons and form inputs across `apps/web` have predominantly been constructed using ad-hoc vertical padding utility classes (`py-1.5`, `py-2`, `py-2.5`) combined with varying font sizes, line heights, and borders, rather than utilizing strict tokenized height classes or consuming `@brewlog/ui` primitives. This results in subtle 2px-4px height misalignments that degrade visual polish and create layout jitter.

---

## 2. Standardized rem-Based Sizing Scale

All interactive buttons and input controls across web routes must conform strictly to a 3-tier rem-based scale:

| Size Tier | Token / Utility | Target Height | rem Value | Application & Usage |
|-----------|-----------------|---------------|-----------|---------------------|
| **Small** | `sm` / `h-8` | 32px | `2rem` | View header triggers ("ADD BEAN", "LOG REVIEW"), table/list row controls, filter chips, detail pane actions |
| **Medium**| `md` / `h-10` | 40px | `2.5rem` | Standard form inputs, modal footer primary/secondary CTAs, dialog confirm/cancel buttons |
| **Large** | `lg` / `h-12` | 48px | `3rem` | Hero brew timer controls (Start, Pause, Resume, Reset), mobile touch targets (>= 44pt) |

### Rejection of the 36px Intermediate Step
A 4px jump from 32px to 36px (or 36px to 40px) falls into the "uncanny valley" of UI design: it is only 2px of top/bottom margin difference, which reads to users as an accidental layout bug rather than an intentional hierarchical distinction. Sizing tiers must advance in noticeable 8px steps (32px -> 40px -> 48px).

---

## 3. Shared Theme & Typography Token Architecture

### 3.1 `@brewlog/core` (`packages/core/src/theme.ts`)

Update `ThemeColors` and all registered themes (`TACTILE_DARK_THEME`, `CRISP_STUDIO_LIGHT_THEME`, and `INDUSTRIAL_PRECISION_THEME`) with single-semantic foreground tokens while maintaining full backwards compatibility for existing mobile consumers:

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
  foreground: string;          // High-contrast headings and active values
  foregroundSecondary: string; // Subtitles, descriptions, units
  foregroundMuted: string;     // Hints, timestamps, placeholders

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

Add ergonomic standard aliases:
```ts
export const DEFAULT_THEME = TACTILE_DARK_THEME;
export const darkTheme = TACTILE_DARK_THEME;
```

### 3.2 CSS & Tailwind CSS v4 Setup (`apps/web/src/index.css`)

Update `:root`, `html.theme-studio-light`, and `@theme` definitions:
- Register `--color-foreground`, `--color-foreground-secondary`, and `--color-foreground-muted`.
- Tailwind v4 will generate clean single-prefixed utilities: `text-foreground`, `text-foreground-secondary`, `text-foreground-muted` (and matching `bg-foreground*`, `border-foreground*`).
- Retain `--color-text-*` as fallback CSS variables during the migration to ensure no visual regressions occur while components are updated.

### 3.3 Root Theme Injection (`apps/web/src/layouts/RootLayout.tsx` & `SettingsContext.tsx`)

The theme injection loops iterate over the active theme's colors and convert camelCase properties to CSS variables:
- `foreground` -> `--color-foreground`
- `foregroundSecondary` -> `--color-foreground-secondary`
- `foregroundMuted` -> `--color-foreground-muted`

---

## 4. UI Primitives (`packages/ui`)

### 4.1 Button (`Button.web.tsx`, `Button.types.ts`)
1. **Size Scale**:
   - `sm`: `'h-8 px-3 text-xs gap-1.5'` (32px / 2rem)
   - `md`: `'h-10 px-4 text-xs gap-2'` (40px / 2.5rem — updated from `h-11` / 44px)
   - `lg`: `'h-12 px-6 text-sm gap-2.5'` (48px / 3rem)
   - Default `size = 'md'`
2. **Prop Enhancements**:
   - Add `type?: 'button' | 'submit' | 'reset'` to `ButtonProps` (defaulting to `'button'` on web) to support HTML form submissions.
   - Add `className?: string` to support layout utilities (e.g., `shrink-0`, `w-full sm:w-auto`).
   - Add `onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void` as an alias to `onPress` for natural web usage.
3. **Typography Tokens**:
   - `secondary` variant: `text-foreground` and `hover:border-foreground-secondary`.
   - `ghost` variant: `text-foreground-secondary` and `hover:text-foreground`.

### 4.2 Form Input Primitives (`packages/ui/src/input/Input.web.tsx`)
1. **Explicit Height**: Add `h-10` (40px / 2.5rem) to the input wrapper container `div` so that text and numeric form inputs match medium button heights across all forms.
2. **Typography Tokens**: Update input text to `text-foreground`, placeholder and unit labels to `text-foreground-muted`.

### 4.3 Primitives Sweep
Update `Card.web.tsx`, `Badge.web.tsx`, `SegmentedControl.web.tsx`, `MetricTile.web.tsx`, and `UiShowcase.web.tsx` to consume `text-foreground`, `text-foreground-secondary`, and `text-foreground-muted`.

---

## 5. Web Application Refactoring Scope (`apps/web`)

### 5.1 Modal Dialogs (`h-10` / 40px Standard)
Replace arbitrary button styling in all modal footers with `@brewlog/ui` `Button` (`size="md"` / `h-10`):
- `apps/web/src/features/recipes/RecipeBuilderModal.tsx`
- `apps/web/src/features/stash/StashView.tsx` (Add/Edit Bean Modal)
- `apps/web/src/features/equipment/EquipmentView.tsx` (Add/Edit Equipment Modal)
- `apps/web/src/components/shared/ConfirmationModal.tsx`

### 5.2 Views and Panes (`h-8` / 32px Standard)
1. **Primary Header Triggers**:
   - `StashView.tsx`: "ADD BEAN" -> `<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAddModal} label="ADD BEAN" />` (`h-8`)
   - `EquipmentView.tsx`: "ADD EQUIPMENT" -> `<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAddModal} label="ADD EQUIPMENT" />` (`h-8`)
   - `RecipesRoute.tsx`: "NEW RECIPE" -> `<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={...} label="NEW RECIPE" />` (`h-8`)
   - `ReviewsView.tsx`: "LOG REVIEW" -> `<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleStartCreate} label="LOG REVIEW" />` (`h-8`)
2. **Review Editor Controls (`ReviewsView.tsx`)**:
   - Top Header Actions: Cancel and Save Review both standardized to `size="sm"` (`h-8` / 32px).
   - Bottom Actions: Cancel and Save Review both standardized to `size="md"` (`h-10` / 40px).
3. **Recipe Detail Pane (`RecipeDetailPane.tsx`)**:
   - Edit Recipe and Delete Recipe: Explicit `h-8 w-8` icon buttons.
   - "BREW WITH THIS RECIPE": `<Button variant="primary" size="sm" ... />` (`h-8` / 32px), creating a uniform 32px action bar.
4. **Timer (`TimerView.tsx`)**:
   - Preserve hero timer button at `h-12` (`3rem` / 48px).

### 5.3 Web Typography Sweep
Replace all occurrences across `apps/web/src`:
- `text-text-primary` -> `text-foreground`
- `text-text-secondary` -> `text-foreground-secondary`
- `text-text-muted` -> `text-foreground-muted`

---

## 6. Automated Verification and Regression Gate

### Playwright Automated Gate (`apps/web/e2e/button-sizing-tokens.spec.ts`)
Implement an end-to-end verification spec:
1. Navigate across all primary routes: `/timer`, `/stash`, `/recipes`, `/equipment`, `/reviews`, `/settings`.
2. Inspect rendered `<button>` and `<a role="button">` elements across routes and open modals (Add Bean, Add Equipment, Recipe Builder, Confirmation Modal, Review Editor).
3. Assert that element `clientHeight` / `boundingBox().height` equals `32px`, `40px`, or `48px` within a 1px sub-pixel tolerance (`[31, 33]`, `[39, 41]`, or `[47, 49]`).
4. Rejection Gate: Any standard button rendering at 28px, 30px, 34px, 36px, 38px, or 44px fails the spec.

---

## 7. Acceptance Criteria

- [ ] All `@brewlog/ui` button size variants compile to `h-8` (32px), `h-10` (40px), and `h-12` (48px).
- [ ] All modal dialog footers use standardized `h-10` (40px) action buttons.
- [ ] All page header utility buttons and filter chips use standardized `h-8` (32px) buttons.
- [ ] Zero buttons styled solely with `py-*` without an explicit height token.
- [ ] Playwright button sizing test suite (`apps/web/e2e/button-sizing-tokens.spec.ts`) passes with 100% compliance.
- [ ] Semantic typography color tokens are migrated to eliminate duplicated `text-text-*` classes across the entire codebase.
- [ ] Monorepo unit and integration tests maintain 100% pass rate when run prior to push.
- [ ] Zero emoji present in code, styles, tests, or documentation.
