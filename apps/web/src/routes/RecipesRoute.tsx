import React, { useState, useMemo, useCallback } from 'react';
import { Outlet, useOutletContext, useParams, useNavigate } from 'react-router';
import { BrewRecipe, Equipment } from '@brewlog/core';
import { Plus } from 'lucide-react';
import { useRootOutletContext } from '../layouts/RootLayout';
import { RecipeCatalogList } from '../features/recipes/RecipeCatalogList';
import { RecipeBuilderModal } from '../features/recipes/RecipeBuilderModal';

export interface RecipeOutletContext {
  recipes: BrewRecipe[];
  equipment?: Equipment[];
  onSelectRecipeForTimer: (recipe: BrewRecipe) => void;
  onEditRecipe?: (recipe: BrewRecipe) => void;
  onDeleteRecipe?: (id: string) => Promise<void> | void;
}

export const useRecipeOutletContext = () => useOutletContext<RecipeOutletContext>();

export const RecipesRoute: React.FC = () => {
  const {
    recipes,
    equipment,
    onAddEquipment,
    onAddRecipe,
    onUpdateRecipe,
    onDeleteRecipe,
    setSelectedRecipe,
  } = useRootOutletContext();
  const { recipeId } = useParams<{ recipeId?: string }>();
  const navigate = useNavigate();

  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('all');
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<BrewRecipe | null>(null);

  const handleSelectRecipeForTimer = useCallback(
    (recipe: BrewRecipe) => {
      setSelectedRecipe(recipe);
    },
    [setSelectedRecipe]
  );

  const handleEditRecipe = useCallback((recipe: BrewRecipe) => {
    setEditingRecipe(recipe);
    setIsBuilderModalOpen(true);
  }, []);

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
      if (editingRecipe) {
        await onUpdateRecipe(editingRecipe.id, newRecipe);
        setEditingRecipe(null);
      } else {
        const created = await onAddRecipe(newRecipe);
        if (created?.id) {
          navigate('/recipes/' + created.id);
        }
      }
    },
    [editingRecipe, onUpdateRecipe, onAddRecipe, navigate]
  );

  const recipeOutletContextValue = useMemo<RecipeOutletContext>(
    () => ({
      recipes,
      equipment,
      onSelectRecipeForTimer: handleSelectRecipeForTimer,
      onEditRecipe: handleEditRecipe,
      onDeleteRecipe,
    }),
    [recipes, equipment, handleSelectRecipeForTimer, handleEditRecipe, onDeleteRecipe]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
            onClick={() => {
              setEditingRecipe(null);
              setIsBuilderModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-mono text-xs uppercase tracking-wider font-bold cursor-pointer transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>NEW RECIPE</span>
          </button>
        </div>
      </div>

      {/* Master-Detail Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Catalog List */}
        <div
          className={`${
            recipeId ? 'hidden lg:block' : 'block'
          } lg:col-span-4`}
        >
          <RecipeCatalogList
            recipes={recipes}
            activeRecipeId={recipeId}
            selectedMethodFilter={selectedMethodFilter}
            onSelectMethodFilter={setSelectedMethodFilter}
            onEditRecipe={handleEditRecipe}
            onDeleteRecipe={handleDeleteRecipeFromList}
          />
        </div>

        {/* Right Column: Child Route Outlet */}
        <div
          className={`${
            recipeId ? 'block' : 'hidden lg:block'
          } col-span-1 lg:col-span-8`}
        >
          <Outlet context={recipeOutletContextValue} />
        </div>
      </div>

      <RecipeBuilderModal
        isOpen={isBuilderModalOpen}
        initialRecipe={editingRecipe}
        equipment={equipment}
        onAddEquipment={onAddEquipment}
        onClose={() => {
          setIsBuilderModalOpen(false);
          setEditingRecipe(null);
        }}
        onSaveRecipe={handleSaveRecipe}
      />
    </div>
  );
};
