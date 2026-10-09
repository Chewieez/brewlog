# Phase 8: User Preferences & Settings Subsystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform User Preferences & Settings subsystem across web and mobile with offline-first persistence, Supabase cloud sync, core domain conversion utilities, dedicated settings interfaces, and targeted telemetry display integration.

**Architecture:** Database preferences stored in a dedicated `user_settings` table in Supabase keyed to `user_id` with strict RLS; pure domain types and conversion math in `@brewlog/core`; offline-first `SettingsContext` with immediate local storage hydration (`AsyncStorage` on mobile, `localStorage` on web) and automatic cloud sync; dedicated Settings UI on mobile (`app/settings/modal.tsx`) and web (`/settings`); canonical metric values preserved in underlying storage with presentation-layer formatting.

**Tech Stack:** React 19, React Native 0.86, Expo SDK 57 (Expo Router), Supabase JS Client, Vitest, TypeScript, Tailwind CSS v4, `@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`.

**Spec:** [docs/superpowers/specs/2026-10-09-phase-8-user-settings-design.md](file:///Users/greglawrence/Projects/brewlog/.worktrees/phase-8-user-settings/docs/superpowers/specs/2026-10-09-phase-8-user-settings-design.md)

## Global Constraints
- Preserve canonical metric units (`grams`, `celsius`) across database rows and domain entities (`BrewRecipe`, `Bean`, `TastingLog`); never store imperial units in core models.
- Default to `defaultTimerMode: 'free_brew'` when no setting is saved yet.
- Offline-first: Guest baristas can configure settings immediately in local storage without requiring authentication.
- Follow Apple HIG ergonomics ($\ge 44\text{pt}$ touch targets) on mobile.
- Strictly adhere to `INDUSTRIAL_PRECISION_THEME` styling tokens (zero hardcoded colors or arbitrary fonts).
- Do not run full/broad test suites on intermediate edits; run only targeted single-file tests per task, reserving the full suite for Task 8 before commit/push.

---

### Task 1: Core Domain Types, Constants & Pure Conversion Math (`@brewlog/core`)

**Files:**
- Modify: `packages/core/src/types.ts`
- Create: `packages/core/src/conversions.ts`
- Create: `packages/core/src/conversions.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: None
- Produces:
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

  export const DEFAULT_USER_SETTINGS: UserSettings = {
    weightUnit: 'metric',
    temperatureUnit: 'celsius',
    defaultTimerMode: 'free_brew',
    dateFormat: 'locale',
  };

  export function gramsToOz(grams: number): number;
  export function ozToGrams(oz: number): number;
  export function celsiusToFahrenheit(c: number): number;
  export function fahrenheitToCelsius(f: number): number;
  export function formatWeight(grams: number, unit: WeightUnit, precision?: number): string;
  export function formatTemperature(celsius: number, unit: TemperatureUnit): string;
  export function formatDisplayDate(dateInput: string | Date | undefined | null, format: DateFormatPreference): string;
  ```

- [ ] **Step 1: Write the failing tests for conversion and formatting utilities**

`packages/core/src/conversions.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  gramsToOz,
  ozToGrams,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  formatWeight,
  formatTemperature,
  formatDisplayDate,
  DEFAULT_USER_SETTINGS,
} from './conversions';

describe('conversions', () => {
  describe('DEFAULT_USER_SETTINGS', () => {
    it('defaults to free_brew timer mode and metric units', () => {
      expect(DEFAULT_USER_SETTINGS).toEqual({
        weightUnit: 'metric',
        temperatureUnit: 'celsius',
        defaultTimerMode: 'free_brew',
        dateFormat: 'locale',
      });
    });
  });

  describe('weight conversions', () => {
    it('converts grams to ounces rounded to 2 decimal places', () => {
      expect(gramsToOz(0)).toBe(0);
      expect(gramsToOz(18)).toBe(0.63);
      expect(gramsToOz(300)).toBe(10.58);
    });

    it('converts ounces to grams rounded to 1 decimal place', () => {
      expect(ozToGrams(0)).toBe(0);
      expect(ozToGrams(0.63)).toBe(17.9);
      expect(ozToGrams(10.58)).toBe(299.9);
    });

    it('formats weight according to WeightUnit', () => {
      expect(formatWeight(18, 'metric')).toBe('18.0 g');
      expect(formatWeight(18.5, 'metric')).toBe('18.5 g');
      expect(formatWeight(18, 'imperial')).toBe('0.63 oz');
      expect(formatWeight(300, 'imperial')).toBe('10.58 oz');
    });
  });

  describe('temperature conversions', () => {
    it('converts celsius to whole integer fahrenheit', () => {
      expect(celsiusToFahrenheit(0)).toBe(32);
      expect(celsiusToFahrenheit(94)).toBe(201);
      expect(celsiusToFahrenheit(100)).toBe(212);
    });

    it('converts fahrenheit to whole integer celsius', () => {
      expect(fahrenheitToCelsius(32)).toBe(0);
      expect(fahrenheitToCelsius(201)).toBe(94);
      expect(fahrenheitToCelsius(212)).toBe(100);
    });

    it('formats temperature according to TemperatureUnit', () => {
      expect(formatTemperature(94, 'celsius')).toBe('94°C');
      expect(formatTemperature(94, 'fahrenheit')).toBe('201°F');
    });
  });

  describe('date formatting', () => {
    const isoDate = '2026-10-09T14:30:00.000Z';

    it('formats ISO dates into YYYY-MM-DD', () => {
      expect(formatDisplayDate(isoDate, 'YYYY-MM-DD')).toBe('2026-10-09');
    });

    it('formats ISO dates into MM/DD/YYYY', () => {
      expect(formatDisplayDate(isoDate, 'MM/DD/YYYY')).toBe('10/09/2026');
    });

    it('formats ISO dates into DD/MM/YYYY', () => {
      expect(formatDisplayDate(isoDate, 'DD/MM/YYYY')).toBe('09/10/2026');
    });

    it('handles undefined and invalid dates gracefully', () => {
      expect(formatDisplayDate(undefined, 'YYYY-MM-DD')).toBe('—');
      expect(formatDisplayDate('', 'YYYY-MM-DD')).toBe('—');
      expect(formatDisplayDate('not-a-date', 'YYYY-MM-DD')).toBe('—');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/src/conversions.test.ts`
Expected: FAIL with module `./conversions` not found.

- [ ] **Step 3: Implement types and conversion utilities**

Modify `packages/core/src/types.ts` to add `WeightUnit`, `TemperatureUnit`, `TimerModePreference`, `DateFormatPreference`, and `UserSettings`.

Create `packages/core/src/conversions.ts`:
```typescript
import {
  WeightUnit,
  TemperatureUnit,
  TimerModePreference,
  DateFormatPreference,
  UserSettings,
} from './types';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  weightUnit: 'metric',
  temperatureUnit: 'celsius',
  defaultTimerMode: 'free_brew',
  dateFormat: 'locale',
};

export function gramsToOz(grams: number): number {
  if (grams <= 0) return 0;
  return Number((grams * 0.03527396).toFixed(2));
}

export function ozToGrams(oz: number): number {
  if (oz <= 0) return 0;
  return Number((oz * 28.34952).toFixed(1));
}

export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

export function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * 5) / 9);
}

export function formatWeight(
  grams: number,
  unit: WeightUnit,
  precision: number = 1
): string {
  if (unit === 'imperial') {
    const oz = gramsToOz(grams);
    return `${oz.toFixed(2)} oz`;
  }
  return `${grams.toFixed(precision)} g`;
}

export function formatTemperature(
  celsius: number,
  unit: TemperatureUnit
): string {
  if (unit === 'fahrenheit') {
    return `${celsiusToFahrenheit(celsius)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

export function formatDisplayDate(
  dateInput: string | Date | undefined | null,
  format: DateFormatPreference
): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'locale':
    default:
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
  }
}
```

Export new utilities and types in `packages/core/src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/src/conversions.test.ts`
Expected: PASS (8/8 tests pass).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/conversions.ts packages/core/src/conversions.test.ts packages/core/src/index.ts
git commit -m "feat(core): add user settings domain types and conversion utilities"
```

