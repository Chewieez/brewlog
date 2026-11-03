# Dynamic Theming in apps/mobile & Retire Industrial Precision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish dynamic theme resolution in `apps/mobile` (and `@brewlog/ui` native primitives) reacting to user settings and system appearance, migrate all 39 mobile files and 7 UI primitives from `INDUSTRIAL_PRECISION_THEME` to `makeStyles` / `useTheme()`, add theme selection in mobile settings, and completely delete `INDUSTRIAL_PRECISION_THEME`.

**Architecture:** `@brewlog/ui` introduces `ThemeContext`, `ThemeProvider`, `useTheme()`, and a theme-id-memoized `makeStyles()` helper. `apps/mobile/app/_layout.tsx` wraps the navigation hierarchy in `ThemeProvider` dynamically resolved from `SettingsContext` and `useColorScheme()`. All components consume dynamic theme tokens inside component render/styles, and `INDUSTRIAL_PRECISION_THEME` is eliminated from `packages/ui/src/theme/theme.ts`.

**Tech Stack:** React 19, React Native 0.86, Expo Router, `@brewlog/ui`, `@brewlog/core`, Vitest, `@testing-library/react`.

**Spec:** [`docs/superpowers/specs/2026-11-01-mobile-dynamic-theming-design.md`](file:///Users/greglawrence/orca/workspaces/brewlog/64-refactor-adopt-dynamic-theming-in-apps-m/docs/superpowers/specs/2026-11-01-mobile-dynamic-theming-design.md)

## Global Constraints

- Zero emoji in code, styles, tests, docstrings, or commit messages.
- Zero hardcoded color hex values in screens or components; all values must derive from `ThemeColors`.
- Do not run broad or full test suites for small intermediate edits. Run only targeted tests per task until ready to commit and push.
- `useTheme()` must default safely to `DEFAULT_THEME` (`TACTILE_DARK_THEME`) when called outside a provider so standalone unit tests do not break.
- Exact header title for the stash item screen in `apps/mobile/app/_layout.tsx` is `Bean Details`.
- Theme selector in `apps/mobile/app/settings/modal.tsx` must be placed at the top of the settings options list (under header/cloud status, above Weight Unit).

---

### Task 1: Theme Context and `makeStyles` Helper in `@brewlog/ui`

**Files:**
- Create: `packages/ui/src/theme/ThemeContext.tsx`
- Create: `packages/ui/src/theme/makeStyles.ts`
- Create: `packages/ui/src/theme/ThemeContext.test.tsx`
- Modify: `packages/ui/src/theme/index.ts`
- Modify: `packages/ui/src/index.native.ts`
- Modify: `packages/ui/src/index.web.ts`

**Interfaces:**
- Consumes: `ThemeTokens`, `ThemeColors`, `DEFAULT_THEME` from `packages/ui/src/theme/theme.ts`.
- Produces: `ThemeContext`, `ThemeProvider`, `useTheme()`, `makeStyles()`, `ThemeContextValue`, `ThemeProviderProps`.

- [ ] **Step 1: Write unit tests for `ThemeContext` and `makeStyles`**

```tsx
// packages/ui/src/theme/ThemeContext.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import { makeStyles } from './makeStyles';
import { TACTILE_DARK_THEME, CRISP_STUDIO_LIGHT_THEME } from './theme';

describe('ThemeContext & useTheme', () => {
  it('falls back to DEFAULT_THEME when rendered outside a ThemeProvider', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme.id).toBe(TACTILE_DARK_THEME.id);
    expect(result.current.isDark).toBe(true);
    expect(result.current.colors.canvas).toBe(TACTILE_DARK_THEME.colors.canvas);
  });

  it('provides the custom theme when wrapped in ThemeProvider', () => {
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <ThemeProvider theme={CRISP_STUDIO_LIGHT_THEME}>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme.id).toBe(CRISP_STUDIO_LIGHT_THEME.id);
    expect(result.current.isDark).toBe(false);
    expect(result.current.colors.canvas).toBe(CRISP_STUDIO_LIGHT_THEME.colors.canvas);
  });
});

describe('makeStyles', () => {
  it('generates styles for the active theme and memoizes by theme id', () => {
    const useStyles = makeStyles((colors) => ({
      box: {
        backgroundColor: colors.canvas,
      },
    }));

    const { result, rerender } = renderHook(() => useStyles(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider theme={TACTILE_DARK_THEME}>{children}</ThemeProvider>
      ),
    });

    const darkStyles = result.current;
    expect(darkStyles.box.backgroundColor).toBe(TACTILE_DARK_THEME.colors.canvas);

    rerender();
    expect(result.current).toBe(darkStyles);
  });

  it('recomputes styles when the theme changes', () => {
    const useStyles = makeStyles((colors) => ({
      box: {
        backgroundColor: colors.canvas,
      },
    }));

    let currentTheme = TACTILE_DARK_THEME;
    const { result, rerender } = renderHook(() => useStyles(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider theme={currentTheme}>{children}</ThemeProvider>
      ),
    });

    expect(result.current.box.backgroundColor).toBe(TACTILE_DARK_THEME.colors.canvas);

    currentTheme = CRISP_STUDIO_LIGHT_THEME;
    rerender();

    expect(result.current.box.backgroundColor).toBe(CRISP_STUDIO_LIGHT_THEME.colors.canvas);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/ui/src/theme/ThemeContext.test.tsx`
Expected: FAIL (modules `ThemeContext` and `makeStyles` do not exist).

- [ ] **Step 3: Implement `ThemeContext.tsx`, `makeStyles.ts`, and index exports**

`packages/ui/src/theme/ThemeContext.tsx`:
```tsx
import React, { createContext, useContext, useMemo } from 'react';
import { ThemeTokens, DEFAULT_THEME, ThemeColors } from './theme';

export interface ThemeContextValue {
  theme: ThemeTokens;
  colors: ThemeColors;
  isDark: boolean;
}

const defaultContextValue: ThemeContextValue = {
  theme: DEFAULT_THEME,
  colors: DEFAULT_THEME.colors,
  isDark: DEFAULT_THEME.isDark,
};

const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

export interface ThemeProviderProps {
  theme?: ThemeTokens;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  theme = DEFAULT_THEME,
  children,
}) => {
  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    colors: theme.colors,
    isDark: theme.isDark,
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
```

`packages/ui/src/theme/makeStyles.ts`:
```tsx
import { StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';
import { ThemeColors, ThemeTokens } from './theme';

type NamedStyles<T> = StyleSheet.NamedStyles<T>;
type StyleFactory<T extends NamedStyles<T> | NamedStyles<any>> = (
  colors: ThemeColors,
  theme: ThemeTokens
) => T;

export function makeStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  styleFactory: StyleFactory<T>
) {
  let cachedThemeId: string | null = null;
  let cachedStyles: T | null = null;

  return function useStyles(): T {
    const { colors, theme } = useTheme();

    if (cachedStyles !== null && cachedThemeId === theme.id) {
      return cachedStyles;
    }

    const createFn = StyleSheet && typeof StyleSheet.create === 'function'
      ? StyleSheet.create
      : ((s: any) => s);

    cachedStyles = createFn(styleFactory(colors, theme));
    cachedThemeId = theme.id;
    return cachedStyles;
  };
}
```

`packages/ui/src/theme/index.ts`:
```tsx
export * from './theme';
export * from './freshness';
export * from './ThemeContext';
export * from './makeStyles';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/ui/src/theme/ThemeContext.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/theme/
git commit -m "feat(ui): add ThemeContext, ThemeProvider, useTheme, and makeStyles helper"
```

---

### Task 2: Refactor Native UI Components in `@brewlog/ui` to Dynamic Theming

**Files:**
- Modify: `packages/ui/src/button/Button.native.tsx`
- Modify: `packages/ui/src/card/Card.native.tsx`
- Modify: `packages/ui/src/badge/Badge.native.tsx`
- Modify: `packages/ui/src/input/Input.native.tsx`
- Modify: `packages/ui/src/metric-tile/MetricTile.native.tsx`
- Modify: `packages/ui/src/segmented-control/SegmentedControl.native.tsx`
- Modify: `packages/ui/src/showcase/UiShowcase.native.tsx`
- Test: `packages/ui/src/button/Button.native.test.tsx`

**Interfaces:**
- Consumes: `makeStyles`, `useTheme` from `../theme`.
- Produces: Native UI components dynamically adapting to current theme without static `INDUSTRIAL_PRECISION_THEME` imports.

- [ ] **Step 1: Update `Button.native.tsx`**

Replace static `const colors = INDUSTRIAL_PRECISION_THEME.colors;` and static `styles = StyleSheet.create(...)` with:
```tsx
import { makeStyles, useTheme } from '../theme';

const useStyles = makeStyles((colors) => ({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 6, gap: 8 },
  smContainer: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 8 },
  mdContainer: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12 },
  lgContainer: { minHeight: 52, paddingHorizontal: 20, paddingVertical: 14 },
  primaryContainer: { backgroundColor: colors.accent },
  secondaryContainer: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.borderActive },
  ghostContainer: { backgroundColor: 'transparent' },
  dangerContainer: { backgroundColor: `${colors.statusError}15`, borderWidth: 1, borderColor: `${colors.statusError}60` },
  disabledContainer: { opacity: 0.5 },
  baseText: { fontFamily: 'JetBrainsMono_700Bold', letterSpacing: 0.5, textTransform: 'uppercase' },
  smText: { fontSize: 11 },
  mdText: { fontSize: 12 },
  lgText: { fontSize: 13 },
  primaryText: { color: colors.canvas },
  secondaryText: { color: colors.foreground },
  ghostText: { color: colors.foregroundSecondary },
  dangerText: { color: colors.statusError },
  disabledText: { color: colors.foregroundMuted },
  iconSlot: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
}));

export const Button: React.FC<ButtonProps> = ({ ... }) => {
  const styles = useStyles();
  const { colors } = useTheme();
  // ... rest of component logic, passing styles and colors to ActivityIndicator ...
};
```

- [ ] **Step 2: Update `Card.native.tsx`, `Badge.native.tsx`, `Input.native.tsx`, `MetricTile.native.tsx`, `SegmentedControl.native.tsx`, `UiShowcase.native.tsx`**

In each component:
1. Replace `import { INDUSTRIAL_PRECISION_THEME } from '../theme';` with `import { makeStyles, useTheme } from '../theme';`.
2. Convert static `StyleSheet.create({ ... })` to `const useStyles = makeStyles((colors) => ({ ... }));`.
3. Call `const styles = useStyles();` (and `const { colors } = useTheme();` when direct colors are needed).
4. In `Input.native.tsx`: pass `colors.foregroundMuted` to `placeholderTextColor`.

- [ ] **Step 3: Run component tests to verify they pass**

Run: `npx vitest run packages/ui/src/button/Button.native.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/
git commit -m "refactor(ui): convert native components to consume dynamic theme tokens"
```

---

### Task 3: Retire `INDUSTRIAL_PRECISION_THEME` from `@brewlog/ui`

**Files:**
- Modify: `packages/ui/src/theme/theme.ts`
- Modify: `packages/ui/src/theme/theme.test.ts`

**Interfaces:**
- Consumes: None.
- Produces: Cleaned `THEMES` map containing only `TACTILE_DARK_THEME` and `CRISP_STUDIO_LIGHT_THEME`.

- [ ] **Step 1: Write test expectations in `theme.test.ts`**

Update `packages/ui/src/theme/theme.test.ts`:
- Remove tests expecting `INDUSTRIAL_PRECISION_THEME`.
- Verify `THEMES` contains only `'tactile-dark'` and `'studio-light'`.
- Verify `resolveTheme('system', true)` resolves to `TACTILE_DARK_THEME` and `resolveTheme('system', false)` resolves to `CRISP_STUDIO_LIGHT_THEME`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/ui/src/theme/theme.test.ts`
Expected: FAIL (until `INDUSTRIAL_PRECISION_THEME` is removed from `theme.ts`).

- [ ] **Step 3: Delete `INDUSTRIAL_PRECISION_THEME` in `theme.ts`**

In `packages/ui/src/theme/theme.ts`:
- Delete the `export const INDUSTRIAL_PRECISION_THEME: ThemeTokens = { ... };` declaration.
- Update `THEMES`:
```ts
export const THEMES: Record<string, ThemeTokens> = {
  [TACTILE_DARK_THEME.id]: TACTILE_DARK_THEME,
  [CRISP_STUDIO_LIGHT_THEME.id]: CRISP_STUDIO_LIGHT_THEME,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/ui/src/theme/theme.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/theme/
git commit -m "refactor(ui): delete INDUSTRIAL_PRECISION_THEME and update theme dictionary"
```

---

### Task 4: Dynamic Theme Root Wiring & Tab Navigation in `apps/mobile`

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.ios.tsx`
- Modify: `apps/mobile/src/components/navigation/FloatingPillTabBar.tsx`
- Modify: `apps/mobile/__tests__/rootLayout.test.tsx`
- Modify: `apps/mobile/__tests__/tabs/_layout.test.tsx`

**Interfaces:**
- Consumes: `useSettings()` from `src/features/settings/SettingsContext`, `useColorScheme()` from `react-native`, `ThemeProvider`, `useTheme`, `makeStyles`, `resolveTheme` from `@brewlog/ui`.
- Produces: Dynamic navigation headers, status bar, navigation bar, and tab bar reacting to active theme.

- [ ] **Step 1: Update `rootLayout.test.tsx` to expect dynamic ThemeProvider**

In `apps/mobile/__tests__/rootLayout.test.tsx`:
Add mock for `useSettings` returning `{ settings: { theme: 'system' } }` and verify `RootLayout` renders without errors with `title: 'Bean Details'` for `stash/[id]`.

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run apps/mobile/__tests__/rootLayout.test.tsx`
Expected: Fails or needs update.

- [ ] **Step 3: Update `apps/mobile/app/_layout.tsx`**

1. Remove `import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/ui';` and `const { colors } = INDUSTRIAL_PRECISION_THEME;`.
2. Import `ThemeProvider`, `useTheme`, `resolveTheme` from `@brewlog/ui`.
3. Import `useColorScheme` from `react-native`.
4. Import `useSettings` from `../src/features/settings/SettingsContext`.
5. Break root layout into `RootLayout` -> `ThemedAppNavigator` -> `NavigationRoot`:
   - `ThemedAppNavigator` computes `activeTheme = resolveTheme(settings.theme, colorScheme === 'dark')` and wraps `NavigationRoot` in `<ThemeProvider theme={activeTheme}>`.
   - `NavigationRoot` calls `const { colors, isDark } = useTheme();`.
   - Mount `<StatusBar style={isDark ? 'light' : 'dark'} />` and `<NavigationBar style={isDark ? 'light' : 'dark'} />`.
   - Configure `Stack` options using `colors.canvas`, `colors.panel`, `colors.foreground`.
   - Set `title: 'Bean Details'` on `stash/[id]`.

- [ ] **Step 4: Update `apps/mobile/app/(tabs)/_layout.ios.tsx` & `FloatingPillTabBar.tsx`**

`_layout.ios.tsx`:
1. Remove `INDUSTRIAL_PRECISION_THEME` import.
2. Call `const { colors, isDark } = useTheme();`.
3. Set `blurEffect={isDark ? 'dark' : 'systemMaterialLight'}`.
4. Set `tintColor={colors.accent}`.
5. In `labelStyle`, set `default.color = colors.foregroundSecondary` and `selected.color = colors.accent`.

`FloatingPillTabBar.tsx`:
1. Remove `INDUSTRIAL_PRECISION_THEME` import.
2. Convert static styles to `makeStyles((colors) => ({ ... }))`.
3. Call `useStyles()` and `useTheme()`.
4. Style tab pill background `colors.panel`, border `colors.borderSubtle`, text `colors.foreground`, inactive `colors.foregroundSecondary`.

- [ ] **Step 5: Run root layout and tab layout tests**

Run: `npx vitest run apps/mobile/__tests__/rootLayout.test.tsx apps/mobile/__tests__/tabs/_layout.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/ apps/mobile/src/components/navigation/ apps/mobile/__tests__/
git commit -m "feat(mobile): integrate dynamic ThemeProvider in root layout and navigation tabs"
```

---

### Task 5: Mobile Settings Screen Theme Selector

**Files:**
- Modify: `apps/mobile/app/settings/modal.tsx`
- Modify: `apps/mobile/src/features/settings/screens/SettingsModalScreen.test.tsx`

**Interfaces:**
- Consumes: `useSettings`, `useTheme`, `makeStyles` from `@brewlog/ui`.
- Produces: Interactive theme selection section at the top of the settings options list.

- [ ] **Step 1: Write test for Theme selection in `SettingsModalScreen.test.tsx`**

In `apps/mobile/src/features/settings/screens/SettingsModalScreen.test.tsx`:
Add a test asserting that the Theme selector options ("SYSTEM", "TACTILE DARK", "STUDIO LIGHT") are rendered and calling `updateSettings({ theme: 'studio_light' })` is invoked when tapped.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/settings/screens/SettingsModalScreen.test.tsx`
Expected: FAIL (Theme selector not yet in modal).

- [ ] **Step 3: Implement Theme Selection in `modal.tsx`**

1. Remove `INDUSTRIAL_PRECISION_THEME` import and replace with `makeStyles` / `useTheme`.
2. Define:
```tsx
const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'SYSTEM' },
  { id: 'tactile_dark', label: 'TACTILE DARK' },
  { id: 'studio_light', label: 'STUDIO LIGHT' },
];
```
3. Add handler:
```tsx
const handleSelectTheme = async (theme: ThemePreference) => {
  if (settings.theme === theme) return;
  Haptics.selectionAsync().catch(() => {});
  await updateSettings({ theme });
};
```
4. Render the Theme preference container as the **first option** under the grabber/cloud status and above **Weight Unit**.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/mobile/src/features/settings/screens/SettingsModalScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/settings/ apps/mobile/src/features/settings/
git commit -m "feat(mobile): add theme preference picker to settings modal"
```

