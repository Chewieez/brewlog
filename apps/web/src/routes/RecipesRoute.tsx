import React, { useState, useMemo, useCallback } from 'react';
import { Outlet, useOutletContext, useParams, useNavigate } from 'react-router';
import { BrewRecipe } from '@brewlog/core';
import { Plus } from 'lucide-react';
import { useRootOutletContext } from '../layouts/RootLayout';
import { RecipeCatalogList } from '../features/recipes/RecipeCatalogList';
import { RecipeBuilderModal } from '../features/recipes/RecipeBuilderModal';

export interface RecipeOutletContext {
  recipes: BrewRecipe[];
  onSelectRecipeForTimer: (recipe: BrewRecipe) => void;
  onDeleteRecipe?: (id: string) => Promise<void> | void;
}

export const useRecipeOutletContext = () => useOutletContext<RecipeOutletContext>();

export const RecipesRoute: React.FC = () => {
  const { recipes, onAddRecipe, onDeleteRecipe, setSelectedRecipe } = useRootOutletContext();
  const { recipeId } = useParams<{ recipeId?: string }>();
  const navigate = useNavigate();

  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('all');
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);

  const handleSelectRecipeForTimer = useCallback(
    (recipe: BrewRecipe) => {
      setSelectedRecipe(recipe);
    },
    [setSelectedRecipe]
  );

  const handleDeleteRecipeFromList = useCallback(
    async (recipe: BrewRecipe) => {
      if (onDeleteRecipe) {
        await onDeleteRecipe(recipe.id);
      }
      if (recipe.id === recipeId) {
        navigate('/recipes');
      }
    },
    [onDeleteRecipe, recipeId, navigate]
  );

  const handleSaveRecipe = useCallback(
    async (newRecipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => {
      const created = await onAddRecipe(newRecipe);
      if (created?.id) {
        navigate('/recipes/' + created.id);
      }
    },
    [onAddRecipe, navigate]
  );

  const recipeOutletContextValue = useMemo<RecipeOutletContext>(
    () => ({
      recipes,
      onSelectRecipeForTimer: handleSelectRecipeForTimer,
      onDeleteRecipe,
    }),
    [recipes, handleSelectRecipeForTimer, onDeleteRecipe]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
            Recipe Studio
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            World Champion & Expert brew profiles alongside your custom dialed-in recipes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsBuilderModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold cursor-pointer transition-colors text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Build Custom Recipe</span>
          </button>
        </div>
      </div>

      {/* Master-Detail Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Catalog List */}
        <div
          className={`${
            recipeId ? 'hidden lg:block' : 'block'
          } lg:col-span-5`}
        >
          <RecipeCatalogList
            recipes={recipes}
            activeRecipeId={recipeId}
            selectedMethodFilter={selectedMethodFilter}
            onSelectMethodFilter={setSelectedMethodFilter}
            onDeleteRecipe={handleDeleteRecipeFromList}
          />
        </div>

        {/* Right Column: Child Route Outlet */}
        <div
          className={`${
            recipeId ? 'block' : 'hidden lg:block'
          } col-span-1 lg:col-span-7`}
        >
          <Outlet context={recipeOutletContextValue} />
        </div>
      </div>

      <RecipeBuilderModal
        isOpen={isBuilderModalOpen}
        onClose={() => setIsBuilderModalOpen(false)}
        onSaveRecipe={handleSaveRecipe}
      />
    </div>
  );
};