---

### Task 2: Supabase Migration, Schema Types & Mappers (`@brewlog/supabase`)

**Files:**
- Create: `packages/supabase/migrations/005_create_user_settings.sql`
- Create: `packages/supabase/src/mappers/settingsMapper.ts`
- Create: `packages/supabase/src/mappers/settingsMapper.test.ts`
- Modify: `packages/supabase/src/database.types.ts`
- Modify: `packages/supabase/src/index.ts`

**Interfaces:**
- Consumes: `UserSettings` from `@brewlog/core`
- Produces:
  ```typescript
  export interface UserSettingsRow {
    user_id: string;
    weight_unit: 'metric' | 'imperial';
    temperature_unit: 'celsius' | 'fahrenheit';
    default_timer_mode: 'recipe' | 'free_brew';
    date_format: 'locale' | 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
    created_at: string;
    updated_at: string;
  }
  export function mapDbToUserSettings(row: UserSettingsRow): UserSettings;
  export function mapUserSettingsToDb(settings: UserSettings, userId: string): UserSettingsInsert;
  ```

- [ ] **Step 1: Write failing tests for settings mapper**

`packages/supabase/src/mappers/settingsMapper.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { mapDbToUserSettings, mapUserSettingsToDb } from './settingsMapper';
import { UserSettings } from '@brewlog/core';
import { UserSettingsRow } from '../database.types';

describe('settingsMapper', () => {
  const dbRow: UserSettingsRow = {
    user_id: 'user-123',
    weight_unit: 'imperial',
    temperature_unit: 'fahrenheit',
    default_timer_mode: 'free_brew',
    date_format: 'YYYY-MM-DD',
    created_at: '2026-10-09T00:00:00Z',
    updated_at: '2026-10-09T00:00:00Z',
  };

  const domain: UserSettings = {
    weightUnit: 'imperial',
    temperatureUnit: 'fahrenheit',
    defaultTimerMode: 'free_brew',
    dateFormat: 'YYYY-MM-DD',
  };

  it('maps database row to UserSettings domain object', () => {
    expect(mapDbToUserSettings(dbRow)).toEqual(domain);
  });

  it('maps UserSettings domain object to database insert/upsert payload', () => {
    const payload = mapUserSettingsToDb(domain, 'user-123');
    expect(payload).toEqual({
      user_id: 'user-123',
      weight_unit: 'imperial',
      temperature_unit: 'fahrenheit',
      default_timer_mode: 'free_brew',
      date_format: 'YYYY-MM-DD',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/supabase/src/mappers/settingsMapper.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement migration SQL, database types, and mappers**

Create `packages/supabase/migrations/005_create_user_settings.sql`:
```sql
-- Migration 005: Create User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_unit TEXT NOT NULL DEFAULT 'metric' CHECK (weight_unit IN ('metric', 'imperial')),
  temperature_unit TEXT NOT NULL DEFAULT 'celsius' CHECK (temperature_unit IN ('celsius', 'fahrenheit')),
  default_timer_mode TEXT NOT NULL DEFAULT 'free_brew' CHECK (default_timer_mode IN ('recipe', 'free_brew')),
  date_format TEXT NOT NULL DEFAULT 'locale' CHECK (date_format IN ('locale', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

Add `user_settings` table to `packages/supabase/src/database.types.ts`.

Create `packages/supabase/src/mappers/settingsMapper.ts`:
```typescript
import { UserSettings } from '@brewlog/core';
import { UserSettingsRow, UserSettingsInsert } from '../database.types';

export function mapDbToUserSettings(row: UserSettingsRow): UserSettings {
  return {
    weightUnit: row.weight_unit,
    temperatureUnit: row.temperature_unit,
    defaultTimerMode: row.default_timer_mode,
    dateFormat: row.date_format,
  };
}

export function mapUserSettingsToDb(settings: UserSettings, userId: string): UserSettingsInsert {
  return {
    user_id: userId,
    weight_unit: settings.weightUnit,
    temperature_unit: settings.temperatureUnit,
    default_timer_mode: settings.defaultTimerMode,
    date_format: settings.dateFormat,
  };
}
```

Export mapper and types in `packages/supabase/src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/supabase/src/mappers/settingsMapper.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/supabase/migrations/005_create_user_settings.sql packages/supabase/src/database.types.ts packages/supabase/src/mappers/settingsMapper.ts packages/supabase/src/mappers/settingsMapper.test.ts packages/supabase/src/index.ts
git commit -m "feat(supabase): add user_settings schema migration, types, and mappers"
```

---

### Task 3: Mobile Settings State Management (`SettingsContext` in `apps/mobile`)

**Files:**
- Create: `apps/mobile/src/features/settings/SettingsContext.tsx`
- Create: `apps/mobile/src/features/settings/SettingsContext.test.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Consumes: `UserSettings`, `DEFAULT_USER_SETTINGS` from `@brewlog/core`; `useAuth` from `apps/mobile/src/features/auth/AuthContext`; `supabase` from `apps/mobile/src/lib/supabase`
- Produces:
  ```typescript
  export interface SettingsContextValue {
    settings: UserSettings;
    loading: boolean;
    updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
    resetToDefaults: () => Promise<void>;
  }
  export const useSettings: () => SettingsContextValue;
  export const SettingsProvider: React.FC<{ children: ReactNode }>;
  ```

- [ ] **Step 1: Write failing tests for mobile SettingsContext**

`apps/mobile/src/features/settings/SettingsContext.test.tsx`:
```typescript
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsProvider, useSettings, SETTINGS_STORAGE_KEY } from './SettingsContext';
import { DEFAULT_USER_SETTINGS } from '@brewlog/core';

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('SettingsContext (Mobile)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    vi.clearAllMocks();
  });

  it('hydrates with default settings when storage is empty', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  it('updates settings and persists to AsyncStorage immediately', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateSettings({ weightUnit: 'imperial' });
    });

    expect(result.current.settings.weightUnit).toBe('imperial');
    const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(JSON.parse(stored!)).toMatchObject({ weightUnit: 'imperial' });
  });

  it('resets settings to defaults on resetToDefaults()', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateSettings({ weightUnit: 'imperial', temperatureUnit: 'fahrenheit' });
    });

    await act(async () => {
      await result.current.resetToDefaults();
    });

    expect(result.current.settings).toEqual(DEFAULT_USER_SETTINGS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/settings/SettingsContext.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement SettingsContext for mobile**

Create `apps/mobile/src/features/settings/SettingsContext.tsx`:
Implement immediate `AsyncStorage` hydration, optimistic React state updates, cloud fetch/upsert when `user` is authenticated, and fallback to `DEFAULT_USER_SETTINGS`.

Modify `apps/mobile/app/_layout.tsx`:
Wrap provider hierarchy with `<SettingsProvider>` immediately following `<AuthProvider>`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/mobile/src/features/settings/SettingsContext.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/settings/SettingsContext.tsx apps/mobile/src/features/settings/SettingsContext.test.tsx apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add SettingsContext with AsyncStorage persistence and cloud sync"
```

---

### Task 4: Mobile Settings Modal & Navigation Entry (`apps/mobile`)

**Files:**
- Create: `apps/mobile/app/settings/modal.tsx`
- Create: `apps/mobile/src/features/settings/screens/SettingsModalScreen.test.tsx`
- Modify: `apps/mobile/app/_layout.tsx` (add `settings/modal` Stack.Screen)
- Modify: `apps/mobile/src/features/auth/AuthSheet.tsx` (add preferences trigger button)

**Interfaces:**
- Consumes: `useSettings` from `SettingsContext`; `useAuth` from `AuthContext`; `INDUSTRIAL_PRECISION_THEME` from `@brewlog/core`; `expo-router`
- Produces: Modal screen with segmented selectors for Weight, Temperature, Default Timer Mode, and Date Format.

- [ ] **Step 1: Write failing tests for mobile Settings Modal Screen**

`apps/mobile/src/features/settings/screens/SettingsModalScreen.test.tsx`:
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SettingsModalScreen from '../../../../app/settings/modal';
import { SettingsProvider } from '../SettingsContext';

const mockBack = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

describe('SettingsModalScreen', () => {
  it('renders all preference sections and dismiss button', () => {
    const { getByText, getByTestId } = render(
      <SettingsProvider>
        <SettingsModalScreen />
      </SettingsProvider>
    );

    expect(getByText(/INSTRUMENT SETTINGS/i)).toBeTruthy();
    expect(getByText(/WEIGHT UNIT/i)).toBeTruthy();
    expect(getByText(/TEMPERATURE UNIT/i)).toBeTruthy();
    expect(getByText(/DEFAULT TIMER MODE/i)).toBeTruthy();
    expect(getByText(/DATE FORMAT/i)).toBeTruthy();
  });

  it('triggers router.back() when dismiss button is pressed', () => {
    const { getByLabelText } = render(
      <SettingsProvider>
        <SettingsModalScreen />
      </SettingsProvider>
    );

    fireEvent.press(getByLabelText('Close settings'));
    expect(mockBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/settings/screens/SettingsModalScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement SettingsModalScreen and AuthSheet entry**

1. Create `apps/mobile/app/settings/modal.tsx`:
   - Industrial Precision styled modal with segmented buttons for each preference.
   - Haptic feedback on tap (`Haptics.selectionAsync()`).
   - Cloud telemetry card showing sync status or local device status.
   - Reset to defaults confirmation button.
2. In `apps/mobile/app/_layout.tsx`:
   - Register `<Stack.Screen name="settings/modal" options={{ presentation: 'modal', headerShown: false }} />`.
3. In `apps/mobile/src/features/auth/AuthSheet.tsx`:
   - Add an "APP PREFERENCES" entry card with `Sliders` or `Settings` icon.
   - Tapping dismisses the sheet and routes to `/settings/modal` via `router.push('/settings/modal')`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/mobile/src/features/settings/screens/SettingsModalScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/settings/modal.tsx apps/mobile/src/features/settings/screens/SettingsModalScreen.test.tsx apps/mobile/app/_layout.tsx apps/mobile/src/features/auth/AuthSheet.tsx
git commit -m "feat(mobile): add Settings modal screen and AuthSheet navigation entry"
```

---

### Task 5: Web Settings State Management & Context (`apps/web`)

**Files:**
- Create: `apps/web/src/features/settings/SettingsContext.tsx`
- Create: `apps/web/src/features/settings/SettingsContext.test.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `UserSettings`, `DEFAULT_USER_SETTINGS` from `@brewlog/core`; `useAuth` from `apps/web/src/features/auth/AuthContext`; `supabase` from `apps/web/src/lib/supabase`
- Produces:
  ```typescript
  export interface SettingsContextValue {
    settings: UserSettings;
    loading: boolean;
    updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
    resetToDefaults: () => Promise<void>;
  }
  export const useSettings: () => SettingsContextValue;
  export const SettingsProvider: React.FC<{ children: ReactNode }>;
  ```

- [ ] **Step 1: Write failing tests for web SettingsContext**

`apps/web/src/features/settings/SettingsContext.test.tsx`:
```typescript
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsProvider, useSettings, WEB_SETTINGS_STORAGE_KEY } from './SettingsContext';
import { DEFAULT_USER_SETTINGS } from '@brewlog/core';

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('SettingsContext (Web)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('hydrates with default settings when localStorage is empty', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  it('updates settings and persists to localStorage', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateSettings({ temperatureUnit: 'fahrenheit' });
    });

    expect(result.current.settings.temperatureUnit).toBe('fahrenheit');
    const stored = JSON.parse(localStorage.getItem(WEB_SETTINGS_STORAGE_KEY)!);
    expect(stored.temperatureUnit).toBe('fahrenheit');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/features/settings/SettingsContext.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement SettingsContext for web**

