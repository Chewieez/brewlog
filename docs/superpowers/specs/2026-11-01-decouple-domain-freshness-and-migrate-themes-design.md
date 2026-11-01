# Design Spec: Issue #61 - Decouple Domain Freshness Statuses and Migrate Theme Tokens to @brewlog/ui

- **Date**: 2026-11-01
- **Topic**: Architectural decoupling of visual theme tokens from domain models, migration of design tokens to `@brewlog/ui`, and presentation-layer freshness resolution
- **Issue**: [#61](https://github.com/Chewieez/brewlog/issues/61)
- **Status**: Validated / Ready for Implementation Planning
- **Targets**: `@brewlog/core`, `@brewlog/ui`, `@brewlog/web` (`apps/web`), `@brewlog/mobile` (`apps/mobile`)

---

## 1. Problem Statement & Context

In early phases of BrewLog development, presentation-tier design tokens (`TACTILE_DARK_THEME`, `CRISP_STUDIO_LIGHT_THEME`, `INDUSTRIAL_PRECISION_THEME`) were placed inside `packages/core/src/theme.ts`. Additionally, the domain resting calculation engine in `packages/core/src/restingUtils.ts` returns literal theme hex color codes:
```ts
badgeColor: colors.statusSuccess
```
This couples pure mathematical domain logic to presentation styling contracts and forces `packages/core` to retain visual concerns.

Furthermore:
- Hardcoded Unicode emojis (such as `❄️` in `restingUtils.ts` and `BeanDetailScreen.tsx`, and `🫘` in `ActiveBeanPill.tsx`) violate the design system requirement ("Zero emoji anywhere").
- Components across `apps/mobile` and `apps/web` import theme tokens from `@brewlog/core` rather than the canonical `@brewlog/ui` package.

### Acceptance Criteria
1. Zero color tokens, hex values, or visual theme contracts exist in `packages/core`.
2. `packages/core` contains strictly domain models, math, conversions, and business rules.
3. `@brewlog/ui` serves as the sole source of truth for design tokens, themes, and UI primitives.
4. All unit, integration, and E2E test suites pass across `apps/web`, `apps/mobile`, and shared packages.
5. Zero emoji in code, styles, tests, or commit messages.

---

## 2. Domain Layer Architecture (`@brewlog/core`)

### 2.1 Decouple `BeanRestingInfo` & `restingUtils.ts`
Remove all theme imports and visual color contracts from [`packages/core/src/restingUtils.ts`](file:///Users/greglawrence/orca/workspaces/brewlog/61-refactor-decouple-domain-freshness-statu/packages/core/src/restingUtils.ts).

```ts
export interface BeanRestingInfo {
  effectiveDays: number;
  status: 'resting' | 'peak' | 'aging' | 'past-peak';
  label: string;
  stageLabel: string;
  isFrozen: boolean;
  badgeLabel: string;
  progressPercent: number;
  recommendedRestDays: number;
}
```

- **`badgeColor` is deleted**: Core returns pure domain properties without presentation values.
- **Emoji Removal**: `badgeLabel` for frozen beans removes the `❄️` character:
  ```ts
  if (isFrozen) {
    badgeLabel = `Frozen at Day ${effectiveDays} (${
      status === "peak" ? "Peak Window" : stageLabel
    })`;
  }
  ```
- **Import Cleanup**: Remove `import { INDUSTRIAL_PRECISION_THEME } from "./theme";` and `const { colors } = INDUSTRIAL_PRECISION_THEME;`.

### 2.2 Core Package Contract Cleanup
- Delete `packages/core/src/theme.ts`.
- Delete `packages/core/src/theme.test.ts`.
- In `packages/core/src/index.ts`, remove `export * from "./theme";`.
- Update `packages/core/src/restingUtils.test.ts`:
  - Remove all theme token imports and `badgeColor` assertions.
  - Update frozen badge label assertions from `"❄️ Frozen at Day ..."` to `"Frozen at Day ..."`.

---

## 3. Design System & Presentation Architecture (`@brewlog/ui`)

### 3.1 Theme Directory (`packages/ui/src/theme/`)
Create a dedicated theme module within `@brewlog/ui`:

```
packages/ui/src/theme/
├── index.ts        # Barrel export for theme tokens, interfaces, and resolvers
├── theme.ts        # ThemeTokens, ThemeColors, TACTILE_DARK_THEME, CRISP_STUDIO_LIGHT_THEME,
│                   # INDUSTRIAL_PRECISION_THEME, THEMES, DEFAULT_THEME, darkTheme, resolveTheme
├── freshness.ts    # Presentation resolvers mapping domain resting state to theme colors/variants
└── theme.test.ts   # Comprehensive tests for tokens, theme resolution, and freshness mapping
```

### 3.2 Freshness Presentation Resolvers (`freshness.ts`)
Provide centralized presentation mapping so mobile screens, web components, and test harnesses share a single source of truth:

```ts
import type { ThemeColors } from './theme';
import type { BeanRestingInfo } from '@brewlog/core';
import type { BadgeProps } from '../badge/Badge.types';

export interface FreshnessPresentationInput {
  status: BeanRestingInfo['status'];
  isFrozen?: boolean;
  hasRoastDate?: boolean;
}

export function resolveFreshnessColor(
  input: FreshnessPresentationInput,
  colors: ThemeColors
): string {
  if (input.hasRoastDate === false) return colors.textMuted;
  if (input.isFrozen) return colors.statusInfo;
  switch (input.status) {
    case 'peak': return colors.statusSuccess;
    case 'resting': return colors.statusWarning;
    case 'aging': return colors.accent;
    case 'past-peak': return colors.textMuted;
  }
}

export function resolveFreshnessBadgeVariant(
  input: FreshnessPresentationInput
): NonNullable<BadgeProps['variant']> {
  if (input.hasRoastDate === false) return 'default';
  if (input.isFrozen) return 'info';
  switch (input.status) {
    case 'peak': return 'success';
    case 'resting': return 'warning';
    case 'aging': return 'accent';
    case 'past-peak': return 'default';
  }
}
```

### 3.3 `Badge` Component Enhancement
Add the `'info'` variant across web and native implementations:
- **`packages/ui/src/badge/Badge.types.ts`**:
  ```ts
  export interface BadgeProps {
    label: string;
    variant?: 'mono' | 'default' | 'accent' | 'success' | 'warning' | 'error' | 'info';
    size?: 'sm' | 'md';
    testID?: string;
  }
  ```
- **`packages/ui/src/badge/Badge.native.tsx`**:
  - Add `variant === 'info' && styles.infoContainer` and `styles.infoText`.
  - `infoContainer`: `{ backgroundColor: `${colors.statusInfo}15`, borderColor: `${colors.statusInfo}60` }`.
  - `infoText`: `{ color: colors.statusInfo }`.
- **`packages/ui/src/badge/Badge.web.tsx`**:
  - Add `else if (variant === 'info')`:
    `variantClasses = 'bg-status-info/10 border border-status-info/40 text-status-info font-sans font-medium';`
- **`packages/ui/src/badge/Badge.web.test.tsx`**:
  - Add a unit test verifying the `info` variant styling.

### 3.4 Internal `@brewlog/ui` Updates
- In `Badge.native.tsx`, `Button.native.tsx`, `Card.native.tsx`, `Input.native.tsx`, `MetricTile.native.tsx`, `SegmentedControl.native.tsx`, and `UiShowcase.native.tsx`:
  - Change `import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core'` to import from `../theme` or `./theme`.
- In `packages/ui/src/index.web.ts` and `packages/ui/src/index.native.ts`:
  - Replace re-exports from `@brewlog/core` with direct re-exports from `./theme`.

---

## 4. UI Component Alignment & Monorepo Migration

### 4.1 Mobile Application (`apps/mobile`)
1. **[`BeanCard.tsx`](file:///Users/greglawrence/orca/workspaces/brewlog/61-refactor-decouple-domain-freshness-statu/apps/mobile/src/features/stash/components/BeanCard.tsx)**:
   - Import `INDUSTRIAL_PRECISION_THEME, resolveFreshnessColor` from `@brewlog/ui`.
   - Calculate badge color:
     ```ts
     const badgeColor = resolveFreshnessColor(
       {
         status: restingInfo.status,
         isFrozen: bean.isFrozen,
         hasRoastDate: Boolean(bean.roastDate),
       },
       colors
     );
     ```
   - Apply `badgeColor` to the resting badge container and text.
2. **[`BeanDetailScreen.tsx`](file:///Users/greglawrence/orca/workspaces/brewlog/61-refactor-decouple-domain-freshness-statu/apps/mobile/src/features/stash/screens/BeanDetailScreen.tsx)**:
   - Import `INDUSTRIAL_PRECISION_THEME, resolveFreshnessColor` from `@brewlog/ui`.
   - Resolve `badgeColor` via `resolveFreshnessColor`.
   - Replace `restingInfo.badgeColor` in resting badge, `timelineSegmentBar` highlights, and `timelineStageLabel`.
   - Remove unicode emoji:
     ```tsx
     {bean.isFrozen
       ? `Day ${restingInfo.effectiveDays} (Frozen)`
       : `Day ${restingInfo.effectiveDays}`}
     ```
3. **[`ActiveBeanPill.tsx`](file:///Users/greglawrence/orca/workspaces/brewlog/61-refactor-decouple-domain-freshness-statu/apps/mobile/src/features/stash/components/ActiveBeanPill.tsx)**:
   - Import `INDUSTRIAL_PRECISION_THEME` from `@brewlog/ui`.
   - Remove unicode emoji `🫘`:
     ```tsx
     <Text style={styles.roasterAndName}>
       {bean.roaster.toUpperCase()} • {bean.name}
     </Text>
     ```
4. **[`restingUtils.ts` & `restingUtils.test.ts`](file:///Users/greglawrence/orca/workspaces/brewlog/61-refactor-decouple-domain-freshness-statu/apps/mobile/src/features/stash/utils/restingUtils.test.ts)**:
   - Update tests to assert domain resting info without `badgeColor` and without emoji.
   - Use `resolveFreshnessColor` from `@brewlog/ui` to verify presentation integration.
5. **Monorepo-wide Theme Import Updates in `apps/mobile`**:
   - Update all remaining screen and component files importing `INDUSTRIAL_PRECISION_THEME` from `@brewlog/core` to import from `@brewlog/ui`:
     - `app/_layout.tsx`
     - `app/(tabs)/_layout.ios.tsx`
     - `app/(tabs)/index.tsx`
     - `app/settings/modal.tsx`
     - All screens and components in `src/components/` and `src/features/`

### 4.2 Web Application (`apps/web`)
1. **[`SettingsContext.tsx`](file:///Users/greglawrence/orca/workspaces/brewlog/61-refactor-decouple-domain-freshness-statu/apps/web/src/features/settings/SettingsContext.tsx)**:
   - Update `resolveTheme` import from `@brewlog/core` to `@brewlog/ui`.
2. **[`StashView.tsx`](file:///Users/greglawrence/orca/workspaces/brewlog/61-refactor-decouple-domain-freshness-statu/apps/web/src/features/stash/StashView.tsx)**:
   - Retain existing `getRestingStatusBadgeClass(status, frozen, hasRoastDate)` or consume `resolveFreshnessBadgeVariant`.
   - Ensure resting badge consumes decoupled `BeanRestingInfo` without `badgeColor`.

---

## 5. Zero Emoji Audit

- Ensure no Unicode emoji characters exist in:
  - `packages/core/src/restingUtils.ts`
  - `packages/core/src/restingUtils.test.ts`
  - `apps/mobile/src/features/stash/utils/restingUtils.test.ts`
  - `apps/mobile/src/features/stash/screens/BeanDetailScreen.tsx`
  - `apps/mobile/src/features/stash/components/ActiveBeanPill.tsx`
- Run a project-wide regex scan verifying zero emojis in code or styles.

---

## 6. Testing & Quality Strategy

1. **Targeted Unit Tests (Development)**:
   - Run `vitest run packages/core/src/restingUtils.test.ts`.
   - Run `vitest run packages/ui/src/theme/theme.test.ts`.
   - Run `vitest run packages/ui/src/badge/Badge.web.test.tsx`.
   - Run `vitest run apps/mobile/src/features/stash/utils/restingUtils.test.ts`.
   - Run `vitest run apps/mobile/src/features/stash/components/BeanCard.test.tsx`.
   - Run `vitest run apps/web/src/features/stash/StashView.test.tsx`.
2. **Typecheck Verification**:
   - Run `npm run typecheck` across all workspaces to guarantee zero broken import paths or missing exports.
3. **Pre-Commit Verification**:
   - Run Playwright E2E tests (`npx playwright test` in `apps/web`).
   - Run full test suite only when preparing for commit and push.
