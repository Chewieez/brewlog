import { useBeans } from "./features/stash/useBeans";
import { useTastingLogs } from "./features/cupping/useTastingLogs";
import { useEquipment } from "./features/equipment/useEquipment";
import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import { AuthModal } from "./features/auth/AuthModal";
import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/shared/Header';
import { TimerView } from './features/timer/TimerView';
import { StashView } from './features/stash/StashView';
import { RecipeStudioView } from './features/recipes/RecipeStudioView';
import { EquipmentView } from './features/equipment/EquipmentView';
import { CuppingView, PendingBrewSession } from './features/cupping/CuppingView';
import { SupabaseModal } from './features/auth/SupabaseModal';
import { Bean, Equipment, BrewRecipe, TastingLog, DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { INITIAL_BEANS } from './lib/sampleData';

function MainAppContent() {
  const { beans, addBean } = useBeans();
  const { logs: tastingLogs, addTastingLog } = useTastingLogs();
  const { equipment, addEquipment, deleteEquipment } = useEquipment();
  const { isPasswordRecovery, authUrlError } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('timer');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Automatically pop open auth modal if arriving via password recovery link or expired link
  useEffect(() => {
    if (isPasswordRecovery || authUrlError) {
      setIsAuthModalOpen(true);
    }
  }, [isPasswordRecovery, authUrlError]);

  // Core App State
  const [recipes, setRecipes] = useState<BrewRecipe[]>(DEFAULT_PRESET_RECIPES);

  // Active Timer Recipe & Selected Bean
  const [selectedRecipe, setSelectedRecipe] = useState<BrewRecipe>(DEFAULT_PRESET_RECIPES[0]);
  const [selectedBean, setSelectedBean] = useState<Bean | null>(INITIAL_BEANS[0] || null);

  // Pending Brew Handoff to Cupping Form
  const [pendingBrewSession, setPendingBrewSession] = useState<PendingBrewSession | null>(null);

  // Keep selectedBean synced when beans load from Supabase
  useEffect(() => {
    if (!selectedBean && beans.length > 0) {
      setSelectedBean(beans[0]);
    }
  }, [beans, selectedBean]);

  // Handlers
  const handleAddBean = async (newBean: Bean) => {
    await addBean(newBean);
  };

  const handleAddEquipment = async (newItem: Omit<Equipment, "id" | "createdAt">) => {
    await addEquipment(newItem);
  };

  const handleAddRecipe = (newRecipe: BrewRecipe) => {
    setRecipes([newRecipe, ...recipes]);
  };

  const handleSelectBeanForBrew = (bean: Bean) => {
    setSelectedBean(bean);
    setActiveTab('timer');
  };

  const handleSelectRecipeForTimer = (recipe: BrewRecipe) => {
    setSelectedRecipe(recipe);
    setActiveTab('timer');
  };

  const handleLogCompletedBrew = (recipe: BrewRecipe, actualTimeSeconds: number, bean: Bean | null) => {
    setPendingBrewSession({
      bean: bean || selectedBean,
      recipe,
      actualTimeSeconds,
    });
    setActiveTab('cupping');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        beanCount={beans.length}
        brewCount={tastingLogs.length}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenDatabaseSettings={() => setIsSupabaseModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'timer' && (
          <TimerView
            recipe={selectedRecipe}
            selectedBean={selectedBean}
            beans={beans}
            onSelectBean={setSelectedBean}
            onSelectOtherRecipe={() => setActiveTab('recipes')}
            onLogCompletedBrew={handleLogCompletedBrew}
          />
        )}

        {activeTab === 'stash' && (
          <StashView
            beans={beans}
            onAddBean={handleAddBean}
            onSelectBeanForBrew={handleSelectBeanForBrew}
          />
        )}

        {activeTab === 'recipes' && (
          <RecipeStudioView
            recipes={recipes}
            onSelectRecipeForTimer={handleSelectRecipeForTimer}
            onAddCustomRecipe={handleAddRecipe}
          />
        )}

        {activeTab === 'equipment' && (
          <EquipmentView
            equipment={equipment}
            onAddEquipment={handleAddEquipment}
            onDeleteEquipment={deleteEquipment}
          />
        )}

        {activeTab === 'cupping' && (
          <CuppingView
            logs={tastingLogs}
            beans={beans}
            pendingBrewSession={pendingBrewSession}
            onClearPendingSession={() => setPendingBrewSession(null)}
            onAddTastingLog={async (log) => {
              await addTastingLog(log);
              setPendingBrewSession(null);
            }}
          />
        )}
      </main>

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