Create `apps/web/src/features/settings/SettingsContext.tsx`:
- localStorage caching under key `brewlog_settings_cache`.
- Supabase fetch/upsert when authenticated.
- Fallback to `DEFAULT_USER_SETTINGS`.

Modify `apps/web/src/App.tsx`:
Wrap route tree with `<SettingsProvider>`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/features/settings/SettingsContext.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/settings/SettingsContext.tsx apps/web/src/features/settings/SettingsContext.test.tsx apps/web/src/App.tsx
git commit -m "feat(web): add SettingsContext with localStorage persistence and cloud sync"
```

---

### Task 6: Web Settings Route & Navigation Entry (`apps/web`)

**Files:**
- Create: `apps/web/src/routes/SettingsRoute.tsx`
- Create: `apps/web/src/routes/SettingsRoute.test.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/features/auth/UserMenu.tsx`

**Interfaces:**
- Consumes: `useSettings` from `SettingsContext`; `formatWeight`, `formatTemperature`, `formatDisplayDate` from `@brewlog/core`
- Produces: Route `/settings` with segmented preferences controls and live calibration preview tile.

- [ ] **Step 1: Write failing tests for SettingsRoute**

`apps/web/src/routes/SettingsRoute.test.tsx`:
```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { SettingsRoute } from './SettingsRoute';
import { SettingsProvider } from '../features/settings/SettingsContext';

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