---

### Task 6: Migrate Auth & Timer Mobile Components

**Files:**
- Modify: `apps/mobile/src/features/auth/AuthSheet.tsx`
- Modify: `apps/mobile/src/features/auth/ProfileHeaderButton.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/src/components/timer/TimerHero.tsx`
- Modify: `apps/mobile/src/components/timer/CollapsibleCalculator.tsx`
- Modify: `apps/mobile/src/components/timer/ActiveStageCard.tsx`
- Modify: `apps/mobile/src/components/timer/StageTimeline.tsx`
- Modify: `apps/mobile/src/components/timer/FreeBrewSplitTimeline.tsx`
- Modify: `apps/mobile/src/components/timer/MethodPills.tsx`
- Test: `apps/mobile/src/features/auth/ProfileHeaderButton.test.tsx`
- Test: `apps/mobile/src/components/timer/TimerHero.test.tsx`
- Test: `apps/mobile/__tests__/tabs/index.test.tsx`

**Interfaces:**
- Consumes: `makeStyles`, `useTheme` from `@brewlog/ui`.
- Produces: Fully dynamic theming across Auth and Timer screens and components.

- [ ] **Step 1: Refactor `AuthSheet.tsx` and `ProfileHeaderButton.tsx`**

1. Replace `import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/ui';` with `import { makeStyles, useTheme } from '@brewlog/ui';`.
2. Convert static styles to `makeStyles`.
3. In components: call `useStyles()` and `useTheme()`.

