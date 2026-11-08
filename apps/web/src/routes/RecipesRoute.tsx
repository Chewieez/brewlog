import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@brewlog/ui';
import { Outlet, useOutletContext, useParams, useNavigate } from 'react-router';
import { BrewRecipe } from '@brewlog/core';
import { Plus } from 'lucide-react';
import { useRecipes } from '../features/recipes/RecipeContext';
import { RecipeCatalogList } from '../features/recipes/RecipeCatalogList';
import { RecipeBuilderModal } from '../features/recipes/RecipeBuilderModal';

export interface RecipeOutletContext {
  onEditRecipe?: (recipe: BrewRecipe) => void;
}

export const useRecipeOutletContext = () => useOutletContext<RecipeOutletContext | undefined>();

export const RecipesRoute: React.FC = () => {
  const {
    recipes,
    addRecipe,
    updateRecipe,
    deleteRecipe,
  } = useRecipes();
  const { recipeId } = useParams<{ recipeId?: string }>();
  const navigate = useNavigate();

  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('all');
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<BrewRecipe | null>(null);

  const handleEditRecipe = useCallback((recipe: BrewRecipe) => {
    setEditingRecipe(recipe);
    setIsBuilderModalOpen(true);
  }, []);

  const handleDeleteRecipeFromList = useCallback(
    async (recipe: BrewRecipe) => {
      await deleteRecipe(recipe.id);
      if (recipe.id === recipeId) {
        navigate('/recipes');
      }
    },
    [deleteRecipe, recipeId, navigate]
  );

  const handleSaveRecipe = useCallback(
    async (newRecipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => {
      if (editingRecipe) {
        await updateRecipe(editingRecipe.id, newRecipe);
        setEditingRecipe(null);
      } else {
        const created = await addRecipe(newRecipe);
        if (created?.id) {
          navigate('/recipes/' + created.id);
        }
      }
    },
    [editingRecipe, updateRecipe, addRecipe, navigate]
  );

  const recipeOutletContextValue = useMemo<RecipeOutletContext>(
    () => ({
      onEditRecipe: handleEditRecipe,
    }),
    [handleEditRecipe]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Recipe Studio
          </h1>
          <p className="text-sm text-foreground-secondary mt-1">
            World Champion & Expert brew profiles alongside your custom dialed-in recipes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingRecipe(null);
              setIsBuilderModalOpen(true);
            }}
            label="NEW RECIPE"
          />
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
        onClose={() => {
          setIsBuilderModalOpen(false);
          setEditingRecipe(null);
        }}
        onSaveRecipe={handleSaveRecipe}
      />
    </div>
  );
};
