import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { BrewRecipe, DEFAULT_PRESET_RECIPES, BrewStage } from "@brewlog/core";
import {
  RecipeRow,
  RecipeStageRow,
  mapRecipeRowToDomain,
  mapRecipeDomainToInsert,
  mapRecipeStageDomainToInsert,
} from "@brewlog/supabase";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/AuthContext";
import { captureSyncError } from "../../lib/sentry";

export type AddRecipeInput = Omit<BrewRecipe, "id" | "createdAt" | "stages"> & {
  stages?: (Omit<BrewStage, "id"> & { id?: string })[];
};

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const STORAGE_KEY = "brewlog_custom_recipes_cache";

/**
 * Storage schema note: Web persists { recipeId } in localStorage because custom dose
 * adjustments are managed locally within TimerView state rather than in RecipeContext.
 * In contrast, Mobile persists { recipeId, dose } in AsyncStorage because its timer relies
 * on RecipeContext's activeTimerDose to keep dial adjustments synced across tab navigations.
 */
export const WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY = "brewlog_last_active_recipe";

const loadSavedActiveRecipeId = (): string | null => {
  try {
    const raw = localStorage.getItem(WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.recipeId === "string") {
        return parsed.recipeId;
      }
    }
  } catch (err) {
    console.error("Failed to load last active recipe from localStorage:", err);
  }
  return null;
};

const persistSavedActiveRecipeId = (recipeId: string): void => {
  try {
    localStorage.setItem(
      WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY,
      JSON.stringify({ recipeId })
    );
  } catch (err) {
    console.error("Failed to save last active recipe to localStorage:", err);
  }
};

const loadLocalCustomRecipes = (): BrewRecipe[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load local custom recipes cache:", err);
  }
  return [];
};

const saveLocalCustomRecipes = (items: BrewRecipe[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save local custom recipes cache:", err);
  }
};

export interface RecipeContextValue {
  recipes: BrewRecipe[];
  customRecipes: BrewRecipe[];
  presets: BrewRecipe[];
  selectedRecipe: BrewRecipe;
  loading: boolean;
  addRecipe: (newRecipe: AddRecipeInput) => Promise<BrewRecipe>;
  updateRecipe: (id: string, updates: Partial<BrewRecipe>) => Promise<BrewRecipe>;
  deleteRecipe: (id: string) => Promise<void>;
  setSelectedRecipe: (recipe: BrewRecipe) => void;
  refreshRecipes: () => Promise<void>;
}

export const RecipeContext = createContext<RecipeContextValue | null>(null);