- [ ] **Step 2: Refactor `app/(tabs)/index.tsx` and Timer subcomponents**

In `app/(tabs)/index.tsx`, `TimerHero.tsx`, `CollapsibleCalculator.tsx`, `ActiveStageCard.tsx`, `StageTimeline.tsx`, `FreeBrewSplitTimeline.tsx`, `MethodPills.tsx`:
1. Remove static `INDUSTRIAL_PRECISION_THEME` imports.
2. Convert static stylesheets to `makeStyles`.
3. In components: call `useStyles()` and `useTheme()`.
4. Ensure Lucide icon colors and ActivityIndicator colors consume `colors.accent`, `colors.foregroundSecondary`, etc.

- [ ] **Step 3: Run targeted tests**

Run: `npx vitest run apps/mobile/src/features/auth/ProfileHeaderButton.test.tsx apps/mobile/src/components/timer/TimerHero.test.tsx apps/mobile/__tests__/tabs/index.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/auth/ apps/mobile/app/\(tabs\)/index.tsx apps/mobile/src/components/timer/
git commit -m "refactor(mobile): migrate auth and timer components to dynamic theme tokens"
```

---

### Task 7: Migrate Stash Mobile Screens & Components

**Files:**
- Modify: `apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx`
- Modify: `apps/mobile/src/features/stash/screens/BeanDetailScreen.tsx`
- Modify: `apps/mobile/src/features/stash/screens/BeanModalScreen.tsx`
- Modify: `apps/mobile/src/features/stash/components/BeanCard.tsx`
- Modify: `apps/mobile/src/features/stash/components/ActiveBeanPill.tsx`
- Modify: `apps/mobile/src/features/stash/components/CellarSummaryBar.tsx`
- Modify: `apps/mobile/src/features/stash/utils/restingUtils.test.ts`
- Test: `apps/mobile/src/features/stash/screens/StashCatalogScreen.test.tsx`
- Test: `apps/mobile/src/features/stash/screens/BeanDetailScreen.test.tsx`
- Test: `apps/mobile/src/features/stash/utils/restingUtils.test.ts`

