# Decouple Domain Freshness Statuses and Migrate Theme Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple domain freshness calculations from visual theme tokens, migrate design tokens from `@brewlog/core` to `@brewlog/ui`, eliminate unicode emoji characters, and align mobile and web presentation layers.

**Architecture:** Relocate `theme.ts` from `packages/core` to `packages/ui/src/theme/`, exposing presentation-tier freshness color and badge resolvers (`resolveFreshnessColor`, `resolveFreshnessBadgeVariant`) in `@brewlog/ui`. In `packages/core`, delete `badgeColor` and all presentation imports, leaving pure domain logic. Update `BeanCard`, `BeanDetailScreen`, and `ActiveBeanPill` in `apps/mobile` and `SettingsContext` in `apps/web` to consume tokens and resolvers from `@brewlog/ui`.

**Tech Stack:** TypeScript, React 19, React Native, Vitest, Playwright, Tailwind CSS v4, Lucide.

**Spec:** [`docs/superpowers/specs/2026-11-01-decouple-domain-freshness-and-migrate-themes-design.md`](file:///Users/greglawrence/orca/workspaces/brewlog/61-refactor-decouple-domain-freshness-statu/docs/superpowers/specs/2026-11-01-decouple-domain-freshness-and-migrate-themes-design.md)

## Global Constraints

- Zero color tokens, hex values, or visual theme contracts exist in `packages/core`.
- `packages/core` contains strictly domain models, math, conversions, and business rules.
- `@brewlog/ui` serves as the sole source of truth for design tokens, themes, and UI primitives.
- Zero emoji in code, styles, tests, or commit messages.
- Do not run broad test suites until ready to commit and push; only execute targeted vitest commands for the files touched in each task.

---

### Task 1: Migrate Theme Tokens to `@brewlog/ui`

**Files:**
- Create: `packages/ui/src/theme/theme.ts`
- Create: `packages/ui/src/theme/index.ts`
- Create: `packages/ui/src/theme/theme.test.ts`
- Modify: `packages/ui/src/index.web.ts:24-34`
- Modify: `packages/ui/src/index.native.ts:24-34`
- Modify: `packages/ui/src/badge/Badge.native.tsx:1-8`
- Modify: `packages/ui/src/button/Button.native.tsx:1-8`
- Modify: `packages/ui/src/card/Card.native.tsx:1-8`
- Modify: `packages/ui/src/input/Input.native.tsx:1-8`
- Modify: `packages/ui/src/metric-tile/MetricTile.native.tsx:1-8`
- Modify: `packages/ui/src/segmented-control/SegmentedControl.native.tsx:1-8`
- Modify: `packages/ui/src/showcase/UiShowcase.native.tsx:1-12`

**Interfaces:**
- Produces: `ThemeColors`, `ThemeTokens`, `TACTILE_DARK_THEME`, `CRISP_STUDIO_LIGHT_THEME`, `INDUSTRIAL_PRECISION_THEME`, `THEMES`, `DEFAULT_THEME`, `darkTheme`, `resolveTheme` directly from `@brewlog/ui`

- [ ] **Step 1: Write the theme definitions and unit test in `@brewlog/ui`**

Create `packages/ui/src/theme/theme.ts`:
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

export interface ThemeTokens {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
}

export const TACTILE_DARK_THEME: ThemeTokens = {
  id: 'tactile-dark',
  name: 'Tactile Dark Craft',
  isDark: true,
  colors: {
    canvas: '#0e0d0c',
    panel: '#171513',
    panelRecessed: '#12100f',
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    borderActive: 'rgba(255, 255, 255, 0.12)',
    accent: '#d97736',
    accentHover: '#e88344',
    foreground: '#f5f0eb',
    foregroundSecondary: '#a8a29e',
    foregroundMuted: '#78716c',
    get textPrimary() { return this.foreground; },
    get textSecondary() { return this.foregroundSecondary; },
    get textMuted() { return this.foregroundMuted; },
    statusSuccess: '#22c55e',
    statusWarning: '#f59e0b',
    statusError: '#ef4444',
    statusInfo: '#38bdf8',
  },
};

export const CRISP_STUDIO_LIGHT_THEME: ThemeTokens = {
  id: 'studio-light',
  name: 'Crisp Studio Light',
  isDark: false,
  colors: {
    canvas: '#f8fafc',
    panel: '#ffffff',
    panelRecessed: '#f1f5f9',
    borderSubtle: '#e2e8f0',
    borderActive: '#cbd5e1',
    accent: '#c25412',
    accentHover: '#9a3412',
    foreground: '#0f172a',
    foregroundSecondary: '#475569',
    foregroundMuted: '#64748b',
    get textPrimary() { return this.foreground; },
    get textSecondary() { return this.foregroundSecondary; },
    get textMuted() { return this.foregroundMuted; },
    statusSuccess: '#16a34a',
    statusWarning: '#d97706',
    statusError: '#dc2626',
    statusInfo: '#0284c7',
  },
};

export const INDUSTRIAL_PRECISION_THEME: ThemeTokens = {
  id: 'industrial-precision',
  name: 'Industrial Precision',
  isDark: true,
  colors: {
    canvas: '#121214',
    panel: '#18181b',
    panelRecessed: '#202024',
    borderSubtle: '#3f3f46',
    borderActive: '#52525b',
    accent: '#d97736',
    accentHover: '#e88344',
    foreground: '#f4f4f5',
    foregroundSecondary: '#a1a1aa',
    foregroundMuted: '#71717a',
    get textPrimary() { return this.foreground; },
    get textSecondary() { return this.foregroundSecondary; },
    get textMuted() { return this.foregroundMuted; },
    statusSuccess: '#22c55e',
    statusWarning: '#f59e0b',
    statusError: '#ef4444',
    statusInfo: '#38bdf8',
  },
};

export const THEMES: Record<string, ThemeTokens> = {
  [TACTILE_DARK_THEME.id]: TACTILE_DARK_THEME,
  [CRISP_STUDIO_LIGHT_THEME.id]: CRISP_STUDIO_LIGHT_THEME,
  [INDUSTRIAL_PRECISION_THEME.id]: INDUSTRIAL_PRECISION_THEME,
};

export const DEFAULT_THEME = TACTILE_DARK_THEME;
export const darkTheme = TACTILE_DARK_THEME;

export function resolveTheme(
  preference: 'system' | 'tactile_dark' | 'studio_light' = 'system',
  isSystemDark = true
): ThemeTokens {
  if (preference === 'studio_light') return CRISP_STUDIO_LIGHT_THEME;
  if (preference === 'tactile_dark') return TACTILE_DARK_THEME;
  return isSystemDark ? TACTILE_DARK_THEME : CRISP_STUDIO_LIGHT_THEME;
}
```

Create `packages/ui/src/theme/index.ts`:
```ts
export * from './theme';
```

Create `packages/ui/src/theme/theme.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  INDUSTRIAL_PRECISION_THEME,
  TACTILE_DARK_THEME,
  CRISP_STUDIO_LIGHT_THEME,
  THEMES,
  resolveTheme,
  DEFAULT_THEME,
  darkTheme,
} from './theme';