export const RecipeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [customRecipes, setCustomRecipes] = useState<BrewRecipe[]>(loadLocalCustomRecipes);
  const [loading, setLoading] = useState(false);

  const recipes = useMemo(
    () => [...customRecipes, ...DEFAULT_PRESET_RECIPES],
    [customRecipes]
  );

  const lastActiveIdRef = useRef<string | null>(null);
  const [selectedRecipe, setSelectedRecipeState] = useState<BrewRecipe>(() => {
    const savedId = loadSavedActiveRecipeId();
    if (savedId) {
      lastActiveIdRef.current = savedId;
      const match = recipes.find((r) => r.id === savedId);
      if (match) return match;
    }
    const fallback = recipes[0] || DEFAULT_PRESET_RECIPES[0];
    if (lastActiveIdRef.current === null) {
      lastActiveIdRef.current = fallback.id;
    }
    return fallback;
  });

  const setSelectedRecipe = useCallback((recipe: BrewRecipe) => {
    lastActiveIdRef.current = recipe.id;
    setSelectedRecipeState(recipe);
    persistSavedActiveRecipeId(recipe.id);
  }, []);

  useEffect(() => {
    const targetId = lastActiveIdRef.current;
    if (targetId) {
      const match = recipes.find((r) => r.id === targetId);
      if (match) {
        setSelectedRecipeState((prev) => (prev === match ? prev : match));
        return;
      }
      // Stored recipe was deleted or corrupted: self-heal by writing fallback
      const fallback = recipes[0] || DEFAULT_PRESET_RECIPES[0];
      lastActiveIdRef.current = fallback.id;
      setSelectedRecipeState((prev) => (prev === fallback ? prev : fallback));
      persistSavedActiveRecipeId(fallback.id);
      return;
    }

    if (recipes.length > 0) {
      const fallback = recipes[0] || DEFAULT_PRESET_RECIPES[0];
      lastActiveIdRef.current = fallback.id;
      setSelectedRecipeState((prev) => (prev === fallback ? prev : fallback));
      persistSavedActiveRecipeId(fallback.id);
    }
  }, [recipes]);

  const fetchRecipes = useCallback(async () => {
    if (!supabase || !user) {
      // Guest or offline mode: load from localStorage
      const local = loadLocalCustomRecipes();
      setCustomRecipes(local);
      return;
    }

    setLoading(true);
    try {
      // 1. Check for unsynced offline items (created with local-rec- prefix)
      const localItems = loadLocalCustomRecipes();
      const unsyncedItems = localItems.filter((item) =>
        item.id.startsWith("local-rec-")
      );
      const syncedIds = new Set<string>();

      if (unsyncedItems.length > 0) {
        console.log(
          `Auto-syncing ${unsyncedItems.length} offline custom recipe(s) to Supabase...`
        );
        for (const item of unsyncedItems) {
          try {
            const payload = mapRecipeDomainToInsert(item, user.id);
            const { data: recData, error: recErr } = await supabase
              .from("recipes")
              .insert(payload)
              .select()
              .single();

            if (recErr || !recData) {
              console.error("Failed to sync offline recipe:", item.name, recErr);
              captureSyncError("recipes", "insert", recErr, item.id);
              continue;
            }

            syncedIds.add(item.id);

            if (item.stages && item.stages.length > 0) {
              const stagePayloads = item.stages.map((stage, idx) =>
                mapRecipeStageDomainToInsert(stage, recData.id, idx)
              );
              const { error: stageErr } = await supabase
                .from("recipe_stages")
                .insert(stagePayloads);

              if (stageErr) {
                console.error(
                  "Failed to sync stages for recipe:",
                  item.name,
                  stageErr
                );
                captureSyncError("recipes", "insert", stageErr, item.id);
              }
            }
          } catch (syncErr) {
            console.error("Failed to sync recipe:", item, syncErr);
            captureSyncError("recipes", "insert", syncErr, item.id);
          }
        }
      }

      // 2. Fetch all user recipes with joined recipe_stages from Supabase
      const { data, error } = await supabase
        .from("recipes")
        .select("*, recipe_stages(*)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetchRecipes error:", error);
        captureSyncError("recipes", "fetch", error);
      } else if (data) {
        const mapped: BrewRecipe[] = (
          data as unknown as (RecipeRow & { recipe_stages?: RecipeStageRow[] })[]
        ).map((row) =>
          mapRecipeRowToDomain(row, row.recipe_stages || [])
        );
        const remainingUnsynced = localItems.filter(
          (r) => r.id.startsWith("local-rec-") && !syncedIds.has(r.id)
        );
        const merged = [...remainingUnsynced, ...mapped];
        setCustomRecipes(merged);
        saveLocalCustomRecipes(merged);
      }
    } catch (err) {
      console.error("fetchRecipes exception:", err);
      captureSyncError("recipes", "fetch", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const addRecipe = useCallback(
    async (
      newRecipe: AddRecipeInput
    ): Promise<BrewRecipe> => {
      const localId = `local-rec-${generateUUID()}`;
      const stagesWithIds = (newRecipe.stages || []).map((stage) => ({
        ...stage,
        id: stage.id || `local-stage-${generateUUID()}`,
      }));

      const fallbackRecipe: BrewRecipe = {
        ...newRecipe,
        id: localId,
        stages: stagesWithIds,
        isPreset: false,
        createdAt: new Date().toISOString(),
      };

      if (!supabase || !user) {
        // Offline / guest mode: persist locally
        setCustomRecipes((prev) => {
          const updated = [fallbackRecipe, ...prev];
          saveLocalCustomRecipes(updated);
          return updated;
        });
        return fallbackRecipe;
      }

      try {
        const payload = mapRecipeDomainToInsert(fallbackRecipe, user.id);

        const { data: recData, error: recError } = await supabase
          .from("recipes")
          .insert(payload)
          .select()
          .single();

        if (recError || !recData) {
          console.error("Supabase recipe insert error:", recError);
          captureSyncError("recipes", "insert", recError, fallbackRecipe.id);
          setCustomRecipes((prev) => {
            const updated = [fallbackRecipe, ...prev];
            saveLocalCustomRecipes(updated);
            return updated;
          });
          return fallbackRecipe;
        }

        let createdStages: RecipeStageRow[] = [];
        if (stagesWithIds.length > 0) {
          const stageInserts = stagesWithIds.map((stage, idx) =>
            mapRecipeStageDomainToInsert(stage, recData.id, idx)
          );
          const { data: stageData, error: stageError } = await supabase
            .from("recipe_stages")
            .insert(stageInserts)
            .select();

          if (stageError) {
            console.error("Supabase recipe stages insert error:", stageError);
            captureSyncError("recipes", "insert", stageError, fallbackRecipe.id);
          } else if (stageData) {
            createdStages = stageData;
          }
        }

        const createdRecipe = mapRecipeRowToDomain(recData, createdStages);
        setCustomRecipes((prev) => {
          const updated = [
            createdRecipe,
            ...prev.filter((r) => r.id !== localId),
          ];
          saveLocalCustomRecipes(updated);
          return updated;
        });
        return createdRecipe;
      } catch (err) {
        console.error("addRecipe exception:", err);
        captureSyncError("recipes", "insert", err, fallbackRecipe.id);
        setCustomRecipes((prev) => {
          const updated = [fallbackRecipe, ...prev];
          saveLocalCustomRecipes(updated);
          return updated;
        });
        return fallbackRecipe;
      }
    },
    [user]
  );

  const updateRecipe = useCallback(
    async (
      id: string,
      updates: Partial<BrewRecipe>
    ): Promise<BrewRecipe> => {
      // Guard against editing preset recipes
      if (
        id.startsWith("preset-") ||
        DEFAULT_PRESET_RECIPES.some((p) => p.id === id)
      ) {
        console.warn("Cannot edit built-in preset recipe:", id);
        return DEFAULT_PRESET_RECIPES.find((p) => p.id === id)!;
      }

      const existing = customRecipes.find((r) => r.id === id);
      if (!existing) {
        console.warn("Cannot find recipe to update:", id);
        throw new Error(`Recipe with id ${id} not found`);
      }

      const stagesWithIds = updates.stages
        ? updates.stages.map((stage) => ({
            ...stage,
            id: stage.id || `local-stage-${generateUUID()}`,
          }))
        : existing.stages;

      const updatedTarget: BrewRecipe = {
        ...existing,
        ...updates,
        stages: stagesWithIds,
      };

      setCustomRecipes((prev) => {
        const updated = prev.map((item) => (item.id === id ? updatedTarget : item));
        saveLocalCustomRecipes(updated);
        return updated;
      });

      setSelectedRecipeState((prev) => (prev.id === id ? updatedTarget : prev));

      if (supabase && user && !id.startsWith("local-rec-")) {
        try {
          const payload = mapRecipeDomainToInsert(updatedTarget, user.id);
          const { error: updateErr } = await supabase
            .from("recipes")
            .update(payload)
            .eq("id", id);

          if (updateErr) {
            throw new Error(updateErr.message || "Failed to update recipe in Supabase");
          }

          if (updates.stages) {
            const { error: deleteStagesErr } = await supabase
              .from("recipe_stages")
              .delete()
              .eq("recipe_id", id);

            if (deleteStagesErr) {
              throw new Error(
                deleteStagesErr.message || "Failed to clear old stages in Supabase"
              );
            }

            if (updates.stages.length > 0) {
              const stageInserts = updates.stages.map((st, idx) =>
                mapRecipeStageDomainToInsert(st, id, idx)
              );
              const { error: insertStagesErr } = await supabase
                .from("recipe_stages")
                .insert(stageInserts);

              if (insertStagesErr) {
                throw new Error(
                  insertStagesErr.message || "Failed to save updated stages in Supabase"
                );
              }
            }
          }
        } catch (err) {
          console.error("updateRecipe exception:", err);
          captureSyncError("recipes", "update", err, id);
          // Roll back local state and cache to existing snapshot
          setCustomRecipes((prev) => {
            const reverted = prev.map((item) => (item.id === id ? existing : item));
            saveLocalCustomRecipes(reverted);
            return reverted;
          });
          setSelectedRecipeState((prev) => (prev.id === id ? existing : prev));
          throw err;
        }
      }

      return updatedTarget;
    },
    [customRecipes, user]
  );

  const deleteRecipe = useCallback(
    async (id: string): Promise<void> => {
      // Guard against deleting built-in presets
      if (
        DEFAULT_PRESET_RECIPES.some((p) => p.id === id) ||
        id.startsWith("preset-")
      ) {
        console.warn("Cannot delete built-in preset recipe:", id);
        return;
      }

      setCustomRecipes((prev) => {
        const updated = prev.filter((r) => r.id !== id);
        saveLocalCustomRecipes(updated);
        return updated;
      });

      setSelectedRecipeState((prev) => {
        if (prev.id === id) {
          const fallback = DEFAULT_PRESET_RECIPES[0];
          lastActiveIdRef.current = fallback.id;
          persistSavedActiveRecipeId(fallback.id);
          return fallback;
        }
        return prev;
      });

      if (supabase && user && !id.startsWith("local-rec-")) {
        try {
          const { error } = await supabase
            .from("recipes")
            .delete()
            .eq("id", id);
          if (error) {
            console.error("Supabase recipe delete error:", error);
            captureSyncError("recipes", "delete", error, id);
          }
        } catch (err) {
          console.error("deleteRecipe exception:", err);
          captureSyncError("recipes", "delete", err, id);
        }
      }
    },
    [user]
  );

  const value = useMemo<RecipeContextValue>(
    () => ({
      recipes,
      customRecipes,
      presets: DEFAULT_PRESET_RECIPES,
      selectedRecipe,
      loading,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      setSelectedRecipe,
      refreshRecipes: fetchRecipes,
    }),
    [
      recipes,
      customRecipes,
      selectedRecipe,
      loading,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      setSelectedRecipe,
      fetchRecipes,
    ]
  );

  return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>;
};

export const useRecipes = (): RecipeContextValue => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error("useRecipes must be used within a RecipeProvider");
  }
  return context;
};