**Interfaces:**
- Consumes: `makeStyles`, `useTheme`, `resolveFreshnessColor` from `@brewlog/ui`.
- Produces: Dynamic theming across all Stash screens, cards, and freshness indicators.

- [ ] **Step 1: Refactor `restingUtils.test.ts`**

In `apps/mobile/src/features/stash/utils/restingUtils.test.ts`:
Replace `import { INDUSTRIAL_PRECISION_THEME, resolveFreshnessColor } from '@brewlog/ui';` with `import { TACTILE_DARK_THEME, resolveFreshnessColor } from '@brewlog/ui';`.
Use `TACTILE_DARK_THEME.colors` in the test assertions.

- [ ] **Step 2: Refactor Stash screens and components**

In `StashCatalogScreen.tsx`, `BeanDetailScreen.tsx`, `BeanModalScreen.tsx`, `BeanCard.tsx`, `ActiveBeanPill.tsx`, `CellarSummaryBar.tsx`:
1. Remove `INDUSTRIAL_PRECISION_THEME` imports.
2. Convert static styles to `makeStyles`.
3. In components: call `useStyles()` and `useTheme()`.
4. In `BeanCard.tsx` and `BeanDetailScreen.tsx`: pass `colors` from `useTheme()` to `resolveFreshnessColor(restingInfo, colors)`.

