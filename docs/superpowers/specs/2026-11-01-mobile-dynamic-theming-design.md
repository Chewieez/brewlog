# Design Spec: Issue #64 - Adopt Dynamic Theming in apps/mobile and Retire Industrial Precision Theme

- **Date**: 2026-11-01
- **Topic**: Dynamic theming subsystem in `@brewlog/ui` and `apps/mobile`, migration of all mobile screens to dynamic theme tokens, and full retirement of `INDUSTRIAL_PRECISION_THEME`
- **Issue**: [#64](https://github.com/Chewieez/brewlog/issues/64)
- **Status**: Validated / Ready for Implementation Planning
- **Targets**: `@brewlog/ui` (`packages/ui`), `@brewlog/mobile` (`apps/mobile`)

---

## 1. Problem Statement & Context

Currently, `apps/mobile` statically imports `INDUSTRIAL_PRECISION_THEME` from `@brewlog/ui` across 39 screens, layouts, navigation headers, and components using top-level module bindings:
```tsx
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/ui';
const { colors } = INDUSTRIAL_PRECISION_THEME;
```

Similarly, the native primitives in `@brewlog/ui` (`Button.native.tsx`, `Card.native.tsx`, `Badge.native.tsx`, `Input.native.tsx`, `MetricTile.native.tsx`, `SegmentedControl.native.tsx`, `UiShowcase.native.tsx`) are statically bound to `INDUSTRIAL_PRECISION_THEME.colors`.

As a consequence:
1. `apps/mobile` cannot respond to system light/dark mode changes (`useColorScheme()`) or user theme preferences stored in `SettingsContext`.
2. Mobile renders the legacy Industrial Precision palette rather than modern Tactile Dark Craft (`TACTILE_DARK_THEME`) and Crisp Studio Light (`CRISP_STUDIO_LIGHT_THEME`).
3. `INDUSTRIAL_PRECISION_THEME` cannot be deleted from `packages/ui/src/theme/theme.ts` while mobile and native UI primitives depend on it.
4. Mobile settings (`apps/mobile/app/settings/modal.tsx`) lacks a Theme preference selector, even though `@brewlog/core` and `apps/web` support `'system' | 'tactile_dark' | 'studio_light'`.

### Acceptance Criteria
- `apps/mobile` dynamically supports both `Tactile Dark Craft` and `Crisp Studio Light` themes based on user settings and device color scheme.
- Zero static imports of `INDUSTRIAL_PRECISION_THEME` exist in `apps/mobile` or `packages/ui`.
- `INDUSTRIAL_PRECISION_THEME` is deleted from `packages/ui/src/theme/theme.ts` and `THEMES` map.
- Theme Preference selection is available in `apps/mobile/app/settings/modal.tsx` placed at the top of settings options (above Weight Unit), matching web parity.
- All unit, component, and integration test suites pass across `@brewlog/ui` and `apps/mobile`.
- Zero emoji in code, styles, tests, or commit messages.

---

## 2. Design System Theme Architecture (`@brewlog/ui`)

### 2.1 Theme Context and Provider (`packages/ui/src/theme/ThemeContext.tsx`)
Create a lightweight React Context and Provider in `@brewlog/ui` that exposes the active theme, resolved colors, and boolean dark mode flag:

```tsx
import React, { createContext, useContext, useMemo } from 'react';
import { ThemeTokens, DEFAULT_THEME, ThemeColors } from './theme';

export interface ThemeContextValue {
  theme: ThemeTokens;
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  colors: DEFAULT_THEME.colors,
  isDark: DEFAULT_THEME.isDark,
});

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

**Graceful Un-contextual Fallback**:
If a component calls `useTheme()` outside a `<ThemeProvider>`, it defaults to `DEFAULT_THEME` (`TACTILE_DARK_THEME`). Isolated unit tests for UI primitives do not need wrapper harnesses unless testing dynamic switches.

### 2.2 Memoized Stylesheet Helper (`packages/ui/src/theme/makeStyles.ts`)
To allow screens and components to define stylesheets outside their render functions while reacting dynamically to theme switches, implement `makeStyles`:

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

    cachedStyles = StyleSheet.create(styleFactory(colors, theme));
    cachedThemeId = theme.id;
    return cachedStyles;
  };
}
```

### 2.3 Refactoring `@brewlog/ui` Native Primitives
Update the 7 native components to eliminate static imports of `INDUSTRIAL_PRECISION_THEME`:
- `packages/ui/src/button/Button.native.tsx`: Use `useStyles()` from `makeStyles` and `useTheme()` for `ActivityIndicator` color.
- `packages/ui/src/card/Card.native.tsx`: Use `makeStyles`.
- `packages/ui/src/badge/Badge.native.tsx`: Use `makeStyles`.
- `packages/ui/src/input/Input.native.tsx`: Use `makeStyles` and `useTheme()` for `placeholderTextColor`.
- `packages/ui/src/metric-tile/MetricTile.native.tsx`: Use `makeStyles`.
- `packages/ui/src/segmented-control/SegmentedControl.native.tsx`: Use `makeStyles`.
- `packages/ui/src/showcase/UiShowcase.native.tsx`: Use `makeStyles` and `useTheme()`.

### 2.4 Retiring `INDUSTRIAL_PRECISION_THEME`
In `packages/ui/src/theme/theme.ts`:
- Delete `export const INDUSTRIAL_PRECISION_THEME: ThemeTokens = { ... };`.
- In `THEMES`:
  ```ts
  export const THEMES: Record<string, ThemeTokens> = {
    [TACTILE_DARK_THEME.id]: TACTILE_DARK_THEME,
    [CRISP_STUDIO_LIGHT_THEME.id]: CRISP_STUDIO_LIGHT_THEME,
  };
  ```
- Update `packages/ui/src/theme/theme.test.ts`:
  - Assert `TACTILE_DARK_THEME` and `CRISP_STUDIO_LIGHT_THEME`.
  - Remove tests expecting `INDUSTRIAL_PRECISION_THEME` and `'industrial-precision'` ID.
  - Add tests for `ThemeProvider`, `useTheme()`, and `makeStyles()`.

### 2.5 Package Exports
- `packages/ui/src/theme/index.ts`: Export `ThemeContext`, `ThemeProvider`, `useTheme`, `makeStyles`.
- `packages/ui/src/index.native.ts`: Re-export theme utilities.
- `packages/ui/src/index.web.ts`: Re-export theme utilities (with platform-safe `makeStyles` or stub if needed).

---

## 3. Mobile Root Layout & Navigation Dynamic Theming (`apps/mobile`)

### 3.1 App Root in `apps/mobile/app/_layout.tsx`
Refactor `RootLayout` so that `SettingsProvider` mounts first, followed by a themed navigation container:

```tsx
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ ... });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <AuthProvider>
          <SettingsProvider>
            <RecipeProvider>
              <StashProvider>
                <EquipmentProvider>
                  <ReviewsProvider>
                    <ThemedAppNavigator />
                  </ReviewsProvider>
                </EquipmentProvider>
              </StashProvider>
            </RecipeProvider>
          </SettingsProvider>
        </AuthProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

function ThemedAppNavigator() {
  const { settings } = useSettings();
  const colorScheme = useColorScheme();

  const activeTheme = useMemo(
    () => resolveTheme(settings.theme, colorScheme === 'dark'),
    [settings.theme, colorScheme]
  );

  return (
    <ThemeProvider theme={activeTheme}>
      <NavigationRoot />
    </ThemeProvider>
  );
}

function NavigationRoot() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.canvas,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="recipe/[id]"
          options={{
            headerShown: true,
            title: 'Recipe Details',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colors.panel },
            headerTintColor: colors.foreground,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="recipe/builder"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="stash/[id]"
          options={{
            headerShown: true,
            title: 'Coffee Details',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colors.canvas },
            headerTintColor: colors.foreground,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen name="stash/modal" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="equipment/modal" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="reviews/modal" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen
          name="reviews/[id]"
          options={{
            headerShown: true,
            title: 'Review Details',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colors.canvas },
            headerTintColor: colors.foreground,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen name="settings/modal" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </>
  );
}
```

### 3.2 Native Tabs Layout (`apps/mobile/app/(tabs)/_layout.ios.tsx`)
Consume `useTheme()`:
- `blurEffect={isDark ? 'dark' : 'systemMaterialLight'}`
- `tintColor={colors.accent}`
- `labelStyle`: default color `colors.foregroundSecondary`, selected color `colors.accent`.

### 3.3 Custom Bottom Tab Bar (`apps/mobile/src/components/navigation/FloatingPillTabBar.tsx`)
- Migrate styles to `makeStyles((colors) => ({ ... }))`.
- Pill container: `backgroundColor: colors.panel`, `borderColor: colors.borderSubtle`.
- Tab items: active label/icon `colors.accent`, inactive `colors.foregroundSecondary`.
- Dynamic Lucide icon colors driven by `useTheme()`.

---

## 4. Mobile Settings Modal UI (`apps/mobile/app/settings/modal.tsx`)

In `apps/mobile/app/settings/modal.tsx`:
Add a **Theme Preference** section placed as the first option, directly below the header/cloud status container and above **Weight Unit** (providing parity with `apps/web/src/routes/SettingsRoute.tsx`):

```tsx
const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'SYSTEM' },
  { id: 'tactile_dark', label: 'TACTILE DARK' },
  { id: 'studio_light', label: 'STUDIO LIGHT' },
];
```

- Renders an interactive option selector with haptic feedback on change.
- Calls `updateSettings({ theme: opt.id })`.
- Theme changes immediately re-render all screens and navigation bars across the mobile app.

---

## 5. Mobile Feature Screen & Component Migration

Migrate all 39 mobile files away from static `INDUSTRIAL_PRECISION_THEME` imports to `makeStyles` and `useTheme`:

### 5.1 Auth Feature (2 files)
- `apps/mobile/src/features/auth/AuthSheet.tsx`
- `apps/mobile/src/features/auth/ProfileHeaderButton.tsx`

### 5.2 Timer Feature (7 files)
- `apps/mobile/app/(tabs)/index.tsx`
- `apps/mobile/src/components/timer/TimerHero.tsx`
- `apps/mobile/src/components/timer/CollapsibleCalculator.tsx`
- `apps/mobile/src/components/timer/ActiveStageCard.tsx`
- `apps/mobile/src/components/timer/StageTimeline.tsx`
- `apps/mobile/src/components/timer/FreeBrewSplitTimeline.tsx`
- `apps/mobile/src/components/timer/MethodPills.tsx`

### 5.3 Stash Feature (7 files)
- `apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx`
- `apps/mobile/src/features/stash/screens/BeanDetailScreen.tsx`
- `apps/mobile/src/features/stash/screens/BeanModalScreen.tsx`
- `apps/mobile/src/features/stash/components/BeanCard.tsx`
- `apps/mobile/src/features/stash/components/ActiveBeanPill.tsx`
- `apps/mobile/src/features/stash/components/CellarSummaryBar.tsx`
- `apps/mobile/src/features/stash/utils/restingUtils.test.ts` (update test to use `TACTILE_DARK_THEME` or `resolveTheme()`)

### 5.4 Recipes Feature (8 files)
- `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx`
- `apps/mobile/src/features/recipes/screens/RecipeDetailScreen.tsx`
- `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.tsx`
- `apps/mobile/src/features/recipes/components/RecipeCard.tsx`
- `apps/mobile/src/features/recipes/components/DoseRescaler.tsx`
- `apps/mobile/src/features/recipes/components/MethodFilterBar.tsx`
- `apps/mobile/src/features/recipes/components/SpecsGrid.tsx`
- `apps/mobile/src/features/recipes/components/StagesTimeline.tsx`

### 5.5 Equipment Feature (3 files)
- `apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.tsx`
- `apps/mobile/src/features/equipment/screens/EquipmentModalScreen.tsx`
- `apps/mobile/src/features/equipment/components/EquipmentCard.tsx`

### 5.6 Reviews Feature (8 files)
- `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx`
- `apps/mobile/src/features/reviews/screens/ReviewDetailScreen.tsx`
- `apps/mobile/src/features/reviews/screens/ReviewModalScreen.tsx`
- `apps/mobile/src/features/reviews/components/ReviewCard.tsx`
- `apps/mobile/src/features/reviews/components/ReviewsSummaryBar.tsx`
- `apps/mobile/src/features/reviews/components/FlavorTagSelector.tsx`
- `apps/mobile/src/features/reviews/components/ScaAttributeScoring.tsx`
- `apps/mobile/src/features/reviews/components/ScaFlavorWheelSvg.tsx`

### 5.7 Navigation & Settings (4 files)
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/(tabs)/_layout.ios.tsx`
- `apps/mobile/src/components/navigation/FloatingPillTabBar.tsx`
- `apps/mobile/app/settings/modal.tsx`

---

## 6. Verification & Quality Gates

1. **Static Grep Verification**:
   Run `grep -rn "INDUSTRIAL_PRECISION_THEME" apps packages` and confirm 0 occurrences remain.
2. **Design Tokens & No Hardcoded Hex**:
   Confirm all migrated styles use `colors.*` from `ThemeColors`.
3. **No Emoji Rule**:
   Run `python3 scripts/check_no_emoji.py` or inspect files to confirm zero emoji in code, comments, styles, or commit messages.
4. **Unit & Component Tests**:
   - `packages/ui` tests: verify `theme.test.ts`, `Button.native.test.tsx`, `Card.native.test.tsx`, etc.
   - `apps/mobile` tests: verify `rootLayout.test.tsx`, `_layout.test.tsx`, `SettingsModalScreen.test.tsx`, and all feature screen tests.
5. **Commit & Integration**:
   Commit message cleanly references Issue #64 with zero emoji.
