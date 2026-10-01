import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrewRecipe, DEFAULT_PRESET_RECIPES, rescaleRecipeDose } from '@brewlog/core';
import {
  mapRecipeRowToDomain,
  mapRecipeDomainToInsert,
  mapRecipeStageDomainToInsert,
} from '@brewlog/supabase';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthContext';

const STORAGE_KEY = '@brewlog/custom_recipes';
export const ACTIVE_RECIPE_STORAGE_KEY = '@brewlog/mobile:last_active_recipe';

export interface SavedActiveRecipe {
  recipeId: string;
  dose?: number;
}

async function loadSavedActiveRecipe(): Promise<SavedActiveRecipe | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_RECIPE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.recipeId === 'string') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read last active recipe from AsyncStorage:', err);
  }
  return null;
}

async function persistSavedActiveRecipe(recipeId: string, dose?: number): Promise<void> {
  try {
    await AsyncStorage.setItem(
      ACTIVE_RECIPE_STORAGE_KEY,
      JSON.stringify({ recipeId, dose })
    );
  } catch (err) {
    console.error('Failed to write last active recipe to AsyncStorage:', err);
  }
}

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

export const RecipeContext = createContext<RecipeContextValue | null>(null);

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

  const pendingSavedRecipeRef = useRef<SavedActiveRecipe | null>(null);
  const activeRecipeSetByUserRef = useRef<boolean>(false);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const [local, savedActive] = await Promise.all([
        loadCachedRecipes(),
        loadSavedActiveRecipe(),
      ]);
      setCustomRecipes(local);

      if (savedActive && !activeRecipeSetByUserRef.current) {
        pendingSavedRecipeRef.current = savedActive;
        const allKnown = [...local, ...DEFAULT_PRESET_RECIPES];
        const match = allKnown.find((r) => r.id === savedActive.recipeId);
        if (match) {
          const dose =
            savedActive.dose && savedActive.dose > 0 ? savedActive.dose : match.coffeeDoseGrams;
          const scaled = rescaleRecipeDose(match, dose);
          setActiveTimerRecipeState(scaled);
          setActiveTimerDose(dose);
          pendingSavedRecipeRef.current = null;
        }
      }

      if (!supabase || !user) {
        if (pendingSavedRecipeRef.current && !activeRecipeSetByUserRef.current) {
          const fallback = DEFAULT_PRESET_RECIPES[0];
          setActiveTimerRecipeState(fallback);
          setActiveTimerDose(fallback.coffeeDoseGrams);
          await persistSavedActiveRecipe(fallback.id, fallback.coffeeDoseGrams);
          pendingSavedRecipeRef.current = null;
        }
        return;
      }

      // Auto-sync unsynced local recipes
      const unsynced = local.filter((r) => r.id.startsWith('local-rec-'));
      const syncedIds = new Set<string>();

      if (unsynced.length > 0) {
        for (const item of unsynced) {
          try {
            const payload = mapRecipeDomainToInsert(item, user.id);
            const { data: recData, error: recErr } = await supabase
              .from('recipes')
              .insert(payload)
              .select()
              .single();

            if (!recErr && recData) {
              syncedIds.add(item.id);
              if (item.stages && item.stages.length > 0) {
                const stagePayloads = item.stages.map((stage, idx) =>
                  mapRecipeStageDomainToInsert(stage, recData.id, idx)
                );
                await supabase.from('recipe_stages').insert(stagePayloads);
              }
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
        const remainingUnsynced = local.filter(
          (r) => r.id.startsWith('local-rec-') && !syncedIds.has(r.id)
        );
        const merged = [...remainingUnsynced, ...mapped];
        setCustomRecipes(merged);
        await persistCachedRecipes(merged);

        if (pendingSavedRecipeRef.current && !activeRecipeSetByUserRef.current) {
          const allKnown = [...merged, ...DEFAULT_PRESET_RECIPES];
          const match = allKnown.find((r) => r.id === pendingSavedRecipeRef.current!.recipeId);
          if (match) {
            const dose =
              pendingSavedRecipeRef.current.dose && pendingSavedRecipeRef.current.dose > 0
                ? pendingSavedRecipeRef.current.dose
                : match.coffeeDoseGrams;
            const scaled = rescaleRecipeDose(match, dose);
            setActiveTimerRecipeState(scaled);
            setActiveTimerDose(dose);
          } else {
            const fallback = DEFAULT_PRESET_RECIPES[0];
            setActiveTimerRecipeState(fallback);
            setActiveTimerDose(fallback.coffeeDoseGrams);
            await persistSavedActiveRecipe(fallback.id, fallback.coffeeDoseGrams);
          }
          pendingSavedRecipeRef.current = null;
        }
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
        const nextRecipes = [fallback, ...customRecipes];
        setCustomRecipes(nextRecipes);
        await persistCachedRecipes(nextRecipes);
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
          const nextRecipes = [fallback, ...customRecipes];
          setCustomRecipes(nextRecipes);
          await persistCachedRecipes(nextRecipes);
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
        const nextRecipes = [created, ...customRecipes.filter((r) => r.id !== localId)];
        setCustomRecipes(nextRecipes);
        await persistCachedRecipes(nextRecipes);
        return created;
      } catch (err) {
        console.error('addRecipe exception:', err);
        const nextRecipes = [fallback, ...customRecipes];
        setCustomRecipes(nextRecipes);
        await persistCachedRecipes(nextRecipes);
        return fallback;
      }
    },
    [user, customRecipes]
  );

  const updateRecipe = useCallback(
    async (id: string, updates: Partial<BrewRecipe>): Promise<BrewRecipe> => {
      if (id.startsWith('preset-') || DEFAULT_PRESET_RECIPES.some((p) => p.id === id)) {
        console.warn('Cannot edit built-in preset recipe:', id);
        const existing = DEFAULT_PRESET_RECIPES.find((p) => p.id === id);
        return existing!;
      }

      const existing = customRecipes.find((r) => r.id === id);
      if (!existing) {
        console.warn('Cannot find recipe to update:', id);
        throw new Error(`Recipe with id ${id} not found`);
      }

      const updatedTarget: BrewRecipe = { ...existing, ...updates };
      const nextRecipes = customRecipes.map((item) => (item.id === id ? updatedTarget : item));
      setCustomRecipes(nextRecipes);
      await persistCachedRecipes(nextRecipes);

      if (supabase && user && !id.startsWith('local-rec-')) {
        try {
          const payload = mapRecipeDomainToInsert(updatedTarget, user.id);
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

      if (activeTimerRecipe.id === id) {
        const rescaled = rescaleRecipeDose(updatedTarget, activeTimerDose);
        setActiveTimerRecipeState(rescaled);
      }

      return updatedTarget;
    },
    [user, customRecipes, activeTimerRecipe.id, activeTimerDose]
  );

  const deleteRecipe = useCallback(
    async (id: string): Promise<void> => {
      if (id.startsWith('preset-') || DEFAULT_PRESET_RECIPES.some((p) => p.id === id)) {
        console.warn('Cannot delete built-in preset recipe:', id);
        return;
      }

      const nextRecipes = customRecipes.filter((r) => r.id !== id);
      setCustomRecipes(nextRecipes);
      await persistCachedRecipes(nextRecipes);

      if (activeTimerRecipe.id === id) {
        const fallback = DEFAULT_PRESET_RECIPES[0];
        setActiveTimerRecipeState(fallback);
        setActiveTimerDose(fallback.coffeeDoseGrams);
        persistSavedActiveRecipe(fallback.id, fallback.coffeeDoseGrams);
      }

      if (supabase && user && !id.startsWith('local-rec-')) {
        try {
          await supabase.from('recipes').delete().eq('id', id);
        } catch (err) {
          console.error('deleteRecipe exception:', err);
        }
      }
    },
    [user, customRecipes, activeTimerRecipe.id]
  );

  const setActiveTimerRecipe = useCallback((recipe: BrewRecipe, dose?: number) => {
    activeRecipeSetByUserRef.current = true;
    pendingSavedRecipeRef.current = null;
    setActiveTimerRecipeState(recipe);
    const targetDose = dose !== undefined && dose > 0 ? dose : recipe.coffeeDoseGrams;
    setActiveTimerDose(targetDose);
    persistSavedActiveRecipe(recipe.id, targetDose);
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
