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
});

