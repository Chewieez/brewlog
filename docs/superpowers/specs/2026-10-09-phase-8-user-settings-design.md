# Phase 8: User Preferences & Settings Subsystem Design Spec

**Date**: 2026-10-09  
**Status**: Approved (Brainstorming Complete)  
**Scope**: Subsystem Foundation + Dedicated Settings UI + Key Display Conversions  
**Worktree**: `.worktrees/phase-8-user-settings` (`feature/phase-8-user-settings`)

---

## 1. Overview & Motivation

BrewLog operates across web (`@brewlog/web`) and mobile (`@brewlog/mobile`) with shared domain packages (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`). Currently, core instrument units (grams, Celsius, recipe timer mode, date formatting) are hardcoded or assume metric conventions.

Phase 8 introduces a cross-platform **User Preferences & Settings Subsystem** that:
1. Preserves canonical metric values (`grams`, `celsius`) across all database records and domain entities to eliminate floating-point drift and schema conversions.
2. Supports customizable display units:
   - **Weight Unit**: Metric (`g`) vs Imperial (`oz`).
   - **Temperature Unit**: Celsius (`°C`) vs Fahrenheit (`°F`).
   - **Default Timer Mode**: Free Brew (`free_brew`, default) vs Guided Recipe (`recipe`).
   - **Date Format**: System Locale (`locale`) vs explicit patterns (`YYYY-MM-DD`, `MM/DD/YYYY`, `DD/MM/YYYY`).
3. Adheres to an **Offline-First** model: guest users can freely configure preferences stored in local storage (`AsyncStorage` / `localStorage`). Upon authentication, remote Supabase settings hydrate the device or newly configured local settings sync to the cloud.
4. Provides dedicated, Apple HIG-compliant and Industrial Precision-styled Settings interfaces on both mobile (`app/settings/modal.tsx` accessed via `AuthSheet`) and web (`/settings` accessed via `UserMenu`).

---

## 2. Core Decisions & Defaults

### 2.1 Default Settings
When no setting is saved yet (brand new install or first-time launch), the app defaults to:
```typescript
export const DEFAULT_USER_SETTINGS: UserSettings = {
  weightUnit: 'metric',
  temperatureUnit: 'celsius',
  defaultTimerMode: 'free_brew', // Defaults to Free Brew (Stopwatch) when no setting is saved
  dateFormat: 'locale',
};
```

### 2.2 Cold Start vs. Explicit Brew Actions
* **Cold Timer Launch**: When navigating to the Timer tab or route without query parameters or an active staged recipe, the timer opens in `settings.defaultTimerMode` (`free_brew` by default).
* **Explicit Recipe Action**: When a user taps "BREW WITH THIS RECIPE" from a Recipe Detail screen or "BREW WITH THIS COFFEE" from Stash, the timer deliberately switches to Guided Recipe mode for that target recipe, honoring explicit user intent while respecting the default mode on cold starts.

---

## 3. Database Architecture & Supabase Schema (`@brewlog/supabase`)

### 3.1 Migration `005_create_user_settings.sql`
A dedicated table decouples client application preferences from user profile identity:

```sql
-- Migration: 005_create_user_settings.sql
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_unit TEXT NOT NULL DEFAULT 'metric' CHECK (weight_unit IN ('metric', 'imperial')),
  temperature_unit TEXT NOT NULL DEFAULT 'celsius' CHECK (temperature_unit IN ('celsius', 'fahrenheit')),
  default_timer_mode TEXT NOT NULL DEFAULT 'free_brew' CHECK (default_timer_mode IN ('recipe', 'free_brew')),
  date_format TEXT NOT NULL DEFAULT 'locale' CHECK (date_format IN ('locale', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;

CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 3.2 Types & Mappers
* In `packages/supabase/src/database.types.ts`:
  * Define `UserSettingsRow`, `UserSettingsInsert`, `UserSettingsUpdate`.
* In `packages/supabase/src/mappers/settingsMapper.ts`:
  * `mapDbToUserSettings(row: UserSettingsRow): UserSettings`
  * `mapUserSettingsToDb(settings: UserSettings, userId: string): UserSettingsInsert`

---

## 4. Core Domain Types & Conversion Math (`@brewlog/core`)

### 4.1 Types (`packages/core/src/types.ts`)
```typescript
export type WeightUnit = 'metric' | 'imperial';
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type TimerModePreference = 'recipe' | 'free_brew';
export type DateFormatPreference = 'locale' | 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';

export interface UserSettings {
  weightUnit: WeightUnit;
  temperatureUnit: TemperatureUnit;
  defaultTimerMode: TimerModePreference;
  dateFormat: DateFormatPreference;
}
```

### 4.2 Conversion & Formatting Utilities (`packages/core/src/conversions.ts`)
* `gramsToOz(grams: number): number`: converts grams to ounces, rounded to 2 decimal places.
* `ozToGrams(oz: number): number`: converts ounces to grams, rounded to 1 decimal place.
* `celsiusToFahrenheit(c: number): number`: converts °C to whole integer °F (`Math.round((c * 9) / 5 + 32)`).
* `fahrenheitToCelsius(f: number): number`: converts °F to whole integer °C (`Math.round(((f - 32) * 5) / 9)`).
* `formatWeight(grams: number, unit: WeightUnit, precision?: number): string`: returns e.g. `18.0 g` (metric) or `0.63 oz` (imperial).
* `formatTemperature(celsius: number, unit: TemperatureUnit): string`: returns e.g. `94°C` or `201°F`.
* `formatDisplayDate(dateInput: string | Date | undefined | null, format: DateFormatPreference): string`: safely formats date strings (`YYYY-MM-DD`, `MM/DD/YYYY`, `DD/MM/YYYY`, or localized system string).

---

## 5. State Management & Offline/Cloud Sync (`SettingsContext`)

### 5.1 Context Interface
```typescript
export interface SettingsContextValue {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}
```

### 5.2 Storage Keys
* Mobile: `@brewlog/mobile:settings_cache` in `AsyncStorage`.
* Web: `brewlog_settings_cache` in `localStorage`.

### 5.3 Hydration & Sync Lifecycle
1. **App Mount**:
   * Reads cached settings from local storage immediately.
   * If cache is empty or invalid, falls back to `DEFAULT_USER_SETTINGS`.
2. **Auth State Transition (User signs in)**:
   * Queries Supabase for `user_settings` matching `user.id`.
   * **Remote record exists**: Overwrites local state and updates local storage.
   * **No remote record exists**: Upserts current local settings to Supabase for `user.id`.
3. **User signs out**:
   * Local settings are preserved on the device for guest usage.
4. **Mutations (`updateSettings`)**:
   * Optimistically updates React state.
   * Persists immediately to local storage.
   * If user is authenticated and online, upserts to Supabase in the background.

---

## 6. User Interface & Navigation

### 6.1 Mobile (`apps/mobile`)
* **Access Point**:
  * Added to `AuthSheet.tsx` as a prominent "APP PREFERENCES" action card with a sliders/gear icon, visible to both guest and signed-in baristas.
  * Tapping dismisses `AuthSheet` and executes `router.push('/settings/modal')`.
* **Screen (`app/settings/modal.tsx`)**:
  * Registered as a modal in `app/_layout.tsx` (`presentation: 'modal'`, dark theme, safe-area padding).
  * Segmented controls with tactile feedback (`expo-haptics`) for:
    - Weight Scale: `[ METRIC (g) ]` | `[ IMPERIAL (oz) ]`
    - Temperature Unit: `[ CELSIUS (°C) ]` | `[ FAHRENHEIT (°F) ]`
    - Default Timer Mode: `[ FREE BREW ]` | `[ GUIDED RECIPE ]`
    - Date Format: `[ LOCALE ]` | `[ YYYY-MM-DD ]` | `[ MM/DD/YYYY ]` | `[ DD/MM/YYYY ]`
  * Status card displaying sync status ("Synced with BrewLog Cloud" or "Saved on this device").
  * Factory reset button with confirmation.

### 6.2 Web (`apps/web`)
* **Access Points**:
  * In `UserMenu.tsx`:
    - Signed in: "SETTINGS" item in the user dropdown navigating to `/settings`.
    - Guest: A gear icon button alongside the "SIGN IN" button in the header.
* **Route (`apps/web/src/routes/SettingsRoute.tsx`)**:
  * Routed at `/settings` within `RootLayout.tsx`.
  * Styled with `INDUSTRIAL_PRECISION_THEME` cards and monospace eyebrow labels (`SYSTEM // PREFERENCES`).
  * Live calibration preview tile rendering formatted values based on active choices in real time.

---

## 7. Telemetry & Display Integrations

1. **Timer Default Mode**:
   * Timer screen (`app/(tabs)/index.tsx` on mobile and `TimerView.tsx` on web) reads `settings.defaultTimerMode` when uninitialized or resetting, opening to Free Brew by default.
2. **Timer Faceplate Metrics**:
   * Dose and target water tiles format via `formatWeight` based on `settings.weightUnit`.
3. **Recipe Detail Specs Grid**:
   * Water temperature tile formats via `formatTemperature` based on `settings.temperatureUnit`.
   * Dose and water target format via `formatWeight`.
4. **Stash & Reviews Dates**:
   * Bean roast dates and review brew dates format via `formatDisplayDate` based on `settings.dateFormat`.

---

## 8. Guardrails & Error Handling

1. **Corrupt Cache**: Invalid or unparseable JSON in local storage safely falls back to `DEFAULT_USER_SETTINGS`.
2. **Offline Resilience**: Supabase upsert rejections or network drops do not throw or revert local state; mutations remain active locally.
3. **Canonical Math Integrity**: Stored recipe doses, water targets, bean bag weights, and review records stay in grams and Celsius. Calculations never compound floating-point conversion errors.

---

## 9. Verification & Testing Strategy

*(Note: Per repository user instructions, test suites are only executed prior to commit and push.)*
* **Core Math (`packages/core/src/conversions.test.ts`)**:
  * Unit tests verifying `gramsToOz`, `ozToGrams`, `celsiusToFahrenheit`, `fahrenheitToCelsius`.
  * Rounding and edge cases: zero, negative, extreme values, precision bounds.
  * Date formatting across all 4 formats with valid and malformed inputs.
* **Supabase Mappers (`packages/supabase/src/mappers/settingsMapper.test.ts`)**:
  * Serialization and deserialization tests matching DB rows to domain models.
* **Mobile Context & UI (`apps/mobile`)**:
  * `SettingsContext.test.tsx`: AsyncStorage hydration, optimistic mutation, Supabase sync on login.
  * `SettingsModal.test.tsx`: Rendering of all segmented controls, touch interaction, and dismiss action.
* **Web Context & Route (`apps/web`)**:
  * `SettingsContext.test.tsx`: localStorage hydration, updateSettings.
  * `SettingsRoute.test.tsx`: Route rendering, live preview updates, settings switching.
