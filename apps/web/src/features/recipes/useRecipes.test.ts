/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRecipes } from "./useRecipes";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../../lib/supabase";
import { DEFAULT_PRESET_RECIPES, BrewRecipe } from "@brewlog/core";

vi.mock("../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("useRecipes hook", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("initializes with DEFAULT_PRESET_RECIPES when unauthenticated and localStorage is empty", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: false,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useRecipes());

    expect(result.current.customRecipes).toEqual([]);
    expect(result.current.recipes).toEqual(DEFAULT_PRESET_RECIPES);
  });

  it("loads existing custom recipes from localStorage cache merged with presets", async () => {
    const cachedCustomRecipe: BrewRecipe = {
      id: "local-rec-12345",
      name: "My Custom Kalita",
      brewMethod: "kalita-wave",
      description: "Fast flow recipe",
      coffeeDoseGrams: 18,
      waterAmountGrams: 300,
      ratio: 16.67,
      grindSize: "Medium",
      waterTempCelsius: 92,
      totalTimeSeconds: 180,
      stages: [],
      isPreset: false,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "brewlog_custom_recipes_cache",
      JSON.stringify([cachedCustomRecipe])
    );

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: false,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useRecipes());

    expect(result.current.customRecipes).toEqual([cachedCustomRecipe]);
    expect(result.current.recipes).toEqual([
      cachedCustomRecipe,
      ...DEFAULT_PRESET_RECIPES,
    ]);
  });

  it("adds recipe offline with local-rec- prefix and updates localStorage", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: false,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useRecipes());

    let addedRecipe: BrewRecipe | undefined;
    await act(async () => {
      addedRecipe = await result.current.addRecipe({
        name: "Morning Chemex",
        brewMethod: "chemex",
        description: "Bright filter cup",
        coffeeDoseGrams: 30,
        waterAmountGrams: 500,
        ratio: 16.67,
        grindSize: "Medium-Coarse",
        waterTempCelsius: 95,
        totalTimeSeconds: 240,
        stages: [
          {
            id: "stage-bloom",
            name: "Bloom",
            startSecond: 0,
            durationSeconds: 45,
            targetWaterWeightGrams: 80,
            instruction: "Pour 80g water",
            stageType: "bloom",
          },
        ],
      });
    });

    expect(addedRecipe).toBeDefined();
    expect(addedRecipe!.id).toMatch(/^local-rec-/);
    expect(addedRecipe!.name).toBe("Morning Chemex");
    expect(result.current.customRecipes[0].id).toBe(addedRecipe!.id);
    expect(result.current.recipes[0].id).toBe(addedRecipe!.id);

    const saved = JSON.parse(
      localStorage.getItem("brewlog_custom_recipes_cache") || "[]"
    );
    expect(saved[0].id).toBe(addedRecipe!.id);
  });

  it("deletes custom recipe offline and updates state and localStorage", async () => {
    const cachedCustomRecipe: BrewRecipe = {
      id: "local-rec-delete-me",
      name: "To Be Deleted",
      brewMethod: "v60",
      description: "Temp recipe",
      coffeeDoseGrams: 15,
      waterAmountGrams: 250,
      ratio: 16.67,
      grindSize: "Medium-Fine",
      waterTempCelsius: 93,
      totalTimeSeconds: 150,
      stages: [],
      isPreset: false,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "brewlog_custom_recipes_cache",
      JSON.stringify([cachedCustomRecipe])
    );

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: false,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useRecipes());

    expect(result.current.customRecipes).toHaveLength(1);

    await act(async () => {
      await result.current.deleteRecipe("local-rec-delete-me");
    });

    expect(result.current.customRecipes).toHaveLength(0);
    expect(result.current.recipes).toEqual(DEFAULT_PRESET_RECIPES);

    const saved = JSON.parse(
      localStorage.getItem("brewlog_custom_recipes_cache") || "[]"
    );
    expect(saved).toHaveLength(0);
  });

  it("guards against deleting built-in preset recipes", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: false,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useRecipes());

    const initialPresetCount = result.current.recipes.length;
    const presetId = DEFAULT_PRESET_RECIPES[0].id;

    await act(async () => {
      await result.current.deleteRecipe(presetId);
    });

    expect(result.current.recipes).toHaveLength(initialPresetCount);
    expect(result.current.recipes.some((r) => r.id === presetId)).toBe(true);
  });

  it("auto-syncs offline local-rec-* items and stages to Supabase when user logs in", async () => {
    const offlineRecipe: BrewRecipe = {
      id: "local-rec-9999",
      name: "Offline Hand Brew",
      brewMethod: "v60",
      description: "Created with no internet",
      coffeeDoseGrams: 20,
      waterAmountGrams: 320,
      ratio: 16,
      grindSize: "20 clicks",
      waterTempCelsius: 94,
      totalTimeSeconds: 180,
      stages: [
        {
          id: "local-stage-1",
          name: "Bloom",
          startSecond: 0,
          durationSeconds: 40,
          targetWaterWeightGrams: 50,
          instruction: "Wet grounds",
          stageType: "bloom",
        },
      ],
      isPreset: false,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "brewlog_custom_recipes_cache",
      JSON.stringify([offlineRecipe])
    );

    const mockUser = { id: "user-abc-123" } as any;

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const mockRecipeInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "uuid-recipe-synced-1", user_id: "user-abc-123" },
          error: null,
        }),
      }),
    });

    const mockStageInsert = vi.fn().mockResolvedValue({ error: null });

    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "uuid-recipe-synced-1",
          user_id: "user-abc-123",
          name: "Offline Hand Brew",
          brew_method: "v60",
          recommended_brewer_id: null,
          recommended_grinder_id: null,
          description: "Created with no internet",
          author: null,
          coffee_dose_grams: 20,
          water_amount_grams: 320,
          ratio: 16,
          grind_size: "20 clicks",
          water_temp_celsius: 94,
          total_time_seconds: 180,
          is_preset: false,
          is_favorite: false,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          recipe_stages: [
            {
              id: "uuid-stage-synced-1",
              recipe_id: "uuid-recipe-synced-1",
              step_order: 0,
              name: "Bloom",
              start_second: 0,
              duration_seconds: 40,
              target_water_weight_grams: 50,
              instruction: "Wet grounds",
              stage_type: "bloom",
            },
          ],
        },
      ],
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "recipes") {
        return {
          insert: mockRecipeInsert,
          select: mockSelect,
        } as any;
      }
      if (table === "recipe_stages") {
        return {
          insert: mockStageInsert,
        } as any;
      }
      return {} as any;
    });

    const { result } = renderHook(() => useRecipes());

    await waitFor(() => {
      expect(mockRecipeInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-abc-123",
          name: "Offline Hand Brew",
        })
      );
    });

    await waitFor(() => {
      expect(mockStageInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            recipe_id: "uuid-recipe-synced-1",
            step_order: 0,
            name: "Bloom",
          }),
        ])
      );
    });

    await waitFor(() => {
      expect(result.current.customRecipes[0].id).toBe("uuid-recipe-synced-1");
      expect(result.current.customRecipes[0].stages[0].id).toBe(
        "uuid-stage-synced-1"
      );
    });
  });

  it("updates existing custom recipe offline and updates state and localStorage", async () => {
    const initialRecipe: BrewRecipe = {
      id: "local-rec-edit-1",
      name: "Original Name",
      brewMethod: "v60",
      description: "Original description",
      coffeeDoseGrams: 15,
      waterAmountGrams: 250,
      ratio: 16.67,
      grindSize: "Medium",
      waterTempCelsius: 93,
      totalTimeSeconds: 150,
      stages: [
        {
          id: "stage-1",
          name: "Bloom",
          startSecond: 0,
          durationSeconds: 45,
          targetWaterWeightGrams: 50,
          instruction: "Bloom grounds",
          stageType: "bloom",
        },
      ],
      isPreset: false,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "brewlog_custom_recipes_cache",
      JSON.stringify([initialRecipe])
    );

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: false,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useRecipes());

    let updated: BrewRecipe | undefined;
    await act(async () => {
      updated = await result.current.updateRecipe("local-rec-edit-1", {
        name: "Updated Name",
        coffeeDoseGrams: 18,
        waterAmountGrams: 300,
      });
    });

    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Updated Name");
    expect(updated!.coffeeDoseGrams).toBe(18);
    expect(updated!.waterAmountGrams).toBe(300);

    expect(result.current.customRecipes[0].name).toBe("Updated Name");
    expect(result.current.customRecipes[0].coffeeDoseGrams).toBe(18);

    const saved = JSON.parse(
      localStorage.getItem("brewlog_custom_recipes_cache") || "[]"
    );
    expect(saved[0].name).toBe("Updated Name");
    expect(saved[0].coffeeDoseGrams).toBe(18);
  });

  it("guards against editing built-in preset recipes", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: false,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useRecipes());
    const preset = DEFAULT_PRESET_RECIPES[0];

    let attemptedUpdate: BrewRecipe | undefined;
    await act(async () => {
      attemptedUpdate = await result.current.updateRecipe(preset.id, {
        name: "Hacked Preset Name",
      });
    });

    expect(attemptedUpdate).toEqual(preset);
    expect(result.current.recipes.find((r) => r.id === preset.id)?.name).toBe(
      preset.name
    );
    expect(result.current.customRecipes).toHaveLength(0);
  });

  it("syncs recipe updates and stages to Supabase when authenticated", async () => {
    const existingRecipe: BrewRecipe = {
      id: "uuid-db-recipe-1",
      name: "Remote Recipe",
      brewMethod: "chemex",
      description: "Original chemex",
      coffeeDoseGrams: 30,
      waterAmountGrams: 500,
      ratio: 16.67,
      grindSize: "Coarse",
      waterTempCelsius: 96,
      totalTimeSeconds: 300,
      stages: [
        {
          id: "uuid-stage-1",
          name: "Old Bloom",
          startSecond: 0,
          durationSeconds: 45,
          targetWaterWeightGrams: 100,
          instruction: "Old bloom step",
          stageType: "bloom",
        },
      ],
      isPreset: false,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "brewlog_custom_recipes_cache",
      JSON.stringify([existingRecipe])
    );

    const mockUser = { id: "user-xyz-789" } as any;

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockRecipeUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    const mockStageDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const mockStageDelete = vi.fn().mockReturnValue({ eq: mockStageDeleteEq });
    const mockStageInsert = vi.fn().mockResolvedValue({ error: null });

    const mockSelectOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "uuid-db-recipe-1",
          user_id: "user-xyz-789",
          name: "Remote Recipe",
          brew_method: "chemex",
          recommended_brewer_id: null,
          recommended_grinder_id: null,
          description: "Original chemex",
          author: null,
          coffee_dose_grams: 30,
          water_amount_grams: 500,
          ratio: 16.67,
          grind_size: "Coarse",
          water_temp_celsius: 96,
          total_time_seconds: 300,
          is_preset: false,
          is_favorite: false,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          recipe_stages: [
            {
              id: "uuid-stage-1",
              recipe_id: "uuid-db-recipe-1",
              step_order: 0,
              name: "Old Bloom",
              start_second: 0,
              duration_seconds: 45,
              target_water_weight_grams: 100,
              instruction: "Old bloom step",
              stage_type: "bloom",
            },
          ],
        },
      ],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockSelectOrder });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "recipes") {
        return {
          select: mockSelect,
          update: mockRecipeUpdate,
        } as any;
      }
      if (table === "recipe_stages") {
        return {
          delete: mockStageDelete,
          insert: mockStageInsert,
        } as any;
      }
      return {} as any;
    });

    const { result } = renderHook(() => useRecipes());

    await waitFor(() => {
      expect(result.current.customRecipes).toHaveLength(1);
    });

    const newStages = [
      {
        id: "new-stage-1",
        name: "Extended Bloom",
        startSecond: 0,
        durationSeconds: 60,
        targetWaterWeightGrams: 120,
        instruction: "Saturate evenly",
        stageType: "bloom" as const,
      },
      {
        id: "new-stage-2",
        name: "Continuous Pour",
        startSecond: 60,
        durationSeconds: 180,
        targetWaterWeightGrams: 500,
        instruction: "Pour through center",
        stageType: "pour" as const,
      },
    ];

    await act(async () => {
      await result.current.updateRecipe("uuid-db-recipe-1", {
        name: "Updated Chemex Brew",
        coffeeDoseGrams: 32,
        stages: newStages,
      });
    });

    expect(mockRecipeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-xyz-789",
        name: "Updated Chemex Brew",
        coffee_dose_grams: 32,
      })
    );
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "uuid-db-recipe-1");

    expect(mockStageDelete).toHaveBeenCalled();
    expect(mockStageDeleteEq).toHaveBeenCalledWith("recipe_id", "uuid-db-recipe-1");

    expect(mockStageInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          recipe_id: "uuid-db-recipe-1",
          step_order: 0,
          name: "Extended Bloom",
        }),
        expect.objectContaining({
          recipe_id: "uuid-db-recipe-1",
          step_order: 1,
          name: "Continuous Pour",
        }),
      ])
    );

    expect(result.current.customRecipes[0].name).toBe("Updated Chemex Brew");
    expect(result.current.customRecipes[0].stages).toHaveLength(2);
  });
});

