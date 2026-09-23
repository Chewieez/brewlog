# Phase 5: Mobile Coffee Bean Stash & Cellar Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, offline-first Coffee Bean Stash and Cellar Inventory subsystem for the Expo mobile app (`apps/mobile`) with resting window calculations, custom roaster resting targets, freezer vault tracking, native bag CRUD, dedicated detail and modal screens, and seamless Timer handoff with 1-tap brew dose deduction.

**Architecture:** We use Approach A (Dedicated `StashContext` with Direct Timer Bridge). `StashContext` manages offline-first `AsyncStorage` caching (`@brewlog/mobile:stash_cache`), auto-sync with Supabase `beans`, cellar shelves (`active`, `frozen`, `archived`), and active brew bean state. The `TimerScreen` consumes `useStash` alongside `useRecipes` to display the active bean and offer 1-tap dose deduction upon brew completion.

**Tech Stack:** React Native (Expo SDK 57), React 19, TypeScript, `@brewlog/core`, `@brewlog/supabase`, `@react-native-async-storage/async-storage`, `expo-router`, `lucide-react-native`, `expo-haptics`, Vitest / React Native Testing Library.

**Spec:** [`docs/superpowers/specs/2026-09-22-phase-5-stash-manager-design.md`](file:///Users/greglawrence/Projects/brewlog/.worktrees/mobile-stash-manager/docs/superpowers/specs/2026-09-22-phase-5-stash-manager-design.md)

## Global Constraints

- Strict TypeScript with zero `any` declarations.
- Visual continuity strictly conforming to `INDUSTRIAL_PRECISION_THEME` design tokens. Zero hardcoded colors.
- Interactive touch targets must meet or exceed Apple HIG 44×44pt minimum.
- Native testing suites must reside outside `apps/mobile/app/` to prevent Expo Router route leakage.
- Every state mutation must preserve offline-first immediate UI response.

---

### Task 1: Core Domain Model & Supabase Schema Expansion

**Files:**
- Modify: `packages/core/src/types.ts:48-71`
- Create: `packages/supabase/migrations/003_add_bean_cellar_status.sql`
- Modify: `packages/supabase/src/database.types.ts:40-75`
- Modify: `packages/supabase/src/mappers/beanMappers.ts:1-53`
- Test: `packages/supabase/src/mappers/beanMappers.test.ts` (or `packages/supabase/src/index.test.ts`)

**Interfaces:**
- Consumes: `Bean` interface, `BeanRow`, `BeanInsert`.
- Produces: `Bean` with `recommendedRestDays?: number`, `isFrozen?: boolean`, `frozenDate?: string`, `isArchived?: boolean`.

- [ ] **Step 1: Write the failing test for bean mappers**

Create `packages/supabase/src/mappers/beanMappers.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { mapBeanRowToDomain, mapBeanDomainToInsert } from "./beanMappers";
import { BeanRow } from "../database.types";
import { Bean } from "@brewlog/core";

describe("beanMappers", () => {
  it("maps new cellar fields from Supabase row to domain", () => {
    const row: BeanRow = {
      id: "bean-1",
      user_id: "user-1",
      roaster: "Sey",
      name: "Worka Sakaro",
      origin_country: "Ethiopia",
      region: "Gedeb",
      farm: "Worka",
      variety: ["Kurume", "Dega"],
      altitude_meters: 2100,
      process: "washed",
      roast_level: "light",
      roast_date: "2026-09-01",
      recommended_rest_days: 14,
      flavor_notes: ["Peach", "Jasmine"],
      rating: 4.8,
      bag_weight_grams: 250,
      remaining_grams: 214,
      price: 24,
      is_favorite: true,
      is_frozen: true,
      frozen_date: "2026-09-15",
      is_archived: false,
      notes: "Floral and sweet",
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-15T00:00:00Z",
    };

    const domain = mapBeanRowToDomain(row);
    expect(domain.recommendedRestDays).toBe(14);
    expect(domain.isFrozen).toBe(true);
    expect(domain.frozenDate).toBe("2026-09-15");
    expect(domain.isArchived).toBe(false);
  });

  it("maps domain with cellar fields to Supabase insert payload", () => {
    const bean: Omit<Bean, "id" | "createdAt"> = {
      roaster: "Passenger",
      name: "Agaro",
      flavorNotes: ["Citrus"],
      recommendedRestDays: 21,
      isFrozen: true,
      frozenDate: "2026-09-20",
      isArchived: false,
    };

    const insert = mapBeanDomainToInsert(bean, "user-1");
    expect(insert.recommended_rest_days).toBe(21);
    expect(insert.is_frozen).toBe(true);
    expect(insert.frozen_date).toBe("2026-09-20");
    expect(insert.is_archived).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- packages/supabase/src/mappers/beanMappers.test.ts`
Expected: FAIL with TypeScript errors on missing fields in `BeanRow`, `Bean`, and `BeanInsert`.

- [ ] **Step 3: Implement domain updates, migration, and mappers**

1. Update `packages/core/src/types.ts`:
Add to `interface Bean`:
```typescript
  recommendedRestDays?: number;
  isFrozen?: boolean;
  frozenDate?: string;
  isArchived?: boolean;
```

2. Create `packages/supabase/migrations/003_add_bean_cellar_status.sql`:
```sql
-- Migration 003: Add Bean Cellar & Resting Status Fields
ALTER TABLE public.beans
  ADD COLUMN IF NOT EXISTS recommended_rest_days INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS frozen_date DATE,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
```

3. Update `packages/supabase/src/database.types.ts`:
Add `recommended_rest_days: number | null`, `is_frozen: boolean`, `frozen_date: string | null`, `is_archived: boolean` to `Row`, `Insert`, and `Update` types for `beans`.

4. Update `packages/supabase/src/mappers/beanMappers.ts`:
Map `recommendedRestDays: b.recommended_rest_days ?? undefined`, `isFrozen: b.is_frozen ?? false`, `frozenDate: b.frozen_date || undefined`, `isArchived: b.is_archived ?? false` in `mapBeanRowToDomain`, and the inverse in `mapBeanDomainToInsert`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- packages/supabase/src/mappers/beanMappers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/supabase/
git commit -m "feat(core,supabase): expand Bean domain and database schema with cellar status fields"
```

---

### Task 2: Resting Window Math & Freezer Logic Utilities

**Files:**
- Create: `apps/mobile/src/features/stash/utils/restingUtils.ts`
- Test: `apps/mobile/src/features/stash/utils/restingUtils.test.ts`

**Interfaces:**
- Consumes: `Bean`, `calculateDaysOffRoast` from `@brewlog/core`.
- Produces:
  ```typescript
  export interface BeanRestingInfo {
    effectiveDays: number;
    status: 'resting' | 'peak' | 'aging' | 'past-peak';
    label: string;
    stageLabel: string;
    isFrozen: boolean;
    badgeLabel: string;
    badgeColor: string;
    progressPercent: number;
    recommendedRestDays: number;
  }
  export function calculateBeanRestingInfo(bean: Bean, referenceDate?: Date): BeanRestingInfo;
  ```

- [ ] **Step 1: Write the failing test for restingUtils**

Create `apps/mobile/src/features/stash/utils/restingUtils.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateBeanRestingInfo } from './restingUtils';
import { Bean } from '@brewlog/core';

