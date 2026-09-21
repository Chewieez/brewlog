# Phase 4 Mobile Recipe Studio & Catalog Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 4 (Mobile Recipe Studio & Catalog Integration) in `apps/mobile`, providing full recipe lifecycle authoring (create, edit, duplicate, delete), dynamic method filtering, offline-first persistence with Supabase cloud sync, native stack/modal navigation, and seamless handoff to the brew timer.

**Architecture:** A centralized `RecipeContext` mounted at the mobile root provides reactive state and offline-first caching via `@react-native-async-storage/async-storage`, syncing with Supabase `recipes` and `recipe_stages` tables via `@brewlog/supabase` mappers. Navigation utilizes Expo Router's native Stack (`/recipe/[id]`) and Modal (`/recipe/builder`). Timer tab consumes `activeTimerRecipe` and `activeTimerDose` with active brew protection.

**Tech Stack:** Expo SDK 57, React Native 0.86.3, Expo Router ~57.0.22, React 19.2.8, `@brewlog/core`, `@brewlog/supabase`, `@react-native-async-storage/async-storage`, `lucide-react-native`, `expo-haptics`, Vitest.

**Spec:** [docs/superpowers/specs/2026-09-20-phase-4-recipe-studio-design.md](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-09-20-phase-4-recipe-studio-design.md)

## Global Constraints

- **STRICT RULE: Zero Inline Styles**. All styles MUST be defined in dedicated `StyleSheet.create` objects using `INDUSTRIAL_PRECISION_THEME` tokens and `FONTS` constants from `apps/mobile/src/theme/fonts.ts`. No `style={{ ... }}` in any component.
- **Touch Targets**: All interactive elements (`Pressable`, buttons, inputs) must meet or exceed Apple HIG minimum of 44×44pt.
- **Offline Resilience**: Full offline capability; local changes persist in `AsyncStorage` and auto-sync when authenticated with Supabase.
- **Preset Protection**: Built-in official presets (`DEFAULT_PRESET_RECIPES`) are immutable. They cannot be edited in-place or deleted.

---

## File Structure & Component Mapping

```
apps/mobile
├── app
│   ├── _layout.tsx                             # Wrap root with RecipeProvider & register recipe routes
│   ├── (tabs)
│   │   ├── index.tsx                           # Timer screen consuming RecipeContext active recipe
│   │   └── recipes.tsx                         # Recipe catalog screen with dynamic filter bar & cards
│   └── recipe
│       ├── [id].tsx                            # Native push stack screen for recipe details
│       └── builder.tsx                         # Native modal screen for create / edit / duplicate
└── src
    └── features
        └── recipes
            ├── RecipeContext.tsx                # RecipeContext & useRecipes hook
            ├── RecipeContext.test.tsx           # Context unit & sync tests
            ├── components
            │   ├── MethodFilterBar.tsx          # Dynamic horizontal method filter pills
            │   ├── MethodFilterBar.test.tsx     # Tests for dynamic pills and selection
            │   ├── RecipeCard.tsx               # Individual catalog card component
            │   ├── RecipeCard.test.tsx          # Tests for badges, specs, and press navigation
            │   ├── SpecsGrid.tsx                # 4-card specs chassis grid
            │   ├── SpecsGrid.test.tsx           # Tests for specs formatting
            │   ├── DoseRescaler.tsx             # Steppers, direct input, and quick presets
            │   ├── DoseRescaler.test.tsx        # Tests for dose adjustment and scaling
            │   ├── StagesTimeline.tsx           # Vertical stage sequence
            │   └── StagesTimeline.test.tsx      # Tests for step ordering and durations
            ├── screens
            │   ├── RecipesCatalogScreen.tsx     # Catalog screen content component
            │   ├── RecipesCatalogScreen.test.tsx
            │   ├── RecipeDetailScreen.tsx       # Detail screen content component
            │   ├── RecipeDetailScreen.test.tsx
            │   ├── RecipeBuilderScreen.tsx      # Builder screen content component
            │   └── RecipeBuilderScreen.test.tsx
            └── utils
                ├── timingUtils.ts               # Recalculate timing & total brew time
                └── timingUtils.test.ts          # Unit tests for chronological consistency
```

---

## Tasks

### Task 1: Timing & Recalculation Utilities (`timingUtils.ts`)

**Files:**
- Create: `apps/mobile/src/features/recipes/utils/timingUtils.ts`
- Test: `apps/mobile/src/features/recipes/utils/timingUtils.test.ts`

**Interfaces:**
- Consumes: `BrewStage` from `@brewlog/core`.
- Produces: `recalculateTiming(stages: BrewStage[]): BrewStage[]`, `calculateTotalBrewTime(stages: BrewStage[]): number`.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/features/recipes/utils/timingUtils.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { BrewStage } from '@brewlog/core';
import { recalculateTiming, calculateTotalBrewTime } from './timingUtils';

describe('timingUtils', () => {
  const sampleStages: BrewStage[] = [
    {
      id: 's1',
      name: 'Bloom',
      stageType: 'bloom',
      startSecond: 10, // deliberately wrong to test recalculation
      durationSeconds: 45,
      targetWaterWeightGrams: 50,
      instruction: 'Bloom pour',
    },
    {
      id: 's2',
      name: 'Second Pour',
      stageType: 'pour',
      startSecond: 99, // deliberately wrong
      durationSeconds: 30,
      targetWaterWeightGrams: 150,
      instruction: 'Main pour',
    },
    {
      id: 's3',
      name: 'Drawdown',
      stageType: 'drawdown',
      startSecond: 0,
      durationSeconds: 45,
      targetWaterWeightGrams: 250,
      instruction: 'Let drain',
    },
  ];

  it('recalculates sequential startSecond values starting from 0', () => {
    const recalculated = recalculateTiming(sampleStages);
    expect(recalculated).toHaveLength(3);
    expect(recalculated[0].startSecond).toBe(0);
    expect(recalculated[0].durationSeconds).toBe(45);
    expect(recalculated[1].startSecond).toBe(45);
    expect(recalculated[1].durationSeconds).toBe(30);
    expect(recalculated[2].startSecond).toBe(75);
    expect(recalculated[2].durationSeconds).toBe(45);
  });

  it('calculates total brew time as the sum of all durations', () => {
    expect(calculateTotalBrewTime(sampleStages)).toBe(120);
  });

  it('handles empty stage lists cleanly', () => {
    expect(recalculateTiming([])).toEqual([]);
    expect(calculateTotalBrewTime([])).toBe(0);
  });

  it('sanitizes negative or NaN durations to 0', () => {
    const dirtyStages: BrewStage[] = [
      {
        id: 's1',
        name: 'Bloom',
        stageType: 'bloom',
        startSecond: 0,
        durationSeconds: -15,
        targetWaterWeightGrams: 50,
        instruction: 'Bloom',
      },
      {
        id: 's2',
        name: 'Pour',
        stageType: 'pour',
        startSecond: 0,
        durationSeconds: (NaN as unknown as number),
        targetWaterWeightGrams: 150,
        instruction: 'Pour',
      },
    ];
    const recalculated = recalculateTiming(dirtyStages);
    expect(recalculated[0].durationSeconds).toBe(0);
    expect(recalculated[0].startSecond).toBe(0);
    expect(recalculated[1].durationSeconds).toBe(0);
    expect(recalculated[1].startSecond).toBe(0);
    expect(calculateTotalBrewTime(dirtyStages)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test apps/mobile/src/features/recipes/utils/timingUtils.test.ts`
Expected: FAIL with missing module error.

- [ ] **Step 3: Write minimal implementation**

Create `apps/mobile/src/features/recipes/utils/timingUtils.ts`:
```typescript
import { BrewStage } from '@brewlog/core';

export function recalculateTiming(stages: BrewStage[]): BrewStage[] {
  let currentStart = 0;
  return stages.map((stage) => {
    const rawDuration = Number(stage.durationSeconds);
    const duration = isNaN(rawDuration) || rawDuration < 0 ? 0 : Math.round(rawDuration);
    const updated: BrewStage = {
      ...stage,
      startSecond: currentStart,
      durationSeconds: duration,
    };
    currentStart += duration;
    return updated;
  });
}

export function calculateTotalBrewTime(stages: BrewStage[]): number {
  return stages.reduce((acc, stage) => {
    const rawDuration = Number(stage.durationSeconds);
    const duration = isNaN(rawDuration) || rawDuration < 0 ? 0 : Math.round(rawDuration);
    return acc + duration;
  }, 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test apps/mobile/src/features/recipes/utils/timingUtils.test.ts`
Expected: PASS with 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/recipes/utils/
git commit -m "feat(mobile): add stage timing recalculation utilities"
```

---

### Task 2: Mobile Recipe State Management & Sync (`RecipeContext.tsx`)

**Files:**
- Create: `apps/mobile/src/features/recipes/RecipeContext.tsx`
- Test: `apps/mobile/src/features/recipes/RecipeContext.test.tsx`

**Interfaces:**
- Consumes:
  - `BrewRecipe`, `DEFAULT_PRESET_RECIPES` from `@brewlog/core`
  - `mapRecipeRowToDomain`, `mapRecipeDomainToInsert`, `mapRecipeStageDomainToInsert` from `@brewlog/supabase`
  - `useAuth` from `apps/mobile/src/features/auth/AuthContext`
  - `supabase` from `apps/mobile/src/lib/supabase`
  - `@react-native-async-storage/async-storage`
- Produces: `RecipeProvider`, `useRecipes()`, `RecipeContextValue`.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/features/recipes/RecipeContext.test.tsx`:
```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PRESET_RECIPES, BrewRecipe } from '@brewlog/core';
import { RecipeProvider, useRecipes } from './RecipeContext';

const mockUser: any = { id: 'test-user-uuid', email: 'barista@brewlog.dev' };
let mockAuthUser: any = null;

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    session: null,
    loading: false,
  }),
}));

const mockSupabaseFrom = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockSupabaseFrom(...args),
  },
}));