describe('SettingsRoute', () => {
  it('renders settings sections and calibration preview gauge', () => {
    render(
      <MemoryRouter>
        <SettingsProvider>
          <SettingsRoute />
        </SettingsProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/INSTRUMENT SETTINGS/i)).toBeInTheDocument();
    expect(screen.getByText(/WEIGHT UNIT/i)).toBeInTheDocument();
    expect(screen.getByText(/TEMPERATURE UNIT/i)).toBeInTheDocument();
    expect(screen.getByText(/CALIBRATION PREVIEW/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/routes/SettingsRoute.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement SettingsRoute and update UserMenu and App**

1. Create `apps/web/src/routes/SettingsRoute.tsx`:
   - Grouped chassis cards for Weight, Temperature, Default Timer Mode, Date Format.
   - Interactive live calibration preview gauge showing formatted values reacting to changes.
   - Reset to factory defaults button.
2. In `apps/web/src/App.tsx`:
   - Add `<Route path="/settings" element={<SettingsRoute />} />` inside `RootLayout`.
3. In `apps/web/src/features/auth/UserMenu.tsx`:
   - Add a gear icon link to `/settings` when unauthenticated.
   - Add a "SETTINGS" link in the dropdown menu when signed in.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/routes/SettingsRoute.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/SettingsRoute.tsx apps/web/src/routes/SettingsRoute.test.tsx apps/web/src/App.tsx apps/web/src/features/auth/UserMenu.tsx
git commit -m "feat(web): add SettingsRoute with live preview gauge and UserMenu links"
```

---

### Task 7: Key Telemetry Display & Default Mode Integration (Mobile & Web)

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx` (Timer default mode & weight formatting)
- Modify: `apps/mobile/src/components/timer/TimerHero.tsx` (faceplate unit formatting)
- Modify: `apps/web/src/features/timer/TimerView.tsx` (Timer default mode & weight formatting)
- Modify: `apps/mobile/src/features/recipes/screens/RecipeDetailScreen.tsx` (specs grid temperature & weight)
- Modify: `apps/web/src/features/recipes/RecipeDetailPane.tsx` (specs grid temperature & weight)
- Create: `apps/mobile/src/features/settings/telemetryIntegration.test.tsx`

**Interfaces:**
- Consumes: `useSettings` across mobile and web; `formatWeight`, `formatTemperature` from `@brewlog/core`
- Produces: Dynamic display values respecting `weightUnit`, `temperatureUnit`, and `defaultTimerMode`.

- [ ] **Step 1: Write failing test verifying settings integration on timer default mode and telemetry**

`apps/mobile/src/features/settings/telemetryIntegration.test.tsx`:
```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, it, expect, vi } from 'vitest';
import { TimerHero } from '../../components/timer/TimerHero';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';

describe('TimerHero Settings Unit Display', () => {
  it('renders imperial units when weightUnit is imperial', () => {
    const recipe = DEFAULT_PRESET_RECIPES[0];
    const { getByText } = render(
      <TimerHero
        recipe={recipe}
        elapsedSeconds={0}
        totalDurationSeconds={180}
        isRunning={false}
        isFinished={false}
        weightUnit="imperial"
      />
    );

    expect(getByText(/oz/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/settings/telemetryIntegration.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Wire settings into Timer and Recipe specs across mobile and web**

1. Update `TimerHero.tsx` and `TimerHero.test.tsx` to accept and format via `weightUnit`.
2. Update `apps/mobile/app/(tabs)/index.tsx` and `apps/web/src/features/timer/TimerView.tsx` to initialize default mode from `settings.defaultTimerMode` when uninitialized.
3. Update `RecipeDetailScreen.tsx` on mobile and `RecipeDetailPane.tsx` on web to format temperature with `formatTemperature` and dose with `formatWeight`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/mobile/src/features/settings/telemetryIntegration.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/timer/ apps/mobile/app/(tabs)/index.tsx apps/web/src/features/timer/ apps/mobile/src/features/recipes/ apps/web/src/features/recipes/ apps/mobile/src/features/settings/telemetryIntegration.test.tsx
git commit -m "feat: wire user settings into timer mode and telemetry displays on mobile and web"
```

---

### Task 8: Verification, Full Test Suite Execution & Documentation

**Files:**
- Modify: `docs/ROADMAP.md` (mark Phase 8 completed)
- Modify: `CASE_STUDY.md` (record Phase 8 implementation notes)

**Execution Steps:**
- [ ] **Step 1: Monorepo typecheck**
  Run: `npm run typecheck`
  Expected: Clean zero-error output across all 5 workspaces.

- [ ] **Step 2: Full Monorepo Test Suite**
  *(Permitted per user rule: Ready to commit and push entire phase)*
  Run: `npm test`
  Expected: 100% pass across all workspaces.

- [ ] **Step 3: Update ROADMAP.md and CASE_STUDY.md**
  Update milestone status for Phase 8 in `docs/ROADMAP.md` and append technical summary.

- [ ] **Step 4: Commit**
  ```bash
  git add docs/ROADMAP.md CASE_STUDY.md
  git commit -m "docs: complete Phase 8 user settings milestone in roadmap"
  ```