describe('calculateBeanRestingInfo', () => {
  const baseBean: Bean = {
    id: 'b-1',
    name: 'Worka',
    roaster: 'Sey',
    flavorNotes: [],
    createdAt: '2026-09-01T00:00:00Z',
  };

  it('calculates default 5-day resting status on shelf', () => {
    // 3 days off roast -> Needs Rest
    const bean1: Bean = { ...baseBean, roastDate: '2026-09-19' };
    const today = new Date('2026-09-22T12:00:00Z');
    const info1 = calculateBeanRestingInfo(bean1, today);

    expect(info1.effectiveDays).toBe(3);
    expect(info1.status).toBe('resting');
    expect(info1.stageLabel).toBe('Needs Rest (De-gassing)');
    expect(info1.badgeLabel).toBe('Needs Rest • Day 3 of 5');
    expect(info1.isFrozen).toBe(false);

    // 10 days off roast -> Peak Window
    const bean2: Bean = { ...baseBean, roastDate: '2026-09-12' };
    const info2 = calculateBeanRestingInfo(bean2, today);
    expect(info2.effectiveDays).toBe(10);
    expect(info2.status).toBe('peak');
    expect(info2.stageLabel).toBe('Peak Flavor Window');
    expect(info2.badgeLabel).toBe('Peak Window • Day 10');
  });

  it('adapts resting window when custom recommendedRestDays is provided', () => {
    // Roaster suggests 14 days rest
    const bean: Bean = { ...baseBean, roastDate: '2026-09-12', recommendedRestDays: 14 };
    const today = new Date('2026-09-22T12:00:00Z'); // 10 days off roast
    const info = calculateBeanRestingInfo(bean, today);

    expect(info.effectiveDays).toBe(10);
    expect(info.recommendedRestDays).toBe(14);
    expect(info.status).toBe('resting');
    expect(info.badgeLabel).toBe('Needs Rest • Day 10 of 14');

    // 15 days off roast -> Now Peak Window for 14-day bean
    const pastRestBean: Bean = { ...baseBean, roastDate: '2026-09-07', recommendedRestDays: 14 };
    const pastRestInfo = calculateBeanRestingInfo(pastRestBean, today);
    expect(pastRestInfo.effectiveDays).toBe(15);
    expect(pastRestInfo.status).toBe('peak');
    expect(pastRestInfo.badgeLabel).toBe('Peak Window • Day 15');
  });

  it('halts aging and produces frozen badge when bean is in freezer vault', () => {
    // Roast date was 30 days ago, but frozen at day 12
    const frozenBean: Bean = {
      ...baseBean,
      roastDate: '2026-08-23',
      isFrozen: true,
      frozenDate: '2026-09-04', // 12 days after roast
    };
    const today = new Date('2026-09-22T12:00:00Z');
    const info = calculateBeanRestingInfo(frozenBean, today);

    expect(info.isFrozen).toBe(true);
    expect(info.effectiveDays).toBe(12);
    expect(info.status).toBe('peak');
    expect(info.badgeLabel).toBe('❄️ Frozen at Day 12 (Peak Window)');
  });

  it('handles edge cases (missing roast date, future dates)', () => {
    const noDateBean: Bean = { ...baseBean, roastDate: undefined };
    const info = calculateBeanRestingInfo(noDateBean);
    expect(info.effectiveDays).toBe(0);
    expect(info.badgeLabel).toBe('Unspecified Roast Date');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/mobile/src/features/stash/utils/restingUtils.test.ts`
Expected: FAIL with "Cannot find module ./restingUtils"

- [ ] **Step 3: Implement restingUtils**

Create `apps/mobile/src/features/stash/utils/restingUtils.ts`:
```typescript
import { Bean, calculateDaysOffRoast, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface BeanRestingInfo {
  effectiveDays: number;
  status: 'resting' | 'peak' | 'aging' | 'past-peak';
  label: string;
  stageLabel: string;
  isFrozen: boolean;
  badgeLabel: string;
  badgeColor: string;
  progressPercent: number;
  recommendedRestDays: number;
}

export function calculateBeanRestingInfo(
  bean: Bean,
  referenceDate: Date = new Date()
): BeanRestingInfo {
  const restDays = bean.recommendedRestDays && bean.recommendedRestDays > 0 ? bean.recommendedRestDays : 5;
  const isFrozen = Boolean(bean.isFrozen);

  if (!bean.roastDate) {
    return {
      effectiveDays: 0,
      status: 'resting',
      label: 'Unknown',
      stageLabel: 'No Date Specified',
      isFrozen: false,
      badgeLabel: 'Unspecified Roast Date',
      badgeColor: colors.textMuted,
      progressPercent: 0,
      recommendedRestDays: restDays,
    };
  }

  // If frozen and has frozenDate, calculate days off roast up to frozenDate
  let effectiveDays = 0;
  if (isFrozen && bean.frozenDate) {
    const frozenTargetDate = new Date(bean.frozenDate);
    effectiveDays = calculateDaysOffRoast(bean.roastDate, frozenTargetDate);
  } else {
    effectiveDays = calculateDaysOffRoast(bean.roastDate, referenceDate);
  }

  let status: 'resting' | 'peak' | 'aging' | 'past-peak';
  let stageLabel: string;
  let badgeColor: string;

  if (effectiveDays < restDays) {
    status = 'resting';
    stageLabel = 'Needs Rest (De-gassing)';
    badgeColor = colors.warning || '#eab308';
  } else if (effectiveDays <= restDays + 25) {
    status = 'peak';
    stageLabel = 'Peak Flavor Window';
    badgeColor = colors.success || '#22c55e';
  } else if (effectiveDays <= restDays + 55) {
    status = 'aging';
    stageLabel = 'Good (Drink Soon)';
    badgeColor = colors.accent || '#f97316';
  } else {
    status = 'past-peak';
    stageLabel = 'Past Peak';
    badgeColor = colors.textMuted || '#94a3b8';
  }

  let badgeLabel = '';
  if (isFrozen) {
    badgeLabel = `❄️ Frozen at Day ${effectiveDays} (${status === 'peak' ? 'Peak Window' : stageLabel})`;
    badgeColor = '#38bdf8'; // Ice Cyan
  } else {
    if (status === 'resting') {
      badgeLabel = `Needs Rest • Day ${effectiveDays} of ${restDays}`;
    } else if (status === 'peak') {
      badgeLabel = `Peak Window • Day ${effectiveDays}`;
    } else if (status === 'aging') {
      badgeLabel = `Good (Drink Soon) • Day ${effectiveDays}`;
    } else {
      badgeLabel = `Past Peak • Day ${effectiveDays}`;
    }
  }

  const maxTrackedDays = restDays + 25;
  const progressPercent = Math.min(100, Math.max(0, Math.round((effectiveDays / maxTrackedDays) * 100)));

  return {
    effectiveDays,
    status,
    label: stageLabel,
    stageLabel,
    isFrozen,
    badgeLabel,
    badgeColor,
    progressPercent,
    recommendedRestDays: restDays,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apps/mobile/src/features/stash/utils/restingUtils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/stash/utils/
git commit -m "feat(mobile): add restingUtils for adaptive resting windows and freezer status calculation"
```

---

### Task 3: Mobile `StashContext` & Offline Caching

**Files:**
- Create: `apps/mobile/src/features/stash/StashContext.tsx`
- Test: `apps/mobile/src/features/stash/StashContext.test.tsx`

**Interfaces:**
- Consumes: `Bean` from `@brewlog/core`, `useAuth` from `../auth/AuthContext`, `supabase` from `../../lib/supabase`.
- Produces: `StashProvider`, `useStash` hook with CRUD methods, shelf views, and `deductBeanDose`.

- [ ] **Step 1: Write the failing test for StashContext**

Create `apps/mobile/src/features/stash/StashContext.test.tsx`:
```typescript
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StashProvider, useStash } from './StashContext';
import { Bean } from '@brewlog/core';

vi.mock('../../lib/supabase', () => ({
  supabase: null,
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

describe('StashContext', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <StashProvider>{children}</StashProvider>
  );

  it('hydrates from AsyncStorage cache immediately', async () => {
    const cachedBean: Bean = {
      id: 'cached-1',
      roaster: 'Sey',
      name: 'Worka',
      flavorNotes: [],
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem('@brewlog/mobile:stash_cache', JSON.stringify([cachedBean]));

    const { result } = renderHook(() => useStash(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.beans).toHaveLength(1);
    expect(result.current.beans[0].name).toBe('Worka');
  });

  it('adds a new bean and stores it in AsyncStorage', async () => {
    const { result } = renderHook(() => useStash(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: Bean | undefined;
    await act(async () => {
      created = await result.current.addBean({
        roaster: 'Passenger',
        name: 'Divisoria',
        flavorNotes: ['Plum'],
        bagWeightGrams: 250,
        remainingGrams: 250,
      });
    });

    expect(created?.id).toBeDefined();
    expect(result.current.beans).toHaveLength(1);
    expect(result.current.activeBeans).toHaveLength(1);

    const stored = await AsyncStorage.getItem('@brewlog/mobile:stash_cache');
    expect(stored).toContain('Divisoria');
  });

  it('toggles frozen vault status and updates frozenDate', async () => {
    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: Bean | undefined;
    await act(async () => {
      created = await result.current.addBean({
        roaster: 'Tim Wendelboe',
        name: 'Caballero',
        flavorNotes: [],
      });
    });

    await act(async () => {
      await result.current.toggleFrozen(created!.id);
    });

    expect(result.current.frozenBeans).toHaveLength(1);
    expect(result.current.activeBeans).toHaveLength(0);
    expect(result.current.beans[0].isFrozen).toBe(true);
    expect(result.current.beans[0].frozenDate).toBeDefined();
  });

  it('deducts dose from remaining weight and clamps at zero', async () => {
    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: Bean | undefined;
    await act(async () => {
      created = await result.current.addBean({
        roaster: 'Sey',
        name: 'Bantu',
        bagWeightGrams: 250,
        remainingGrams: 30,
        flavorNotes: [],
      });
    });

    await act(async () => {
      await result.current.deductBeanDose(created!.id, 18);
    });

    expect(result.current.beans[0].remainingGrams).toBe(12);

    // Deduct more than remaining
    await act(async () => {
      await result.current.deductBeanDose(created!.id, 20);
    });
    expect(result.current.beans[0].remainingGrams).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/mobile/src/features/stash/StashContext.test.tsx`
Expected: FAIL with "Cannot find module ./StashContext"

- [ ] **Step 3: Implement StashContext**

Create `apps/mobile/src/features/stash/StashContext.tsx`:
Implement `StashProvider` and `useStash` following `RecipeContext.tsx` pattern:
- Cache key: `@brewlog/mobile:stash_cache`.
- State: `beans`, `activeBrewBean`, `loading`.
- Computed:
  - `activeBeans = beans.filter(b => !b.isArchived && !b.isFrozen)`
  - `frozenBeans = beans.filter(b => !b.isArchived && b.isFrozen)`
  - `archivedBeans = beans.filter(b => b.isArchived)`
- Methods:
  - `addBean`: generates UUID, sets defaults, updates state & storage, inserts to Supabase if authed.
  - `updateBean`: merges partial updates, updates storage & Supabase.
  - `deleteBean`: deletes item from state, storage, and Supabase.
  - `toggleFavorite`: toggles `isFavorite`.
  - `toggleFrozen`: toggles `isFrozen`, sets `frozenDate = new Date().toISOString().split('T')[0]` when frozen, or clears it when thawed.
  - `archiveBean`: sets `isArchived = true`.
  - `unarchiveBean`: sets `isArchived = false`.
  - `deductBeanDose`: updates `remainingGrams = Math.max(0, (b.remainingGrams || 0) - doseGrams)`.
  - `setActiveBrewBean`: sets or clears active bean for brew timer.
  - `refreshBeans`: fetches Supabase and merges.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apps/mobile/src/features/stash/StashContext.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/stash/StashContext.tsx apps/mobile/src/features/stash/StashContext.test.tsx
git commit -m "feat(mobile): implement StashContext with offline-first persistence and shelf partitioning"
```

---

### Task 4: Cellar Components (`BeanCard` and `CellarSummaryBar`)

**Files:**
- Create: `apps/mobile/src/features/stash/components/BeanCard.tsx`
- Create: `apps/mobile/src/features/stash/components/CellarSummaryBar.tsx`
- Test: `apps/mobile/src/features/stash/components/BeanCard.test.tsx`
- Test: `apps/mobile/src/features/stash/components/CellarSummaryBar.test.tsx`

**Interfaces:**
- Consumes: `Bean`, `INDUSTRIAL_PRECISION_THEME`, `calculateBeanRestingInfo`.
- Produces: Visual card and summary chassis bar with touch targets $\ge 44$pt.

- [ ] **Step 1: Write the failing tests for BeanCard & CellarSummaryBar**

1. Create `apps/mobile/src/features/stash/components/BeanCard.test.tsx`:
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { describe, it, expect, vi } from 'vitest';
import { BeanCard } from './BeanCard';
import { Bean } from '@brewlog/core';

describe('BeanCard', () => {
  const bean: Bean = {
    id: 'b-1',
    roaster: 'Sey',
    name: 'Worka Sakaro',
    originCountry: 'Ethiopia',
    process: 'washed',
    roastLevel: 'light',
    roastDate: '2026-09-12',
    bagWeightGrams: 250,
    remainingGrams: 200,
    flavorNotes: ['Jasmine', 'Peach'],
    createdAt: '2026-09-01T00:00:00Z',
  };

  it('renders bean details, resting badge, and remaining weight', () => {
    const { getByText } = render(
      <BeanCard bean={bean} onPress={() => {}} onBrew={() => {}} onToggleFavorite={() => {}} />
    );

    expect(getByText('SEY')).toBeTruthy();
    expect(getByText('Worka Sakaro')).toBeTruthy();
    expect(getByText('Ethiopia')).toBeTruthy();
    expect(getByText('washed')).toBeTruthy();
    expect(getByText(/Peak Window/)).toBeTruthy();
    expect(getByText(/200g \/ 250g/)).toBeTruthy();
  });

  it('triggers onBrew callback when BREW button is pressed', () => {
    const onBrew = vi.fn();
    const { getByText } = render(
      <BeanCard bean={bean} onPress={() => {}} onBrew={onBrew} onToggleFavorite={() => {}} />
    );

    fireEvent.press(getByText('BREW'));
    expect(onBrew).toHaveBeenCalledWith(bean);
  });
});
```

2. Create `apps/mobile/src/features/stash/components/CellarSummaryBar.test.tsx`:
```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, it, expect } from 'vitest';
import { CellarSummaryBar } from './CellarSummaryBar';

describe('CellarSummaryBar', () => {
  it('renders total bags, peak bags count, and total remaining grams', () => {
    const { getByText } = render(
      <CellarSummaryBar totalBags={5} peakBags={3} totalRemainingGrams={980} />
    );

    expect(getByText('5')).toBeTruthy();
    expect(getByText('ACTIVE BAGS')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('AT PEAK')).toBeTruthy();
    expect(getByText('980g')).toBeTruthy();
    expect(getByText('TOTAL STASH')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- apps/mobile/src/features/stash/components/`
Expected: FAIL

- [ ] **Step 3: Implement BeanCard and CellarSummaryBar**

1. Create `apps/mobile/src/features/stash/components/CellarSummaryBar.tsx`:
Implement 3-column chassis metrics card with `ACTIVE BAGS`, `AT PEAK`, `TOTAL STASH` matching `TimerHero` layout patterns.

2. Create `apps/mobile/src/features/stash/components/BeanCard.tsx`:
Implement card with:
- Roaster eyebrow & title.
- Favorite star icon button ($\ge 44$pt touch area).
- Badges: Origin country, process, roast level.
- Resting badge from `calculateBeanRestingInfo(bean)`.
- Remaining weight progress bar (colored green/accent, or amber when $< 40$g).
- Action buttons: "BREW" button (accent color) and pressable card wrapper.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- apps/mobile/src/features/stash/components/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/stash/components/
git commit -m "feat(mobile): add BeanCard and CellarSummaryBar components"
```

---

### Task 5: Cellar Catalog Screen & Tab Integration

**Files:**
- Create: `apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx`
- Modify: `apps/mobile/app/(tabs)/stash.tsx:1-93`
- Test: `apps/mobile/src/features/stash/screens/StashCatalogScreen.test.tsx`

**Interfaces:**
- Consumes: `useStash`, `BeanCard`, `CellarSummaryBar`, `useRouter`.
- Produces: Interactive tab view with search, shelf switcher, and process filtering.

- [ ] **Step 1: Write the failing test for StashCatalogScreen**

Create `apps/mobile/src/features/stash/screens/StashCatalogScreen.test.tsx`:
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { describe, it, expect, vi } from 'vitest';
import { StashCatalogScreen } from './StashCatalogScreen';
import { StashContextValue, StashContext } from '../StashContext';
import { Bean } from '@brewlog/core';

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('StashCatalogScreen', () => {
  const mockBeans: Bean[] = [
    {
      id: 'b-1',
      roaster: 'Sey',
      name: 'Worka',
      originCountry: 'Ethiopia',
      process: 'washed',
      roastDate: '2026-09-12',
      bagWeightGrams: 250,
      remainingGrams: 200,
      flavorNotes: [],
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'b-2',
      roaster: 'Passenger',
      name: 'Heza',
      originCountry: 'Burundi',
      process: 'natural',
      isFrozen: true,
      frozenDate: '2026-09-15',
      bagWeightGrams: 250,
      remainingGrams: 250,
      flavorNotes: [],
      createdAt: '2026-09-01T00:00:00Z',
    },
  ];

  const mockValue: StashContextValue = {
    beans: mockBeans,
    activeBeans: [mockBeans[0]],
    frozenBeans: [mockBeans[1]],
    archivedBeans: [],
    activeBrewBean: null,
    loading: false,
    addBean: vi.fn(),
    updateBean: vi.fn(),
    deleteBean: vi.fn(),
    toggleFavorite: vi.fn(),
    toggleFrozen: vi.fn(),
    archiveBean: vi.fn(),
    unarchiveBean: vi.fn(),
    setActiveBrewBean: vi.fn(),
    deductBeanDose: vi.fn(),
    refreshBeans: vi.fn(),
  };

  it('renders active cellar beans by default and switches to freezer vault', () => {
    const { getByText, queryByText } = render(
      <StashContext.Provider value={mockValue}>
        <StashCatalogScreen />
      </StashContext.Provider>
    );

    expect(getByText('Worka')).toBeTruthy();
    expect(queryByText('Heza')).toBeNull();

    // Switch to Freezer Vault
    fireEvent.press(getByText('Freezer Vault'));
    expect(getByText('Heza')).toBeTruthy();
    expect(queryByText('Worka')).toBeNull();
  });

  it('filters beans by search input', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <StashContext.Provider value={mockValue}>
        <StashCatalogScreen />
      </StashContext.Provider>
    );

    const searchInput = getByPlaceholderText('Search roaster, origin, name...');
    fireEvent.changeText(searchInput, 'Sey');
    expect(getByText('Worka')).toBeTruthy();

    fireEvent.changeText(searchInput, 'NonExistent');
    expect(queryByText('Worka')).toBeNull();
    expect(getByText('No coffees found')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/mobile/src/features/stash/screens/StashCatalogScreen.test.tsx`
Expected: FAIL with "Cannot find module ./StashCatalogScreen"

- [ ] **Step 3: Implement StashCatalogScreen and update tab route**

1. Create `apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx`:
- Shelf selector pills: `Active Cellar`, `Freezer Vault`, `Archived`.
- Process filter chips: `All`, `Washed`, `Natural`, `Honey`, `Anaerobic`.
- Search query filtering.
- Renders `CellarSummaryBar` and `FlatList` with `BeanCard` elements.
- Empty states for empty shelves and search misses.
- Top "+ ADD BAG" button navigating to `/stash/modal`.

2. Replace placeholder in `apps/mobile/app/(tabs)/stash.tsx`:
```typescript
import React from 'react';
import { StashCatalogScreen } from '../../src/features/stash/screens/StashCatalogScreen';

export default function StashTabRoute() {
  return <StashCatalogScreen />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apps/mobile/src/features/stash/screens/StashCatalogScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx apps/mobile/app/\(tabs\)/stash.tsx apps/mobile/src/features/stash/screens/StashCatalogScreen.test.tsx
git commit -m "feat(mobile): integrate StashCatalogScreen into main stash tab route"
```

---

### Task 6: Dedicated Bean Detail Screen (`app/stash/[id].tsx`)

**Files:**
- Create: `apps/mobile/src/features/stash/screens/BeanDetailScreen.tsx`
- Create: `apps/mobile/app/stash/[id].tsx`
- Modify: `apps/mobile/app/_layout.tsx` (register route)
- Test: `apps/mobile/src/features/stash/screens/BeanDetailScreen.test.tsx`

**Interfaces:**
- Consumes: `useStash`, `useLocalSearchParams`, `useRouter`.
- Produces: Full-page bean detail with resting curve, dose quick-steppers, and "Brew with this Coffee" CTA.

- [ ] **Step 1: Write the failing test for BeanDetailScreen**

Create `apps/mobile/src/features/stash/screens/BeanDetailScreen.test.tsx`:
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { describe, it, expect, vi } from 'vitest';
import { BeanDetailScreen } from './BeanDetailScreen';
import { StashContextValue, StashContext } from '../StashContext';
import { Bean } from '@brewlog/core';

const pushMock = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: pushMock }),
  useLocalSearchParams: () => ({ id: 'b-1' }),
}));

describe('BeanDetailScreen', () => {
  const bean: Bean = {
    id: 'b-1',
    roaster: 'Sey',
    name: 'Worka Sakaro',
    originCountry: 'Ethiopia',
    region: 'Gedeb',
    farm: 'Worka',
    variety: ['Kurume'],
    altitudeMeters: 2100,
    process: 'washed',
    roastLevel: 'light',
    roastDate: '2026-09-12',
    recommendedRestDays: 14,
    bagWeightGrams: 250,
    remainingGrams: 210,
    flavorNotes: ['Jasmine', 'Peach'],
    notes: 'Exceptional transparency and floral brightness.',
    createdAt: '2026-09-01T00:00:00Z',
  };

  const mockContext: StashContextValue = {
    beans: [bean],
    activeBeans: [bean],
    frozenBeans: [],
    archivedBeans: [],
    activeBrewBean: null,
    loading: false,
    addBean: vi.fn(),
    updateBean: vi.fn(),
    deleteBean: vi.fn(),
    toggleFavorite: vi.fn(),
    toggleFrozen: vi.fn(),
    archiveBean: vi.fn(),
    unarchiveBean: vi.fn(),
    setActiveBrewBean: vi.fn(),
    deductBeanDose: vi.fn(),
    refreshBeans: vi.fn(),
  };

  it('renders bean details, specs, and flavor notes', () => {
    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    expect(getByText('Worka Sakaro')).toBeTruthy();
    expect(getByText('SEY')).toBeTruthy();
    expect(getByText('Ethiopia • Gedeb')).toBeTruthy();
    expect(getByText('2100m')).toBeTruthy();
    expect(getByText('Jasmine')).toBeTruthy();
    expect(getByText('Peach')).toBeTruthy();
  });

  it('sets active bean and navigates to Timer on BREW button press', () => {
    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByText('BREW WITH THIS COFFEE'));
    expect(mockContext.setActiveBrewBean).toHaveBeenCalledWith(bean);
    expect(pushMock).toHaveBeenCalledWith('/(tabs)');
  });

  it('adjusts remaining weight using quick dose steppers', () => {
    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByText('-18g'));
    expect(mockContext.updateBean).toHaveBeenCalledWith('b-1', { remainingGrams: 192 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/mobile/src/features/stash/screens/BeanDetailScreen.test.tsx`
Expected: FAIL with "Cannot find module ./BeanDetailScreen"

- [ ] **Step 3: Implement BeanDetailScreen and register route**

1. Create `apps/mobile/src/features/stash/screens/BeanDetailScreen.tsx`:
- Header card with specs (country, region, farm, variety, altitude, process, roast level).
- Resting timeline with current day indicator and roaster target.
- Inventory card with remaining weight gauge and `-15g`, `-18g`, `+18g` quick calibration steppers.
- Flavor notes tags.
- Action toolbar with primary `"BREW WITH THIS COFFEE"`, `Freeze / Thaw`, `Edit`, and `Archive / Delete`.

2. Create `apps/mobile/app/stash/[id].tsx`:
```typescript
import React from 'react';
import { BeanDetailScreen } from '../../src/features/stash/screens/BeanDetailScreen';

export default function BeanDetailRoute() {
  return <BeanDetailScreen />;
}
```

3. Register stack screen in `apps/mobile/app/_layout.tsx`:
```typescript
<Stack.Screen
  name="stash/[id]"
  options={{
    headerShown: true,
    title: 'Coffee Details',
    headerStyle: { backgroundColor: colors.canvas },
    headerTintColor: colors.textPrimary,
  }}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apps/mobile/src/features/stash/screens/BeanDetailScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/stash/screens/BeanDetailScreen.tsx apps/mobile/app/stash/\[id\].tsx apps/mobile/app/_layout.tsx apps/mobile/src/features/stash/screens/BeanDetailScreen.test.tsx
git commit -m "feat(mobile): add BeanDetailScreen with resting timeline and brew session CTA"
```

---

### Task 7: Modal Bean Form (Add & Edit)

**Files:**
- Create: `apps/mobile/src/features/stash/screens/BeanModalScreen.tsx`
- Create: `apps/mobile/app/stash/modal.tsx`
- Modify: `apps/mobile/app/_layout.tsx` (register modal route)
- Test: `apps/mobile/src/features/stash/screens/BeanModalScreen.test.tsx`

**Interfaces:**
- Consumes: `useStash`, `useLocalSearchParams`, `useRouter`.
- Produces: Validated modal form for creating or editing bean records.

- [ ] **Step 1: Write the failing test for BeanModalScreen**

Create `apps/mobile/src/features/stash/screens/BeanModalScreen.test.tsx`:
```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, vi } from 'vitest';
import { BeanModalScreen } from './BeanModalScreen';
import { StashContextValue, StashContext } from '../StashContext';

const backMock = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ back: backMock, push: vi.fn() }),
  useLocalSearchParams: () => ({}),
}));

describe('BeanModalScreen', () => {
  const mockContext: StashContextValue = {
    beans: [],
    activeBeans: [],
    frozenBeans: [],
    archivedBeans: [],
    activeBrewBean: null,
    loading: false,
    addBean: vi.fn().mockResolvedValue({ id: 'new-1' }),
    updateBean: vi.fn(),
    deleteBean: vi.fn(),
    toggleFavorite: vi.fn(),
    toggleFrozen: vi.fn(),
    archiveBean: vi.fn(),
    unarchiveBean: vi.fn(),
    setActiveBrewBean: vi.fn(),
    deductBeanDose: vi.fn(),
    refreshBeans: vi.fn(),
  };

  it('validates required fields before submitting', async () => {
    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanModalScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByText('SAVE BAG'));
    expect(getByText('Roaster is required')).toBeTruthy();
    expect(mockContext.addBean).not.toHaveBeenCalled();
  });

  it('saves new bean with custom recommendedRestDays and bag size preset', async () => {
    const { getByPlaceholderText, getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanModalScreen />
      </StashContext.Provider>
    );

    fireEvent.changeText(getByPlaceholderText('Roaster (e.g. Sey, Passenger)'), 'Sey');
    fireEvent.changeText(getByPlaceholderText('Coffee Name (e.g. Worka Sakaro)'), 'Bantu');
    fireEvent.changeText(getByPlaceholderText('5 (Standard)'), '14');

    fireEvent.press(getByText('SAVE BAG'));

    await waitFor(() => {
      expect(mockContext.addBean).toHaveBeenCalledWith(
        expect.objectContaining({
          roaster: 'Sey',
          name: 'Bantu',
          recommendedRestDays: 14,
        })
      );
      expect(backMock).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/mobile/src/features/stash/screens/BeanModalScreen.test.tsx`
Expected: FAIL with "Cannot find module ./BeanModalScreen"

- [ ] **Step 3: Implement BeanModalScreen and register modal route**

1. Create `apps/mobile/src/features/stash/screens/BeanModalScreen.tsx`:
- Header with Cancel / Save.
- Inputs: Roaster, Name, Origin Country, Region, Farm, Variety, Altitude.
- Horizontal segmented chips for Process Method and Roast Level.
- Roast Date and `recommendedRestDays` (placeholder `5`).
- Bag weight presets (250g, 340g, 1kg) and remaining weight inputs.
- Freezer vault toggle.
- Discard confirmation alert on cancel if inputs were modified.

2. Create `apps/mobile/app/stash/modal.tsx`:
```typescript
import React from 'react';
import { BeanModalScreen } from '../../src/features/stash/screens/BeanModalScreen';

export default function BeanModalRoute() {
  return <BeanModalScreen />;
}
```

3. Register in `apps/mobile/app/_layout.tsx`:
```typescript
<Stack.Screen
  name="stash/modal"
  options={{
    presentation: 'modal',
    headerShown: false,
  }}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apps/mobile/src/features/stash/screens/BeanModalScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/stash/screens/BeanModalScreen.tsx apps/mobile/app/stash/modal.tsx apps/mobile/app/_layout.tsx apps/mobile/src/features/stash/screens/BeanModalScreen.test.tsx
git commit -m "feat(mobile): add BeanModalScreen for creating and editing coffee bags"
```

---

### Task 8: Timer Bridge Integration & Dose Deduction

**Files:**
- Create: `apps/mobile/src/features/stash/components/ActiveBeanPill.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx:1-160`
- Modify: `apps/mobile/app/_layout.tsx` (wrap with `StashProvider`)
- Test: `apps/mobile/__tests__/tabs/timerStashIntegration.test.tsx`

**Interfaces:**
- Consumes: `useStash`, `useRecipes`, `useMobileBrewTimer`.
- Produces: Active bean pill above Timer chassis and 1-tap dose deduction upon brew completion.

- [ ] **Step 1: Write the failing test for Timer & Stash integration**

Create `apps/mobile/__tests__/tabs/timerStashIntegration.test.tsx`:
```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, vi } from 'vitest';
import TimerScreen from '../../app/(tabs)/index';
import { StashContextValue, StashContext } from '../../src/features/stash/StashContext';
import { RecipeContextValue, RecipeContext } from '../../src/features/recipes/RecipeContext';
import { Bean, DEFAULT_PRESET_RECIPES } from '@brewlog/core';

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../../src/hooks/useMobileBrewTimer', () => ({
  useMobileBrewTimer: () => ({
    elapsedSeconds: 180,
    isRunning: false,
    isFinished: true, // completed brew
    isMuted: false,
    currentStageIndex: 0,
    currentStage: null,
    totalProgress: 1,
    toggleTimer: vi.fn(),
    reset: vi.fn(),
    toggleMute: vi.fn(),
  }),
}));

describe('Timer & Stash Integration', () => {
  const activeBean: Bean = {
    id: 'bean-1',
    roaster: 'Sey',
    name: 'Worka Sakaro',
    remainingGrams: 200,
    flavorNotes: [],
    createdAt: '2026-09-01T00:00:00Z',
  };

  const mockStash: StashContextValue = {
    beans: [activeBean],
    activeBeans: [activeBean],
    frozenBeans: [],
    archivedBeans: [],
    activeBrewBean: activeBean,
    loading: false,
    addBean: vi.fn(),
    updateBean: vi.fn(),
    deleteBean: vi.fn(),
    toggleFavorite: vi.fn(),
    toggleFrozen: vi.fn(),
    archiveBean: vi.fn(),
    unarchiveBean: vi.fn(),
    setActiveBrewBean: vi.fn(),
    deductBeanDose: vi.fn().mockResolvedValue(undefined),
    refreshBeans: vi.fn(),
  };

  const mockRecipes: RecipeContextValue = {
    recipes: DEFAULT_PRESET_RECIPES,
    customRecipes: [],
    presets: DEFAULT_PRESET_RECIPES,
    loading: false,
    activeTimerRecipe: DEFAULT_PRESET_RECIPES[0],
    activeTimerDose: 15,
    isBrewActive: false,
    setIsBrewActive: vi.fn(),
    timerResetTrigger: 0,
    addRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
    setActiveTimerRecipe: vi.fn(),
    refreshRecipes: vi.fn(),
  };

  it('renders active bean pill in timer chassis and deducts dose upon completion', async () => {
    const { getByText } = render(
      <StashContext.Provider value={mockStash}>
        <RecipeContext.Provider value={mockRecipes}>
          <TimerScreen />
        </RecipeContext.Provider>
      </StashContext.Provider>
    );

    expect(getByText(/SEY • Worka Sakaro/)).toBeTruthy();
    expect(getByText(/200g left/)).toBeTruthy();

    // Deduct button in finished banner
    const deductBtn = getByText('DEDUCT 15g FROM STASH');
    fireEvent.press(deductBtn);

    await waitFor(() => {
      expect(mockStash.deductBeanDose).toHaveBeenCalledWith('bean-1', 15);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/mobile/__tests__/tabs/timerStashIntegration.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement ActiveBeanPill and integrate with TimerScreen and RootLayout**

1. Create `apps/mobile/src/features/stash/components/ActiveBeanPill.tsx`:
Compact industrial pill displaying `🫘 [ROASTER] • [NAME] ([REMAINING]g left)` with a touch target `×` button to call `setActiveBrewBean(null)`.

2. Update `apps/mobile/app/_layout.tsx`:
Wrap children inside `<StashProvider>` right below `<RecipeProvider>`.

3. Update `apps/mobile/app/(tabs)/index.tsx`:
- Consume `const { activeBrewBean, setActiveBrewBean, deductBeanDose } = useStash();`
- Render `<ActiveBeanPill />` above `TimerHero`.
- In the `isFinished` section, render deduction action card when `activeBrewBean` is non-null.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apps/mobile/__tests__/tabs/timerStashIntegration.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/stash/components/ActiveBeanPill.tsx apps/mobile/app/\(tabs\)/index.tsx apps/mobile/app/_layout.tsx apps/mobile/__tests__/tabs/timerStashIntegration.test.tsx
git commit -m "feat(mobile): integrate active bean handoff and 1-tap dose deduction into TimerScreen"
```

---

### Task 9: Monorepo Verification & Documentation

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `README.md`

- [ ] **Step 1: Run full test suite monorepo-wide**

Run: `npm test`
Expected: 100% test pass across all packages and apps (core, supabase, web, mobile).

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Run Expo Doctor**

Run: `cd apps/mobile && npx expo-doctor`
Expected: 21/21 clean checks.

- [ ] **Step 4: Run Metro export dry run**

Run: `cd apps/mobile && npx expo export --platform ios && npx expo export --platform android`
Expected: Clean production bundles generated for iOS and Android.

- [ ] **Step 5: Update documentation and commit**

Update `docs/ROADMAP.md` and `README.md` to mark Phase 5 complete.
```bash
git add docs/ROADMAP.md README.md
git commit -m "docs: document Phase 5 mobile stash manager and cellar inventory completion"
```
