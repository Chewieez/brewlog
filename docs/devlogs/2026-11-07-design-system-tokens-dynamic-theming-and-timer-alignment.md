# Devlog: Design System Sizing Tokens, Domain Decoupling, Dynamic Theming & Timer Alignment

- **Date**: 2026-11-07
- **Milestones**: Phase 7B Sizing Tokens & Foreground Migration (#59), Domain Freshness Decoupling (#61), Mobile Dynamic Theming & Industrial Precision Retirement (#64), Multi-Grinder Recipe Settings (#30), and Web Timer Page Header & Faceplate Alignment (#63)
- **Status**: Completed & Verified
- **Tech Stack**: React 19.3, React Native 0.88 (Expo SDK 58), Expo Router, Tailwind CSS v4, TypeScript 6.0, `@brewlog/core`, `@brewlog/ui`, `@brewlog/supabase`, Vitest 4.1, Playwright

---

## Executive Summary

Following the completion of Phase 8 (User Preferences & Settings Subsystem), development focused on five interconnected architectural and UX milestones across `@brewlog/core`, `@brewlog/ui`, `@brewlog/supabase`, `apps/web`, and `apps/mobile`:

1. **Multi-Grinder Recipe Calibration (Issue #30)**: Extended recipes to store ordered multi-grinder dial settings (`grinder_settings` JSONB), supporting inline grinder creation inside the Recipe Builder, automatic filtering of deleted equipment, and primary grinder pre-fill into the Brew Timer and Reviews flows.
2. **Design System Sizing Scale & Semantic Foreground Tokens (Issue #59)**: Standardized web interactive controls onto a strict 3-tier rem-based height scale (`sm`: 32px / `2rem`, `md`: 40px / `2.5rem`, `lg`: 48px / `3rem`), eliminated the 36px uncanny valley, replaced 550+ duplicated `text-text-*` utility classes with `text-foreground*`, and added an automated Playwright E2E button sizing gate (`button-sizing-tokens.spec.ts`).
3. **Domain Freshness Decoupling & Theme Migration to `@brewlog/ui` (Issue #61)**: Removed all visual theme contracts and hex color codes (`badgeColor`) from `@brewlog/core` (`packages/core/src/theme.ts` deleted), making `@brewlog/ui` the sole source of truth for themes, design tokens, and presentation-layer freshness resolvers (`resolveFreshnessColor`, `resolveFreshnessBadgeVariant`).
4. **Dynamic Multi-Theme Architecture & Retirement of `INDUSTRIAL_PRECISION_THEME` (Issue #64)**: Introduced `ThemeProvider`, `useTheme()`, and memoized `makeStyles()` in `@brewlog/ui`, migrated all 7 native UI primitives and all 39 mobile screens/components to dynamic **Tactile Dark Craft** (`TACTILE_DARK_THEME`) and **Crisp Studio Light** (`CRISP_STUDIO_LIGHT_THEME`) palettes, added a Theme Preference selector to Mobile Settings, and deleted `INDUSTRIAL_PRECISION_THEME`.
5. **Web Timer Page Header & Interactive Faceplate Alignment (Issue #63)**: Added a standard `Timer` `<h1>` page header with a right-aligned `@brewlog/ui` `SegmentedControl` (`GUIDED RECIPE` | `FREE BREW`) on web (`TimerView.tsx`), alongside inline tap-to-edit faceplate metrics for Coffee Dose, Water Target, and Brew Ratio (`1:X`).

---

## Architecture & Cross-Package Deliverables

### 1. Multi-Grinder Recipe Settings (`@brewlog/core`, `@brewlog/supabase`, Web & Mobile)

- **Core Domain (`packages/core/src/types.ts`)**:
  - Added `RecipeGrinderSetting` (`{ grinderId: string; setting: string }`) and `grinderSettings?: RecipeGrinderSetting[]` on `BrewRecipe`, while maintaining `recommendedGrinderId` for backward compatibility.
- **Database Schema & Mappers (`packages/supabase`)**:
  - Migration `004_add_recipe_grinder_settings.sql` adds `grinder_settings JSONB NOT NULL DEFAULT '[]'::jsonb` to `public.recipes`.
  - Updated `mapRecipeRowToDomain` and `mapRecipeDomainToInsert` in `packages/supabase/src/mappers/recipeMappers.ts` with automatic fallback hydration from legacy `recommended_grinder_id` rows.
- **Web & Mobile Recipe Studio (`RecipeBuilderModal.tsx`, `RecipeBuilderScreen.tsx`, `RecipeDetailPane.tsx`, `RecipeDetailScreen.tsx`)**:
  - Allows configuring multiple grinders and dial settings per recipe, with the first entry badged as `Primary`.
  - Provides inline grinder creation when a user has zero grinders in their equipment catalog.
  - Filters out deleted grinders cleanly on detail views and pre-fills the primary grinder and dial setting into the Brew Timer and Review creation flows.

### 2. Standardized Sizing Tokens & Semantic Foreground Typography (`@brewlog/ui` & `apps/web`)

- **3-Tier rem-Based Control Scale**:
  - `sm` (`h-8` / `2rem` / 32px): View header triggers (`ADD BEAN`, `ADD EQUIPMENT`, `NEW RECIPE`, `LOG REVIEW`), filter chips, and detail pane actions.
  - `md` (`h-10` / `2.5rem` / 40px): Form inputs (`Input.web.tsx`), modal dialog footers (`RecipeBuilderModal`, `StashView`, `EquipmentView`, `ConfirmationModal`), and review editor footer actions.
  - `lg` (`h-12` / `3rem` / 48px): Hero brew timer controls (`START BREW`, `PAUSE`, `RESUME`, `RESET`).
- **Semantic Foreground Tokens**:
  - Added `foreground`, `foregroundSecondary`, and `foregroundMuted` to `ThemeColors` and `apps/web/src/index.css` (`@theme`), replacing `text-text-primary`, `text-text-secondary`, and `text-text-muted` with `text-foreground`, `text-foreground-secondary`, and `text-foreground-muted`.
- **Automated Playwright E2E Gate (`apps/web/e2e/button-sizing-tokens.spec.ts`)**:
  - Traverses `/timer`, `/stash`, `/recipes`, `/equipment`, `/reviews`, and `/settings` (including modal dialogs) and asserts that rendered buttons strictly match 32px, 40px, or 48px (`±1px` sub-pixel tolerance).

### 3. Domain Freshness Decoupling (`@brewlog/core` -> `@brewlog/ui`)

- **Pure Domain `BeanRestingInfo` (`packages/core/src/restingUtils.ts`)**:
  - Removed `badgeColor` and Unicode emoji characters from `calculateBeanRestingInfo`.
  - Deleted `packages/core/src/theme.ts` and `packages/core/src/theme.test.ts` so `@brewlog/core` has zero visual or styling concerns.
- **Presentation Freshness Resolvers (`packages/ui/src/theme/freshness.ts`)**:
  - Implemented `resolveFreshnessColor(input, colors)` and `resolveFreshnessBadgeVariant(input)` in `@brewlog/ui`, mapping domain states (`peak`, `resting`, `aging`, `past-peak`, `isFrozen`, `hasRoastDate`) to theme colors and `Badge` variants (including the `'info'` variant).

### 4. Dynamic Multi-Theme Engine & Platform-Adaptive Mobile Navigation (`@brewlog/ui` & `apps/mobile`)

- **`ThemeProvider`, `useTheme`, and `makeStyles` (`packages/ui/src/theme/`)**:
  - Built `ThemeContext.tsx` and memoized `makeStyles.ts` in `@brewlog/ui`, caching `StyleSheet.create` outputs per active theme ID (`tactile-dark` vs `studio-light`).
  - Migrated all 7 native `@brewlog/ui` primitives (`Button`, `Card`, `Badge`, `Input`, `MetricTile`, `SegmentedControl`, `UiShowcase`) and all 39 screens/components in `apps/mobile` to dynamic theme hooks.
  - Deleted `INDUSTRIAL_PRECISION_THEME` across the monorepo.
- **Mobile Theme Selector & Root Layout (`apps/mobile/app/_layout.tsx`, `app/settings/modal.tsx`)**:
  - `ThemedAppNavigator` resolves the active theme from `settings.theme` (`'system' | 'tactile_dark' | 'studio_light'`) and `useColorScheme()`, dynamically updating `StatusBar`, `NavigationBar`, stack headers, and screen backgrounds.
  - Added a `SegmentedControl` Theme selector (`SYSTEM`, `DARK`, `LIGHT`) at the top of `SettingsModalScreen`.
- **Platform-Adaptive Tab Shell**:
  - Upgraded `apps/mobile` to Expo SDK 58 (`~58.0.17`), React Native 0.88, and React 19.3.
  - Implemented `app/(tabs)/_layout.ios.tsx` using `NativeTabs` (`expo-router/native-tabs`) with dynamic `blurEffect` (`dark` / `systemMaterialLight`) and template icons, alongside the spring-animated `FloatingPillTabBar` in `app/(tabs)/_layout.tsx`.

### 5. Web Timer Page Header & Interactive Faceplate (`apps/web/src/features/timer/TimerView.tsx`)

- **Consistent Page Header**:
  - Added a top-level `<h1>Timer</h1>` page header paired with `@brewlog/ui` `SegmentedControl<TimerMode>` (`GUIDED RECIPE` | `FREE BREW`), aligning `/timer` with `/stash`, `/recipes`, `/equipment`, `/reviews`, and `/settings`.
- **Inline Faceplate Metric Editing**:
  - Enabled direct tap-to-edit inputs on the web timer faceplate for Coffee Dose, Water Target, and Brew Ratio (`1:X`) with unit-aware formatting (`metric` grams vs `imperial` ounces) and real-time proportional rescaling.
