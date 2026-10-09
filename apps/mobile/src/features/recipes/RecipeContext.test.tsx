/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PRESET_RECIPES, BrewRecipe } from '@brewlog/core';
import { RecipeProvider, useRecipes, ACTIVE_RECIPE_STORAGE_KEY } from './RecipeContext';

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

  it('syncs offline recipes and fetches cloud recipes when authenticated', async () => {
    mockAuthUser = mockUser;

    const offlineRecipe: BrewRecipe = {
      id: 'local-rec-sync-test',
      name: 'Offline Filter Pour',
      brewMethod: 'v60',
      description: 'Needs sync',
      coffeeDoseGrams: 15,
      waterAmountGrams: 250,
      ratio: 16.67,
      grindSize: 'Medium',
      waterTempCelsius: 92,
      totalTimeSeconds: 150,
      stages: [
        {
          id: 's-local-1',
          name: 'Bloom',
          stageType: 'bloom',
          startSecond: 0,
          durationSeconds: 45,
          targetWaterWeightGrams: 50,
          instruction: 'Bloom pour',
        },
      ],
      isPreset: false,
      createdAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      '@brewlog/custom_recipes',
      JSON.stringify([offlineRecipe])
    );

    const mockRecipeInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'cloud-rec-uuid-1', user_id: mockUser.id },
          error: null,
        }),
      }),
    });

    const mockStageInsert = vi.fn().mockResolvedValue({ error: null });

    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'cloud-rec-uuid-1',
          user_id: mockUser.id,
          name: 'Offline Filter Pour',
          brew_method: 'v60',
          recommended_brewer_id: null,
          recommended_grinder_id: null,
          description: 'Needs sync',
          author: null,
          coffee_dose_grams: 15,
          water_amount_grams: 250,
          ratio: 16.67,
          grind_size: 'Medium',
          water_temp_celsius: 92,
          total_time_seconds: 150,
          is_preset: false,
          is_favorite: false,
          notes: null,
          created_at: new Date().toISOString(),
          recipe_stages: [
            {
              id: 'cloud-stage-uuid-1',
              recipe_id: 'cloud-rec-uuid-1',
              step_order: 0,
              name: 'Bloom',
              start_second: 0,
              duration_seconds: 45,
              target_water_weight_grams: 50,
              instruction: 'Bloom pour',
              stage_type: 'bloom',
            },
          ],
        },
      ],
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'recipes') {
        return {
          insert: mockRecipeInsert,
          select: mockSelect,
        };
      }
      if (table === 'recipe_stages') {
        return {
          insert: mockStageInsert,
        };
      }
      return {};
    });

    const { result } = renderHook(() => useRecipes(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockRecipeInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUser.id,
        name: 'Offline Filter Pour',
      })
    );
    expect(mockStageInsert).toHaveBeenCalled();
    expect(result.current.customRecipes).toHaveLength(1);
    expect(result.current.customRecipes[0].id).toBe('cloud-rec-uuid-1');
    expect(result.current.customRecipes[0].stages[0].id).toBe('cloud-stage-uuid-1');

    const stored = await AsyncStorage.getItem('@brewlog/custom_recipes');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed[0].id).toBe('cloud-rec-uuid-1');
  });

  it('retains failed unsynced offline recipes when fetching cloud recipes', async () => {
    mockAuthUser = mockUser;

    const failedOfflineRecipe: BrewRecipe = {
      id: 'local-rec-failed-sync',
      name: 'Failed Offline Recipe',
      brewMethod: 'aeropress',
      description: 'Will fail upload',
      coffeeDoseGrams: 14,
      waterAmountGrams: 200,
      ratio: 14.29,
      grindSize: 'Fine',
      waterTempCelsius: 85,
      totalTimeSeconds: 120,
      stages: [],
      isPreset: false,
      createdAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      '@brewlog/custom_recipes',
      JSON.stringify([failedOfflineRecipe])
    );

    const mockRecipeInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Network error during upload'),
        }),
      }),
    });

    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'cloud-rec-existing',
          user_id: mockUser.id,
          name: 'Existing Cloud Recipe',
          brew_method: 'chemex',
          recommended_brewer_id: null,
          recommended_grinder_id: null,
          description: 'From cloud',
          author: null,
          coffee_dose_grams: 30,
          water_amount_grams: 500,
          ratio: 16.67,
          grind_size: 'Medium-Coarse',
          water_temp_celsius: 94,
          total_time_seconds: 240,
          is_preset: false,
          is_favorite: false,
          notes: null,
          created_at: new Date().toISOString(),
          recipe_stages: [],
        },
      ],
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'recipes') {
        return {
          insert: mockRecipeInsert,
          select: mockSelect,
        };
      }
      return {};
    });

    const { result } = renderHook(() => useRecipes(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.customRecipes).toHaveLength(2);
    expect(result.current.customRecipes.some((r) => r.id === 'local-rec-failed-sync')).toBe(true);
    expect(result.current.customRecipes.some((r) => r.id === 'cloud-rec-existing')).toBe(true);
  });

  it('persists activeTimerRecipe and dose to AsyncStorage when setActiveTimerRecipe is called', async () => {
    const { result } = renderHook(() => useRecipes(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const aeropressPreset = DEFAULT_PRESET_RECIPES[1];
    act(() => {
      result.current.setActiveTimerRecipe(aeropressPreset, 18);
    });

    const stored = await AsyncStorage.getItem(ACTIVE_RECIPE_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed).toEqual({
      recipeId: aeropressPreset.id,
      dose: 18,
    });
  });

  it('hydrates activeTimerRecipe and dose from AsyncStorage on initial load', async () => {
    const aeropressPreset = DEFAULT_PRESET_RECIPES[1];
    await AsyncStorage.setItem(
      ACTIVE_RECIPE_STORAGE_KEY,
      JSON.stringify({ recipeId: aeropressPreset.id, dose: 18 })
    );

    const { result } = renderHook(() => useRecipes(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeTimerRecipe.id).toBe(aeropressPreset.id);
    expect(result.current.activeTimerDose).toBe(18);
    expect(result.current.activeTimerRecipe.coffeeDoseGrams).toBe(18);
  });

  it('hydrates activeTimerRecipe from custom recipes when stored ID matches custom recipe', async () => {
    const customRecipe: BrewRecipe = {
      id: 'local-rec-active-test',
      name: 'Dialed Espresso',
      brewMethod: 'espresso',
      description: 'Dialed shot',
      coffeeDoseGrams: 18,
      waterAmountGrams: 36,
      ratio: 2,
      grindSize: 'Fine',
      waterTempCelsius: 93,
      totalTimeSeconds: 30,
      stages: [],
      isPreset: false,
      createdAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      '@brewlog/custom_recipes',
      JSON.stringify([customRecipe])
    );
    await AsyncStorage.setItem(
      ACTIVE_RECIPE_STORAGE_KEY,
      JSON.stringify({ recipeId: customRecipe.id, dose: 20 })
    );

    const { result } = renderHook(() => useRecipes(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeTimerRecipe.id).toBe(customRecipe.id);
    expect(result.current.activeTimerDose).toBe(20);
    expect(result.current.activeTimerRecipe.coffeeDoseGrams).toBe(20);
  });

  it('falls back to default preset and updates AsyncStorage when currently active recipe is deleted', async () => {
    const { result } = renderHook(() => useRecipes(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: BrewRecipe | null = null;
    await act(async () => {
      created = await result.current.addRecipe({
        name: 'Temporary Recipe',
        brewMethod: 'v60',
        coffeeDoseGrams: 15,
        waterAmountGrams: 250,
        ratio: 16.67,
        grindSize: 'Medium',
        waterTempCelsius: 93,
        totalTimeSeconds: 150,
        description: 'Temp',
        stages: [],
      });
    });

    act(() => {
      result.current.setActiveTimerRecipe(created!, 15);
    });

    expect(result.current.activeTimerRecipe.id).toBe(created!.id);

    await act(async () => {
      await result.current.deleteRecipe(created!.id);
    });

    expect(result.current.activeTimerRecipe.id).toBe(DEFAULT_PRESET_RECIPES[0].id);
    expect(result.current.activeTimerDose).toBe(DEFAULT_PRESET_RECIPES[0].coffeeDoseGrams);

    const stored = await AsyncStorage.getItem(ACTIVE_RECIPE_STORAGE_KEY);
    const parsed = JSON.parse(stored!);
    expect(parsed.recipeId).toBe(DEFAULT_PRESET_RECIPES[0].id);
  });

  it('self-heals AsyncStorage with fallback preset when stored recipe ID cannot be found', async () => {
    await AsyncStorage.setItem(
      ACTIVE_RECIPE_STORAGE_KEY,
      JSON.stringify({ recipeId: 'non-existent-or-deleted-id', dose: 18 })
    );

    const { result } = renderHook(() => useRecipes(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeTimerRecipe.id).toBe(DEFAULT_PRESET_RECIPES[0].id);

    const stored = await AsyncStorage.getItem(ACTIVE_RECIPE_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.recipeId).toBe(DEFAULT_PRESET_RECIPES[0].id);
  });

  it('hydrates activeTimerRecipe from cloud recipes when stored ID arrives asynchronously from Supabase', async () => {
    mockAuthUser = mockUser;

    await AsyncStorage.setItem(
      ACTIVE_RECIPE_STORAGE_KEY,
      JSON.stringify({ recipeId: 'cloud-rec-async-test', dose: 22 })
    );

    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'cloud-rec-async-test',
          user_id: mockUser.id,
          name: 'Cloud Dialed Geisha',
          brew_method: 'v60',
          recommended_brewer_id: null,
          recommended_grinder_id: null,
          description: 'From cloud',
          author: null,
          coffee_dose_grams: 15,
          water_amount_grams: 250,
          ratio: 16.67,
          grind_size: 'Medium',
          water_temp_celsius: 93,
          total_time_seconds: 150,
          is_preset: false,
          is_favorite: false,
          notes: null,
          created_at: new Date().toISOString(),
          recipe_stages: [],
        },
      ],
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'recipes') {
        return { select: mockSelect };
      }
      return {};
    });

    const { result } = renderHook(() => useRecipes(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activeTimerRecipe.id).toBe('cloud-rec-async-test');
    expect(result.current.activeTimerDose).toBe(22);
    expect(result.current.activeTimerRecipe.coffeeDoseGrams).toBe(22);
  });

  it('creates custom recipe with grinderSettings and saves to AsyncStorage', async () => {
    const { result } = renderHook(() => useRecipes(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: BrewRecipe | null = null;
    await act(async () => {
      created = await result.current.addRecipe({
        name: 'V60 with Grinder Settings',
        brewMethod: 'v60',
        coffeeDoseGrams: 15,
        waterAmountGrams: 250,
        ratio: 16.67,
        grindSize: 'Medium',
        grinderSettings: [
          { grinderId: 'grinder-ode', setting: '5.1' },
          { grinderId: 'grinder-c40', setting: '18 clicks' },
        ],
        waterTempCelsius: 93,
        totalTimeSeconds: 150,
        description: 'Dialed',
        stages: [],
      });
    });

    expect(created).toBeDefined();
    expect(created!.grinderSettings).toHaveLength(2);
    expect(created!.grinderSettings![0]).toEqual({
      grinderId: 'grinder-ode',
      setting: '5.1',
    });

    const stored = await AsyncStorage.getItem('@brewlog/custom_recipes');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed[0].grinderSettings).toEqual([
      { grinderId: 'grinder-ode', setting: '5.1' },
      { grinderId: 'grinder-c40', setting: '18 clicks' },
    ]);
  });

  it('persists and restores grinderSettings on activeTimerRecipe', async () => {
    const customRecipe: BrewRecipe = {
      id: 'local-rec-active-grinder',
      name: 'Active Recipe With Grinders',
      brewMethod: 'v60',
      description: 'Active',
      coffeeDoseGrams: 16,
      waterAmountGrams: 250,
      ratio: 15.6,
      grindSize: 'Medium',
      grinderSettings: [
        { grinderId: 'grinder-primary', setting: '4.2' },
      ],
      waterTempCelsius: 92,
      totalTimeSeconds: 140,
      stages: [],
      isPreset: false,
      createdAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      '@brewlog/custom_recipes',
      JSON.stringify([customRecipe])
    );
    await AsyncStorage.setItem(
      ACTIVE_RECIPE_STORAGE_KEY,
      JSON.stringify({ recipeId: customRecipe.id, dose: 16 })
    );

    const { result } = renderHook(() => useRecipes(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeTimerRecipe.id).toBe(customRecipe.id);
    expect(result.current.activeTimerRecipe.grinderSettings).toBeDefined();
    expect(result.current.activeTimerRecipe.grinderSettings![0]).toEqual({
      grinderId: 'grinder-primary',
      setting: '4.2',
    });
  });
});

