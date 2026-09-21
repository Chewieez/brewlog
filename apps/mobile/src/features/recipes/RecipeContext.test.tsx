/** @vitest-environment jsdom */
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