describe('RecipeContext', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await AsyncStorage.clear();
    mockAuthUser = null;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RecipeProvider>{children}</RecipeProvider>
  );

  it('hydrates with DEFAULT_PRESET_RECIPES and activeTimerRecipe defaulted to first preset', async () => {
    const { result } = renderHook(() => useRecipes(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.recipes.length).toBeGreaterThanOrEqual(DEFAULT_PRESET_RECIPES.length);
    expect(result.current.customRecipes).toEqual([]);
    expect(result.current.presets).toEqual(DEFAULT_PRESET_RECIPES);
    expect(result.current.activeTimerRecipe.id).toBe(DEFAULT_PRESET_RECIPES[0].id);
    expect(result.current.activeTimerDose).toBe(DEFAULT_PRESET_RECIPES[0].coffeeDoseGrams);
  });

  it('creates custom recipe offline with local-rec- ID and saves to AsyncStorage', async () => {
    const { result } = renderHook(() => useRecipes(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: BrewRecipe | null = null;
    await act(async () => {
      created = await result.current.addRecipe({
        name: 'My V60 Single Pour',
        brewMethod: 'v60',
        coffeeDoseGrams: 15,
        waterAmountGrams: 250,
        ratio: 16.67,
        grindSize: 'Medium-Fine',
        waterTempCelsius: 93,
        totalTimeSeconds: 150,
        description: 'Clean bright cup',
        stages: [
          {
            id: 's1',
            name: 'Bloom',
            stageType: 'bloom',
            startSecond: 0,
            durationSeconds: 45,
            targetWaterWeightGrams: 50,
            instruction: 'Bloom pour',
          },
        ],
      });
    });

    expect(created).toBeDefined();
    expect(created!.id).toMatch(/^local-rec-/);
    expect(result.current.customRecipes).toHaveLength(1);
    expect(result.current.customRecipes[0].name).toBe('My V60 Single Pour');

    const stored = await AsyncStorage.getItem('@brewlog/custom_recipes');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed[0].name).toBe('My V60 Single Pour');
  });

  it('updates an existing custom recipe and saves changes to AsyncStorage', async () => {
    const { result } = renderHook(() => useRecipes(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: BrewRecipe | null = null;
    await act(async () => {
      created = await result.current.addRecipe({
        name: 'Original Name',
        brewMethod: 'v60',
        coffeeDoseGrams: 15,
        waterAmountGrams: 250,
        ratio: 16.67,
        grindSize: 'Medium',
        waterTempCelsius: 92,
        totalTimeSeconds: 120,
        description: 'Original',
        stages: [],
      });
    });

    await act(async () => {
      await result.current.updateRecipe(created!.id, {
        name: 'Updated Name',
        waterTempCelsius: 95,
      });
    });

    expect(result.current.customRecipes[0].name).toBe('Updated Name');
    expect(result.current.customRecipes[0].waterTempCelsius).toBe(95);
  });

  it('prevents deletion or editing of built-in preset recipes', async () => {
    const { result } = renderHook(() => useRecipes(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const presetId = DEFAULT_PRESET_RECIPES[0].id;
    await act(async () => {
      await result.current.deleteRecipe(presetId);
    });

    expect(result.current.recipes.some((r) => r.id === presetId)).toBe(true);
  });

  it('deletes custom recipe and removes from AsyncStorage', async () => {
    const { result } = renderHook(() => useRecipes(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: BrewRecipe | null = null;
    await act(async () => {
      created = await result.current.addRecipe({
        name: 'To Delete',
        brewMethod: 'chemex',
        coffeeDoseGrams: 30,
        waterAmountGrams: 500,
        ratio: 16.67,
        grindSize: 'Medium-Coarse',
        waterTempCelsius: 94,
        totalTimeSeconds: 240,
        description: 'Delete me',
        stages: [],
      });
    });

    expect(result.current.customRecipes).toHaveLength(1);

    await act(async () => {
      await result.current.deleteRecipe(created!.id);
    });

    expect(result.current.customRecipes).toHaveLength(0);
  });

  it('updates activeTimerRecipe and activeTimerDose via setActiveTimerRecipe', async () => {
    const { result } = renderHook(() => useRecipes(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const testRecipe = DEFAULT_PRESET_RECIPES[1];
    act(() => {
      result.current.setActiveTimerRecipe(testRecipe, 20);
    });

    expect(result.current.activeTimerRecipe.id).toBe(testRecipe.id);
    expect(result.current.activeTimerDose).toBe(20);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test apps/mobile/src/features/recipes/RecipeContext.test.tsx`
Expected: FAIL with missing module error.

- [ ] **Step 3: Write minimal implementation**

Create `apps/mobile/src/features/recipes/RecipeContext.tsx`:
```typescript
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrewRecipe, DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import {
  mapRecipeRowToDomain,
  mapRecipeDomainToInsert,
  mapRecipeStageDomainToInsert,
} from '@brewlog/supabase';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthContext';

const STORAGE_KEY = '@brewlog/custom_recipes';

export interface RecipeContextValue {
  recipes: BrewRecipe[];
  customRecipes: BrewRecipe[];
  presets: BrewRecipe[];
  loading: boolean;
  activeTimerRecipe: BrewRecipe;
  activeTimerDose: number;
  addRecipe: (recipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => Promise<BrewRecipe>;
  updateRecipe: (id: string, updates: Partial<BrewRecipe>) => Promise<BrewRecipe>;
  deleteRecipe: (id: string) => Promise<void>;
  setActiveTimerRecipe: (recipe: BrewRecipe, dose?: number) => void;
  refreshRecipes: () => Promise<void>;
}

const RecipeContext = createContext<RecipeContextValue | null>(null);

async function loadCachedRecipes(): Promise<BrewRecipe[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read cached recipes from AsyncStorage:', err);
  }
  return [];
}

async function persistCachedRecipes(items: BrewRecipe[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to write cached recipes to AsyncStorage:', err);
  }
}

export const RecipeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [customRecipes, setCustomRecipes] = useState<BrewRecipe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTimerRecipe, setActiveTimerRecipeState] = useState<BrewRecipe>(
    DEFAULT_PRESET_RECIPES[0]
  );
  const [activeTimerDose, setActiveTimerDose] = useState<number>(
    DEFAULT_PRESET_RECIPES[0].coffeeDoseGrams
  );

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const local = await loadCachedRecipes();

      if (!supabase || !user) {
        setCustomRecipes(local);
        return;
      }

      // Auto-sync unsynced local recipes
      const unsynced = local.filter((r) => r.id.startsWith('local-rec-'));
      if (unsynced.length > 0) {
        for (const item of unsynced) {
          try {
            const payload = mapRecipeDomainToInsert(item, user.id);
            const { data: recData, error: recErr } = await supabase
              .from('recipes')
              .insert(payload)
              .select()
              .single();

            if (!recErr && recData && item.stages && item.stages.length > 0) {
              const stagePayloads = item.stages.map((stage, idx) =>
                mapRecipeStageDomainToInsert(stage, recData.id, idx)
              );
              await supabase.from('recipe_stages').insert(stagePayloads);
            }
          } catch (syncErr) {
            console.error('Failed to sync offline recipe:', item.name, syncErr);
          }
        }
      }

      // Fetch cloud recipes
      const { data, error } = await supabase
        .from('recipes')
        .select('*, recipe_stages(*)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: BrewRecipe[] = data.map((row: any) =>
          mapRecipeRowToDomain(row, row.recipe_stages || [])
        );
        setCustomRecipes(mapped);
        await persistCachedRecipes(mapped);
      } else {
        setCustomRecipes(local);
      }
    } catch (err) {
      console.error('fetchRecipes error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const addRecipe = useCallback(
    async (newRecipe: Omit<BrewRecipe, 'id' | 'createdAt'>): Promise<BrewRecipe> => {
      const localId = `local-rec-${Date.now()}`;
      const stagesWithIds = (newRecipe.stages || []).map((stage, index) => ({
        ...stage,
        id: stage.id || `local-stage-${Date.now()}-${index}`,
      }));

      const fallback: BrewRecipe = {
        ...newRecipe,
        id: localId,
        stages: stagesWithIds,
        isPreset: false,
        createdAt: new Date().toISOString(),
      };

      if (!supabase || !user) {
        setCustomRecipes((prev) => {
          const updated = [fallback, ...prev];
          persistCachedRecipes(updated);
          return updated;
        });
        return fallback;
      }

      try {
        const payload = mapRecipeDomainToInsert(newRecipe, user.id);
        const { data: recData, error: recError } = await supabase
          .from('recipes')
          .insert(payload)
          .select()
          .single();

        if (recError || !recData) {
          setCustomRecipes((prev) => {
            const updated = [fallback, ...prev];
            persistCachedRecipes(updated);
            return updated;
          });
          return fallback;
        }

        let createdStages: any[] = [];
        if (stagesWithIds.length > 0) {
          const stageInserts = stagesWithIds.map((st, idx) =>
            mapRecipeStageDomainToInsert(st, recData.id, idx)
          );
          const { data: stageData } = await supabase
            .from('recipe_stages')
            .insert(stageInserts)
            .select();
          if (stageData) createdStages = stageData;
        }

        const created = mapRecipeRowToDomain(recData, createdStages);
        setCustomRecipes((prev) => {
          const updated = [created, ...prev.filter((r) => r.id !== localId)];
          persistCachedRecipes(updated);
          return updated;
        });
        return created;
      } catch (err) {
        console.error('addRecipe exception:', err);
        setCustomRecipes((prev) => {
          const updated = [fallback, ...prev];
          persistCachedRecipes(updated);
          return updated;
        });
        return fallback;
      }
    },
    [user]
  );

  const updateRecipe = useCallback(
    async (id: string, updates: Partial<BrewRecipe>): Promise<BrewRecipe> => {
      if (id.startsWith('preset-') || DEFAULT_PRESET_RECIPES.some((p) => p.id === id)) {
        console.warn('Cannot edit built-in preset recipe:', id);
        const existing = DEFAULT_PRESET_RECIPES.find((p) => p.id === id);
        return existing!;
      }

      let updatedTarget: BrewRecipe | null = null;

      setCustomRecipes((prev) => {
        const updated = prev.map((item) => {
          if (item.id === id) {
            updatedTarget = { ...item, ...updates };
            return updatedTarget;
          }
          return item;
        });
        persistCachedRecipes(updated);
        return updated;
      });

      if (supabase && user && !id.startsWith('local-rec-') && updatedTarget) {
        try {
          const target = updatedTarget as BrewRecipe;
          const payload = mapRecipeDomainToInsert(target, user.id);
          await supabase.from('recipes').update(payload).eq('id', id);

          if (updates.stages) {
            await supabase.from('recipe_stages').delete().eq('recipe_id', id);
            const stageInserts = updates.stages.map((st, idx) =>
              mapRecipeStageDomainToInsert(st, id, idx)
            );
            await supabase.from('recipe_stages').insert(stageInserts);
          }
        } catch (err) {
          console.error('updateRecipe exception:', err);
        }
      }

      return updatedTarget!;
    },
    [user]
  );

  const deleteRecipe = useCallback(
    async (id: string): Promise<void> => {
      if (id.startsWith('preset-') || DEFAULT_PRESET_RECIPES.some((p) => p.id === id)) {
        console.warn('Cannot delete built-in preset recipe:', id);
        return;
      }

      setCustomRecipes((prev) => {
        const updated = prev.filter((r) => r.id !== id);
        persistCachedRecipes(updated);
        return updated;
      });

      if (supabase && user && !id.startsWith('local-rec-')) {
        try {
          await supabase.from('recipes').delete().eq('id', id);
        } catch (err) {
          console.error('deleteRecipe exception:', err);
        }
      }
    },
    [user]
  );

  const setActiveTimerRecipe = useCallback((recipe: BrewRecipe, dose?: number) => {
    setActiveTimerRecipeState(recipe);
    if (dose !== undefined && dose > 0) {
      setActiveTimerDose(dose);
    } else {
      setActiveTimerDose(recipe.coffeeDoseGrams);
    }
  }, []);

  const recipes = useMemo(
    () => [...customRecipes, ...DEFAULT_PRESET_RECIPES],
    [customRecipes]
  );

  const value = useMemo<RecipeContextValue>(
    () => ({
      recipes,
      customRecipes,
      presets: DEFAULT_PRESET_RECIPES,
      loading,
      activeTimerRecipe,
      activeTimerDose,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      setActiveTimerRecipe,
      refreshRecipes: fetchRecipes,
    }),
    [
      recipes,
      customRecipes,
      loading,
      activeTimerRecipe,
      activeTimerDose,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      setActiveTimerRecipe,
      fetchRecipes,
    ]
  );

  return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>;
};

export const useRecipes = (): RecipeContextValue => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test apps/mobile/src/features/recipes/RecipeContext.test.tsx`
Expected: PASS with 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/recipes/RecipeContext.tsx apps/mobile/src/features/recipes/RecipeContext.test.tsx
git commit -m "feat(mobile): implement RecipeContext and offline-first useRecipes hook"
```

---

### Task 3: Root Layout Provider Injection & Route Scaffolding

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/recipe/[id].tsx`
- Create: `apps/mobile/app/recipe/builder.tsx`
- Test: `apps/mobile/__tests__/rootLayout.test.tsx`

**Interfaces:**
- Consumes: `RecipeProvider` from `apps/mobile/src/features/recipes/RecipeContext`.
- Produces: Global provider wrapping, registered `/recipe/[id]` and `/recipe/builder` routes.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/rootLayout.test.tsx`:
```typescript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import RootLayout from '../app/_layout';

vi.mock('expo-router', () => ({
  Stack: Object.assign(
    ({ children }: any) => <div data-testid="mock-stack">{children}</div>,
    {
      Screen: ({ name, options }: any) => (
        <div data-testid={`mock-screen-${name}`} data-options={JSON.stringify(options)} />
      ),
    }
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: vi.fn(),
  hideAsync: vi.fn(),
}));

vi.mock('@expo-google-fonts/outfit', () => ({
  useFonts: () => [true, null],
  Outfit_300Light: 'Outfit_300Light',
  Outfit_400Regular: 'Outfit_400Regular',
  Outfit_500Medium: 'Outfit_500Medium',
  Outfit_600SemiBold: 'Outfit_600SemiBold',
  Outfit_700Bold: 'Outfit_700Bold',
}));

vi.mock('@expo-google-fonts/jetbrains-mono', () => ({
  JetBrainsMono_400Regular: 'JetBrainsMono_400Regular',
  JetBrainsMono_500Medium: 'JetBrainsMono_500Medium',
  JetBrainsMono_700Bold: 'JetBrainsMono_700Bold',
}));

vi.mock('../src/features/auth/AuthContext', () => ({
  AuthProvider: ({ children }: any) => <div data-testid="mock-auth-provider">{children}</div>,
  useAuth: () => ({ user: null }),
}));

vi.mock('../src/features/recipes/RecipeContext', () => ({
  RecipeProvider: ({ children }: any) => <div data-testid="mock-recipe-provider">{children}</div>,
  useRecipes: () => ({ recipes: [] }),
}));

describe('RootLayout', () => {
  it('renders AuthProvider and RecipeProvider wrapping Stack with recipe routes', () => {
    const { getByTestId } = render(<RootLayout />);

    expect(getByTestId('mock-auth-provider')).toBeDefined();
    expect(getByTestId('mock-recipe-provider')).toBeDefined();
    expect(getByTestId('mock-screen-(tabs)')).toBeDefined();
    expect(getByTestId('mock-screen-recipe/[id]')).toBeDefined();
    expect(getByTestId('mock-screen-recipe/builder')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test apps/mobile/__tests__/rootLayout.test.tsx`
Expected: FAIL because recipe routes and `RecipeProvider` are not yet added to `_layout.tsx`.

- [ ] **Step 3: Modify `_layout.tsx` and create route placeholders**

Create `apps/mobile/app/recipe/[id].tsx`:
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export default function RecipeDetailRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholderText}>Recipe Detail</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
});
```

Create `apps/mobile/app/recipe/builder.tsx`:
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export default function RecipeBuilderRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholderText}>Recipe Builder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
});
```

Update `apps/mobile/app/_layout.tsx`:
```typescript
import "react-native-get-random-values";
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { AuthProvider } from '../src/features/auth/AuthContext';
import { RecipeProvider } from '../src/features/recipes/RecipeContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors } = INDUSTRIAL_PRECISION_THEME;

  const [fontsLoaded, fontError] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

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
      <AuthProvider>
        <RecipeProvider>
          <StatusBar style="light" />
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
                headerTintColor: colors.textPrimary,
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
          </Stack>
        </RecipeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test apps/mobile/__tests__/rootLayout.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/_layout.tsx apps/mobile/app/recipe/ apps/mobile/__tests__/rootLayout.test.tsx
git commit -m "feat(mobile): register RecipeProvider and recipe stack and modal routes"
```

---

### Task 4: Dynamic Filter Bar & Recipe Card Components

**Files:**
- Create: `apps/mobile/src/features/recipes/components/MethodFilterBar.tsx`
- Test: `apps/mobile/src/features/recipes/components/MethodFilterBar.test.tsx`
- Create: `apps/mobile/src/features/recipes/components/RecipeCard.tsx`
- Test: `apps/mobile/src/features/recipes/components/RecipeCard.test.tsx`

**Interfaces:**
- `MethodFilterBarProps`: `{ recipes: BrewRecipe[]; selectedMethod: string; onSelectMethod: (method: string) => void; }`
- `RecipeCardProps`: `{ recipe: BrewRecipe; onPress: (recipe: BrewRecipe) => void; }`

- [ ] **Step 1: Write the failing tests**

Create `apps/mobile/src/features/recipes/components/MethodFilterBar.test.tsx`:
```typescript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { MethodFilterBar } from './MethodFilterBar';

describe('MethodFilterBar', () => {
  it('derives unique methods from recipes list and always includes ALL and CUSTOM', () => {
    const onSelect = vi.fn();
    const { getByText } = render(
      <MethodFilterBar
        recipes={DEFAULT_PRESET_RECIPES}
        selectedMethod="all"
        onSelectMethod={onSelect}
      />
    );

    expect(getByText('ALL')).toBeDefined();
    expect(getByText('CUSTOM')).toBeDefined();
    expect(getByText('V60')).toBeDefined();
    expect(getByText('AEROPRESS')).toBeDefined();
  });

  it('triggers onSelectMethod when pill is pressed', () => {
    const onSelect = vi.fn();
    const { getByText } = render(
      <MethodFilterBar
        recipes={DEFAULT_PRESET_RECIPES}
        selectedMethod="all"
        onSelectMethod={onSelect}
      />
    );

    fireEvent.click(getByText('V60'));
    expect(onSelect).toHaveBeenCalledWith('v60');
  });
});
```

Create `apps/mobile/src/features/recipes/components/RecipeCard.test.tsx`:
```typescript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { RecipeCard } from './RecipeCard';

describe('RecipeCard', () => {
  it('renders recipe metadata, method badge, and preset indicator', () => {
    const recipe = DEFAULT_PRESET_RECIPES[0];
    const onPress = vi.fn();
    const { getByText } = render(<RecipeCard recipe={recipe} onPress={onPress} />);

    expect(getByText(recipe.name)).toBeDefined();
    expect(getByText(recipe.brewMethod.toUpperCase())).toBeDefined();
    expect(getByText('PRESET')).toBeDefined();
    expect(getByText(`${recipe.coffeeDoseGrams}g`)).toBeDefined();
    expect(getByText(`1:${recipe.ratio}`)).toBeDefined();
  });

  it('renders CUSTOM badge when recipe is user-created', () => {
    const customRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      id: 'custom-123',
      isPreset: false,
      author: 'Barista Bob',
    };
    const { getByText } = render(<RecipeCard recipe={customRecipe} onPress={vi.fn()} />);

    expect(getByText('CUSTOM')).toBeDefined();
    expect(getByText('by Barista Bob')).toBeDefined();
  });

  it('triggers onPress with the recipe when tapped', () => {
    const recipe = DEFAULT_PRESET_RECIPES[0];
    const onPress = vi.fn();
    const { getByText } = render(<RecipeCard recipe={recipe} onPress={onPress} />);

    fireEvent.click(getByText(recipe.name));
    expect(onPress).toHaveBeenCalledWith(recipe);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test apps/mobile/src/features/recipes/components/MethodFilterBar.test.tsx`
Expected: FAIL with missing modules.

- [ ] **Step 3: Write minimal implementations**

Create `apps/mobile/src/features/recipes/components/MethodFilterBar.tsx`:
```typescript
import React, { useMemo } from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { BrewRecipe, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface MethodFilterBarProps {
  recipes: BrewRecipe[];
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
}

export const MethodFilterBar: React.FC<MethodFilterBarProps> = ({
  recipes,
  selectedMethod,
  onSelectMethod,
}) => {
  const pills = useMemo(() => {
    const methods = Array.from(new Set(recipes.map((r) => r.brewMethod.toLowerCase())));
    return ['all', 'custom', ...methods.filter((m) => m !== 'custom')];
  }, [recipes]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {pills.map((method) => {
        const isSelected = selectedMethod.toLowerCase() === method.toLowerCase();
        return (
          <Pressable
            key={method}
            onPress={() => onSelectMethod(method)}
            style={[styles.pill, isSelected ? styles.pillActive : styles.pillInactive]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Filter by ${method}`}
          >
            <Text
              style={[
                styles.pillText,
                isSelected ? styles.pillTextActive : styles.pillTextInactive,
              ]}
            >
              {method.toUpperCase().replace('-', ' ')}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
  },
  pillInactive: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
  },
  pillText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  pillTextActive: {
    color: colors.accent,
  },
  pillTextInactive: {
    color: colors.textMuted,
  },
});
```

Create `apps/mobile/src/features/recipes/components/RecipeCard.tsx`:
```typescript
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BrewRecipe, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface RecipeCardProps {
  recipe: BrewRecipe;
  onPress: (recipe: BrewRecipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onPress }) => {
  const isCustom = !recipe.isPreset && !recipe.id.startsWith('preset-');
  const minutes = Math.floor(recipe.totalTimeSeconds / 60);
  const seconds = recipe.totalTimeSeconds % 60;
  const timeFormatted = `${minutes}m ${seconds > 0 ? `${seconds}s` : ''}`.trim();

  return (
    <Pressable
      onPress={() => onPress(recipe)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`View recipe ${recipe.name}`}
    >
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
          <View style={styles.methodBadge}>
            <Text style={styles.methodBadgeText}>
              {recipe.brewMethod.toUpperCase()}
            </Text>
          </View>
          {isCustom ? (
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>CUSTOM</Text>
            </View>
          ) : (
            <View style={styles.presetBadge}>
              <Text style={styles.presetBadgeText}>PRESET</Text>
            </View>
          )}
        </View>
        {recipe.author ? (
          <Text style={styles.authorText}>by {recipe.author}</Text>
        ) : null}
      </View>

      <Text style={styles.nameText}>{recipe.name}</Text>
      {recipe.description ? (
        <Text style={styles.descriptionText} numberOfLines={2}>
          {recipe.description}
        </Text>
      ) : null}

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>DOSE</Text>
          <Text style={styles.metricValue}>{recipe.coffeeDoseGrams}g</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>RATIO</Text>
          <Text style={styles.metricValue}>1:{recipe.ratio}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>WATER</Text>
          <Text style={styles.metricValue}>{recipe.waterAmountGrams}g</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>TIME</Text>
          <Text style={styles.metricValue}>{timeFormatted}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  cardPressed: {
    opacity: 0.85,
    borderColor: colors.accent,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  methodBadge: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  methodBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  customBadge: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  customBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 0.8,
  },
  presetBadge: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  presetBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  authorText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
  nameText: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  descriptionText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.panelRecessed,
    borderRadius: 6,
    padding: 10,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: FONTS.monoRegular,
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 2,
    letterSpacing: 0.8,
  },
  metricValue: {
    fontFamily: FONTS.monoBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test apps/mobile/src/features/recipes/components/MethodFilterBar.test.tsx apps/mobile/src/features/recipes/components/RecipeCard.test.tsx`
Expected: PASS with all tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/recipes/components/
git commit -m "feat(mobile): add MethodFilterBar and RecipeCard components with dynamic pills"
```

---

### Task 5: Recipe Catalog Screen Integration (`app/(tabs)/recipes.tsx`)

**Files:**
- Create: `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx`
- Test: `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.test.tsx`
- Modify: `apps/mobile/app/(tabs)/recipes.tsx`

**Interfaces:**
- Consumes: `useRecipes()` from `RecipeContext`, `useRouter()` from `expo-router`, `MethodFilterBar`, `RecipeCard`.
- Produces: Catalog screen with filter pills, recipe card list, new recipe header button.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.test.tsx`:
```typescript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { RecipesCatalogScreen } from './RecipesCatalogScreen';

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockRecipesContext = {
  recipes: DEFAULT_PRESET_RECIPES,
  customRecipes: [],
  presets: DEFAULT_PRESET_RECIPES,
  loading: false,
  activeTimerRecipe: DEFAULT_PRESET_RECIPES[0],
  activeTimerDose: 15,
  addRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
  setActiveTimerRecipe: vi.fn(),
  refreshRecipes: vi.fn(),
};

vi.mock('../RecipeContext', () => ({
  useRecipes: () => mockRecipesContext,
}));

describe('RecipesCatalogScreen', () => {
  it('renders header, filter bar, and recipe cards', () => {
    const { getByText } = render(<RecipesCatalogScreen />);

    expect(getByText('RECIPE CATALOG')).toBeDefined();
    expect(getByText('Curated Brew Profiles')).toBeDefined();
    expect(getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();
  });

  it('navigates to /recipe/[id] when a recipe card is pressed', () => {
    const { getByText } = render(<RecipesCatalogScreen />);
    fireEvent.click(getByText(DEFAULT_PRESET_RECIPES[0].name));

    expect(mockPush).toHaveBeenCalledWith(`/recipe/${DEFAULT_PRESET_RECIPES[0].id}`);
  });

  it('navigates to /recipe/builder when New Recipe button is pressed', () => {
    const { getByLabelText } = render(<RecipesCatalogScreen />);
    fireEvent.click(getByLabelText('Create new custom recipe'));

    expect(mockPush).toHaveBeenCalledWith('/recipe/builder');
  });

  it('filters recipes by method when filter pill is selected', () => {
    const { getByText, queryByText } = render(<RecipesCatalogScreen />);
    fireEvent.click(getByText('AEROPRESS'));

    expect(getByText('AeroPress Standard')).toBeDefined();
    expect(queryByText('James Hoffmann V60')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.test.tsx`
Expected: FAIL with missing module error.

- [ ] **Step 3: Write implementation and hook up `app/(tabs)/recipes.tsx`**

Create `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx`:
```typescript
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME, BrewRecipe } from '@brewlog/core';
import { useRecipes } from '../RecipeContext';
import { MethodFilterBar } from '../components/MethodFilterBar';
import { RecipeCard } from '../components/RecipeCard';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export const RecipesCatalogScreen: React.FC = () => {
  const router = useRouter();
  const { recipes } = useRecipes();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const filteredRecipes = useMemo(() => {
    if (selectedFilter === 'all') return recipes;
    if (selectedFilter === 'custom') {
      return recipes.filter((r) => !r.isPreset && !r.id.startsWith('preset-'));
    }
    return recipes.filter(
      (r) => r.brewMethod.toLowerCase() === selectedFilter.toLowerCase()
    );
  }, [recipes, selectedFilter]);

  const handleSelectRecipe = (recipe: BrewRecipe) => {
    router.push(`/recipe/${recipe.id}`);
  };

  const handleCreateNew = () => {
    router.push('/recipe/builder');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEyebrow}>RECIPE CATALOG</Text>
          <Text style={styles.headerTitle}>Curated Brew Profiles</Text>
          <Text style={styles.headerSubtitle}>
            Specialty brew guides alongside your custom recipes.
          </Text>
        </View>
        <Pressable
          onPress={handleCreateNew}
          style={styles.addButton}
          accessibilityRole="button"
          accessibilityLabel="Create new custom recipe"
        >
          <Plus size={18} color={colors.canvas} />
          <Text style={styles.addButtonText}>NEW</Text>
        </Pressable>
      </View>

      <MethodFilterBar
        recipes={recipes}
        selectedMethod={selectedFilter}
        onSelectMethod={setSelectedFilter}
      />

      <View style={styles.listContainer}>
        {filteredRecipes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Recipes Found</Text>
            <Text style={styles.emptySubtitle}>
              No recipes match the selected brew method filter.
            </Text>
          </View>
        ) : (
          filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onPress={handleSelectRecipe}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerEyebrow: {
    fontSize: 11,
    fontFamily: FONTS.monoBold,
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: FONTS.sansBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.sansRegular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    minHeight: 44,
    minWidth: 72,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  addButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.canvas,
    letterSpacing: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
```

Update `apps/mobile/app/(tabs)/recipes.tsx`:
```typescript
import React from 'react';
import { RecipesCatalogScreen } from '../../src/features/recipes/screens/RecipesCatalogScreen';

export default function RecipesTab() {
  return <RecipesCatalogScreen />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.test.tsx apps/mobile/app/(tabs)/recipes.tsx
git commit -m "feat(mobile): integrate dynamic RecipesCatalogScreen with filter bar and navigation"
```

---

### Task 6: Recipe Detail Components (SpecsGrid, DoseRescaler, StagesTimeline)

**Files:**
- Create: `apps/mobile/src/features/recipes/components/SpecsGrid.tsx`
- Test: `apps/mobile/src/features/recipes/components/SpecsGrid.test.tsx`
- Create: `apps/mobile/src/features/recipes/components/DoseRescaler.tsx`
- Test: `apps/mobile/src/features/recipes/components/DoseRescaler.test.tsx`
- Create: `apps/mobile/src/features/recipes/components/StagesTimeline.tsx`
- Test: `apps/mobile/src/features/recipes/components/StagesTimeline.test.tsx`

**Interfaces:**
- `SpecsGridProps`: `{ totalWater: number; ratio: number; totalTimeSeconds: number; waterTempCelsius?: number; }`
- `DoseRescalerProps`: `{ currentDose: number; baseDose: number; onDoseChange: (dose: number) => void; }`
- `StagesTimelineProps`: `{ stages: BrewStage[]; }`

- [ ] **Step 1: Write the failing tests**

Create `apps/mobile/src/features/recipes/components/SpecsGrid.test.tsx`:
```typescript
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SpecsGrid } from './SpecsGrid';

describe('SpecsGrid', () => {
  it('renders all four specification cards formatted properly', () => {
    const { getByText } = render(
      <SpecsGrid
        totalWater={250}
        ratio={16.67}
        totalTimeSeconds={180}
        waterTempCelsius={93}
      />
    );

    expect(getByText('250g')).toBeDefined();
    expect(getByText('1:16.7')).toBeDefined();
    expect(getByText('3m 00s')).toBeDefined();
    expect(getByText('93°C')).toBeDefined();
  });
});
```

Create `apps/mobile/src/features/recipes/components/DoseRescaler.test.tsx`:
```typescript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DoseRescaler } from './DoseRescaler';

describe('DoseRescaler', () => {
  it('increments and decrements dose by 1g using steppers', () => {
    const onDoseChange = vi.fn();
    const { getByLabelText } = render(
      <DoseRescaler currentDose={15} baseDose={15} onDoseChange={onDoseChange} />
    );

    fireEvent.click(getByLabelText('Increase dose by 1 gram'));
    expect(onDoseChange).toHaveBeenCalledWith(16);

    fireEvent.click(getByLabelText('Decrease dose by 1 gram'));
    expect(onDoseChange).toHaveBeenCalledWith(14);
  });

  it('selects quick preset dose buttons', () => {
    const onDoseChange = vi.fn();
    const { getByText } = render(
      <DoseRescaler currentDose={15} baseDose={15} onDoseChange={onDoseChange} />
    );

    fireEvent.click(getByText('Server (30g)'));
    expect(onDoseChange).toHaveBeenCalledWith(30);
  });

  it('shows reset button when custom dose differs from base dose', () => {
    const onDoseChange = vi.fn();
    const { getByText } = render(
      <DoseRescaler currentDose={20} baseDose={15} onDoseChange={onDoseChange} />
    );

    const resetBtn = getByText('Reset (15g)');
    fireEvent.click(resetBtn);
    expect(onDoseChange).toHaveBeenCalledWith(15);
  });
});
```

Create `apps/mobile/src/features/recipes/components/StagesTimeline.test.tsx`:
```typescript
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrewStage } from '@brewlog/core';
import { StagesTimeline } from './StagesTimeline';

describe('StagesTimeline', () => {
  const stages: BrewStage[] = [
    {
      id: 's1',
      name: 'Bloom',
      stageType: 'bloom',
      startSecond: 0,
      durationSeconds: 45,
      targetWaterWeightGrams: 50,
      instruction: 'Pour 50g water',
    },
    {
      id: 's2',
      name: 'Main Pour',
      stageType: 'pour',
      startSecond: 45,
      durationSeconds: 60,
      targetWaterWeightGrams: 250,
      instruction: 'Spiral pour',
    },
  ];

  it('renders stages in sequence with badges, durations, and weights', () => {
    const { getByText } = render(<StagesTimeline stages={stages} />);

    expect(getByText('1')).toBeDefined();
    expect(getByText('Bloom')).toBeDefined();
    expect(getByText('45s')).toBeDefined();
    expect(getByText('50g')).toBeDefined();

    expect(getByText('2')).toBeDefined();
    expect(getByText('Main Pour')).toBeDefined();
    expect(getByText('60s')).toBeDefined();
    expect(getByText('250g')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test apps/mobile/src/features/recipes/components/SpecsGrid.test.tsx`
Expected: FAIL with missing modules.

- [ ] **Step 3: Write minimal implementations**

Create `apps/mobile/src/features/recipes/components/SpecsGrid.tsx`:
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Droplets, BookOpen, Clock, Thermometer } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface SpecsGridProps {
  totalWater: number;
  ratio: number;
  totalTimeSeconds: number;
  waterTempCelsius?: number;
}

export const SpecsGrid: React.FC<SpecsGridProps> = ({
  totalWater,
  ratio,
  totalTimeSeconds,
  waterTempCelsius,
}) => {
  const mins = Math.floor(totalTimeSeconds / 60);
  const secs = totalTimeSeconds % 60;
  const timeFormatted = `${mins}m ${String(secs).padStart(2, '0')}s`;
  const ratioFormatted = `1:${Math.round(ratio * 10) / 10}`;

  return (
    <View style={styles.grid}>
      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Droplets size={16} color={colors.accent} />
        </View>
        <Text style={styles.label}>TOTAL WATER</Text>
        <Text style={styles.value}>{totalWater}g</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <BookOpen size={16} color={colors.accent} />
        </View>
        <Text style={styles.label}>BREW RATIO</Text>
        <Text style={styles.value}>{ratioFormatted}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Clock size={16} color={colors.accent} />
        </View>
        <Text style={styles.label}>TARGET TIME</Text>
        <Text style={styles.value}>{timeFormatted}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Thermometer size={16} color={colors.accent} />
        </View>
        <Text style={styles.label}>WATER TEMP</Text>
        <Text style={styles.value}>
          {waterTempCelsius ? `${waterTempCelsius}°C` : '93-96°C'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.panelRecessed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    fontFamily: FONTS.monoRegular,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  value: {
    fontFamily: FONTS.monoBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
});
```

Create `apps/mobile/src/features/recipes/components/DoseRescaler.tsx`:
```typescript
import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface DoseRescalerProps {
  currentDose: number;
  baseDose: number;
  onDoseChange: (dose: number) => void;
}

const PRESETS = [
  { label: 'Single (15g)', dose: 15 },
  { label: 'Standard (18g)', dose: 18 },
  { label: 'Server (30g)', dose: 30 },
  { label: 'Batch (45g)', dose: 45 },
];

export const DoseRescaler: React.FC<DoseRescalerProps> = ({
  currentDose,
  baseDose,
  onDoseChange,
}) => {
  const handleStep = (delta: number) => {
    const next = Math.max(1, Math.min(100, Math.round((currentDose + delta) * 10) / 10));
    onDoseChange(next);
  };

  const handleTextCommit = (val: string) => {
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      onDoseChange(Math.round(parsed * 10) / 10);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>COFFEE DOSE RESCALER</Text>
        {currentDose !== baseDose ? (
          <Pressable
            onPress={() => onDoseChange(baseDose)}
            style={styles.resetButton}
            accessibilityRole="button"
          >
            <Text style={styles.resetText}>Reset ({baseDose}g)</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          onPress={() => handleStep(-1)}
          style={styles.stepperButton}
          accessibilityRole="button"
          accessibilityLabel="Decrease dose by 1 gram"
        >
          <Minus size={18} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.doseInputWrapper}>
          <TextInput
            defaultValue={String(currentDose)}
            key={String(currentDose)}
            onEndEditing={(e) => handleTextCommit(e.nativeEvent.text)}
            keyboardType="decimal-pad"
            style={styles.doseInput}
            accessibilityLabel="Target coffee dose in grams"
          />
          <Text style={styles.doseUnit}>g</Text>
        </View>

        <Pressable
          onPress={() => handleStep(1)}
          style={styles.stepperButton}
          accessibilityRole="button"
          accessibilityLabel="Increase dose by 1 gram"
        >
          <Plus size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.presetsRow}>
        {PRESETS.map((p) => {
          const isActive = currentDose === p.dose;
          return (
            <Pressable
              key={p.dose}
              onPress={() => onDoseChange(p.dose)}
              style={[
                styles.presetPill,
                isActive ? styles.presetPillActive : styles.presetPillInactive,
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.presetText,
                  isActive ? styles.presetTextActive : styles.presetTextInactive,
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  resetButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  resetText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doseInputWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  doseInput: {
    fontFamily: FONTS.monoBold,
    fontSize: 22,
    color: colors.textPrimary,
    minWidth: 44,
    textAlign: 'center',
    paddingVertical: 4,
  },
  doseUnit: {
    fontFamily: FONTS.monoRegular,
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 4,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  presetPill: {
    paddingHorizontal: 10,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetPillActive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
  },
  presetPillInactive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
  },
  presetText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
  },
  presetTextActive: {
    color: colors.accent,
    fontFamily: FONTS.monoBold,
  },
  presetTextInactive: {
    color: colors.textSecondary,
  },
});
```

Create `apps/mobile/src/features/recipes/components/StagesTimeline.tsx`:
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrewStage, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface StagesTimelineProps {
  stages: BrewStage[];
}

export const StagesTimeline: React.FC<StagesTimelineProps> = ({ stages }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>BREW STEPS TIMELINE</Text>
      <View style={styles.stagesList}>
        {stages.map((stage, idx) => (
          <View key={stage.id || idx} style={styles.stageCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{idx + 1}</Text>
            </View>
            <View style={styles.stageContent}>
              <View style={styles.stageHeader}>
                <Text style={styles.stageName}>{stage.name}</Text>
                <View style={styles.stageMetrics}>
                  {stage.targetWaterWeightGrams !== undefined ? (
                    <Text style={styles.stageWater}>
                      {stage.targetWaterWeightGrams}g
                    </Text>
                  ) : null}
                  <Text style={styles.stageDuration}>
                    {stage.durationSeconds}s
                  </Text>
                </View>
              </View>
              {stage.instruction ? (
                <Text style={styles.stageInstruction}>{stage.instruction}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  stagesList: {
    gap: 8,
  },
  stageCard: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  stageContent: {
    flex: 1,
    gap: 4,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageName: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  stageMetrics: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  stageWater: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.accent,
  },
  stageDuration: {
    fontFamily: FONTS.monoRegular,
    fontSize: 12,
    color: colors.textMuted,
  },
  stageInstruction: {
    fontFamily: FONTS.sansRegular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test apps/mobile/src/features/recipes/components/SpecsGrid.test.tsx apps/mobile/src/features/recipes/components/DoseRescaler.test.tsx apps/mobile/src/features/recipes/components/StagesTimeline.test.tsx`
Expected: PASS with all tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/recipes/components/SpecsGrid.tsx apps/mobile/src/features/recipes/components/SpecsGrid.test.tsx apps/mobile/src/features/recipes/components/DoseRescaler.tsx apps/mobile/src/features/recipes/components/DoseRescaler.test.tsx apps/mobile/src/features/recipes/components/StagesTimeline.tsx apps/mobile/src/features/recipes/components/StagesTimeline.test.tsx
git commit -m "feat(mobile): implement SpecsGrid, DoseRescaler, and StagesTimeline components"
```

---

### Task 7: Recipe Detail Screen Integration (`app/recipe/[id].tsx`)

**Files:**
- Create: `apps/mobile/src/features/recipes/screens/RecipeDetailScreen.tsx`
- Test: `apps/mobile/src/features/recipes/screens/RecipeDetailScreen.test.tsx`
- Modify: `apps/mobile/app/recipe/[id].tsx`

**Interfaces:**
- Consumes: `useLocalSearchParams()`, `useRouter()`, `useRecipes()`, `rescaleRecipeDose`.
- Produces: Dedicated detail view with SpecsGrid, DoseRescaler, StagesTimeline, and action toolbar.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/features/recipes/screens/RecipeDetailScreen.test.tsx`:
```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Alert } from 'react-native';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { RecipeDetailScreen } from './RecipeDetailScreen';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => ({ id: DEFAULT_PRESET_RECIPES[0].id }),
}));

const mockSetActiveTimerRecipe = vi.fn();
const mockDeleteRecipe = vi.fn();

const mockContext = {
  recipes: DEFAULT_PRESET_RECIPES,
  customRecipes: [],
  presets: DEFAULT_PRESET_RECIPES,
  loading: false,
  activeTimerRecipe: DEFAULT_PRESET_RECIPES[0],
  activeTimerDose: 15,
  addRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: mockDeleteRecipe,
  setActiveTimerRecipe: mockSetActiveTimerRecipe,
  refreshRecipes: vi.fn(),
};

vi.mock('../RecipeContext', () => ({
  useRecipes: () => mockContext,
}));

describe('RecipeDetailScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders recipe title, method, and action buttons', () => {
    const { getByText } = render(<RecipeDetailScreen recipeId={DEFAULT_PRESET_RECIPES[0].id} />);

    expect(getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();
    expect(getByText('BREW WITH THIS RECIPE')).toBeDefined();
    expect(getByText('Duplicate as Custom')).toBeDefined();
  });

  it('hands off scaled recipe to timer and navigates to tabs when Brew With This Recipe is clicked', () => {
    const { getByText } = render(<RecipeDetailScreen recipeId={DEFAULT_PRESET_RECIPES[0].id} />);

    fireEvent.click(getByText('BREW WITH THIS RECIPE'));

    expect(mockSetActiveTimerRecipe).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('navigates to builder with duplicateId parameter when Duplicate is clicked', () => {
    const { getByText } = render(<RecipeDetailScreen recipeId={DEFAULT_PRESET_RECIPES[0].id} />);

    fireEvent.click(getByText('Duplicate as Custom'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recipe/builder',
      params: { duplicateId: DEFAULT_PRESET_RECIPES[0].id },
    });
  });

  it('shows Edit and Delete buttons for custom recipes, and prompts confirmation before delete', () => {
    const customRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      id: 'local-rec-999',
      isPreset: false,
      name: 'My Custom V60',
    };
    mockContext.recipes = [customRecipe, ...DEFAULT_PRESET_RECIPES];

    const alertSpy = vi.spyOn(Alert, 'alert');
    const { getByText } = render(<RecipeDetailScreen recipeId="local-rec-999" />);

    expect(getByText('Edit Recipe')).toBeDefined();
    const deleteBtn = getByText('Delete Recipe');
    expect(deleteBtn).toBeDefined();

    fireEvent.click(deleteBtn);
    expect(alertSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test apps/mobile/src/features/recipes/screens/RecipeDetailScreen.test.tsx`
Expected: FAIL with missing module error.

- [ ] **Step 3: Write implementation and connect `app/recipe/[id].tsx`**

Create `apps/mobile/src/features/recipes/screens/RecipeDetailScreen.tsx`:
```typescript
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Copy, Edit2, Trash2 } from 'lucide-react-native';
import {
  INDUSTRIAL_PRECISION_THEME,
  rescaleRecipeDose,
} from '@brewlog/core';
import { useRecipes } from '../RecipeContext';
import { SpecsGrid } from '../components/SpecsGrid';
import { DoseRescaler } from '../components/DoseRescaler';
import { StagesTimeline } from '../components/StagesTimeline';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface RecipeDetailScreenProps {
  recipeId: string;
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({ recipeId }) => {
  const router = useRouter();
  const { recipes, deleteRecipe, setActiveTimerRecipe } = useRecipes();

  const recipe = recipes.find((r) => r.id === recipeId);
  const [customDose, setCustomDose] = useState<number>(
    recipe ? Math.round(recipe.coffeeDoseGrams) : 15
  );

  if (!recipe) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundTitle}>Recipe Not Found</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Return to Catalog</Text>
        </Pressable>
      </View>
    );
  }

  const scaledRecipe = rescaleRecipeDose(recipe, customDose);
  const isCustom = !recipe.isPreset && !recipe.id.startsWith('preset-');

  const handleBrew = () => {
    setActiveTimerRecipe(scaledRecipe, customDose);
    router.replace('/(tabs)');
  };

  const handleDuplicate = () => {
    router.push({
      pathname: '/recipe/builder',
      params: { duplicateId: recipe.id },
    });
  };

  const handleEdit = () => {
    router.push({
      pathname: '/recipe/builder',
      params: { editId: recipe.id },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Recipe?',
      `Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRecipe(recipe.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={styles.methodBadge}>
            <Text style={styles.methodBadgeText}>
              {recipe.brewMethod.toUpperCase()}
            </Text>
          </View>
          {isCustom ? (
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>CUSTOM</Text>
            </View>
          ) : (
            <View style={styles.presetBadge}>
              <Text style={styles.presetBadgeText}>OFFICIAL PRESET</Text>
            </View>
          )}
          {recipe.author ? (
            <Text style={styles.authorText}>by {recipe.author}</Text>
          ) : null}
        </View>

        <Text style={styles.recipeTitle}>{recipe.name}</Text>
        {recipe.description ? (
          <Text style={styles.descriptionText}>{recipe.description}</Text>
        ) : null}
      </View>

      <Pressable
        onPress={handleBrew}
        style={({ pressed }) => [styles.brewButton, pressed && styles.brewButtonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Brew with this recipe"
      >
        <Play size={18} color={colors.canvas} fill={colors.canvas} />
        <Text style={styles.brewButtonText}>BREW WITH THIS RECIPE</Text>
      </Pressable>

      <SpecsGrid
        totalWater={scaledRecipe.waterAmountGrams}
        ratio={scaledRecipe.ratio}
        totalTimeSeconds={scaledRecipe.totalTimeSeconds}
        waterTempCelsius={scaledRecipe.waterTempCelsius}
      />

      <DoseRescaler
        currentDose={customDose}
        baseDose={Math.round(recipe.coffeeDoseGrams)}
        onDoseChange={setCustomDose}
      />

      <StagesTimeline stages={scaledRecipe.stages} />

      <View style={styles.actionsFooter}>
        <Pressable
          onPress={handleDuplicate}
          style={styles.actionButton}
          accessibilityRole="button"
        >
          <Copy size={16} color={colors.textPrimary} />
          <Text style={styles.actionButtonText}>Duplicate as Custom</Text>
        </Pressable>

        {isCustom ? (
          <>
            <Pressable
              onPress={handleEdit}
              style={styles.actionButton}
              accessibilityRole="button"
            >
              <Edit2 size={16} color={colors.textPrimary} />
              <Text style={styles.actionButtonText}>Edit Recipe</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={[styles.actionButton, styles.deleteButton]}
              accessibilityRole="button"
            >
              <Trash2 size={16} color={colors.statusError} />
              <Text style={styles.deleteButtonText}>Delete Recipe</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  notFoundTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  backButton: {
    minHeight: 44,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  backButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.accent,
  },
  header: {
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodBadge: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  methodBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  customBadge: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  customBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 0.8,
  },
  presetBadge: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  presetBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  authorText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
  recipeTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 24,
    color: colors.textPrimary,
  },
  descriptionText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  brewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  brewButtonPressed: {
    opacity: 0.85,
  },
  brewButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 13,
    color: colors.canvas,
    letterSpacing: 1.2,
  },
  actionsFooter: {
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  deleteButton: {
    borderColor: colors.statusError,
  },
  deleteButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.statusError,
  },
});
```

Update `apps/mobile/app/recipe/[id].tsx`:
```typescript
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { RecipeDetailScreen } from '../../src/features/recipes/screens/RecipeDetailScreen';

export default function RecipeDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipeDetailScreen recipeId={id || ''} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test apps/mobile/src/features/recipes/screens/RecipeDetailScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/recipes/screens/RecipeDetailScreen.tsx apps/mobile/src/features/recipes/screens/RecipeDetailScreen.test.tsx apps/mobile/app/recipe/[id].tsx
git commit -m "feat(mobile): implement RecipeDetailScreen with rescaler, stages, and action toolbar"
```

---

### Task 8: Recipe Builder Modal Screen (`app/recipe/builder.tsx`)

**Files:**
- Create: `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.tsx`
- Test: `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.test.tsx`
- Modify: `apps/mobile/app/recipe/builder.tsx`

**Interfaces:**
- Consumes: `useLocalSearchParams()`, `useRouter()`, `useRecipes()`, `recalculateTiming`, `calculateTotalBrewTime`, `calculateWaterAmount`, `calculateRatio`.
- Produces: Modal form for creating, editing, and duplicating custom recipes.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.test.tsx`:
```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { RecipeBuilderScreen } from './RecipeBuilderScreen';

const mockBack = vi.fn();
const mockReplace = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  useLocalSearchParams: () => ({}),
}));

const mockAddRecipe = vi.fn().mockResolvedValue({ id: 'new-rec-1' });
const mockUpdateRecipe = vi.fn().mockResolvedValue({ id: 'rec-1' });

const mockContext = {
  recipes: DEFAULT_PRESET_RECIPES,
  customRecipes: [],
  presets: DEFAULT_PRESET_RECIPES,
  loading: false,
  activeTimerRecipe: DEFAULT_PRESET_RECIPES[0],
  activeTimerDose: 15,
  addRecipe: mockAddRecipe,
  updateRecipe: mockUpdateRecipe,
  deleteRecipe: vi.fn(),
  setActiveTimerRecipe: vi.fn(),
  refreshRecipes: vi.fn(),
};

vi.mock('../RecipeContext', () => ({
  useRecipes: () => mockContext,
}));

describe('RecipeBuilderScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields: name, method pills, dose, ratio, grind, temp, and stages', () => {
    const { getByText, getByPlaceholderText } = render(<RecipeBuilderScreen />);

    expect(getByText('New Recipe')).toBeDefined();
    expect(getByPlaceholderText('e.g. My Morning V60')).toBeDefined();
    expect(getByText('BREW METHOD')).toBeDefined();
    expect(getByText('DOSE & WATER RATIO')).toBeDefined();
    expect(getByText('BREW STAGES')).toBeDefined();
  });

  it('validates empty name and disables or warns on save', async () => {
    const { getByText } = render(<RecipeBuilderScreen />);
    fireEvent.click(getByText('Save Recipe'));

    expect(mockAddRecipe).not.toHaveBeenCalled();
    expect(getByText('Recipe name is required')).toBeDefined();
  });

  it('adds, removes, and saves recipe stages', async () => {
    const { getByText, getByPlaceholderText } = render(<RecipeBuilderScreen />);

    const nameInput = getByPlaceholderText('e.g. My Morning V60');
    fireEvent.change(nameInput, { target: { value: 'Awesome Aeropress' } });

    fireEvent.click(getByText('+ Add Brew Stage'));
    fireEvent.click(getByText('Save Recipe'));

    await waitFor(() => {
      expect(mockAddRecipe).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.test.tsx`
Expected: FAIL with missing module error.

- [ ] **Step 3: Write implementation and connect `app/recipe/builder.tsx`**

Create `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.tsx`:
```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  X,
  Check,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native';
import {
  INDUSTRIAL_PRECISION_THEME,
  BrewMethodType,
  StageType,
  BrewStage,
  calculateWaterAmount,
} from '@brewlog/core';
import { useRecipes } from '../RecipeContext';
import { recalculateTiming, calculateTotalBrewTime } from '../utils/timingUtils';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

const METHODS: { label: string; value: BrewMethodType }[] = [
  { label: 'V60', value: 'v60' },
  { label: 'AeroPress', value: 'aeropress' },
  { label: 'Chemex', value: 'chemex' },
  { label: 'French Press', value: 'french-press' },
  { label: 'Flair', value: 'flair' },
  { label: 'Kalita', value: 'kalita-wave' },
  { label: 'Custom', value: 'custom' },
];

const STAGE_TYPES: { label: string; value: StageType }[] = [
  { label: 'Bloom', value: 'bloom' },
  { label: 'Pour', value: 'pour' },
  { label: 'Agitation', value: 'agitation' },
  { label: 'Drawdown', value: 'drawdown' },
  { label: 'Press', value: 'press' },
  { label: 'Other', value: 'other' },
];

const RATIO_PRESETS = [15, 16, 16.67, 17];

const DEFAULT_STAGES: BrewStage[] = [
  {
    id: 'stage-1',
    name: 'Bloom',
    stageType: 'bloom',
    startSecond: 0,
    durationSeconds: 45,
    targetWaterWeightGrams: 50,
    instruction: 'Saturate coffee bed completely',
  },
  {
    id: 'stage-2',
    name: 'Main Pour',
    stageType: 'pour',
    startSecond: 45,
    durationSeconds: 45,
    targetWaterWeightGrams: 250,
    instruction: 'Gentle spiral pour outward',
  },
  {
    id: 'stage-3',
    name: 'Drawdown',
    stageType: 'drawdown',
    startSecond: 90,
    durationSeconds: 60,
    targetWaterWeightGrams: 250,
    instruction: 'Allow bed to drain flat',
  },
];

export const RecipeBuilderScreen: React.FC = () => {
  const router = useRouter();
  const { editId, duplicateId } = useLocalSearchParams<{
    editId?: string;
    duplicateId?: string;
  }>();
  const { recipes, addRecipe, updateRecipe } = useRecipes();

  const sourceRecipe = editId
    ? recipes.find((r) => r.id === editId)
    : duplicateId
    ? recipes.find((r) => r.id === duplicateId)
    : null;

  const [name, setName] = useState<string>(
    sourceRecipe
      ? duplicateId
        ? `${sourceRecipe.name} (Copy)`
        : sourceRecipe.name
      : ''
  );
  const [author, setAuthor] = useState<string>(sourceRecipe?.author || '');
  const [brewMethod, setBrewMethod] = useState<BrewMethodType>(
    sourceRecipe?.brewMethod || 'v60'
  );
  const [coffeeDoseGrams, setCoffeeDoseGrams] = useState<number>(
    sourceRecipe?.coffeeDoseGrams || 15
  );
  const [ratio, setRatio] = useState<number>(sourceRecipe?.ratio || 16.67);
  const [grindSize, setGrindSize] = useState<string>(
    sourceRecipe?.grindSize || 'Medium-Fine'
  );
  const [waterTempCelsius, setWaterTempCelsius] = useState<number>(
    sourceRecipe?.waterTempCelsius || 93
  );
  const [description, setDescription] = useState<string>(
    sourceRecipe?.description || ''
  );
  const [notes, setNotes] = useState<string>(sourceRecipe?.notes || '');
  const [stages, setStages] = useState<BrewStage[]>(
    sourceRecipe ? recalculateTiming(sourceRecipe.stages) : DEFAULT_STAGES
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const calculatedWater = calculateWaterAmount(coffeeDoseGrams, ratio);
  const totalBrewTime = calculateTotalBrewTime(stages);

  const handleAddStage = () => {
    const nextIdx = stages.length + 1;
    const newStage: BrewStage = {
      id: `new-stage-${Date.now()}`,
      name: `Stage ${nextIdx}`,
      stageType: 'pour',
      startSecond: 0,
      durationSeconds: 30,
      targetWaterWeightGrams: calculatedWater,
      instruction: '',
    };
    setStages(recalculateTiming([...stages, newStage]));
  };

  const handleRemoveStage = (idx: number) => {
    const filtered = stages.filter((_, i) => i !== idx);
    setStages(recalculateTiming(filtered));
  };

  const handleMoveStage = (idx: number, delta: number) => {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= stages.length) return;
    const reordered = [...stages];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    setStages(recalculateTiming(reordered));
  };

  const handleUpdateStage = (idx: number, patch: Partial<BrewStage>) => {
    const updated = stages.map((st, i) => (i === idx ? { ...st, ...patch } : st));
    setStages(patch.durationSeconds !== undefined ? recalculateTiming(updated) : updated);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Recipe name is required');
      return;
    }
    if (stages.length === 0) {
      setErrorMessage('At least one brew stage is required');
      return;
    }

    setErrorMessage(null);

    const payload = {
      name: trimmedName,
      author: author.trim() || undefined,
      brewMethod,
      coffeeDoseGrams,
      ratio,
      waterAmountGrams: calculatedWater,
      grindSize,
      waterTempCelsius,
      totalTimeSeconds: totalBrewTime,
      description: description.trim(),
      notes: notes.trim() || undefined,
      stages,
    };

    if (editId) {
      await updateRecipe(editId, payload);
      router.back();
    } else {
      const created = await addRecipe(payload);
      router.replace(`/recipe/${created.id}`);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes?',
      'Any unsaved recipe customizations will be lost.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.navHeader}>
        <Pressable
          onPress={handleCancel}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Cancel editing"
        >
          <X size={20} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.navTitle}>
          {editId ? 'Edit Recipe' : duplicateId ? 'Duplicate Recipe' : 'New Recipe'}
        </Text>
        <Pressable
          onPress={handleSave}
          style={styles.saveButton}
          accessibilityRole="button"
          accessibilityLabel="Save Recipe"
        >
          <Check size={18} color={colors.canvas} />
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Section 1: Overview */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>RECIPE OVERVIEW</Text>

        <Text style={styles.fieldLabel}>RECIPE NAME *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. My Morning V60"
          placeholderTextColor={colors.textMuted}
          style={styles.textInput}
        />

        <Text style={styles.fieldLabel}>AUTHOR / BARISTA</Text>
        <TextInput
          value={author}
          onChangeText={setAuthor}
          placeholder="e.g. James Hoffmann"
          placeholderTextColor={colors.textMuted}
          style={styles.textInput}
        />

        <Text style={styles.fieldLabel}>BREW METHOD</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.methodRow}>
          {METHODS.map((m) => {
            const isSelected = brewMethod === m.value;
            return (
              <Pressable
                key={m.value}
                onPress={() => setBrewMethod(m.value)}
                style={[styles.methodPill, isSelected ? styles.methodPillActive : styles.methodPillInactive]}
              >
                <Text style={[styles.methodPillText, isSelected ? styles.methodPillTextActive : styles.methodPillTextInactive]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.fieldLabel}>DESCRIPTION</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Tasting goals, extraction notes..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={[styles.textInput, styles.multilineInput]}
        />
      </View>

      {/* Section 2: Dose & Ratio */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>DOSE & WATER RATIO</Text>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>DOSE (G)</Text>
            <TextInput
              value={String(coffeeDoseGrams)}
              onChangeText={(val) => setCoffeeDoseGrams(parseFloat(val) || 0)}
              keyboardType="decimal-pad"
              style={styles.textInput}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>RATIO (1:X)</Text>
            <TextInput
              value={String(ratio)}
              onChangeText={(val) => setRatio(parseFloat(val) || 0)}
              keyboardType="decimal-pad"
              style={styles.textInput}
            />
          </View>
        </View>

        <View style={styles.ratioPillsRow}>
          {RATIO_PRESETS.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRatio(r)}
              style={[styles.ratioPill, ratio === r ? styles.ratioPillActive : styles.ratioPillInactive]}
            >
              <Text style={[styles.ratioPillText, ratio === r ? styles.ratioPillTextActive : styles.ratioPillTextInactive]}>
                1:{r}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.waterSummaryRow}>
          <Text style={styles.waterSummaryLabel}>TOTAL WATER TARGET</Text>
          <Text style={styles.waterSummaryValue}>{calculatedWater}g</Text>
        </View>
      </View>

      {/* Section 3: Parameters */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>GRIND & TEMPERATURE</Text>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>GRIND SIZE</Text>
            <TextInput
              value={grindSize}
              onChangeText={setGrindSize}
              placeholder="e.g. Medium-Fine"
              placeholderTextColor={colors.textMuted}
              style={styles.textInput}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>WATER TEMP (°C)</Text>
            <TextInput
              value={String(waterTempCelsius)}
              onChangeText={(val) => setWaterTempCelsius(parseInt(val, 10) || 0)}
              keyboardType="number-pad"
              style={styles.textInput}
            />
          </View>
        </View>
      </View>

      {/* Section 4: Stages */}
      <View style={styles.sectionCard}>
        <View style={styles.stagesHeaderRow}>
          <Text style={styles.sectionHeader}>BREW STAGES</Text>
          <Text style={styles.timeSummaryText}>
            Total: {Math.floor(totalBrewTime / 60)}m {totalBrewTime % 60}s
          </Text>
        </View>

        {stages.map((st, idx) => (
          <View key={st.id || idx} style={styles.stageEditorCard}>
            <View style={styles.stageEditorHeader}>
              <Text style={styles.stageNumber}>Step {idx + 1} ({st.startSecond}s)</Text>
              <View style={styles.stageActionIcons}>
                <Pressable
                  onPress={() => handleMoveStage(idx, -1)}
                  disabled={idx === 0}
                  style={[styles.miniButton, idx === 0 && styles.miniButtonDisabled]}
                >
                  <ChevronUp size={16} color={idx === 0 ? colors.textMuted : colors.textPrimary} />
                </Pressable>
                <Pressable
                  onPress={() => handleMoveStage(idx, 1)}
                  disabled={idx === stages.length - 1}
                  style={[styles.miniButton, idx === stages.length - 1 && styles.miniButtonDisabled]}
                >
                  <ChevronDown size={16} color={idx === stages.length - 1 ? colors.textMuted : colors.textPrimary} />
                </Pressable>
                <Pressable onPress={() => handleRemoveStage(idx)} style={styles.miniButton}>
                  <Trash2 size={16} color={colors.statusError} />
                </Pressable>
              </View>
            </View>

            <TextInput
              value={st.name}
              onChangeText={(val) => handleUpdateStage(idx, { name: val })}
              placeholder="Stage name (e.g. Bloom)"
              placeholderTextColor={colors.textMuted}
              style={styles.textInput}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>DURATION (SEC)</Text>
                <TextInput
                  value={String(st.durationSeconds)}
                  onChangeText={(val) =>
                    handleUpdateStage(idx, { durationSeconds: parseInt(val, 10) || 0 })
                  }
                  keyboardType="number-pad"
                  style={styles.textInput}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>TARGET WATER (G)</Text>
                <TextInput
                  value={String(st.targetWaterWeightGrams)}
                  onChangeText={(val) =>
                    handleUpdateStage(idx, { targetWaterWeightGrams: parseFloat(val) || 0 })
                  }
                  keyboardType="decimal-pad"
                  style={styles.textInput}
                />
              </View>
            </View>

            <TextInput
              value={st.instruction}
              onChangeText={(val) => handleUpdateStage(idx, { instruction: val })}
              placeholder="Pour instruction / technique..."
              placeholderTextColor={colors.textMuted}
              style={styles.textInput}
            />
          </View>
        ))}

        <Pressable onPress={handleAddStage} style={styles.addStageButton}>
          <Plus size={16} color={colors.accent} />
          <Text style={styles.addStageButtonText}>+ Add Brew Stage</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 48,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  navButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  saveButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.canvas,
    letterSpacing: 0.8,
  },
  errorBanner: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.statusError,
    borderRadius: 8,
    padding: 12,
  },
  errorBannerText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.statusError,
  },
  sectionCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  sectionHeader: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  stagesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeSummaryText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  textInput: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontFamily: FONTS.sansRegular,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
    gap: 4,
  },
  methodRow: {
    gap: 8,
    paddingVertical: 4,
  },
  methodPill: {
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodPillActive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
  },
  methodPillInactive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
  },
  methodPillText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
  },
  methodPillTextActive: {
    color: colors.accent,
  },
  methodPillTextInactive: {
    color: colors.textMuted,
  },
  ratioPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  ratioPill: {
    paddingHorizontal: 10,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratioPillActive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
  },
  ratioPillInactive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
  },
  ratioPillText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
  },
  ratioPillTextActive: {
    color: colors.accent,
  },
  ratioPillTextInactive: {
    color: colors.textSecondary,
  },
  waterSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.panelRecessed,
    padding: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  waterSummaryLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  waterSummaryValue: {
    fontFamily: FONTS.monoBold,
    fontSize: 15,
    color: colors.accent,
  },
  stageEditorCard: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  stageEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageNumber: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
  },
  stageActionIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  miniButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniButtonDisabled: {
    opacity: 0.3,
  },
  addStageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 6,
  },
  addStageButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.accent,
  },
});
```

Update `apps/mobile/app/recipe/builder.tsx`:
```typescript
import React from 'react';
import { RecipeBuilderScreen } from '../../src/features/recipes/screens/RecipeBuilderScreen';

export default function RecipeBuilderRoute() {
  return <RecipeBuilderScreen />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.tsx apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.test.tsx apps/mobile/app/recipe/builder.tsx
git commit -m "feat(mobile): implement full-lifecycle RecipeBuilderScreen supporting create, edit, duplicate"
```

---

### Task 9: Timer Integration & Active Brew Guard (`app/(tabs)/index.tsx`)

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Test: `apps/mobile/__tests__/tabs/timerRecipeIntegration.test.tsx`

**Interfaces:**
- Consumes: `useRecipes()` (`activeTimerRecipe`, `activeTimerDose`, `setActiveTimerRecipe`).
- Produces: Live sync with Timer tab faceplate and alert guard before resetting active brews.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/tabs/timerRecipeIntegration.test.tsx`:
```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Alert } from 'react-native';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import TimerScreen from '../../app/(tabs)/index';

const mockSetActiveTimerRecipe = vi.fn();
const mockActiveTimerRecipe = {
  ...DEFAULT_PRESET_RECIPES[0],
  name: 'Active Custom V60',
  coffeeDoseGrams: 20,
};

vi.mock('../../src/features/recipes/RecipeContext', () => ({
  useRecipes: () => ({
    recipes: [mockActiveTimerRecipe, ...DEFAULT_PRESET_RECIPES],
    activeTimerRecipe: mockActiveTimerRecipe,
    activeTimerDose: 20,
    setActiveTimerRecipe: mockSetActiveTimerRecipe,
  }),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('TimerScreen Recipe Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active recipe from RecipeContext on TimerHero faceplate', () => {
    const { getByText } = render(<TimerScreen />);

    expect(getByText('Active Custom V60')).toBeDefined();
    expect(getByText('20')).toBeDefined(); // text input value
  });

  it('switches to preset method when method pill is selected', () => {
    const { getByText } = render(<TimerScreen />);

    fireEvent.click(getByText('AEROPRESS'));
    expect(mockSetActiveTimerRecipe).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test apps/mobile/__tests__/tabs/timerRecipeIntegration.test.tsx`
Expected: FAIL because `app/(tabs)/index.tsx` still has isolated local state and does not consume `RecipeContext`.

- [ ] **Step 3: Update `app/(tabs)/index.tsx`**

Modify `apps/mobile/app/(tabs)/index.tsx`:
```typescript
import React from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  INDUSTRIAL_PRECISION_THEME,
  DEFAULT_PRESET_RECIPES,
  rescaleRecipeDose,
} from '@brewlog/core';
import { useRecipes } from '../../src/features/recipes/RecipeContext';
import { useMobileBrewTimer } from '../../src/hooks/useMobileBrewTimer';
import { MethodPills } from '../../src/components/timer/MethodPills';
import { CollapsibleCalculator } from '../../src/components/timer/CollapsibleCalculator';
import { TimerHero } from '../../src/components/timer/TimerHero';
import { ActiveStageCard } from '../../src/components/timer/ActiveStageCard';
import { StageTimeline } from '../../src/components/timer/StageTimeline';
import { FONTS } from '../../src/theme/fonts';
import { AVAILABLE_METHODS } from '../../src/utils/recipeUtils';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export default function TimerScreen() {
  const router = useRouter();
  const { activeTimerRecipe, activeTimerDose, setActiveTimerRecipe } = useRecipes();

  const activeRecipe = rescaleRecipeDose(activeTimerRecipe, activeTimerDose);

  const {
    elapsedSeconds,
    isRunning,
    isFinished,
    isMuted,
    currentStageIndex,
    currentStage,
    totalProgress,
    toggleTimer,
    reset,
    toggleMute,
  } = useMobileBrewTimer(activeRecipe);

  const handleSelectMethod = (methodName: string) => {
    if (activeRecipe.brewMethod.toLowerCase() === methodName.toLowerCase()) {
      return;
    }

    const match = DEFAULT_PRESET_RECIPES.find(
      (r) => r.brewMethod.toLowerCase() === methodName.toLowerCase()
    );
    if (!match) return;

    const isBrewActive = isRunning || (elapsedSeconds > 0 && !isFinished);

    if (isBrewActive) {
      Alert.alert(
        'Switch Brew Method?',
        'A brew is currently in progress. Switching methods will reset your timer.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset & Switch',
            style: 'destructive',
            onPress: () => {
              reset();
              setActiveTimerRecipe(match, match.coffeeDoseGrams);
            },
          },
        ]
      );
      return;
    }

    reset();
    setActiveTimerRecipe(match, match.coffeeDoseGrams);
  };

  const handleApplyDose = (newDose: number) => {
    if (isRunning || isFinished) return;
    if (newDose > 0) {
      setActiveTimerRecipe(activeTimerRecipe, Math.round(newDose * 10) / 10);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Quick-Start Method Pills */}
      <MethodPills
        selectedMethod={activeRecipe.brewMethod}
        onSelectMethod={handleSelectMethod}
        methods={AVAILABLE_METHODS}
      />

      {/* Standalone Collapsible Calculator */}
      <CollapsibleCalculator
        initialDose={activeTimerDose}
        initialRatio={activeRecipe.ratio}
        onApplyDose={handleApplyDose}
      />

      {/* Web-Parity Instrument Faceplate */}
      <TimerHero
        recipe={activeRecipe}
        elapsedSeconds={elapsedSeconds}
        isRunning={isRunning}
        isFinished={isFinished}
        isMuted={isMuted}
        currentStageTargetWater={currentStage?.targetWaterWeightGrams || 0}
        doseGrams={activeTimerDose}
        onToggleTimer={toggleTimer}
        onReset={reset}
        onToggleMute={toggleMute}
        totalProgress={totalProgress}
        onChangeDose={handleApplyDose}
      />

      {/* Finished Banner */}
      {isFinished ? (
        <View style={styles.finishedBanner}>
          <Text style={styles.finishedTitle}>BREW COMPLETE</Text>
          <Text style={styles.finishedSubtitle}>
            Completed in {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
          </Text>
          <Pressable
            onPress={() => router.push('/cupping')}
            style={styles.logButton}
            accessibilityRole="button"
            accessibilityLabel="Log to Cupping Journal"
          >
            <Text style={styles.logButtonText}>LOG TO CUPPING JOURNAL</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Active Pour Guidance */}
          {currentStage ? (
            <ActiveStageCard
              stage={currentStage}
              stageIndex={currentStageIndex}
              totalStages={activeRecipe.stages.length}
              elapsedSeconds={elapsedSeconds}
            />
          ) : null}

          {/* Timeline of Stages */}
          <StageTimeline
            stages={activeRecipe.stages}
            currentStageIndex={currentStageIndex}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  finishedBanner: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: colors.panel,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  finishedTitle: {
    color: colors.accent,
    fontSize: 14,
    fontFamily: FONTS.monoBold,
    letterSpacing: 2,
  },
  finishedSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.sansRegular,
  },
  logButton: {
    marginTop: 8,
    backgroundColor: colors.accent,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: {
    color: colors.canvas,
    fontSize: 11,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.2,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test apps/mobile/__tests__/tabs/timerRecipeIntegration.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/(tabs)/index.tsx apps/mobile/__tests__/tabs/timerRecipeIntegration.test.tsx
git commit -m "feat(mobile): connect TimerScreen to RecipeContext with active brew guard"
```

---

### Task 10: Full Monorepo Verification & Quality Gate

**Files:**
- Modify: `docs/ROADMAP.md` (mark Phase 4 Complete)
- Modify: `docs/devlogs/2026-09-21-phase-4-mobile-recipe-studio.md`

- [ ] **Step 1: Run TypeScript typecheck across monorepo**

Run: `npm run typecheck`
Expected: Zero TypeScript errors across all workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/web`, `@brewlog/mobile`).

- [ ] **Step 2: Run all unit test suites across monorepo**

Run: `npm test`
Expected: 100% test pass rate across all test suites.

- [ ] **Step 3: Run Expo Doctor in apps/mobile**

Run: `cd apps/mobile && npx expo-doctor`
Expected: 21/21 checks passing with zero errors.

- [ ] **Step 4: Verify production Metro exports for iOS and Android**

Run: `cd apps/mobile && npx expo export --platform ios && npx expo export --platform android`
Expected: Clean bundling with zero module resolution or packaging errors.

- [ ] **Step 5: Document Phase 4 completion in Devlog and Roadmap**

Create `docs/devlogs/2026-09-21-phase-4-mobile-recipe-studio.md` detailing the deliverables, architecture, offline-first sync, test coverage, and bundling metrics. Update `docs/ROADMAP.md` marking Phase 4 as Complete (`[x]`).

- [ ] **Step 6: Commit documentation and completion updates**

```bash
git add docs/ROADMAP.md docs/devlogs/2026-09-21-phase-4-mobile-recipe-studio.md
git commit -m "docs: document Phase 4 mobile recipe studio completion"
```
