# Devlog: Cross-Platform User Preferences, Cloud Settings & Instrument Telemetry

- **Date**: 2026-10-09
- **Milestone**: Phase 8: User Preferences & Settings Subsystem (Cross-Platform)
- **Status**: Completed & Verified
- **Branch**: `feature/phase-8-user-settings`
- **Pull Request**: [#43](https://github.com/Chewieez/brewlog/pull/43)
- **Tech Stack**: React 19, React Native (Expo SDK 57), Expo Router, Tailwind CSS v4, TypeScript 5.7+, `@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, Vitest, Testing Library

---

## Executive Summary

Prior to this milestone, BrewLog lacked user configuration capabilities. All metrics, temperatures, and timer workflows were hardcoded:
1. **Hardcoded Metric System**: Weights were formatted exclusively in grams (`g`) and temperatures in Celsius (`°C`), with no user preferences for imperial units (ounces `oz` or Fahrenheit `°F`).
2. **Fixed Timer Mode**: The brew timer always booted into a single hardcoded default, regardless of whether a barista predominantly used guided recipe brewing or manual stopwatch free-brew workflows.
3. **Display Date Discrepancies**: Timestamps on beans and tasting reviews used inconsistent date rendering patterns without a standardized date format preference.
4. **Missing Cloud Settings Table**: The Supabase schema lacked a dedicated user settings table with Row Level Security (RLS) to synchronize preferences across devices.

Phase 8 delivers an offline-first, cross-platform User Preferences and Calibration subsystem. It establishes pure mathematical conversion engines in `@brewlog/core`, relational PostgreSQL schema and bidirectional mappers in `@brewlog/supabase`, offline-first state management across mobile (AsyncStorage `@brewlog/mobile:settings_cache`) and web (`localStorage` `brewlog_settings_cache`), accessible and token-compliant user settings interfaces, and real-time localized telemetry across all timer, recipe, stash, and review views.

---

## Architecture & Cross-Package Deliverables

### 1. Pure Domain Math, Types & Formatters (`@brewlog/core`)

- **Domain Model Definitions**:
  - `WeightUnit`: `'metric' | 'imperial'`
  - `TemperatureUnit`: `'celsius' | 'fahrenheit'`
  - `TimerModePreference`: `'recipe' | 'free_brew'`
  - `DateFormatPreference`: `'locale' | 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY'`
  - `UserSettings`: Unified domain interface containing the four core preferences.
  - `DEFAULT_USER_SETTINGS`: Defaulting to `metric`, `celsius`, `free_brew`, and `locale`.
- **Pure Math & Rounding Converters**:
  - `gramsToOz(grams)`: Converts grams to ounces rounded to 2 decimal places ($1\text{ oz} \approx 28.34952\text{ g}$). Handles negative numbers symmetrically for scale tare offsets.
  - `ozToGrams(oz)`: Converts ounces to grams rounded to 1 decimal place.
  - `celsiusToFahrenheit(c)`: Converts Celsius to whole-integer Fahrenheit ($\text{round}((c \times 9) / 5 + 32)$).
  - `fahrenheitToCelsius(f)`: Converts Fahrenheit to whole-integer Celsius ($\text{round}((f - 32) \times 5 / 9)$).
  - `formatWeight(grams, unit, precision)`: Returns formatted string (e.g. `18.0 g` vs `0.63 oz`).
  - `formatTemperature(celsius, unit)`: Returns formatted string (e.g. `94°C` vs `201°F`).
  - `formatDisplayDate(dateInput, format)`: Robust multi-format date parser and formatter supporting ISO strings, date-only strings (`YYYY-MM-DD`), and `Date` instances without client timezone day-slippage.

### 2. Supabase Cloud Schema, Triggers & Mappers (`@brewlog/supabase`)

- **Migration `005_create_user_settings.sql`**:
  - Table `public.user_settings` keyed to `user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`.
  - Column constraints ensuring valid values: `weight_unit IN ('metric', 'imperial')`, `temperature_unit IN ('celsius', 'fahrenheit')`, `default_timer_mode IN ('recipe', 'free_brew')`, and `date_format IN ('locale', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY')`.
  - Strict Row Level Security (RLS) policies for `SELECT`, `UPDATE`, and `INSERT` validating `auth.uid() = user_id`.
  - Database trigger `set_user_settings_updated_at` firing `BEFORE UPDATE` to automatically maintain `updated_at`.
- **Bidirectional Mappers & Types**:
  - Updated `database.types.ts` defining `UserSettingsRow`, `UserSettingsInsert`, and `UserSettingsUpdate`.
  - `mapDbToUserSettings`: Transforms database snake_case row into camelCase domain object.
  - `mapUserSettingsToDb`: Transforms domain entity into database payload, including timestamp refresh (`updated_at: new Date().toISOString()`).

### 3. Offline-First State Management

- **Mobile State (`SettingsContext.tsx` in `apps/mobile`)**:
  - Immediate local boot hydration from AsyncStorage (`@brewlog/mobile:settings_cache`).
  - Optimistic in-memory updates with synchronous ref tracking (`settingsRef.current`) to guard rapid sequential mutations.
  - Automatic Supabase two-way cloud sync: pulls cloud settings on login; pushes local preferences to cloud if no remote record exists.
  - Provides `useSettings()` and non-throwing `useOptionalSettings()` fallback for components rendered outside providers.
- **Web State (`SettingsContext.tsx` in `apps/web`)**:
  - Local persistence via `localStorage` (`brewlog_settings_cache`).
  - Optimistic updates, error-logging upsert handling, and seamless cloud sync on auth state change.
  - Non-throwing `useOptionalSettings()` for isolated testing and guest barista use.

### 4. Dedicated Settings UI & Navigation

- **Mobile Settings Modal (`apps/mobile/app/settings/modal.tsx`)**:
  - Accessible via dedicated "App Preferences" card in `AuthSheet`, preserving the Apple HIG 5-tab shell.
  - Segmented control buttons for Weight Unit, Temperature Unit, and Default Timer Mode with `accessibilityRole="button"`, descriptive labels, and `accessibilityState={{ selected: isSelected }}`.
  - Expandable date format dropdown with live formatted previews and checkmark indicators.
  - Cloud synchronization status indicator (Cloud Sync Active vs Local Storage Only).
  - Tactile haptic feedback on change via `expo-haptics`.
  - Reset to factory defaults with confirmation alert.
- **Web Settings Chassis (`apps/web/src/routes/SettingsRoute.tsx`)**:
  - Route `/settings` accessible from top header user dropdown (`UserMenu`) and unauthenticated guest toolbar.
  - Semantic theme tokens (`bg-panel`, `border-border-subtle`, `text-text-primary`, `status-success`, `status-error`), strictly avoiding prohibited single-sided accent borders and un-themed Tailwind palette classes.
  - Real-time Live Calibration Preview gauge tile reflecting active preferences immediately.
  - Restore Factory Defaults flow using `ConfirmationModal` dialog.

### 5. Telemetry & Faceplate Display Integration

- **Timer Telemetry**:
  - `TimerHero.tsx` (mobile) and `TimerView.tsx` (web) boot in `settings.defaultTimerMode` (`free_brew` by default).
  - Deep-link and catalog brew actions pass `?mode=recipe` or `params: { mode: 'recipe' }` to explicitly enter recipe mode.
  - Target water, current weights, and live dose steppers format via `formatWeight` with active unit conversions while maintaining underlying state calculations in canonical grams.
- **Recipe Details**:
  - `RecipeDetailScreen.tsx` (mobile) and `RecipeDetailPane.tsx` (web) format water temperatures via `formatTemperature` and recipe weights via `formatWeight`.
- **Stash & Reviews Integration**:
  - `BeanDetailScreen.tsx` formats roast dates using `formatDisplayDate(bean.roastDate, dateFormat)`.
  - `ReviewCard.tsx`, `ReviewDetailScreen.tsx`, `ReviewsView.tsx`, and `ReviewDetailPane.tsx` format brew dates using `formatDisplayDate(log.brewDate, dateFormat)`.

---

## Code Review Refinements & Merge Alignment

During code review and branch integration, several key issues were diagnosed and resolved:
1. **Cold-Start Desynchronization**: Fixed timing race in mobile timer initial mode resolution where local storage hydration resolved after route parameter checks.
2. **Faceplate Unit Consistency**: Standardized editable dose inputs to accept and render in active `WeightUnit`, eliminating abrupt unit flips on timer start.
3. **Date Timezone Shift**: Fixed timezone discrepancy in `formatDisplayDate` where date-only strings jumped by 1 day west of UTC.
4. **Design Doctrine Violations**: Removed prohibited single-sided gradient bars and mapped raw Tailwind colors to semantic tokens.
5. **Database Trigger & Timestamp Updates**: Added `set_user_settings_updated_at` trigger and populated `updated_at` in mappers.
6. **Negative Weight Symmetry**: Removed asymmetric `<= 0` clamping in `gramsToOz` and `ozToGrams` to preserve scale tare offsets.
7. **Native Modal Integration**: Replaced browser `window.confirm()` with `ConfirmationModal`.
8. **Accessible Segmented Controls**: Added `accessibilityState={{ selected }}` across all mobile segmented buttons.
9. **Merge Conflict Resolution**: Successfully merged `origin/main` (PR #38 reviews redesign), aligning `RecipeDetailPane` and `ReviewsView` master-detail layouts with Phase 8 formatting engines.

---

## Quality Checks & Verification

- **TypeScript Monorepo Typecheck**: Passed with 0 errors across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`):
  ```bash
  npm run typecheck
  ```
- **Targeted Test Execution**:
  - `@brewlog/core`: 14/14 tests passing (`conversions.test.ts`)
  - `@brewlog/supabase`: 2/2 tests passing (`settingsMapper.test.ts`)
  - `@brewlog/mobile`: 44/44 tests passing across settings, reviews, and stash suites (`SettingsContext.test.tsx`, `SettingsModalScreen.test.tsx`, `telemetryIntegration.test.tsx`, `ReviewCard.test.tsx`, `ReviewDetailScreen.test.tsx`, `BeanDetailScreen.test.tsx`)
  - `@brewlog/web`: 45/45 tests passing across settings, reviews, and recipe panes (`SettingsContext.test.tsx`, `SettingsRoute.test.tsx`, `ReviewsView.test.tsx`, `ReviewDetailPane.test.tsx`, `RecipeDetailPane.test.tsx`)
- **Zero-Emoji Compliance**: Verified zero emoji characters across code, comments, UI copy, and documentation.