- [ ] **Step 3: Run targeted tests**

Run: `npx vitest run apps/mobile/src/features/stash/screens/StashCatalogScreen.test.tsx apps/mobile/src/features/stash/screens/BeanDetailScreen.test.tsx apps/mobile/src/features/stash/utils/restingUtils.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/stash/
git commit -m "refactor(mobile): migrate stash screens and components to dynamic theme tokens"
```

---

### Task 8: Migrate Recipes Mobile Screens & Components

**Files:**
- Modify: `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx`
- Modify: `apps/mobile/src/features/recipes/screens/RecipeDetailScreen.tsx`
- Modify: `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.tsx`
- Modify: `apps/mobile/src/features/recipes/components/RecipeCard.tsx`
- Modify: `apps/mobile/src/features/recipes/components/DoseRescaler.tsx`
- Modify: `apps/mobile/src/features/recipes/components/MethodFilterBar.tsx`
- Modify: `apps/mobile/src/features/recipes/components/SpecsGrid.tsx`
- Modify: `apps/mobile/src/features/recipes/components/StagesTimeline.tsx`
- Test: `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.test.tsx`
- Test: `apps/mobile/src/features/recipes/screens/RecipeDetailScreen.test.tsx`

**Interfaces:**
- Consumes: `makeStyles`, `useTheme` from `@brewlog/ui`.
- Produces: Dynamic theming across all Recipe studio screens, cards, rescaler, and timeline components.

