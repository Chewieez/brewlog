import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, useOutletContext } from 'react-router';
import { Header } from '../components/shared/Header';
import { AuthModal } from '../features/auth/AuthModal';
import { useAuth } from '../features/auth/AuthContext';
import { useBeans } from '../features/stash/useBeans';
import { useReviews } from '../features/reviews/useReviews';
import { useEquipment } from '../features/equipment/useEquipment';
import { useRecipes } from '../features/recipes/useRecipes';
import { Bean, Equipment, BrewRecipe, TastingLog, DEFAULT_PRESET_RECIPES, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { INITIAL_BEANS } from '../lib/sampleData';
import { PendingBrewSession } from '../features/reviews/ReviewsView';

export interface RootOutletContext {
  beans: Bean[];
  recipes: BrewRecipe[];
  equipment: Equipment[];
  tastingLogs: TastingLog[];
  selectedBean: Bean | null;
  selectedRecipe: BrewRecipe;
  pendingBrewSession: PendingBrewSession | null;
  setSelectedBean: (bean: Bean | null) => void;
  setSelectedRecipe: (recipe: BrewRecipe) => void;
  setPendingBrewSession: (session: PendingBrewSession | null) => void;
  onAddBean: (bean: Bean) => Promise<void>;
  onUpdateBean: (bean: Bean) => Promise<void>;
  onDeleteBean: (id: string) => Promise<void>;
  onAddEquipment: (item: Omit<Equipment, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateEquipment: (id: string, updates: Partial<Equipment>) => Promise<Equipment>;
  onDeleteEquipment: (id: string) => Promise<void>;
  onToggleFavorite: (id: string) => Promise<void>;
  onAddRecipe: (recipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => Promise<BrewRecipe>;
  onUpdateRecipe: (id: string, updates: Partial<BrewRecipe>) => Promise<BrewRecipe>;
  onDeleteRecipe: (id: string) => Promise<void>;
  onAddTastingLog: (log: Omit<TastingLog, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateTastingLog: (id: string, updates: Partial<TastingLog>) => Promise<TastingLog | void>;
  onDeleteTastingLog: (id: string) => Promise<void>;
}

export const useRootOutletContext = () => useOutletContext<RootOutletContext>();

/**
 * Storage schema note: Web persists { recipeId } in localStorage because custom dose
 * adjustments are managed locally within TimerView state rather than in RootLayout context.
 * In contrast, Mobile persists { recipeId, dose } in AsyncStorage because its timer relies
 * on RecipeContext's activeTimerDose to keep dial adjustments synced across tab navigations.
 */
export const WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY = 'brewlog_last_active_recipe';

const loadSavedActiveRecipeId = (): string | null => {
  try {
    const raw = localStorage.getItem(WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.recipeId === 'string') {
        return parsed.recipeId;
      }
    }
  } catch (err) {
    console.error('Failed to load last active recipe from localStorage:', err);
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
    console.error('Failed to save last active recipe to localStorage:', err);
  }
};

export const RootLayout: React.FC = () => {
  const { beans, addBean, updateBean, deleteBean } = useBeans();
  const { logs: tastingLogs, addTastingLog, updateTastingLog, deleteTastingLog } = useReviews();
  const {
    equipment,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    toggleFavorite,
  } = useEquipment();
  const { recipes, addRecipe, updateRecipe, deleteRecipe } = useRecipes();
  const { isPasswordRecovery, authUrlError } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(INDUSTRIAL_PRECISION_THEME.colors).forEach(([key, value]) => {
      const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--color-${kebab}`, value);
    });
  }, []);

  useEffect(() => {
    if (isPasswordRecovery || authUrlError) {
      setIsAuthModalOpen(true);
    }
  }, [isPasswordRecovery, authUrlError]);

  const [selectedRecipe, setSelectedRecipeState] = useState<BrewRecipe>(() => {
    const savedId = loadSavedActiveRecipeId();
    if (savedId) {
      const match = recipes.find((r) => r.id === savedId);
      if (match) return match;
    }
    return recipes[0] || DEFAULT_PRESET_RECIPES[0];
  });
  const [selectedBean, setSelectedBean] = useState<Bean | null>(INITIAL_BEANS[0] || null);
  const [pendingBrewSession, setPendingBrewSession] = useState<PendingBrewSession | null>(null);

  const setSelectedRecipe = useCallback((recipe: BrewRecipe) => {
    setSelectedRecipeState(recipe);
    persistSavedActiveRecipeId(recipe.id);
  }, []);

  useEffect(() => {
    const savedId = loadSavedActiveRecipeId();
    if (savedId) {
      const match = recipes.find((r) => r.id === savedId);
      if (match) {
        if (selectedRecipe !== match) {
          setSelectedRecipeState(match);
        }
        return;
      }
      // Stored recipe was deleted or corrupted: self-heal by writing fallback
      const fallback = recipes[0] || DEFAULT_PRESET_RECIPES[0];
      if (selectedRecipe !== fallback) {
        setSelectedRecipeState(fallback);
      }
      persistSavedActiveRecipeId(fallback.id);
      return;
    }

    if (recipes.length > 0 && !recipes.some((r) => r.id === selectedRecipe.id)) {
      const fallback = recipes[0] || DEFAULT_PRESET_RECIPES[0];
      setSelectedRecipeState(fallback);
      persistSavedActiveRecipeId(fallback.id);
    }
  }, [recipes, selectedRecipe]);

  useEffect(() => {
    if (!selectedBean && beans.length > 0) {
      setSelectedBean(beans[0]);
    }
  }, [beans, selectedBean]);

  const onAddBean = useCallback(
    async (bean: Bean) => {
      await addBean(bean);
    },
    [addBean]
  );

  const onUpdateBean = useCallback(
    async (bean: Bean) => {
      await updateBean(bean);
      if (selectedBean?.id === bean.id) {
        setSelectedBean(bean);
      }
    },
    [updateBean, selectedBean]
  );

  const onDeleteBean = useCallback(
    async (id: string) => {
      await deleteBean(id);
      if (selectedBean?.id === id) {
        setSelectedBean(beans.find((b) => b.id !== id) || null);
      }
    },
    [deleteBean, selectedBean, beans]
  );

  const onAddEquipment = useCallback(
    async (item: Omit<Equipment, 'id' | 'createdAt'>) => {
      await addEquipment(item);
    },
    [addEquipment]
  );

  const onUpdateEquipment = useCallback(
    async (id: string, updates: Partial<Equipment>) => {
      return await updateEquipment(id, updates);
    },
    [updateEquipment]
  );

  const onToggleFavorite = useCallback(
    async (id: string) => {
      await toggleFavorite(id);
    },
    [toggleFavorite]
  );

  const onAddTastingLog = useCallback(
    async (log: Omit<TastingLog, 'id' | 'createdAt'>) => {
      await addTastingLog(log);
    },
    [addTastingLog]
  );

  const onUpdateTastingLog = useCallback(
    async (id: string, updates: Partial<TastingLog>) => {
      return await updateTastingLog(id, updates);
    },
    [updateTastingLog]
  );

  const onDeleteTastingLog = useCallback(
    async (id: string) => {
      await deleteTastingLog(id);
    },
    [deleteTastingLog]
  );

  const onUpdateRecipe = useCallback(
    async (id: string, updates: Partial<BrewRecipe>) => {
      const updated = await updateRecipe(id, updates);
      if (selectedRecipe.id === id) {
        setSelectedRecipeState(updated);
      }
      return updated;
    },
    [updateRecipe, selectedRecipe.id]
  );

  const onDeleteRecipe = useCallback(
    async (id: string) => {
      await deleteRecipe(id);
      if (selectedRecipe.id === id) {
        const fallback = DEFAULT_PRESET_RECIPES[0];
        setSelectedRecipeState(fallback);
        persistSavedActiveRecipeId(fallback.id);
      }
    },
    [deleteRecipe, selectedRecipe.id]
  );

  const contextValue: RootOutletContext = useMemo(
    () => ({
      beans,
      recipes,
      equipment,
      tastingLogs,
      selectedBean,
      selectedRecipe,
      pendingBrewSession,
      setSelectedBean,
      setSelectedRecipe,
      setPendingBrewSession,
      onAddBean,
      onUpdateBean,
      onDeleteBean,
      onAddEquipment,
      onUpdateEquipment,
      onDeleteEquipment: deleteEquipment,
      onToggleFavorite,
      onAddRecipe: addRecipe,
      onUpdateRecipe,
      onDeleteRecipe,
      onAddTastingLog,
      onUpdateTastingLog,
      onDeleteTastingLog,
    }),
    [
      beans,
      recipes,
      equipment,
      tastingLogs,
      selectedBean,
      selectedRecipe,
      pendingBrewSession,
      setSelectedBean,
      setSelectedRecipe,
      setPendingBrewSession,
      onAddBean,
      onUpdateBean,
      onDeleteBean,
      onAddEquipment,
      onUpdateEquipment,
      deleteEquipment,
      onToggleFavorite,
      addRecipe,
      onUpdateRecipe,
      onDeleteRecipe,
      onAddTastingLog,
      onUpdateTastingLog,
      onDeleteTastingLog,
    ]
  );

  const handleOpenAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col font-sans selection:bg-accent/30 selection:text-text-primary">
      <Header
        beanCount={beans.length}
        brewCount={tastingLogs.length}
        onOpenAuthModal={handleOpenAuthModal}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet context={contextValue} />
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseAuthModal}
      />
    </div>
  );
};
