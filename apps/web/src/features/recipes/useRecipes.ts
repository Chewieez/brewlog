import { useState, useEffect, useCallback, useMemo } from "react";
import { BrewRecipe, DEFAULT_PRESET_RECIPES } from "@brewlog/core";
import {
  mapRecipeRowToDomain,
  mapRecipeDomainToInsert,
  mapRecipeStageDomainToInsert,
} from "@brewlog/supabase";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/AuthContext";

const STORAGE_KEY = "brewlog_custom_recipes_cache";

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

export const useRecipes = () => {
  const { user } = useAuth();
  const [customRecipes, setCustomRecipes] = useState<BrewRecipe[]>(loadLocalCustomRecipes);
  const [loading, setLoading] = useState(false);

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

            if (recErr) {
              console.error("Failed to sync offline recipe:", item.name, recErr);
              continue;
            }

            if (recData && item.stages && item.stages.length > 0) {
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
              }
            }
          } catch (syncErr) {
            console.error("Failed to sync recipe:", item, syncErr);
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
      } else if (data) {
        const mapped: BrewRecipe[] = data.map((row: any) =>
          mapRecipeRowToDomain(row, row.recipe_stages || [])
        );
        setCustomRecipes(mapped);
        saveLocalCustomRecipes(mapped);
      }
    } catch (err) {
      console.error("fetchRecipes exception:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const addRecipe = async (
    newRecipe: Omit<BrewRecipe, "id" | "createdAt">
  ): Promise<BrewRecipe> => {
    const localId = `local-rec-${Date.now()}`;
    const stagesWithIds = (newRecipe.stages || []).map((stage, index) => ({
      ...stage,
      id: stage.id || `local-stage-${Date.now()}-${index}`,
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
      const payload = mapRecipeDomainToInsert(newRecipe, user.id);

      const { data: recData, error: recError } = await supabase
        .from("recipes")
        .insert(payload)
        .select()
        .single();

      if (recError || !recData) {
        console.error("Supabase recipe insert error:", recError);
        setCustomRecipes((prev) => {
          const updated = [fallbackRecipe, ...prev];
          saveLocalCustomRecipes(updated);
          return updated;
        });
        return fallbackRecipe;
      }

      let createdStages: any[] = [];
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
      setCustomRecipes((prev) => {
        const updated = [fallbackRecipe, ...prev];
        saveLocalCustomRecipes(updated);
        return updated;
      });
      return fallbackRecipe;
    }
  };

  const updateRecipe = async (
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
      ? updates.stages.map((stage, index) => ({
          ...stage,
          id: stage.id || `local-stage-${Date.now()}-${index}`,
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

    if (supabase && user && !id.startsWith("local-rec-")) {
      try {
        const payload = mapRecipeDomainToInsert(updatedTarget, user.id);
        const { error: updateErr } = await supabase
          .from("recipes")
          .update(payload)
          .eq("id", id);

        if (updateErr) {
          console.error("Supabase recipe update error:", updateErr);
        }

        if (updates.stages) {
          const { error: deleteStagesErr } = await supabase
            .from("recipe_stages")
            .delete()
            .eq("recipe_id", id);

          if (deleteStagesErr) {
            console.error(
              "Supabase recipe stages delete error:",
              deleteStagesErr
            );
          }

          const stageInserts = updates.stages.map((st, idx) =>
            mapRecipeStageDomainToInsert(st, id, idx)
          );
          const { error: insertStagesErr } = await supabase
            .from("recipe_stages")
            .insert(stageInserts);

          if (insertStagesErr) {
            console.error(
              "Supabase recipe stages insert error:",
              insertStagesErr
            );
          }
        }
      } catch (err) {
        console.error("updateRecipe exception:", err);
      }
    }

    return updatedTarget;
  };

  const deleteRecipe = async (id: string): Promise<void> => {
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

    if (supabase && user && !id.startsWith("local-rec-")) {
      try {
        const { error } = await supabase
          .from("recipes")
          .delete()
          .eq("id", id);
        if (error) {
          console.error("Supabase recipe delete error:", error);
        }
      } catch (err) {
        console.error("deleteRecipe exception:", err);
      }
    }
  };

  const recipes = useMemo(
    () => [...customRecipes, ...DEFAULT_PRESET_RECIPES],
    [customRecipes]
  );

  return {
    recipes,
    customRecipes,
    presets: DEFAULT_PRESET_RECIPES,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    loading,
    refreshRecipes: fetchRecipes,
  };
};