- [ ] **Step 1: Refactor Recipe screens and components**

In `RecipesCatalogScreen.tsx`, `RecipeDetailScreen.tsx`, `RecipeBuilderScreen.tsx`, `RecipeCard.tsx`, `DoseRescaler.tsx`, `MethodFilterBar.tsx`, `SpecsGrid.tsx`, `StagesTimeline.tsx`:
1. Remove `INDUSTRIAL_PRECISION_THEME` imports.
2. Convert static styles to `makeStyles`.
3. In components: call `useStyles()` and `useTheme()`.
4. Update inline icon colors and badge colors to reference dynamic `colors`.

- [ ] **Step 2: Run targeted tests**

Run: `npx vitest run apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.test.tsx apps/mobile/src/features/recipes/screens/RecipeDetailScreen.test.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/recipes/
git commit -m "refactor(mobile): migrate recipe screens and components to dynamic theme tokens"
```

---

### Task 9: Migrate Equipment & Reviews Mobile Screens & Components

**Files:**
- Modify: `apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.tsx`
- Modify: `apps/mobile/src/features/equipment/screens/EquipmentModalScreen.tsx`
- Modify: `apps/mobile/src/features/equipment/components/EquipmentCard.tsx`
- Modify: `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx`
- Modify: `apps/mobile/src/features/reviews/screens/ReviewDetailScreen.tsx`
- Modify: `apps/mobile/src/features/reviews/screens/ReviewModalScreen.tsx`
- Modify: `apps/mobile/src/features/reviews/components/ReviewCard.tsx`
- Modify: `apps/mobile/src/features/reviews/components/ReviewsSummaryBar.tsx`
- Modify: `apps/mobile/src/features/reviews/components/FlavorTagSelector.tsx`
- Modify: `apps/mobile/src/features/reviews/components/ScaAttributeScoring.tsx`
- Modify: `apps/mobile/src/features/reviews/components/ScaFlavorWheelSvg.tsx`
- Test: `apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.test.tsx`
- Test: `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.test.tsx`

