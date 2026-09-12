import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, useOutletContext } from 'react-router';
import { Header } from '../components/shared/Header';
import { AuthModal } from '../features/auth/AuthModal';
import { useAuth } from '../features/auth/AuthContext';
import { useBeans } from '../features/stash/useBeans';
import { useTastingLogs } from '../features/cupping/useTastingLogs';
import { useEquipment } from '../features/equipment/useEquipment';
import { useRecipes } from '../features/recipes/useRecipes';
import { Bean, Equipment, BrewRecipe, TastingLog, DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { INITIAL_BEANS } from '../lib/sampleData';
import { PendingBrewSession } from '../features/cupping/CuppingView';

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
  onAddEquipment: (item: Omit<Equipment, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteEquipment: (id: string) => Promise<void>;
  onAddRecipe: (recipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => Promise<BrewRecipe>;
  onDeleteRecipe: (id: string) => Promise<void>;
  onAddTastingLog: (log: Omit<TastingLog, 'id' | 'createdAt'>) => Promise<void>;
}

export const useRootOutletContext = () => useOutletContext<RootOutletContext>();

export const RootLayout: React.FC = () => {
  const { beans, addBean } = useBeans();
  const { logs: tastingLogs, addTastingLog } = useTastingLogs();
  const { equipment, addEquipment, deleteEquipment } = useEquipment();
  const { recipes, addRecipe, deleteRecipe } = useRecipes();
  const { isPasswordRecovery, authUrlError } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (isPasswordRecovery || authUrlError) {
      setIsAuthModalOpen(true);
    }
  }, [isPasswordRecovery, authUrlError]);

  const [selectedRecipe, setSelectedRecipe] = useState<BrewRecipe>(
    recipes[0] || DEFAULT_PRESET_RECIPES[0]
  );
  const [selectedBean, setSelectedBean] = useState<Bean | null>(INITIAL_BEANS[0] || null);
  const [pendingBrewSession, setPendingBrewSession] = useState<PendingBrewSession | null>(null);

  useEffect(() => {
    if (recipes.length > 0 && !recipes.some((r) => r.id === selectedRecipe.id)) {
      setSelectedRecipe(recipes[0]);
    }
  }, [recipes, selectedRecipe.id]);

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

  const onAddEquipment = useCallback(
    async (item: Omit<Equipment, 'id' | 'createdAt'>) => {
      await addEquipment(item);
    },
    [addEquipment]
  );

  const onAddTastingLog = useCallback(
    async (log: Omit<TastingLog, 'id' | 'createdAt'>) => {
      await addTastingLog(log);
    },
    [addTastingLog]
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
      onAddEquipment,
      onDeleteEquipment: deleteEquipment,
      onAddRecipe: addRecipe,
      onDeleteRecipe: deleteRecipe,
      onAddTastingLog,
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
      onAddEquipment,
      deleteEquipment,
      addRecipe,
      deleteRecipe,
      onAddTastingLog,
    ]
  );

  const handleOpenAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
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