describe('theme tokens in @brewlog/ui', () => {
  it('exports INDUSTRIAL_PRECISION_THEME with all required color keys', () => {
    expect(INDUSTRIAL_PRECISION_THEME.id).toBe('industrial-precision');
    expect(INDUSTRIAL_PRECISION_THEME.isDark).toBe(true);
    expect(INDUSTRIAL_PRECISION_THEME.colors.canvas).toBe('#121214');
    expect(INDUSTRIAL_PRECISION_THEME.colors.panel).toBe('#18181b');
    expect(INDUSTRIAL_PRECISION_THEME.colors.panelRecessed).toBe('#202024');
    expect(INDUSTRIAL_PRECISION_THEME.colors.borderSubtle).toBe('#3f3f46');
    expect(INDUSTRIAL_PRECISION_THEME.colors.borderActive).toBe('#52525b');
    expect(INDUSTRIAL_PRECISION_THEME.colors.accent).toBe('#d97736');
    expect(INDUSTRIAL_PRECISION_THEME.colors.accentHover).toBe('#e88344');
    expect(INDUSTRIAL_PRECISION_THEME.colors.textPrimary).toBe('#f4f4f5');
    expect(INDUSTRIAL_PRECISION_THEME.colors.textSecondary).toBe('#a1a1aa');
    expect(INDUSTRIAL_PRECISION_THEME.colors.textMuted).toBe('#71717a');
    expect(INDUSTRIAL_PRECISION_THEME.colors.statusSuccess).toBe('#22c55e');
    expect(INDUSTRIAL_PRECISION_THEME.colors.statusWarning).toBe('#f59e0b');
    expect(INDUSTRIAL_PRECISION_THEME.colors.statusError).toBe('#ef4444');
    expect(INDUSTRIAL_PRECISION_THEME.colors.statusInfo).toBe('#38bdf8');
  });

  it('exports TACTILE_DARK_THEME and CRISP_STUDIO_LIGHT_THEME', () => {
    expect(TACTILE_DARK_THEME.id).toBe('tactile-dark');
    expect(TACTILE_DARK_THEME.isDark).toBe(true);
    expect(TACTILE_DARK_THEME.colors.canvas).toBe('#0e0d0c');

    expect(CRISP_STUDIO_LIGHT_THEME.id).toBe('studio-light');
    expect(CRISP_STUDIO_LIGHT_THEME.isDark).toBe(false);
    expect(CRISP_STUDIO_LIGHT_THEME.colors.canvas).toBe('#f8fafc');
  });

  it('includes themes in THEMES map', () => {
    expect(THEMES['industrial-precision']).toBe(INDUSTRIAL_PRECISION_THEME);
    expect(THEMES['tactile-dark']).toBe(TACTILE_DARK_THEME);
    expect(THEMES['studio-light']).toBe(CRISP_STUDIO_LIGHT_THEME);
  });

  it('exports semantic foreground tokens on all registered themes with backward-compatible aliases', () => {
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

  describe('resolveTheme', () => {
    it('resolves system preference to dark or light based on system state', () => {
      expect(resolveTheme('system', true)).toBe(TACTILE_DARK_THEME);
      expect(resolveTheme('system', false)).toBe(CRISP_STUDIO_LIGHT_THEME);
      expect(resolveTheme(undefined, true)).toBe(TACTILE_DARK_THEME);
      expect(resolveTheme(undefined, false)).toBe(CRISP_STUDIO_LIGHT_THEME);
    });

    it('resolves explicit tactile_dark and studio_light preferences regardless of system state', () => {
      expect(resolveTheme('tactile_dark', false)).toBe(TACTILE_DARK_THEME);
      expect(resolveTheme('tactile_dark', true)).toBe(TACTILE_DARK_THEME);
      expect(resolveTheme('studio_light', true)).toBe(CRISP_STUDIO_LIGHT_THEME);
      expect(resolveTheme('studio_light', false)).toBe(CRISP_STUDIO_LIGHT_THEME);
    });
  });
});
```

- [ ] **Step 2: Update re-exports in `@brewlog/ui` barrel files**

Update `packages/ui/src/index.web.ts` and `packages/ui/src/index.native.ts` to export directly from `./theme` instead of `@brewlog/core`:
```ts
export * from './theme';
```

- [ ] **Step 3: Update internal native component theme imports in `packages/ui`**

In each of the following files, change:
`import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';`
to:
`import { INDUSTRIAL_PRECISION_THEME } from '../theme';`:
- `packages/ui/src/badge/Badge.native.tsx`
- `packages/ui/src/button/Button.native.tsx`
- `packages/ui/src/card/Card.native.tsx`
- `packages/ui/src/input/Input.native.tsx`
- `packages/ui/src/metric-tile/MetricTile.native.tsx`
- `packages/ui/src/segmented-control/SegmentedControl.native.tsx`
- `packages/ui/src/showcase/UiShowcase.native.tsx`

- [ ] **Step 4: Run targeted vitest command to verify theme tokens**

Run: `npx vitest run packages/ui/src/theme/theme.test.ts`
Expected: PASS (all theme assertions pass in `@brewlog/ui`).

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/theme packages/ui/src/index.web.ts packages/ui/src/index.native.ts packages/ui/src/badge/Badge.native.tsx packages/ui/src/button/Button.native.tsx packages/ui/src/card/Card.native.tsx packages/ui/src/input/Input.native.tsx packages/ui/src/metric-tile/MetricTile.native.tsx packages/ui/src/segmented-control/SegmentedControl.native.tsx packages/ui/src/showcase/UiShowcase.native.tsx
git commit -m "feat(ui): migrate theme tokens and resolveTheme into @brewlog/ui"
```

---

### Task 2: Add Freshness Presentation Resolvers & Info Badge Variant to `@brewlog/ui`

**Files:**
- Create: `packages/ui/src/theme/freshness.ts`
- Modify: `packages/ui/src/theme/index.ts:1-2`
- Modify: `packages/ui/src/badge/Badge.types.ts:1-6`
- Modify: `packages/ui/src/badge/Badge.web.tsx:1-33`
- Modify: `packages/ui/src/badge/Badge.native.tsx:15-68`
- Modify: `packages/ui/src/badge/Badge.web.test.tsx:1-30`
- Modify: `packages/ui/src/theme/theme.test.ts:75-120`

**Interfaces:**
- Consumes: `BeanRestingInfo` from `@brewlog/core` (via peer/workspace dependency), `ThemeColors` from `./theme`
- Produces: `resolveFreshnessColor(input, colors): string`, `resolveFreshnessBadgeVariant(input): BadgeVariant`

- [ ] **Step 1: Write failing tests for freshness resolvers and info badge variant**

Add to `packages/ui/src/theme/theme.test.ts`:
```ts
import { resolveFreshnessColor, resolveFreshnessBadgeVariant } from './freshness';

describe('freshness presentation resolvers', () => {
  const colors = INDUSTRIAL_PRECISION_THEME.colors;

  it('resolves colors for standard resting stages', () => {
    expect(resolveFreshnessColor({ status: 'peak' }, colors)).toBe(colors.statusSuccess);
    expect(resolveFreshnessColor({ status: 'resting' }, colors)).toBe(colors.statusWarning);
    expect(resolveFreshnessColor({ status: 'aging' }, colors)).toBe(colors.accent);
    expect(resolveFreshnessColor({ status: 'past-peak' }, colors)).toBe(colors.textMuted);
  });

  it('resolves frozen status to statusInfo color regardless of stage', () => {
    expect(resolveFreshnessColor({ status: 'peak', isFrozen: true }, colors)).toBe(colors.statusInfo);
    expect(resolveFreshnessColor({ status: 'resting', isFrozen: true }, colors)).toBe(colors.statusInfo);
  });

  it('resolves unspecified roast date to textMuted color', () => {
    expect(resolveFreshnessColor({ status: 'resting', hasRoastDate: false }, colors)).toBe(colors.textMuted);
  });

  it('resolves badge variants accurately', () => {
    expect(resolveFreshnessBadgeVariant({ status: 'peak' })).toBe('success');
    expect(resolveFreshnessBadgeVariant({ status: 'resting' })).toBe('warning');
    expect(resolveFreshnessBadgeVariant({ status: 'aging' })).toBe('accent');
    expect(resolveFreshnessBadgeVariant({ status: 'past-peak' })).toBe('default');
    expect(resolveFreshnessBadgeVariant({ status: 'peak', isFrozen: true })).toBe('info');
    expect(resolveFreshnessBadgeVariant({ status: 'resting', hasRoastDate: false })).toBe('default');
  });
});
```

Add to `packages/ui/src/badge/Badge.web.test.tsx`:
```ts
it('renders info badge with sky styling', () => {
  render(<Badge label="Frozen" variant="info" />);
  const badge = screen.getByText('Frozen');
  expect(badge).toBeInTheDocument();
  expect(badge.className).toContain('text-status-info');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/ui/src/theme/theme.test.ts`
Expected: FAIL (`resolveFreshnessColor` is not defined).

- [ ] **Step 3: Implement `freshness.ts` and update `Badge` components**

Create `packages/ui/src/theme/freshness.ts`:
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

Update `packages/ui/src/theme/index.ts`:
```ts
export * from './theme';
export * from './freshness';
```

Update `packages/ui/src/badge/Badge.types.ts`:
```ts
export interface BadgeProps {
  label: string;
  variant?: 'mono' | 'default' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  testID?: string;
}
```

Update `packages/ui/src/badge/Badge.web.tsx`:
```tsx
  } else if (variant === 'error') {
    variantClasses = 'bg-status-error/10 border border-status-error/40 text-status-error font-sans font-medium';
  } else if (variant === 'info') {
    variantClasses = 'bg-status-info/10 border border-status-info/40 text-status-info font-sans font-medium';
  }
```

Update `packages/ui/src/badge/Badge.native.tsx`:
Add `variant === 'info' && styles.infoContainer` and `variant === 'info' && styles.infoText`.
In styles:
```tsx
infoContainer: { backgroundColor: `${colors.statusInfo}15`, borderColor: `${colors.statusInfo}60` },
infoText: { color: colors.statusInfo },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/ui/src/theme/theme.test.ts packages/ui/src/badge/Badge.web.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/theme/freshness.ts packages/ui/src/theme/index.ts packages/ui/src/badge packages/ui/src/theme/theme.test.ts
git commit -m "feat(ui): add freshness presentation resolvers and info badge variant"
```

---

### Task 3: Decouple Domain Logic in `@brewlog/core`

**Files:**
- Modify: `packages/core/src/restingUtils.ts:1-171`
- Modify: `packages/core/src/restingUtils.test.ts:1-293`
- Modify: `packages/core/src/index.ts:1-8`
- Delete: `packages/core/src/theme.ts`
- Delete: `packages/core/src/theme.test.ts`

**Interfaces:**
- Produces: `BeanRestingInfo` without `badgeColor`, `calculateBeanRestingInfo`, `offsetRoastDateForThaw` without presentation dependencies

- [ ] **Step 1: Write failing test in `packages/core/src/restingUtils.test.ts`**

Update `packages/core/src/restingUtils.test.ts`:
- Remove `import { INDUSTRIAL_PRECISION_THEME } from "./theme";`.
- Remove all `expect(info.badgeColor).toBe(...)` lines.
- Change frozen badge expectations from `"❄️ Frozen at Day ..."` to `"Frozen at Day ..."`.
- Add an assertion: `expect('badgeColor' in info1).toBe(false)`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/src/restingUtils.test.ts`
Expected: FAIL (`badgeColor` still present and badgeLabel has emoji).

- [ ] **Step 3: Remove `badgeColor`, theme imports, and emoji from `restingUtils.ts`**

In `packages/core/src/restingUtils.ts`:
1. Remove `import { INDUSTRIAL_PRECISION_THEME } from "./theme";` and `const { colors } = INDUSTRIAL_PRECISION_THEME;`.
2. In `BeanRestingInfo`, delete `badgeColor: string;`.
3. In `calculateBeanRestingInfo`:
   - Delete `let badgeColor: string;` and all assignments to `badgeColor`.
   - Update frozen badge label generation to omit emoji:
     ```ts
     badgeLabel = `Frozen at Day ${effectiveDays} (${
       status === "peak" ? "Peak Window" : stageLabel
     })`;
     ```
   - Return `BeanRestingInfo` without `badgeColor`.

- [ ] **Step 4: Remove `theme.ts` and `theme.test.ts` from `packages/core`**

1. Delete `packages/core/src/theme.ts`.
2. Delete `packages/core/src/theme.test.ts`.
3. In `packages/core/src/index.ts`, delete `export * from "./theme";`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/core/src/restingUtils.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git rm packages/core/src/theme.ts packages/core/src/theme.test.ts
git add packages/core/src/restingUtils.ts packages/core/src/restingUtils.test.ts packages/core/src/index.ts
git commit -m "refactor(core): decouple restingUtils from theme tokens and remove theme.ts from core"
```

---

### Task 4: Align Mobile Stash Components and Migrate Theme Imports in `apps/mobile`

**Files:**
- Modify: `apps/mobile/src/features/stash/utils/restingUtils.test.ts:1-290`
- Modify: `apps/mobile/src/features/stash/components/BeanCard.tsx:1-100`
- Modify: `apps/mobile/src/features/stash/screens/BeanDetailScreen.tsx:20-50, 305-375`
- Modify: `apps/mobile/src/features/stash/components/ActiveBeanPill.tsx:1-60`
- Modify: All mobile files importing `INDUSTRIAL_PRECISION_THEME` from `@brewlog/core`

**Interfaces:**
- Consumes: `INDUSTRIAL_PRECISION_THEME, resolveFreshnessColor` from `@brewlog/ui`, `calculateBeanRestingInfo` from `@brewlog/core`

- [ ] **Step 1: Update mobile `restingUtils.test.ts` and `BeanCard.test.tsx`**

In `apps/mobile/src/features/stash/utils/restingUtils.test.ts`:
- Update import of `INDUSTRIAL_PRECISION_THEME` to `@brewlog/ui`.
- Remove `badgeColor` assertions and emoji assertions from expected strings.
- Test presentation mapping using `resolveFreshnessColor`:
  ```ts
  import { INDUSTRIAL_PRECISION_THEME, resolveFreshnessColor } from '@brewlog/ui';
  const color = resolveFreshnessColor({ status: info1.status, isFrozen: info1.isFrozen, hasRoastDate: true }, INDUSTRIAL_PRECISION_THEME.colors);
  expect(color).toBe(INDUSTRIAL_PRECISION_THEME.colors.statusWarning);
  ```

In `apps/mobile/src/features/stash/components/BeanCard.test.tsx`:
- Ensure fake timer tests pass without referencing `badgeColor`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/stash/utils/restingUtils.test.ts`
Expected: FAIL (`BeanCard` or tests referencing old types).

- [ ] **Step 3: Update `BeanCard.tsx`, `BeanDetailScreen.tsx`, and `ActiveBeanPill.tsx`**

1. In `apps/mobile/src/features/stash/components/BeanCard.tsx`:
   - Change:
     ```ts
     import { Bean } from '@brewlog/core';
     import { INDUSTRIAL_PRECISION_THEME, resolveFreshnessColor } from '@brewlog/ui';
     ```
   - Calculate `badgeColor`:
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
   - Replace `restingInfo.badgeColor` with `badgeColor` in styles.

2. In `apps/mobile/src/features/stash/screens/BeanDetailScreen.tsx`:
   - Update imports:
     ```ts
     import { Bean, formatDisplayDate } from '@brewlog/core';
     import { INDUSTRIAL_PRECISION_THEME, resolveFreshnessColor } from '@brewlog/ui';
     ```
   - Calculate `badgeColor` via `resolveFreshnessColor` and replace `restingInfo.badgeColor`.
   - Remove `❄️` emoji on line 362:
     ```tsx
     {bean.isFrozen
       ? `Day ${restingInfo.effectiveDays} (Frozen)`
       : `Day ${restingInfo.effectiveDays}`}
     ```

3. In `apps/mobile/src/features/stash/components/ActiveBeanPill.tsx`:
   - Update imports:
     ```ts
     import { Bean } from '@brewlog/core';
     import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/ui';
     ```
   - Remove `🫘` emoji on line 42:
     ```tsx
     <Text style={styles.roasterAndName}>
       {bean.roaster.toUpperCase()} • {bean.name}
     </Text>
     ```

4. Update all remaining mobile files importing `INDUSTRIAL_PRECISION_THEME` from `@brewlog/core` to import it from `@brewlog/ui`:
   - `apps/mobile/app/_layout.tsx`
   - `apps/mobile/app/(tabs)/_layout.ios.tsx`
   - `apps/mobile/app/(tabs)/index.tsx`
   - `apps/mobile/app/settings/modal.tsx`
   - `apps/mobile/src/components/navigation/FloatingPillTabBar.tsx`
   - `apps/mobile/src/components/timer/ActiveStageCard.tsx`
   - `apps/mobile/src/components/timer/CollapsibleCalculator.tsx`
   - `apps/mobile/src/components/timer/FreeBrewSplitTimeline.tsx`
   - `apps/mobile/src/components/timer/MethodPills.tsx`
   - `apps/mobile/src/components/timer/StageTimeline.tsx`
   - `apps/mobile/src/components/timer/TimerHero.tsx`
   - `apps/mobile/src/features/equipment/components/EquipmentCard.tsx`
   - `apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.tsx`
   - `apps/mobile/src/features/equipment/screens/EquipmentModalScreen.tsx`
   - `apps/mobile/src/features/recipes/components/DoseRescaler.tsx`
   - `apps/mobile/src/features/recipes/components/MethodFilterBar.tsx`
   - `apps/mobile/src/features/recipes/components/RecipeCard.tsx`
   - `apps/mobile/src/features/recipes/components/SpecsGrid.tsx`
   - `apps/mobile/src/features/recipes/components/StagesTimeline.tsx`
   - `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.tsx`
   - `apps/mobile/src/features/recipes/screens/RecipeDetailScreen.tsx`
   - `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx`
   - `apps/mobile/src/features/reviews/components/FlavorTagSelector.tsx`
   - `apps/mobile/src/features/reviews/components/ReviewCard.tsx`
   - `apps/mobile/src/features/reviews/components/ReviewsSummaryBar.tsx`
   - `apps/mobile/src/features/reviews/components/ScaAttributeScoring.tsx`
   - `apps/mobile/src/features/reviews/components/ScaFlavorWheelSvg.tsx`
   - `apps/mobile/src/features/reviews/screens/ReviewDetailScreen.tsx`
   - `apps/mobile/src/features/reviews/screens/ReviewModalScreen.tsx`
   - `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx`
   - `apps/mobile/src/features/stash/components/CellarSummaryBar.tsx`
   - `apps/mobile/src/features/stash/screens/BeanModalScreen.tsx`
   - `apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx`

- [ ] **Step 4: Run targeted mobile unit tests**

Run: `npx vitest run apps/mobile/src/features/stash/utils/restingUtils.test.ts apps/mobile/src/features/stash/components/BeanCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile
git commit -m "refactor(mobile): migrate theme imports to @brewlog/ui and remove emoji from stash components"
```

---

### Task 5: Align Web Settings and Stash in `apps/web`

**Files:**
- Modify: `apps/web/src/features/settings/SettingsContext.tsx:1-20`
- Modify: `apps/web/src/features/stash/StashView.tsx:1-20`
- Test: `apps/web/src/features/stash/StashView.test.tsx`

**Interfaces:**
- Consumes: `resolveTheme` from `@brewlog/ui`, `calculateBeanRestingInfo` from `@brewlog/core`

- [ ] **Step 1: Update `SettingsContext.tsx` in `apps/web`**

In `apps/web/src/features/settings/SettingsContext.tsx`:
Change:
```ts
import { UserSettings, DEFAULT_USER_SETTINGS, resolveTheme } from '@brewlog/core';
```
to:
```ts
import { UserSettings, DEFAULT_USER_SETTINGS } from '@brewlog/core';
import { resolveTheme } from '@brewlog/ui';
```

- [ ] **Step 2: Verify `StashView.tsx` consumes decoupled `BeanRestingInfo`**

In `apps/web/src/features/stash/StashView.tsx`, verify that `calculateBeanRestingInfo` result is consumed without any expectation of `badgeColor`.

- [ ] **Step 3: Run web unit tests**

Run: `npx vitest run apps/web/src/features/stash/StashView.test.tsx apps/web/src/features/settings/SettingsContext.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/settings/SettingsContext.tsx apps/web/src/features/stash/StashView.tsx
git commit -m "refactor(web): import resolveTheme from @brewlog/ui and align stash view"
```

---

### Task 6: Zero Emoji Gate, Typecheck Verification & Pre-Commit Verification

**Files:**
- Monorepo-wide code files

- [ ] **Step 1: Run zero-emoji verification scan**

Run:
```bash
python3 -c "
import os, re, sys
emoji_pattern = re.compile(r'[\U00010000-\U0010ffff]|[\u2600-\u27bf]')
violations = []
for root, dirs, files in os.walk('.'):
    if any(p in root for p in ['node_modules', '.git', 'dist', '.expo']):
        continue
    for file in files:
        if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.json', '.css')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                for line_no, line in enumerate(f, 1):
                    # Exclude the mathematical multiplication cross ✕ (\u2715) if present
                    line_clean = line.replace('\u2715', '')
                    if emoji_pattern.search(line_clean):
                        violations.append(f'{path}:{line_no}: {line.strip()}')
if violations:
    print('Emoji violations found:\n' + '\n'.join(violations))
    sys.exit(1)
print('Zero emoji gate passed!')
"
```
Expected: `Zero emoji gate passed!`.

- [ ] **Step 2: Run monorepo typecheck**

Run: `npm run typecheck`
Expected: All TypeScript checks across `@brewlog/core`, `@brewlog/ui`, `@brewlog/web`, and `@brewlog/mobile` exit with 0 errors.

- [ ] **Step 3: Run Playwright E2E tests in `apps/web`**

Run: `npm run test:e2e` in `apps/web`
Expected: PASS (all browser E2E smoke tests and design system checks pass).

- [ ] **Step 4: Final verification and commit**

Run: `npm test` across all workspaces to ensure all unit and integration test suites pass prior to push.
```bash
git status
```
Verify clean git status and prepare PR.
