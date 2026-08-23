import React, { useState } from 'react';
import { Header, ActiveTab } from './components/Header';
import { TimerView } from './components/TimerView';
import { StashView } from './components/StashView';
import { RecipeStudioView } from './components/RecipeStudioView';
import { EquipmentView } from './components/EquipmentView';
import { CuppingView } from './components/CuppingView';
import { SupabaseModal } from './components/SupabaseModal';
import { Bean, Equipment, BrewRecipe, TastingLog, DEFAULT_PRESET_RECIPES, calculateScaScore } from '@brewlog/core';
import { INITIAL_BEANS, INITIAL_EQUIPMENT, INITIAL_TASTING_LOGS } from './lib/sampleData';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('timer');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Core App State
  const [beans, setBeans] = useState<Bean[]>(INITIAL_BEANS);
  const [equipment, setEquipment] = useState<Equipment[]>(INITIAL_EQUIPMENT);
  const [recipes, setRecipes] = useState<BrewRecipe[]>(DEFAULT_PRESET_RECIPES);
  const [tastingLogs, setTastingLogs] = useState<TastingLog[]>(INITIAL_TASTING_LOGS);

  // Active Timer Recipe
  const [selectedRecipe, setSelectedRecipe] = useState<BrewRecipe>(DEFAULT_PRESET_RECIPES[0]);

  // Handlers
  const handleAddBean = (newBean: Bean) => {
    setBeans([newBean, ...beans]);
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

  const handleLogCompletedBrew = (recipe: BrewRecipe, actualTimeSeconds: number) => {
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

    setTastingLogs([newLog, ...tastingLogs]);
    setActiveTab('cupping');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        beanCount={beans.length}
        brewCount={tastingLogs.length}
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
            onAddTastingLog={(log) => setTastingLogs([log, ...tastingLogs])}
          />
        )}
      </main>

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
}