**Interfaces:**
- Consumes: `makeStyles`, `useTheme` from `@brewlog/ui`.
- Produces: Dynamic theming across Equipment and Reviews features including flavor wheel SVG and scoring charts.

- [ ] **Step 1: Refactor Equipment screens and components**

In `EquipmentCatalogScreen.tsx`, `EquipmentModalScreen.tsx`, `EquipmentCard.tsx`:
1. Remove `INDUSTRIAL_PRECISION_THEME` imports.
2. Convert static styles to `makeStyles`.
3. In components: call `useStyles()` and `useTheme()`.

- [ ] **Step 2: Refactor Reviews screens, components, and SVG**

In `ReviewsCatalogScreen.tsx`, `ReviewDetailScreen.tsx`, `ReviewModalScreen.tsx`, `ReviewCard.tsx`, `ReviewsSummaryBar.tsx`, `FlavorTagSelector.tsx`, `ScaAttributeScoring.tsx`, `ScaFlavorWheelSvg.tsx`:
1. Remove `INDUSTRIAL_PRECISION_THEME` imports.
2. Convert static styles to `makeStyles`.
3. In components: call `useStyles()` and `useTheme()`.
4. In `ScaFlavorWheelSvg.tsx`: pass dynamic `colors` from `useTheme()` for wheel segment strokes, centers, and background fills.

- [ ] **Step 3: Run targeted tests**

Run: `npx vitest run apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.test.tsx apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/equipment/ apps/mobile/src/features/reviews/
git commit -m "refactor(mobile): migrate equipment and reviews components to dynamic theme tokens"
```

---

### Task 10: Full Verification & Codebase-wide Acceptance Verification

**Files:**
- Entire repository audit.

**Interfaces:**
- Verified complete retirement of `INDUSTRIAL_PRECISION_THEME` and zero regressions.

- [ ] **Step 1: Verify zero occurrences of `INDUSTRIAL_PRECISION_THEME`**

Run: `grep -rn "INDUSTRIAL_PRECISION_THEME" apps packages`
Expected: Exit code 1 (0 matches found).

- [ ] **Step 2: Verify zero emoji in code, styles, tests, and comments**

Run: `python3 scripts/check_no_emoji.py apps packages` (or inspect changed git diff).
Expected: 0 emoji violations.

- [ ] **Step 3: Run full package and mobile test suites before committing and pushing**

Run: `npm test`
Expected: All suites across `@brewlog/core`, `@brewlog/ui`, `@brewlog/web`, and `@brewlog/mobile` PASS.

- [ ] **Step 4: Final commit (if any remaining changes) and status check**

```bash
git status
```
Confirm clean branch ready for PR.
