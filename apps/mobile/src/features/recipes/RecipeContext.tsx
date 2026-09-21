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
