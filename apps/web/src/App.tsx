import { useBeans } from "./features/stash/useBeans";
import { useTastingLogs } from "./features/cupping/useTastingLogs";
import { AuthProvider } from "./features/auth/AuthContext";
import { AuthModal } from "./features/auth/AuthModal";
import React, { useState } from 'react';
import { Header, ActiveTab } from './components/shared/Header';
import { TimerView } from './features/timer/TimerView';
import { StashView } from './features/stash/StashView';
import { RecipeStudioView } from './features/recipes/RecipeStudioView';
import { EquipmentView } from './features/equipment/EquipmentView';
import { CuppingView } from './features/cupping/CuppingView';
import { SupabaseModal } from './features/auth/SupabaseModal';
import { Bean, Equipment, BrewRecipe, TastingLog, DEFAULT_PRESET_RECIPES, calculateScaScore } from '@brewlog/core';
import { INITIAL_BEANS, INITIAL_EQUIPMENT, INITIAL_TASTING_LOGS } from './lib/sampleData';

function MainAppContent() {
  const { beans, addBean } = useBeans();
  const { logs: tastingLogs, addTastingLog } = useTastingLogs();
  const [activeTab, setActiveTab] = useState<ActiveTab>('timer');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Core App State
  // beans from useBeans
  const [equipment, setEquipment] = useState<Equipment[]>(INITIAL_EQUIPMENT);
  const [recipes, setRecipes] = useState<BrewRecipe[]>(DEFAULT_PRESET_RECIPES);
  // logs from useTastingLogs

  // Active Timer Recipe
  const [selectedRecipe, setSelectedRecipe] = useState<BrewRecipe>(DEFAULT_PRESET_RECIPES[0]);

  // Handlers
  const handleAddBean = async (newBean: Bean) => {
    await addBean(newBean);
  };

  const handleAddEquipment = (newItem: Equipment) => {
    setEquipment([newItem, ...equipment]);
  };

  const handleAddRecipe = (newRecipe: BrewRecipe) => {
    setRecipes([newRecipe, ...recipes]);
  };

  const handleSelectBeanForBrew = (bean: Bean) => {
    setActiveTab('timer');
  };

  const handleSelectRecipeForTimer = (recipe: BrewRecipe) => {
    setSelectedRecipe(recipe);
    setActiveTab('timer');
  };

  const handleLogCompletedBrew = async (recipe: BrewRecipe, actualTimeSeconds: number) => {
    const newLog: TastingLog = {
      id: 'log-' + Date.now(),
      beanNameSnapshot: beans[0]?.name || 'Specialty Blend',
      roasterSnapshot: beans[0]?.roaster || 'Local Roaster',
      recipeNameSnapshot: recipe.name,
      brewMethod: recipe.brewMethod,
      brewDate: new Date().toISOString(),
      coffeeDoseGrams: recipe.coffeeDoseGrams,
      waterAmountGrams: recipe.waterAmountGrams,
      actualTimeSeconds,
      grindSetting: recipe.grindSize,
      waterTempCelsius: recipe.waterTempCelsius,
      scores: {
        fragranceAroma: 8.5,
        acidity: 8.5,
        sweetness: 8.8,
        body: 8.0,
        clarity: 9.0,
        aftertaste: 8.5,
        balance: 8.7,
        overall: 8.8,
      },
      calculatedScaScore: 87.2,
      rating: 4.8,
      flavorTags: ['Sweetness', 'Clarity'],
      notes: 'Brewed with Brew Assistant timer.',
      wouldBrewAgain: true,
      createdAt: new Date().toISOString(),
    };

    await addTastingLog(newLog);
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
          />
        )}

        {activeTab === 'cupping' && (
          <CuppingView
            logs={tastingLogs}
            onAddTastingLog={(log) => addTastingLog(log)}
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
